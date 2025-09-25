import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile, saveProfile } from '../lib/profile'

type Lang = { code: string; label: string }

const LANGUAGES: Lang[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'ur', label: 'اردو (Urdu)' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml', label: 'മലയാളം (Malayalam)' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'or', label: 'ଓଡ଼ିଆ (Odia)' },
  { code: 'as', label: 'অসমীয়া (Assamese)' },
  { code: 'ne', label: 'नेपाली (Nepali)' },
  { code: 'sd', label: 'سنڌي (Sindhi)' },
  { code: 'si', label: 'සිංහල (Sinhala)' },
]

declare global {
  interface Window {
    googleTranslateElementInit?: () => void
    google?: any
  }
}

function loadGoogleTranslate() {
  return new Promise<void>((resolve) => {
    if ((window as any).google && (window as any).google.translate) {
      resolve()
      return
    }
    ;(window as any).googleTranslateElementInit = () => {
      try {
        // Mount a hidden widget so the combo exists for programmatic control
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: 'en', autoDisplay: false },
          'google_translate_element'
        )
      } catch {}
      resolve()
    }
    const s = document.createElement('script')
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
    s.async = true
    document.head.appendChild(s)
  })
}

function setCookie(name: string, value: string) {
  const domain = window.location.hostname
  const expires = new Date(Date.now() + 365*24*60*60*1000).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; domain=${domain}`
}

async function applyLanguage(lang: string) {
  // Try programmatic change via the widget's combo
  await loadGoogleTranslate()
  const tries = 10
  for (let i = 0; i < tries; i++) {
    const combo = document.querySelector<HTMLSelectElement>('.goog-te-combo')
    if (combo) {
      combo.value = lang
      combo.dispatchEvent(new Event('change'))
      return
    }
    await new Promise(r => setTimeout(r, 100))
  }
  // Fallback: set cookie and reload (last resort)
  setCookie('googtrans', `/en/${lang}`)
  setCookie('googtrans', `/en/${lang}`) // some setups require duplicate without domain
  window.location.reload()
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1|2|3>(1)
  const [visible, setVisible] = useState<boolean>(() => !localStorage.getItem('onboardingDone'))
  const [selectedLang, setSelectedLang] = useState<string>(() => localStorage.getItem('preferredLanguage') || 'en')
  const [name, setName] = useState<string>('')

  // If a preferred language exists, ensure the widget loads and apply it quickly
  useEffect(() => {
    const pref = localStorage.getItem('preferredLanguage')
    if (pref) {
      // Fire and forget; don't block UI
      void applyLanguage(pref)
    } else {
      void loadGoogleTranslate()
    }
  }, [])

  const langOptions = useMemo(() => LANGUAGES, [])

  if (!visible) {
    return (
      // Hidden container for Google widget (kept around for programmatic control)
      <div id="google_translate_element" style={{ position: 'fixed', bottom: 0, left: 0, opacity: 0, pointerEvents: 'none' }} />
    )
  }

  return (
    <>
      <div id="google_translate_element" style={{ position: 'fixed', bottom: 0, left: 0, opacity: 0, pointerEvents: 'none' }} />
      <div className="overlay-fullscreen">
        <div className="overlay-card">
          {step === 1 && (
            <>
              <h2 style={{marginTop:0}}>Choose your language</h2>
              <p className="muted" style={{marginTop:0}}>You can change it later.</p>
              <div className="lang-grid">
                {langOptions.map(l => (
                  <button
                    key={l.code}
                    className={selectedLang === l.code ? '' : 'secondary'}
                    onClick={() => setSelectedLang(l.code)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:16}}>
                <button onClick={async ()=>{ 
                  localStorage.setItem('preferredLanguage', selectedLang)
                  await applyLanguage(selectedLang)
                  setStep(2)
                }}>Next</button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 style={{marginTop:0}}>What should we call you?</h2>
              <input 
                placeholder="Your name"
                value={name}
                onChange={e => setName((e.target as HTMLInputElement).value)}
              />
              <div style={{display:'flex', justifyContent:'space-between', gap:8, marginTop:16}}>
                <button className="secondary" onClick={()=>setStep(1)}>Back</button>
                <button onClick={()=>{
                  const p = getProfile()
                  p.name = name?.trim() || p.name
                  saveProfile(p)
                  setStep(3)
                }}>Continue</button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h2 style={{marginTop:0}}>How would you like to continue?</h2>
              <p className="muted">You can explore as a guest or sign in to sync your progress.</p>
              <div className="row" style={{gap:8, marginTop:8}}>
                <button className="secondary" onClick={()=>{
                  localStorage.setItem('mode', 'guest')
                  localStorage.setItem('onboardingDone', '1')
                  setVisible(false)
                }}>Continue as Guest</button>
                <button onClick={()=>{
                  localStorage.setItem('mode', 'auth')
                  localStorage.setItem('onboardingDone', '1')
                  setVisible(false)
                  navigate('/profile')
                }}>Sign In</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
