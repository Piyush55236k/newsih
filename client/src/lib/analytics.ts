export type AnalyticsEvent = {
	type: string
	data?: Record<string, unknown>
	ts: number
}

const KEY = 'agriassist_events'

export function trackEvent(type: string, data?: Record<string, unknown>) {
	const evt: AnalyticsEvent = { type, data, ts: Date.now() }
	try {
		const raw = localStorage.getItem(KEY)
		const arr: AnalyticsEvent[] = raw ? JSON.parse(raw) : []
		arr.push(evt)
		localStorage.setItem(KEY, JSON.stringify(arr).slice(0, 100000))
	} catch {
		// ignore
	}
	try {
		const ev = new CustomEvent('analytics:event', { detail: evt })
		window.dispatchEvent(ev)
	} catch {}
		try { if ((import.meta as any).env?.DEV) console.log('[analytics]', evt) } catch {}
}

export function getEvents(): AnalyticsEvent[] {
	try {
		const raw = localStorage.getItem(KEY)
		return raw ? JSON.parse(raw) : []
	} catch {
		return []
	}
}

export function clearEvents() {
	localStorage.removeItem(KEY)
}

// Lightweight verification engine: define simple rules that map quest steps to events
export type VerificationRule = {
	id: string
	when: (e: AnalyticsEvent) => boolean
}

// Built-in rules we can recognize today
export const DEFAULT_RULES: VerificationRule[] = [
	// Pest detection image analyzed
	{ id: 'pest:imageAnalyzed', when: (e) => e.type === 'pest_detect_ai' },
	// Pest image uploaded to Supabase
	{ id: 'pest:imageUploaded', when: (e) => e.type === 'pest_upload' },
	// Weather viewed (auto when page loads)
	{ id: 'weather:viewed', when: (e) => e.type === 'weather_view' },
	// Market prices fetched
	{ id: 'market:fetched', when: (e) => e.type === 'market_live_fetch' },
	// Feedback submitted
	{ id: 'feedback:submitted', when: (e) => e.type === 'feedback_submit' },
]

export function getVerifiedSet(rules: VerificationRule[] = DEFAULT_RULES): Set<string> {
	const events = getEvents()
	const ok = new Set<string>()
	for (const ev of events) {
		for (const r of rules) {
			try { if (r.when(ev)) ok.add(r.id) } catch {}
		}
	}
	return ok
}
