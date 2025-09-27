import { useEffect, useMemo, useRef, useState } from 'react'
import { trackEvent } from '../lib/analytics'

const LANGS = [
  { code: 'en-US', label: 'English' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'bn-IN', label: 'Bengali' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'te-IN', label: 'Telugu' },
]

const detectLangFromText = (s: string): string => {
  if (/[ऀ-ॿ]/u.test(s)) return 'hi-IN'
  if (/[ঀ-৿]/u.test(s)) return 'bn-IN'
  if (/[஀-௿]/u.test(s)) return 'ta-IN'
  if (/[ఀ-౿]/u.test(s)) return 'te-IN'
  return 'en-US'
}

const pickVoiceForLang = (langCode: string): SpeechSynthesisVoice | undefined => {
  const vs = window.speechSynthesis.getVoices()
  return (
    vs.find(v => v.lang === langCode) ||
    vs.find(v => v.lang?.toLowerCase() === langCode.toLowerCase()) ||
    vs.find(v => v.lang?.startsWith(langCode.split('-')[0]))
  )
}

const askAI = async (prompt: string, langHint?: string) => {
  try {
    const r = await fetch('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, lang: langHint }),
    })
    const data = await r.json()
    return data.text || 'Sorry, I could not generate a response.'
  } catch {
    return 'Network error talking to AI service.'
  }
}

export default function VoiceAssist() {
  const [lang, setLang] = useState('en-US')
  const [listening, setListening] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const recRef = useRef<any>(null)

  useEffect(() => {
    const loadVoices = () => void window.speechSynthesis.getVoices()
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  const speak = (text: string, langOverride?: string) => {
    const chosenLang = langOverride || lang
    const ut = new SpeechSynthesisUtterance(text)
    ut.lang = chosenLang
    const voice = pickVoiceForLang(chosenLang)
    if (voice) ut.voice = voice
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(ut)
    trackEvent('tts', { lang: chosenLang, text })
  }

  const supportedSTT = useMemo(() => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  }, [])

  const startListen = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = lang
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.continuous = false

    rec.onresult = async (ev: any) => {
      const result = ev.results?.[0]?.[0]
      const text: string = result?.transcript ?? ''
      const confidence: number = result?.confidence ?? 1
      if (!text.trim()) return
      setLog(l => [...l, 'User: ' + text])
      trackEvent('stt', { lang: rec.lang, text, confidence })
      if (confidence < 0.4) {
        const msg = rec.lang.startsWith('hi') ? 'कृपया दोहराएँ।' :
                    rec.lang.startsWith('bn') ? 'দয়া করে আবার বলুন।' :
                    rec.lang.startsWith('ta') ? 'தயவு செய்து மீண்டும் சொல்லவும்.' :
                    rec.lang.startsWith('te') ? 'దయచేసి మళ్లీ చెప్పండి.' :
                    'Sorry, please repeat.'
        setLog(l => [...l, 'Assistant: ' + msg])
        speak(msg, rec.lang)
        return
      }
      const detectedLang = detectLangFromText(text)
      const reply = await askAI(text, detectedLang)
      setLog(l => [...l, 'Assistant: ' + reply])
      speak(reply, detectedLang)
    }

    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  const stopListen = () => { recRef.current?.stop?.(); setListening(false) }

  useEffect(() => () => stopListen(), [])

  return (
    <div className="grid">
      <section className="card">
        <h2>Voice Assistance</h2>
        <div className="row">
          <div className="col">
            <label>Language (for recognition)</label>
            <select value={lang} onChange={e => setLang(e.target.value)}>
              {LANGS.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <p className="muted" style={{marginTop: 6}}>
              Replies auto-match the user’s spoken language (based on transcript).
            </p>
          </div>
          <div className="col" style={{ alignSelf: 'end' }}>
            {!supportedSTT && (
              <p className="warning">Speech recognition not supported in this browser.</p>
            )}
            <button onClick={listening ? stopListen : startListen}>
              {listening ? 'Stop Listening' : 'Start Listening'}
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Try a prompt</h3>
        <div className="row">
          <button
            className="secondary"
            onClick={() => speak('Weather looks favorable for irrigation today.', 'en-US')}
          >
            Speak Weather Tip
          </button>
          <button
            className="secondary"
            onClick={() => speak('Apply balanced fertilizer as per soil recommendation.', 'en-US')}
          >
            Speak Fertilizer Tip
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Transcript</h3>
        {log.length === 0 && <p className="muted">No interactions yet.</p>}
        {log.map((l, i) => (
          <div key={i} className="muted">{l}</div>
        ))}
      </section>
    </div>
  )
}
