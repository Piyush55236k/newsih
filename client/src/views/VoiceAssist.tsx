import { useEffect, useMemo, useRef, useState } from 'react'
import { trackEvent } from '../lib/analytics'

const LANGS = [
	{ code: 'en-US', label: 'English' },
	{ code: 'hi-IN', label: 'Hindi' },
	{ code: 'bn-IN', label: 'Bengali' },
	{ code: 'ta-IN', label: 'Tamil' },
	{ code: 'te-IN', label: 'Telugu' },
]

export default function VoiceAssist(){
	const [lang, setLang] = useState('en-US')
	const [listening, setListening] = useState(false)
	const [log, setLog] = useState<string[]>([])
	const recRef = useRef<any>(null)

	const speak = (text: string) => {
		const ut = new SpeechSynthesisUtterance(text)
		ut.lang = lang
		window.speechSynthesis.cancel()
		window.speechSynthesis.speak(ut)
		trackEvent('tts', { lang, text })
	}

	const supportedSTT = useMemo(()=>{
		return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
	}, [])

	const startListen = () => {
		const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
		if (!SR) return
		const rec = new SR()
		rec.lang = lang
		rec.interimResults = false
		rec.maxAlternatives = 1
		rec.onresult = (ev: any) => {
			const text = ev.results[0][0].transcript as string
			setLog(l=>[...l, 'User: ' + text])
			trackEvent('stt', { lang, text })
			// simple intent detection
			const t = text.toLowerCase()
			if (t.includes('weather') || t.includes('mausam')) speak('Today looks favorable for field work.')
			else if (t.includes('soil')) speak('Enter soil test values under the soil section.')
			else if (t.includes('price') || t.includes('market')) speak('Check latest commodity prices in the market section.')
			else speak('Sorry, I did not understand. Please try again.')
		}
		rec.onend = () => setListening(false)
		rec.onerror = () => setListening(false)
		recRef.current = rec
		rec.start()
		setListening(true)
	}

	const stopListen = () => { recRef.current?.stop?.(); setListening(false) }

	useEffect(()=>()=>stopListen(), [])

	return (
		<div className="grid">
			<section className="card">
				<h2>Voice Assistance</h2>
				<div className="row">
					<div className="col">
						<label>Language</label>
						<select value={lang} onChange={e=>setLang(e.target.value)}>
							{LANGS.map(l=> <option key={l.code} value={l.code}>{l.label}</option>)}
						</select>
					</div>
					<div className="col" style={{alignSelf:'end'}}>
						{!supportedSTT && <p className="warning">Speech recognition not supported in this browser.</p>}
						<button onClick={listening? stopListen : startListen}>{listening? 'Stop Listening' : 'Start Listening'}</button>
					</div>
				</div>
			</section>
			<section className="card">
				<h3>Try a prompt</h3>
				<div className="row">
					<button className="secondary" onClick={()=>speak('Weather looks favorable for irrigation today.')}>Speak Weather Tip</button>
					<button className="secondary" onClick={()=>speak('Apply balanced fertilizer as per soil recommendation.')}>Speak Fertilizer Tip</button>
				</div>
			</section>
			<section className="card">
				<h3>Transcript</h3>
				{log.length===0 && <p className="muted">No interactions yet.</p>}
				{log.map((l,i)=>(<div key={i} className="muted">{l}</div>))}
			</section>
		</div>
	)
}
