import { useState } from 'react'

type SoilForm = {
	ph: number | ''
	nitrogen: number | ''
	phosphorus: number | ''
	potassium: number | ''
	ec: number | ''
	crop: string
}

// Align crops with backend baseline_npk keys
const crops = ['Wheat','Paddy','Maize','Cotton','Mustard']

export default function SoilHealth() {
	const [form, setForm] = useState<SoilForm>({ ph: '', nitrogen: '', phosphorus: '', potassium: '', ec: '', crop: 'Wheat' })
	const [aiLoading, setAiLoading] = useState(false)
	const [aiError, setAiError] = useState<string|null>(null)
	const [ai, setAi] = useState<null | { messages: string[]; fert: string[]; split?: string; dose?: string }> (null)
	const [apiStatus, setApiStatus] = useState<'unknown'|'online'|'offline'>('unknown')

	const update = (k: keyof SoilForm, v: any) => setForm(s => ({ ...s, [k]: v }))

		function apiBase(){
			return 'https://fertilizer-5hx9.onrender.com';
		}

		async function pingApi(){
			const base = apiBase().replace(/\/$/, '')
			// Try configured base first; if it fails, try local serverless health
			try{
				if (base) {
					const r1 = await fetch(`${base}/`, { method:'GET' })
					if (r1.ok) { setApiStatus('online'); return }
				}
				const r2 = await fetch(`/api/health`, { method:'GET' })
				setApiStatus(r2.ok ? 'online' : 'offline')
			}catch{
				setApiStatus('offline')
			}
		}

		function toQuery(obj: Record<string,string|number>){
			const q = new URLSearchParams()
			for (const [k,v] of Object.entries(obj)) q.append(k, String(v))
			return q.toString()
		}

		function normalizeModelResp(r: any){
			const out = { messages: [] as string[], fert: [] as string[], split: undefined as string|undefined, dose: undefined as string|undefined }
			if (!r || typeof r !== 'object') return out
			const add = (v: any)=>{ if (Array.isArray(v)) out.messages.push(...v.map(String)); else if (v) out.messages.push(String(v)) }
			// Preferred shape from Flask backend
			if (Array.isArray(r.messages)) out.messages.push(...r.messages.map((m:any)=>String(m)))
			if (r.fertilizer_plan && typeof r.fertilizer_plan === 'object'){
				const plan = r.fertilizer_plan as Record<string, number>
				for (const [k,v] of Object.entries(plan)){
					// Pretty label: e.g., DAP_kg/ha -> DAP, keep unit in value
					const name = k.replace(/_kg\/ha$/i,'').replace(/_/g,' ')
					out.fert.push(`${name.toUpperCase()}: ${v} kg/ha`)
				}
			}
			// Common shapes
			if (r.messages) add(r.messages)
			if (r.recommendations) add(r.recommendations)
			if (r.recommendation) add(r.recommendation)
			if (r.summary) add(r.summary)
			if (r.notes) add(r.notes)
			const fert = r.fertilizers || r.fertilizer || r.npk || r.inputs
			if (Array.isArray(fert)) out.fert = fert.map((x:any)=> String(x))
			else if (fert) out.fert = String(fert).split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean)
			out.split = r.split || r.schedule || r.application
			out.dose = r.dose || r.dosage || r.rate
			// Fallback: if nothing collected but a top-level text exists
			if (out.messages.length===0 && typeof r === 'object'){
				for (const k of Object.keys(r)){
					const v = (r as any)[k]
					if (typeof v === 'string' && v.length>8) { out.messages.push(v); break }
				}
			}
			return out
		}

		async function runAI(){
			setAi(null); setAiError(null); setAiLoading(true)
			try{
				const ph = Number(form.ph), n = Number(form.nitrogen), p = Number(form.phosphorus), k = Number(form.potassium), ec = Number(form.ec)
				if ([ph,n,p,k,ec].some(Number.isNaN)) throw new Error('Fill all fields (including EC) before running AI')
				const base = apiBase().replace(/\/$/, '')
				const payload = {
					crop: String(form.crop || '').toLowerCase(),
					inputs: { N: n, P: p, K: k, pH: ph, EC: ec }
				}
				// Only use the correct API endpoint
				let r: Response | null = null
				let lastErr: any = null
				try {
					r = await fetch(`${base}/recommend`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
					if (!r.ok) throw new Error(`Request failed (${r.status}) at ${base}/recommend`)
				} catch (err:any) {
					setApiStatus('offline')
					throw new Error(err?.message || 'Cannot reach AI API')
				}
				let resp: any | null = null
				try{ resp = await r.json() } catch { /* ignore */ }
				if (!r.ok){
					const msg = resp?.error || `Request failed (${r.status})`
					throw new Error(msg)
				}
				if (!resp) throw new Error('No response from AI API')
				const norm = normalizeModelResp(resp)
				setAi(norm)
			}catch(e:any){
				setAiError(String(e?.message || e))
			}finally{
				setAiLoading(false)
			}
		}

	return (
		<div className="grid">
			<section className="card">
				<h2>Soil Health Recommendations</h2>
				<p className="muted">Enter basic soil test values to get guidance.</p>
				<p className="muted">API status: {apiStatus==='unknown' ? '—' : apiStatus==='online' ? 'Online' : 'Offline' } <button onClick={pingApi} style={{marginLeft:8}} type="button">Check API</button></p>
				<div className="row">
					<div className="col">
						<label>Crop</label>
						<select value={form.crop} onChange={e=>update('crop', e.target.value)}>
							{crops.map(c=> <option key={c} value={c}>{c}</option>)}
						</select>
					</div>
					<div className="col">
						<label>pH</label>
						<input type="number" step="0.1" value={form.ph} onChange={e=>update('ph', e.target.value)} placeholder="6.5" />
					</div>
					<div className="col">
						<label>Nitrogen (kg/ha)</label>
						<input type="number" value={form.nitrogen} onChange={e=>update('nitrogen', e.target.value)} placeholder="300" />
					</div>
					<div className="col">
						<label>Phosphorus (kg/ha)</label>
						<input type="number" value={form.phosphorus} onChange={e=>update('phosphorus', e.target.value)} placeholder="15" />
					</div>
					<div className="col">
						<label>Potassium (kg/ha)</label>
						<input type="number" value={form.potassium} onChange={e=>update('potassium', e.target.value)} placeholder="140" />
					</div>
					<div className="col">
						<label>EC (dS/m)</label>
						<input type="number" step="0.1" value={form.ec} onChange={e=>update('ec', e.target.value)} placeholder="1.5" />
					</div>
				</div>
						<div style={{marginTop:10}}>
							<button onClick={runAI} disabled={aiLoading}> {aiLoading ? 'Running AI…' : 'Get AI Recommendation'} </button>
							{aiError && <span className="warning" style={{marginLeft:10}}>{aiError}</span>}
						</div>
			</section>



					{ai && (
						<section className="card">
							<h3>AI Model Recommendation</h3>
							{ai.messages.length>0 && (
								<ul>
									{ai.messages.map((m,i)=>(<li key={i}>{m}</li>))}
								</ul>
							)}
							{ai.fert.length>0 && <p><b>Fertilizers:</b> {ai.fert.join(', ')}</p>}
							{ai.split && <p><b>Application:</b> {ai.split}</p>}
							{ai.dose && <p className="muted">{ai.dose}</p>}
						</section>
					)}
		</div>
	)
}
