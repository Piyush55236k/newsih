import { useEffect, useMemo, useState } from 'react'
import { fetchCropAdvisory } from '../lib/advisory'
import { trackEvent } from '../lib/analytics'
import { motion, AnimatePresence } from 'framer-motion'

type FormState = {
  lat: string
  lon: string
  past_crop: string
  date: string
}

const crops = [
  'Wheat','Rice','Paddy','Maize','Corn','Cotton','Mustard','Soybean','Sugarcane','Pulses','Groundnut','Millet','Barley','Sorghum','Potato','Onion','Tomato'
]

export default function CropAdvisory(){
  const [form, setForm] = useState<FormState>(()=>({
    lat: '28.6139', // Delhi default
    lon: '77.2090',
    past_crop: 'Wheat',
    date: new Date().toISOString().slice(0,10)
  }))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [resp, setResp] = useState<any>(null)
  const [soil, setSoil] = useState<any>(null)
  const [weather, setWeather] = useState<any>(null)
  const [recs, setRecs] = useState<any[]>([])
  const [tips, setTips] = useState<string[]>([])

  function update(field: keyof FormState, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function run() {
    setLoading(true)
    setError(null)
    setResp(null)
    setSoil(null)
    setWeather(null)
    setRecs([])
    setTips([])
    try {
      const result = await fetchCropAdvisory({
        ...form,
        lat: Number(form.lat),
        lon: Number(form.lon)
      })
      setResp(result)
      setSoil(result?.soil || null)
      setWeather(result?.weather || null)
      setRecs(result?.recommendations || [])
  setTips([])
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch advisory')
    } finally {
      setLoading(false)
    }
  }


  return (
    <motion.div className="fade-in" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.4 }}>
      {/* Header Card */}
      <motion.div className="row" style={{gridTemplateColumns: '1fr'}} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <motion.div className="card bg-gradient-green" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          <h2>🌾 Crop Advisory</h2>
          <p className="muted">Get crop recommendations based on your location, weather, and past crop.</p>
        </motion.div>
      </motion.div>

      {/* Form Card */}
      <motion.div className="row" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <motion.div className="card" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          <motion.div className="row" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="col">
              <label>Latitude</label>
              <input value={form.lat} onChange={e=>update('lat', e.target.value)} placeholder="28.6139" />
            </div>
            <div className="col">
              <label>Longitude</label>
              <input value={form.lon} onChange={e=>update('lon', e.target.value)} placeholder="77.2090" />
            </div>
            <div className="col">
              <label>Previous Crop</label>
              <select value={form.past_crop} onChange={e=>update('past_crop', e.target.value)}>
                {crops.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col">
              <label>Date (optional)</label>
              <input type="date" value={form.date} onChange={e=>update('date', e.target.value)} />
            </div>
          </motion.div>
          <motion.div style={{marginTop:12, display:'flex', gap:8, alignItems:'center'}} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} onClick={run} disabled={loading}>{loading ? 'Fetching…' : 'Get Advisory'}</motion.button>
            <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} onClick={()=>{
              if (!navigator.geolocation) return
              navigator.geolocation.getCurrentPosition(
                pos => setForm(s=>({ ...s, lat: String(pos.coords.latitude), lon: String(pos.coords.longitude) })),
                ()=>{}
              )
            }}>Use my location</motion.button>
            {error ? (<motion.span className="warning" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{error}</motion.span>) : null}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Loading State */}
      <AnimatePresence>
        {loading ? (
          <motion.div className="row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <motion.div className="card text-center" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.4 }}>
              <motion.div className="loading" style={{margin:'0 auto 12px'}} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} />
              <p className="muted">Contacting advisory service…</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Results Section */}
      <AnimatePresence>
        {resp ? (
          <>
            {(soil || weather) ? (
              <motion.div className="row grid-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.5 }}>
                {soil ? (
                  <motion.div className="card" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
                    <h3>🧪 Soil Analysis</h3>
                    {soil.soil_type ? (<p><b>Type:</b> {soil.soil_type}</p>) : null}
                    {soil.composition ? (
                      <p className="muted">Composition → Clay: {soil.composition.clay ?? '?'}%, Sand: {soil.composition.sand ?? '?'}%, Silt: {soil.composition.silt ?? '?'}%</p>
                    ) : null}
                    {soil.sources && soil.sources.length>0 ? (
                      <p className="muted">Sources: {soil.sources.join(', ')}</p>
                    ) : null}
                  </motion.div>
                ) : null}
                {weather ? (
                  <motion.div className="card" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
                    <h3>🌤️ Weather Summary</h3>
                    {typeof weather.temp !== 'undefined' ? (<p><b>Temperature:</b> {weather.temp} °C</p>) : null}
                    {typeof weather.rainfall !== 'undefined' ? (<p><b>Rainfall:</b> {weather.rainfall} mm</p>) : null}
                    {weather.season ? (<p><b>Season:</b> {Array.isArray(weather.season) ? weather.season.join(', ') : weather.season}</p>) : null}
                    {weather.sources && weather.sources.length>0 ? (
                      <p className="muted">Sources: {weather.sources.join(', ')}</p>
                    ) : null}
                  </motion.div>
                ) : null}
              </motion.div>
            ) : null}

            <motion.div className="row" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.5 }}>
              <motion.div className="card" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
                <h3>✅ Recommended Crops</h3>
                {recs.length === 0 ? (<p className="muted">No recommendations returned.</p>) : null}
                {recs.length > 0 ? (
                  <motion.div className="grid-3" style={{gap:16}} initial="hidden" animate="visible" variants={{hidden:{},visible:{transition:{staggerChildren:0.1}}}}>
                    {recs.map((r: any, i: number)=> (
                      <motion.div key={i} className="card card-interactive" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }} whileHover={{ scale: 1.03, boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <h4 style={{margin:0}}>{r.crop || r.name || 'Crop'}</h4>
                          {typeof r.score === 'number' ? (<span className="tag success">Score: {Math.round(r.score*100)/100}</span>) : null}
                        </div>
                        {r.season ? (<p className="muted">Season: {Array.isArray(r.season) ? r.season.join(', ') : r.season}</p>) : null}
                        {r.soil_match ? (<p className="muted">Soil match: {String(r.soil_match)}</p>) : null}
                        {typeof r.weather_match !== 'undefined' ? (<p className="muted">Weather match: {r.weather_match ? 'Yes' : 'No'}</p>) : null}
                        {r.temp_range ? (<p className="muted">Temp range: {r.temp_range}</p>) : null}
                        {r.rainfall_range ? (<p className="muted">Rainfall: {r.rainfall_range}</p>) : null}
                        {r.rotation_benefit ? (<p className="muted">Rotation: {r.rotation_benefit}</p>) : null}
                      </motion.div>
                    ))}
                  </motion.div>
                ) : null}
              </motion.div>
            </motion.div>

            {tips.length>0 ? (
              <motion.div className="row" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.5 }}>
                <motion.div className="card" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
                  <h3>🌟 Tips</h3>
                  <ul>
                    {tips.map((t: string, i: number)=> (<motion.li key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>{t}</motion.li>))}
                  </ul>
                </motion.div>
              </motion.div>
            ) : null}
          </>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}
