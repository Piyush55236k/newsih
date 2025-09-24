import { useEffect, useMemo, useState } from 'react'
import { trackEvent } from '../lib/analytics'

type WX = {
	temperature: number
	windspeed: number
	precipitation: number
	time: string
}

export default function Weather() {
	const [coords, setCoords] = useState<{lat:number;lon:number}>({ lat: 28.6139, lon: 77.2090 }) // Delhi default
	const [wx, setWx] = useState<WX | null>(null)
	const [err, setErr] = useState<string | null>(null)
	const [region, setRegion] = useState<{ state?: string; district?: string; city?: string }>({})

	useEffect(() => {
		if (!navigator.geolocation) return
		navigator.geolocation.getCurrentPosition(
			pos => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
			() => {}
		)
	}, [])

	// Reverse geocode to get state (and district/city) for display
	useEffect(()=>{
		const run = async()=>{
			try{
				const base = (import.meta as any).env?.VITE_NOMINATIM_BASE || 'https://nominatim.openstreetmap.org'
				const url = `${base}/reverse?format=json&lat=${coords.lat}&lon=${coords.lon}&zoom=10&addressdetails=1`
				const j = await fetch(url, { headers: { 'Accept': 'application/json' } }).then(r=>r.json())
				const a = j?.address || {}
				setRegion({ state: a.state, district: a.state_district || a.county, city: a.city || a.town })
				if (!a?.state) {
					// Fallback: Open-Meteo reverse geocoding (admin1 ~ state)
					try {
						const u2 = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${coords.lat}&longitude=${coords.lon}&language=en&format=json` 
						const g = await fetch(u2).then(r=>r.json())
						const r0 = g?.results?.[0]
						if (r0?.admin1) setRegion(prev => ({ ...prev, state: r0.admin1 }))
					} catch {}
				}
			} catch {
				// Try fallback directly if Nominatim failed
				try {
					const u2 = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${coords.lat}&longitude=${coords.lon}&language=en&format=json`
					const g = await fetch(u2).then(r=>r.json())
					const r0 = g?.results?.[0]
					if (r0?.admin1) setRegion(prev => ({ ...prev, state: r0.admin1 }))
				} catch {}
			}
		}
		run()
	}, [coords.lat, coords.lon])

		useEffect(() => {
			const key = (import.meta as any).env?.VITE_OPENWEATHER_API_KEY
			const run = async () => {
				try {
					if (key) {
						const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${key}`
						const d = await fetch(url).then(r=>r.json())
						const data: WX = {
							temperature: d.main.temp,
							windspeed: d.wind.speed,
							precipitation: (d.rain?.['1h'] ?? 0) + (d.snow?.['1h'] ?? 0),
							time: new Date(d.dt*1000).toISOString()
						}
						setWx(data)
						trackEvent('weather_view', { ...data, ...coords, provider:'openweather' })
						return
					}
					const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,precipitation,wind_speed_10m&timezone=auto`
					const d = await fetch(url).then(r=>r.json())
					const c = d.current
					const data: WX = { temperature: c.temperature_2m, windspeed: c.wind_speed_10m, precipitation: c.precipitation, time: c.time }
					setWx(data)
					trackEvent('weather_view', { ...data, ...coords, provider:'open-meteo' })
				} catch (e:any) {
					setErr(String(e))
				}
			}
			run()
		}, [coords.lat, coords.lon])

	const alerts = useMemo(() => {
		if (!wx) return [] as string[]
		const a: string[] = []
		if (wx.precipitation > 0.5) a.push('Rain expected: delay irrigation and protect inputs')
		if (wx.windspeed > 30) a.push('High winds: avoid spraying; stake/support tender crops')
		if (wx.temperature < 5) a.push('Frost risk: use mulching/irrigation to buffer soil heat')
		if (wx.temperature > 38) a.push('Heat stress: irrigate early morning/late evening')
		return a
	}, [wx])

	return (
		<div className="grid">
			<section className="card">
				<h2>Weather & Alerts</h2>
				<p className="muted">{region.state ? `${region.state} • ` : ''}Lat {coords.lat.toFixed(3)}, Lon {coords.lon.toFixed(3)}</p>
				{err && <p className="warning">{err}</p>}
				{!wx && !err && <p className="muted">Loading weather…</p>}
				{wx && (
					<div className="row">
						<div className="col"><div className="tag">Temp</div><div style={{fontSize:28}}>{wx.temperature.toFixed(1)}°C</div></div>
						<div className="col"><div className="tag">Wind</div><div style={{fontSize:28}}>{wx.windspeed.toFixed(0)} km/h</div></div>
						<div className="col"><div className="tag">Precip</div><div style={{fontSize:28}}>{wx.precipitation.toFixed(1)} mm</div></div>
					</div>
				)}
			</section>
			<section className="card">
				<h3>Predictive Insights</h3>
				{alerts.length === 0 && <p className="ok">No critical alerts. Conditions look favorable.</p>}
				{alerts.length > 0 && (
					<ul>
						{alerts.map((a,i)=>(<li key={i}>{a}</li>))}
					</ul>
				)}
			</section>
		</div>
	)
}
