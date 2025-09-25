export type Lang = { code: string; label: string }

export const LANGUAGES: Lang[] = [
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

let _gtPromise: Promise<void> | null = null
export function loadGoogleTranslate() {
  if ((window as any).google && (window as any).google.translate) {
    return Promise.resolve()
  }
  if (_gtPromise) return _gtPromise
  _gtPromise = new Promise<void>((resolve) => {
    (window as any).googleTranslateElementInit = () => {
      try {
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: 'en', autoDisplay: false },
          'google_translate_element'
        )
      } catch {}
      resolve()
    }
    const existing = document.querySelector('script[src*="translate_a/element.js"]')
    if (!existing) {
      const s = document.createElement('script')
      s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      s.async = true
      document.head.appendChild(s)
    }
  })
  return _gtPromise
}

function setCookie(name: string, value: string) {
  const domain = window.location.hostname
  const expires = new Date(Date.now() + 365*24*60*60*1000).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; domain=${domain}`
}

let _lastLang = ''
let _pending = false
export async function applyLanguage(lang: string) {
  if (!lang || lang === 'en') { _lastLang = 'en'; return }
  if (_pending) return
  _pending = true
  // Try programmatic change via the widget's combo
  await loadGoogleTranslate()
  const tries = 50
  for (let i = 0; i < tries; i++) {
    const combo = document.querySelector<HTMLSelectElement>('.goog-te-combo')
    if (combo) {
      combo.value = lang
      combo.dispatchEvent(new Event('change'))
      _lastLang = lang
      _pending = false
      return
    }
    await new Promise(r => setTimeout(r, 100))
  }
  // Fallback: set cookie and reload (last resort)
  setCookie('googtrans', `/en/${lang}`)
  setCookie('googtrans', `/en/${lang}`)
  window.location.reload()
}
