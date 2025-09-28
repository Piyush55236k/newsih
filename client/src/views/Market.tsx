import { useEffect, useState } from 'react'
import { trackEvent } from '../lib/analytics'
import { fetchAgmarknetPrices, agmarkEnvStatus, type LivePrice } from '../lib/marketProviders'
import { motion } from 'framer-motion'

const COMMS = ['Wheat','Rice','Maize','Soybean','Cotton','Potato','Tomato']
const STATES = [
	'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
]

export default function Market(){
	const [selectedCommodity, setSelectedCommodity] = useState('Wheat')
	const [live, setLive] = useState<LivePrice[]>([])
	const [liveLoading, setLiveLoading] = useState(false)
	const [liveError, setLiveError] = useState<string|null>(null)
	const [addr, setAddr] = useState<{ state?: string; district?: string }>({})
	const [stateInput, setStateInput] = useState('')
	const [districtInput, setDistrictInput] = useState('')
	const [marketInput, setMarketInput] = useState('')
	const LS_KEY = 'market.filters.v1'
	const [envWarn, setEnvWarn] = useState<string[]>([])

	function fmt(n?: number) { return typeof n==='number' ? `₹ ${n}` : '—' }

	// Restore saved filters & check env
	useEffect(()=>{
		try {
			const raw = localStorage.getItem(LS_KEY)
			if(raw){
				const saved = JSON.parse(raw)
				if(saved.commodity) setSelectedCommodity(saved.commodity)
				if(saved.state) setStateInput(saved.state)
				if(saved.district) setDistrictInput(saved.district)
				if(saved.market) setMarketInput(saved.market)
			}
			const env = agmarkEnvStatus()
			if (env.warnings?.length) setEnvWarn(env.warnings)
		} catch {}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	},[])

	// Save filters to localStorage
	useEffect(()=>{
		try {
			const userSetFilters = Boolean(stateInput || districtInput || marketInput);
			localStorage.setItem(LS_KEY, JSON.stringify({
				commodity: selectedCommodity,
				state: stateInput,        // ✅ FIXED: save state as well
				district: districtInput,
				market: marketInput,
				userSetFilters
			}))
		} catch {}
	},[selectedCommodity, stateInput, districtInput, marketInput])

	// Detect user location
	useEffect(()=>{
		if (!navigator.geolocation) return
		navigator.geolocation.getCurrentPosition(async (pos)=>{
			try {
				const lat = pos.coords.latitude, lon = pos.coords.longitude
				const base = (import.meta as any).env?.VITE_NOMINATIM_BASE || 'https://nominatim.openstreetmap.org'
				const url = `${base}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`
				const j = await fetch(url, { headers: { 'Accept': 'application/json' } }).then(r=>r.json())
				const a = j?.address || {}
				setAddr({ state: a.state, district: a.state_district || a.county || a.city || a.town })
			} catch {}
		}, ()=>{})
	}, [])

	// Load live prices
	const loadLive = async () => {
		setLiveLoading(true); setLiveError(null)
		try {
			const env = agmarkEnvStatus()
			if (!env.ok) {
				throw new Error(`Missing env: ${env.missing.join(', ')}. Add them to .env and restart dev server.`)
			}
			const userSetFilters = Boolean(stateInput || districtInput || marketInput)
			const effectiveState = (userSetFilters ? stateInput : (stateInput || addr.state))?.trim() || undefined
			const effectiveDistrict = (userSetFilters ? districtInput : (districtInput || addr.district))?.trim() || undefined
			const effectiveMarket = marketInput?.trim() || undefined   // ✅ simplified
			const data = await fetchAgmarknetPrices({ 
				commodity: selectedCommodity || undefined, 
				state: effectiveState, 
				district: effectiveDistrict, 
				market: effectiveMarket, 
				limit: 50, 
				strict: userSetFilters 
			})
			setLive(data)
			trackEvent('market_live_fetch', { len: data.length, commodity: selectedCommodity, state: effectiveState, district: effectiveDistrict, market: effectiveMarket })
		} catch (e:any) {
			setLiveError(String(e?.message || e))
		} finally {
			setLiveLoading(false)
		}
	}

	return (
		<motion.div className="grid" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.4 }}>
			<motion.section className="card" initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
				<h2>Market Prices</h2>
				<div className="row" style={{gap:8, marginBottom:8}}>
					<div className="muted" style={{marginLeft:'auto'}}>{[addr.district, addr.state].filter(Boolean).join(', ') || 'Location unknown'}</div>
				</div>
				<div className="card">
					<div className="row">
						<div className="col">
							<label>Commodity</label>
							<select value={selectedCommodity} onChange={e=>setSelectedCommodity(e.target.value)}>
								{COMMS.map(c=>
									<option key={c} value={c}>{c}</option>)}
							</select>
						</div>
						<div className="col">
							<label>State (optional)</label>
							<input list="states" value={stateInput} onChange={e=>setStateInput(e.target.value)} placeholder={addr.state || 'e.g., Maharashtra'} />
							<datalist id="states">
								{STATES.map(s => <option key={s} value={s} />)}
							</datalist>
						</div>
						<div className="col">
							<label>District (optional)</label>
							<input value={districtInput} onChange={e=>setDistrictInput(e.target.value)} placeholder={addr.district || 'e.g., Pune'} />
						</div>
						<div className="col">
							<label>Market (optional)</label>
							<input value={marketInput} onChange={e=>setMarketInput(e.target.value)} placeholder="e.g., Lasalgaon" />
						</div>
						<div className="col" style={{alignSelf:'end'}}>
							<button onClick={loadLive}>Refresh</button>
							<button className="secondary" style={{marginLeft:8}} onClick={()=>{ setStateInput(''); setDistrictInput(''); setMarketInput(''); loadLive() }}>Use my location</button>
							<button className="secondary" style={{marginLeft:8}} onClick={()=>{ setStateInput(''); setDistrictInput(''); setMarketInput(''); }}>Clear filters</button>
						</div>
					</div>
					{envWarn.length>0 && (
						<div className="muted" style={{marginBottom:8}}>
							{envWarn.map((w,i)=>(<div key={i}>Warning: {w}</div>))}
						</div>
					)}
					{liveLoading && <p className="muted">Loading live prices…</p>}
					{liveError && <p className="warning">{liveError}</p>}
					{!liveLoading && !liveError && live.length===0 && <p className="muted">No live prices found. Check API key/resource, try fewer filters, or click "Clear filters".</p>}
					<div className="grid">
						{live.map((p,i)=> (
							<div className="card" key={i}>
								<div className="row">
									<div className="col"><div className="tag">{p.commodity}</div></div>
									<div className="col" style={{textAlign:'right'}}>{[p.market, p.district, p.state].filter(Boolean).join(', ')}</div>
								</div>
								<div style={{fontSize:20, marginTop:6}}>Min: {fmt(p.min)} • Max: {fmt(p.max)}</div>
							</div>
						))}
					</div>
				</div>
			</motion.section>
		</motion.div>
	)
}
