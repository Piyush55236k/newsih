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

function deleteCookieAllScopes(name: string) {
  const host = window.location.hostname
  const expires = 'Thu, 01 Jan 1970 00:00:00 GMT'
  // no domain
  document.cookie = `${name}=; expires=${expires}; path=/`
  // exact domain
  document.cookie = `${name}=; expires=${expires}; path=/; domain=${host}`
  // dot domain (if applicable)
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host) && host.includes('.')) {
    document.cookie = `${name}=; expires=${expires}; path=/; domain=.${host}`
  }
}

let _lastLang = ''
let _pending = false
let _queuedLang: string | null = null
export async function applyLanguage(lang: string) {
  if (!lang) lang = 'en'
  if (_pending) { _queuedLang = lang; return }
  if (lang === _lastLang) return
  _pending = true
  if (lang === 'en') {
    // Prevent endless reload loop: only reload once per session
    deleteCookieAllScopes('googtrans')
    _lastLang = 'en'
    _pending = false
    _queuedLang = null
    // Avoid page reload to preserve SPA navigation
    return
  }
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
      const next = _queuedLang; _queuedLang = null
      if (next && next !== _lastLang) return applyLanguage(next)
      return
    }
    await new Promise(r => setTimeout(r, 100))
  }
  // Fallback: set cookie only (avoid reload to preserve SPA state)
  setCookie('googtrans', `/en/${lang}`)
  setCookie('googtrans', `/en/${lang}`)
}
