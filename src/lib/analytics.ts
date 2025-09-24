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
