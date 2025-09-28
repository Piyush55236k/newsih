import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackEvent } from '../lib/analytics';

type WX = {
	temperature: number;
	windspeed: number;
	precipitation: number;
	time: string;
};

export default function Weather() {
	const [coords, setCoords] = useState<{lat:number;lon:number}>({ lat: 28.6139, lon: 77.2090 }); // Delhi default
	const [wx, setWx] = useState<WX | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [region, setRegion] = useState<{ state?: string; district?: string; city?: string }>({});

	useEffect(() => {
		if (!navigator.geolocation) return;
		navigator.geolocation.getCurrentPosition(
			pos => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
			() => {}
		);
	}, []);

	useEffect(()=>{
		const run = async()=>{
			try{
				const base = (import.meta as any).env?.VITE_NOMINATIM_BASE || 'https://nominatim.openstreetmap.org';
				const url = `${base}/reverse?format=json&lat=${coords.lat}&lon=${coords.lon}&zoom=10&addressdetails=1`;
				const j = await fetch(url, { headers: { 'Accept': 'application/json' } }).then(r=>r.json());
				const a = j?.address || {};
				setRegion({ state: a.state, district: a.state_district || a.county, city: a.city || a.town });
			} catch (e) {}
		};
		run();
	}, [coords.lat, coords.lon]);

	useEffect(() => {
		const key = (import.meta as any).env?.VITE_OPENWEATHER_API_KEY;
		const run = async () => {
			try {
				if (key) {
					const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${key}`;
					const d = await fetch(url).then(r=>r.json());
					const data: WX = {
						temperature: d.main.temp,
						windspeed: d.wind.speed,
						precipitation: (d.rain?.['1h'] ?? 0) + (d.snow?.['1h'] ?? 0),
						time: new Date(d.dt*1000).toISOString()
					};
					setWx(data);
					trackEvent('weather_view', { ...data, ...coords, provider:'openweather' });
					return;
				}
				const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,precipitation,wind_speed_10m&timezone=auto`;
				const d = await fetch(url).then(r=>r.json());
				const c = d.current;
				const data: WX = { temperature: c.temperature_2m, windspeed: c.wind_speed_10m, precipitation: c.precipitation, time: c.time };
				setWx(data);
				trackEvent('weather_view', { ...data, ...coords, provider:'open-meteo' });
			} catch (e:any) {
				setErr(String(e));
			}
		};
		run();
	}, [coords.lat, coords.lon]);

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
		<motion.div 
			className="weather-container"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6 }}
		>
			<motion.div 
				className="card weather-header bg-gradient-blue"
				initial={{ scale: 0.95, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ duration: 0.5, delay: 0.1 }}
			>
				<div className="weather-title">
					<h2>🌤️ Weather & Agricultural Alerts</h2>
					<p className="location-info">
						{region.state ? `${region.state} • ` : ''}
						📍 Lat {coords.lat.toFixed(3)}, Lon {coords.lon.toFixed(3)}
					</p>
				</div>
			</motion.div>

			<AnimatePresence>
				{err && (
					<motion.div 
						className="card error-card"
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						transition={{ duration: 0.3 }}
					>
						<div className="error-content">
							<span className="error-icon">⚠️</span>
							<div className="error-text">
								<h3>Weather Error</h3>
								<p>{err}</p>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{!wx && !err && (
					<motion.div 
						className="card loading-card"
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.9 }}
						transition={{ duration: 0.4 }}
					>
						<div className="loading-content">
							<div className="loading-spinner-large"></div>
							<p className="loading-text">Loading weather data...</p>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{wx && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.5 }}
					>
						<div className="weather-metrics grid-3">
							<motion.div 
								className="card metric-card temperature-card fade-in-delay-1"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5, delay: 0.2 }}
								whileHover={{ scale: 1.05, rotateY: 5 }}
							>
								<div className="metric-icon">🌡️</div>
								<div className="metric-label">Temperature</div>
								<div className="metric-value temperature-value">
									{wx.temperature.toFixed(1)}°C
								</div>
								<div className="metric-description">Current temperature</div>
							</motion.div>

							<motion.div 
								className="card metric-card wind-card fade-in-delay-2"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5, delay: 0.3 }}
								whileHover={{ scale: 1.05, rotateY: 5 }}
							>
								<div className="metric-icon">💨</div>
								<div className="metric-label">Wind Speed</div>
								<div className="metric-value wind-value">
									{wx.windspeed.toFixed(0)} km/h
								</div>
								<div className="metric-description">Wind conditions</div>
							</motion.div>

							<motion.div 
								className="card metric-card precipitation-card fade-in-delay-3"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5, delay: 0.4 }}
								whileHover={{ scale: 1.05, rotateY: 5 }}
							>
								<div className="metric-icon">🌧️</div>
								<div className="metric-label">Precipitation</div>
								<div className="metric-value precipitation-value">
									{wx.precipitation.toFixed(1)} mm
								</div>
								<div className="metric-description">Current rainfall</div>
							</motion.div>
						</div>

						<motion.div 
							className="card alerts-card"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.5 }}
						>
							<h3>🚨 Agricultural Alerts & Recommendations</h3>
							<AnimatePresence>
								{alerts.length === 0 ? (
									<motion.div 
										className="no-alerts"
										initial={{ opacity: 0, scale: 0.9 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.9 }}
										transition={{ duration: 0.4 }}
									>
										<div className="success-icon-large">✅</div>
										<h4>No Critical Alerts</h4>
										<p>Weather conditions look favorable for farming activities</p>
									</motion.div>
								) : (
									<motion.div 
										className="alerts-list"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.4 }}
									>
										{alerts.map((alert, index) => (
											<motion.div 
												key={index}
												className="alert-item"
												initial={{ opacity: 0, x: -20 }}
												animate={{ opacity: 1, x: 0 }}
												transition={{ duration: 0.3, delay: index * 0.1 }}
												whileHover={{ scale: 1.02, x: 8 }}
											>
												<span className="alert-icon">⚠️</span>
												<div className="alert-content">
													<h4>Weather Alert</h4>
													<p>{alert}</p>
												</div>
											</motion.div>
										))}
									</motion.div>
								)}
							</AnimatePresence>
						</motion.div>

						<motion.div 
							className="card summary-card"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.6 }}
						>
							<h3>📊 Weather Summary</h3>
							<div className="summary-grid grid-2">
								<div className="summary-item temperature-summary">
									<h4>🌡️ Temperature Status</h4>
									<p className="status-text">
										{wx.temperature < 5 ? '❄️ Cold - Risk of frost damage' :
										 wx.temperature > 38 ? '🔥 Very Hot - Heat stress risk' :
										 wx.temperature > 30 ? '☀️ Hot - Monitor irrigation' :
										 wx.temperature > 15 ? '🌤️ Optimal - Good growing conditions' :
										 '🌡️ Cool - Slow growth expected'}
									</p>
								</div>

								<div className="summary-item wind-summary">
									<h4>💨 Wind Conditions</h4>
									<p className="status-text">
										{wx.windspeed > 30 ? '🌪️ Strong - Avoid spraying' :
										 wx.windspeed > 15 ? '💨 Moderate - Caution with spraying' :
										 '🍃 Calm - Good for all activities'}
									</p>
								</div>
							</div>
							
							<div className="last-updated">
								<span className="update-icon">ℹ️</span>
								Last updated: {new Date(wx.time).toLocaleString()}
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	)
}
