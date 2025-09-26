import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile, saveProfile } from '../lib/profile'
import { LANGUAGES, applyLanguage, loadGoogleTranslate } from './i18n'

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
      // Always apply the language, even for English, to ensure onboarding logic is consistent
      void applyLanguage(pref)
    } else {
      void loadGoogleTranslate()
    }
  }, [])

  // Lock scroll while overlay is visible
  useEffect(() => {
    if (visible) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [visible])

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
      <div className="overlay-fullscreen" role="dialog" aria-modal="true">
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
                  ;(document.activeElement as HTMLElement)?.blur()
                  try { await applyLanguage(selectedLang) } catch {}
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
