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
		<div className="fade-in">
			<div className="row" style={{gridTemplateColumns: '1fr'}}>
				<div className="card bg-gradient-blue">
					<h2>🌤️ Weather & Agricultural Alerts</h2>
					<p className="muted">
						{region.state ? `${region.state} • ` : ''}
						📍 Lat {coords.lat.toFixed(3)}, Lon {coords.lon.toFixed(3)}
					</p>
				</div>
			</div>

			{err && (
				<div className="row">
					<div className="card">
						<div style={{
							padding: '16px',
							backgroundColor: 'var(--red-100)',
							border: '1px solid var(--red-200)',
							borderRadius: 'var(--radius-md)',
						}}>
							<p style={{color: 'var(--red-700)', margin: '0'}}>⚠️ Weather Error: {err}</p>
						</div>
					</div>
				</div>
			)}

			{!wx && !err && (
				<div className="row">
					<div className="card text-center">
						<div className="loading" style={{margin: '0 auto 16px'}}></div>
						<p className="muted">Loading weather data...</p>
					</div>
				</div>
			)}

			{wx && (
				<>
					<div className="row grid-3">
						<div className="card card-interactive fade-in-delay-1" style={{textAlign: 'center'}}>
							<div style={{fontSize: '48px', marginBottom: '12px'}}>🌡️</div>
							<div className="tag info" style={{marginBottom: '12px'}}>Temperature</div>
							<div style={{
								fontSize: '36px', 
								fontWeight: '700', 
								color: 'var(--green-600)',
								marginBottom: '8px'
							}}>
								{wx.temperature.toFixed(1)}°C
							</div>
							<p className="muted">Current temperature</p>
						</div>

						<div className="card card-interactive fade-in-delay-2" style={{textAlign: 'center'}}>
							<div style={{fontSize: '48px', marginBottom: '12px'}}>💨</div>
							<div className="tag info" style={{marginBottom: '12px'}}>Wind Speed</div>
							<div style={{
								fontSize: '36px', 
								fontWeight: '700', 
								color: 'var(--blue-500)',
								marginBottom: '8px'
							}}>
								{wx.windspeed.toFixed(0)} km/h
							</div>
							<p className="muted">Wind conditions</p>
						</div>

						<div className="card card-interactive fade-in-delay-3" style={{textAlign: 'center'}}>
							<div style={{fontSize: '48px', marginBottom: '12px'}}>🌧️</div>
							<div className="tag info" style={{marginBottom: '12px'}}>Precipitation</div>
							<div style={{
								fontSize: '36px', 
								fontWeight: '700', 
								color: 'var(--blue-600)',
								marginBottom: '8px'
							}}>
								{wx.precipitation.toFixed(1)} mm
							</div>
							<p className="muted">Current rainfall</p>
						</div>
					</div>

					<div className="row">
						<div className="card fade-in-delay-1">
							<h3>🚨 Agricultural Alerts & Recommendations</h3>
							{alerts.length === 0 && (
								<div style={{
									padding: '20px',
									backgroundColor: 'var(--green-100)',
									border: '1px solid var(--green-200)',
									borderRadius: 'var(--radius-md)',
									textAlign: 'center'
								}}>
									<div style={{fontSize: '48px', marginBottom: '12px'}}>✅</div>
									<p style={{color: 'var(--green-700)', fontWeight: '600', margin: '0'}}>
										No critical alerts detected
									</p>
									<p style={{color: 'var(--green-600)', margin: '8px 0 0'}}>
										Weather conditions look favorable for farming activities
									</p>
								</div>
							)}
							{alerts.length > 0 && (
								<div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
									{alerts.map((alert, index) => (
										<div key={index} style={{
											padding: '16px',
											backgroundColor: 'var(--yellow-100)',
											border: '1px solid var(--yellow-200)',
											borderRadius: 'var(--radius-md)',
											display: 'flex',
											alignItems: 'flex-start',
											gap: '12px'
										}}>
											<span style={{fontSize: '24px'}}>⚠️</span>
											<div>
												<p style={{
													color: 'var(--yellow-700)',
													fontWeight: '600',
													margin: '0 0 4px 0'
												}}>
													Weather Alert
												</p>
												<p style={{
													color: 'var(--yellow-600)',
													margin: '0'
												}}>
													{alert}
												</p>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					<div className="row">
						<div className="card fade-in-delay-2">
							<h3>📊 Weather Summary</h3>
							<div className="grid-2" style={{gap: '16px'}}>
								<div style={{
									padding: '16px',
									backgroundColor: 'var(--bg-accent)',
									borderRadius: 'var(--radius-md)',
									border: '1px solid var(--panel-border)'
								}}>
									<h4 style={{color: 'var(--green-600)', marginBottom: '8px'}}>
										🌡️ Temperature Status
									</h4>
									<p className="muted">
										{wx.temperature < 5 ? '❄️ Cold - Risk of frost damage' :
										 wx.temperature > 38 ? '🔥 Very Hot - Heat stress risk' :
										 wx.temperature > 30 ? '☀️ Hot - Monitor irrigation' :
										 wx.temperature > 15 ? '🌤️ Optimal - Good growing conditions' :
										 '🌡️ Cool - Slow growth expected'}
									</p>
								</div>

								<div style={{
									padding: '16px',
									backgroundColor: 'var(--bg-accent)',
									borderRadius: 'var(--radius-md)',
									border: '1px solid var(--panel-border)'
								}}>
									<h4 style={{color: 'var(--blue-600)', marginBottom: '8px'}}>
										💨 Wind Conditions
									</h4>
									<p className="muted">
										{wx.windspeed > 30 ? '🌪️ Strong - Avoid spraying' :
										 wx.windspeed > 15 ? '💨 Moderate - Caution with spraying' :
										 '🍃 Calm - Good for all activities'}
									</p>
								</div>
							</div>
							
							<div style={{
								marginTop: '16px',
								padding: '12px',
								backgroundColor: 'var(--blue-50)',
								borderRadius: 'var(--radius-sm)',
								border: '1px solid var(--blue-200)'
							}}>
								<p style={{
									fontSize: '14px',
									color: 'var(--blue-700)',
									margin: '0',
									display: 'flex',
									alignItems: 'center',
									gap: '8px'
								}}>
									ℹ️ Last updated: {new Date(wx.time).toLocaleString()}
								</p>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	)
}
