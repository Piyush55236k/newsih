import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '../lib/analytics'
import { getSupabase } from '../lib/supabase'

type Result = {
	disease: string
	confidence: number
	treatments: string[]
	plant_type: string
	severity: string
}

export default function PestDetect(){
	const [src, setSrc] = useState<string>('')
	const [res, setRes] = useState<Result | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const imgRef = useRef<HTMLImageElement>(null)

	function apiBase(){
		const env: any = (import.meta as any).env || {}
		// Use disease detection API URL if provided, else try SIH API
		return (env.VITE_DISEASE_API_URL as string) || (env.VITE_SIH_API_URL as string) || ''
	}

	async function analyzeWithAI(imageData: string) {
		setLoading(true)
		setError(null)
		try {
			const base = apiBase().replace(/\/$/, '')
			const url = base ? `${base}/detect` : `/api/disease/detect`
			
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ image: imageData })
			})
			
			if (!response.ok) {
				const errorData = await response.json().catch(() => null)
				throw new Error(errorData?.error || `Request failed (${response.status})`)
			}
			
			const result = await response.json()
			setRes(result)
			trackEvent('pest_detect_ai', { 
				disease: result.disease, 
				confidence: result.confidence,
				plant_type: result.plant_type 
			})
		} catch (e: any) {
			const errorMsg = e.message || 'Failed to analyze image'
			setError(errorMsg)
			console.error('Disease detection error:', e)
		} finally {
			setLoading(false)
		}
	}

	useEffect(()=>{
		if (!src) return
		const img = imgRef.current
		if (!img) return
		
		const processImage = () => {
			// Convert image to base64 for API
			const canvas = document.createElement('canvas')
			const ctx = canvas.getContext('2d')!
			canvas.width = img.naturalWidth
			canvas.height = img.naturalHeight
			ctx.drawImage(img, 0, 0)
			const imageData = canvas.toDataURL('image/jpeg', 0.8)
			analyzeWithAI(imageData)
		}
		
		if (!img.complete) {
			img.onload = processImage
		} else {
			processImage()
		}
	}, [src])

		const onFile = async (f: File) => {
		const reader = new FileReader()
		reader.onload = () => setSrc(String(reader.result))
		reader.readAsDataURL(f)
			try{
				const supa = getSupabase()
				if (supa) {
					const path = `pests/${Date.now()}_${f.name}`
					const { error } = await supa.storage.from('uploads').upload(path, f, { upsert: true })
					if (error) console.error('Supabase upload error:', error)
					else trackEvent('pest_upload', { path })
				}
			}catch(e){ console.error('Supabase storage exception:', e) }
	}

	return (
		<div className="grid">
			<section className="card">
				<h2>Pest/Disease Detection</h2>
				<p className="muted">Upload a clear photo of a leaf or plant part.</p>
				<input type="file" accept="image/*" onChange={e=>{ const f=e.target.files?.[0]; if (f) onFile(f) }} />
			</section>
			{src && (
				<section className="card">
					<div className="row">
						<div className="col">
							<img ref={imgRef} src={src} style={{maxWidth:'100%', borderRadius:12, border:'1px solid #1f2937'}} />
						</div>
						<div className="col">
							<h3>Result</h3>
							{loading && <p className="muted">Analyzing with AI model…</p>}
							{error && <p className="warning">Error: {error}</p>}
							{res && (
								<div>
									<p><b>{res.disease.replace(/___/g, ' - ')}</b> <span className="tag">{Math.round(res.confidence*100)}% confidence</span></p>
									<p className="muted">Plant: {res.plant_type} • Severity: {res.severity}</p>
									<h4>Treatment Recommendations:</h4>
									<ul>
										{res.treatments.map((t: string, i: number)=>(<li key={i}>{t}</li>))}
									</ul>
									<p className="muted">AI-powered disease detection. For critical cases, consult local agricultural experts.</p>
								</div>
							)}
						</div>
					</div>
				</section>
			)}
		</div>
	)
}
