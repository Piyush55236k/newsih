import React, { useState } from 'react';
const crops = [
	'Wheat', 'Rice', 'Maize', 'Barley', 'Soybean', 'Cotton', 'Sugarcane', 'Potato', 'Tomato', 'Onion', 'Other'
];

export default function SoilHealth() {
	const [form, setForm] = useState({
		crop: crops[0],
		ph: '',
		nitrogen: '',
		phosphorus: '',
		potassium: '',
		ec: ''
	});
	const [ai, setAi] = useState<any>(null);
	const [aiLoading, setAiLoading] = useState(false);
	const [aiError, setAiError] = useState('');
	const [apiStatus, setApiStatus] = useState<'unknown'|'online'|'offline'>('unknown');

	function update(field: string, value: string) {
		setForm(f => ({ ...f, [field]: value }));
	}

	async function pingApi() {
		setApiStatus('unknown');
		try {
			const resp = await fetch('/api/soilhealth/ping');
			setApiStatus(resp.ok ? 'online' : 'offline');
		} catch {
			setApiStatus('offline');
		}
	}

	async function runAI() {
		setAiError('');
		setAiLoading(true);
		setAi(null);
		try {
			const payload = {
				crop: form.crop,
				ph: form.ph,
				nitrogen: form.nitrogen,
				phosphorus: form.phosphorus,
				potassium: form.potassium,
				ec: form.ec
			};
			const r = await fetch('/api/soilhealth/recommend', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!r.ok) throw new Error(`Request failed (${r.status})`);
			const resp = await r.json();
			setAi(resp);
		} catch (e: any) {
			setAiError(String(e?.message || e));
		} finally {
			setAiLoading(false);
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
					{ai.messages && ai.messages.length>0 && (
						<ul>
							{ai.messages.map((m:any,i:number)=>(<li key={i}>{m}</li>))}
						</ul>
					)}
					{ai.fert && ai.fert.length>0 && <p><b>Fertilizers:</b> {ai.fert.join(', ')}</p>}
					{ai.split && <p><b>Application:</b> {ai.split}</p>}
					{ai.dose && <p className="muted">{ai.dose}</p>}
				</section>
			)}
		</div>
	);
}
