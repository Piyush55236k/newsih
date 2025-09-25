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
		// Use disease detection API URL if provided, else fallback to deployed API
		return (env.VITE_DISEASE_API_URL as string) || 'https://newsih.onrender.com'
	}

	async function analyzeWithAI(imageData: string) {
		setLoading(true)
		setError(null)
		try {
			const base = apiBase().replace(/\/$/, '')
			const tryUrls: string[] = []
			if (base) tryUrls.push(`${base}/detect`)
			tryUrls.push(`/api/disease/detect`)
			let result: Result | null = null
			let lastErr: any = null
			for (const url of tryUrls){
				try{
					const response = await fetch(url, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ image: imageData })
					})
					if (!response.ok) {
						const errorData = await response.json().catch(() => null)
						lastErr = new Error(errorData?.error || `Request failed (${response.status}) at ${url}`)
						continue
					}
					result = await response.json()
					break
				}catch(e:any){
					lastErr = e
				}
			}
			if (!result) throw lastErr || new Error('Failed to analyze image')
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
		<div className="fade-in">
			<div className="row" style={{gridTemplateColumns: '1fr'}}>
				<div className="card bg-gradient-green">
					<h2>🐛 Plant Disease Detection</h2>
					<p className="muted">Upload a clear photo of a leaf or plant part to get instant AI-powered disease diagnosis and treatment recommendations.</p>
				</div>
			</div>
			
			<div className="row" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))'}}>
				<div className="card fade-in-delay-1">
					<h3>📸 Upload Image</h3>
					<div className="upload-area" style={{
						border: '2px dashed var(--green-300)',
						borderRadius: 'var(--radius-md)',
						padding: '32px 24px',
						textAlign: 'center',
						backgroundColor: 'var(--green-50)',
						transition: 'var(--transition)',
						cursor: 'pointer'
					}}>
						<input 
							type="file" 
							accept="image/*" 
							onChange={e=>{ const f=e.target.files?.[0]; if (f) onFile(f) }}
							style={{display: 'none'}}
							id="imageUpload"
						/>
						<label htmlFor="imageUpload" style={{cursor: 'pointer', display: 'block'}}>
							<div style={{fontSize: '48px', marginBottom: '16px'}}>📷</div>
							<p style={{color: 'var(--green-700)', fontWeight: '600', marginBottom: '8px'}}>
								Click to upload plant image
							</p>
							<p className="muted" style={{fontSize: '14px'}}>
								Supports: JPG, PNG, WebP (Max 10MB)
							</p>
						</label>
					</div>
				</div>
				
				{src && (
					<div className="card fade-in-delay-2">
						<h3>🔍 Analysis Result</h3>
						<div className="image-container" style={{marginBottom: '20px'}}>
							<img 
								ref={imgRef} 
								src={src} 
								alt="Uploaded plant"
								style={{
									width: '100%', 
									maxHeight: '300px',
									objectFit: 'cover',
									borderRadius: 'var(--radius-md)', 
									border: '2px solid var(--panel-border)',
									boxShadow: 'var(--shadow-sm)'
								}} 
							/>
						</div>
						
						{loading && (
							<div className="loading-state" style={{
								textAlign: 'center',
								padding: '24px',
								color: 'var(--green-600)'
							}}>
								<div className="loading" style={{margin: '0 auto 16px'}}></div>
								<p><strong>Analyzing with AI model…</strong></p>
								<p className="muted">This may take a few seconds</p>
							</div>
						)}
						
						{error && (
							<div className="error-state" style={{
								padding: '16px',
								backgroundColor: 'var(--red-100)',
								border: '1px solid var(--red-200)',
								borderRadius: 'var(--radius-md)',
								marginBottom: '16px'
							}}>
								<p style={{color: 'var(--red-700)', fontWeight: '600'}}>
									⚠️ Analysis Error
								</p>
								<p style={{color: 'var(--red-600)'}}>{error}</p>
							</div>
						)}
						
						{res && (
							<div className="result-container fade-in">
								<div className="disease-info" style={{
									padding: '20px',
									backgroundColor: 'var(--green-50)',
									borderRadius: 'var(--radius-md)',
									marginBottom: '20px',
									border: '1px solid var(--green-200)'
								}}>
									<h4 style={{
										color: 'var(--green-700)',
										fontSize: '20px',
										marginBottom: '12px',
										display: 'flex',
										alignItems: 'center',
										gap: '8px'
									}}>
										🦠 {res.disease.replace(/___/g, ' - ')}
									</h4>
									
									<div style={{
										display: 'flex',
										gap: '12px',
										flexWrap: 'wrap',
										marginBottom: '16px'
									}}>
										<span className="tag success">
											{Math.round(res.confidence*100)}% confidence
										</span>
										<span className="tag info">
											🌿 {res.plant_type}
										</span>
										<span className={`tag ${res.severity === 'High' ? 'danger' : res.severity === 'Medium' ? 'warning' : 'success'}`}>
											{res.severity} severity
										</span>
									</div>
								</div>
								
								<div className="treatments-section">
									<h4 style={{
										color: 'var(--green-700)',
										marginBottom: '16px',
										display: 'flex',
										alignItems: 'center',
										gap: '8px'
									}}>
										💊 Treatment Recommendations
									</h4>
									<ul style={{
										listStyle: 'none',
										padding: '0',
										margin: '0'
									}}>
										{res.treatments.map((treatment: string, index: number) => (
											<li key={index} style={{
												padding: '12px 16px',
												backgroundColor: index % 2 === 0 ? 'var(--green-50)' : 'transparent',
												borderRadius: 'var(--radius-sm)',
												marginBottom: '8px',
												display: 'flex',
												alignItems: 'flex-start',
												gap: '8px'
											}}>
												<span style={{color: 'var(--green-600)'}}>✓</span>
												<span>{treatment}</span>
											</li>
										))}
									</ul>
								</div>
								
								<div className="disclaimer" style={{
									marginTop: '20px',
									padding: '16px',
									backgroundColor: 'var(--blue-100)',
									borderRadius: 'var(--radius-md)',
									border: '1px solid var(--blue-200)'
								}}>
									<p style={{
										fontSize: '14px',
										color: 'var(--blue-700)',
										margin: '0',
										display: 'flex',
										alignItems: 'center',
										gap: '8px'
									}}>
										ℹ️ <strong>Disclaimer:</strong> AI-powered disease detection for guidance only. 
										For critical cases, consult local agricultural experts or extension services.
									</p>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
