import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '../lib/analytics'
import { getSupabase } from '../lib/supabase'

type Result = {
	label: string
	confidence: number
	tips: string[]
}

function analyzeImage(img: HTMLImageElement): Result {
	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')!
	const w = (canvas.width = Math.min(256, img.naturalWidth))
	const h = (canvas.height = Math.min(256, img.naturalHeight))
	ctx.drawImage(img, 0, 0, w, h)
	const data = ctx.getImageData(0, 0, w, h).data
	let brownish = 0, greenish = 0, pixels = w*h
	for (let i=0; i<data.length; i+=4){
		const r=data[i], g=data[i+1], b=data[i+2]
		if (g>r && g>b) greenish++
		if (r>g && g>b && r>90 && g>70) brownish++
	}
	const ratio = brownish/(pixels||1)
	if (ratio>0.12) {
		return {
			label: 'Possible leaf spot/blight',
			confidence: Math.min(0.95, ratio*2),
			tips: [
				'Remove heavily infected leaves to reduce spread',
				'Avoid overhead irrigation; water at soil level',
				'Consider copper-based fungicide per label guidance',
			]
		}
	}
	return {
		label: 'No obvious disease signature',
		confidence: 0.7,
		tips: ['Monitor leaves for new lesions','Keep foliage dry; ensure airflow']
	}
}

export default function PestDetect(){
	const [src, setSrc] = useState<string>('')
	const [res, setRes] = useState<Result | null>(null)
	const imgRef = useRef<HTMLImageElement>(null)

	useEffect(()=>{
		if (!src) return
		const img = imgRef.current
		if (!img) return
		if (!img.complete) {
			img.onload = () => {
				const r = analyzeImage(img)
				setRes(r)
				trackEvent('pest_detect', { label: r.label, confidence: r.confidence })
			}
		} else {
			const r = analyzeImage(img)
			setRes(r)
			trackEvent('pest_detect', { label: r.label, confidence: r.confidence })
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
							{!res && <p className="muted">Analyzing…</p>}
							{res && (
								<div>
									<p><b>{res.label}</b> <span className="tag">{Math.round(res.confidence*100)}%</span></p>
									<ul>
										{res.tips.map((t,i)=>(<li key={i}>{t}</li>))}
									</ul>
									<p className="muted">This is a lightweight, on-device heuristic. For accurate diagnosis, consult local extension services.</p>
								</div>
							)}
						</div>
					</div>
				</section>
			)}
		</div>
	)
}
