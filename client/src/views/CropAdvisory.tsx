import { useEffect, useMemo, useState } from 'react'
import { fetchCropAdvisory } from '../lib/advisory'
import { trackEvent } from '../lib/analytics'

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
  const [resp, setResp] = useState<any|null>(null)

  useEffect(()=>{
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setForm(s=>({ ...s, lat: String(pos.coords.latitude), lon: String(pos.coords.longitude) })),
      ()=>{}
    )
  }, [])

  const update = (k: keyof FormState, v: string)=> setForm(s => ({ ...s, [k]: v }))

  async function run(){
    setLoading(true); setError(null); setResp(null)
    try{
      const lat = Number(form.lat), lon = Number(form.lon)
      if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error('Please enter valid coordinates')
      trackEvent('advisory_request', { lat, lon, past_crop: form.past_crop })
      const data = await fetchCropAdvisory({ lat, lon, past_crop: form.past_crop || undefined, date: form.date || undefined })
      setResp(data)
      trackEvent('advisory_result', { ok: true, recs: (data as any)?.recommendations?.length || (data as any)?.crop_recommendations?.length || 0 })
    }catch(e:any){
      const msg = e?.message || String(e)
      setError(msg)
      trackEvent('advisory_result', { ok: false, error: msg })
    }finally{
      setLoading(false)
    }
  }

  const soil = useMemo(()=>{
    if (!resp) return null
    return resp.soil || resp.soil_analysis || resp.soil_data || null
  }, [resp])

  const weather = useMemo(()=>{
    if (!resp) return null
    return resp.weather || resp.weather_data || null
  }, [resp])

  const tips: string[] = useMemo(()=>{
    if (!resp) return []
    const t = resp.tips || resp.farming_tips || resp.recommendations_text
    if (!t) return []
    if (Array.isArray(t)) return t.map(String)
    return String(t).split(/\n|\.|;|,/).map((s:string)=>s.trim()).filter(Boolean)
  }, [resp])

  const recs: any[] = useMemo(()=>{
    if (!resp) return []
    const r = resp.recommendations || resp.crop_recommendations || []
    return Array.isArray(r) ? r : []
  }, [resp])

  return (
    <div className="fade-in">
      <div className="row" style={{gridTemplateColumns: '1fr'}}>
        <div className="card bg-gradient-green">
          <h2>🌾 Crop Advisory</h2>
          <p className="muted">Get crop recommendations based on your location, weather, and past crop.</p>
        </div>
      </div>

      <div className="row">
        <div className="card">
          <div className="row">
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
                {crops.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col">
              <label>Date (optional)</label>
              <input type="date" value={form.date} onChange={e=>update('date', e.target.value)} />
            </div>
          </div>
          <div style={{marginTop:12, display:'flex', gap:8, alignItems:'center'}}>
            <button onClick={run} disabled={loading}>{loading ? 'Fetching…' : 'Get Advisory'}</button>
            <button type="button" onClick={()=>{
              if (!navigator.geolocation) return
              navigator.geolocation.getCurrentPosition(
                pos => setForm(s=>({ ...s, lat: String(pos.coords.latitude), lon: String(pos.coords.longitude) })),
                ()=>{}
              )
            }}>Use my location</button>
            {error && <span className="warning">{error}</span>}
          </div>
        </div>
      </div>

      {loading && (
        <div className="row">
          <div className="card text-center">
            <div className="loading" style={{margin:'0 auto 12px'}} />
            <p className="muted">Contacting advisory service…</p>
          </div>
        </div>
      )}

      {resp && (
        <>
          {(soil || weather) && (
            <div className="row grid-2">
              {soil && (
                <div className="card">
                  <h3>🧪 Soil Analysis</h3>
                  {soil.soil_type && <p><b>Type:</b> {soil.soil_type}</p>}
                  {soil.composition && (
                    <p className="muted">Composition → Clay: {soil.composition.clay ?? '?'}%, Sand: {soil.composition.sand ?? '?'}%, Silt: {soil.composition.silt ?? '?'}%</p>
                  )}
                  {soil.sources && soil.sources.length>0 && (
                    <p className="muted">Sources: {soil.sources.join(', ')}</p>
                  )}
                </div>
              )}
              {weather && (
                <div className="card">
                  <h3>🌤️ Weather Summary</h3>
                  {typeof weather.temp !== 'undefined' && <p><b>Temperature:</b> {weather.temp} °C</p>}
                  {typeof weather.rainfall !== 'undefined' && <p><b>Rainfall:</b> {weather.rainfall} mm</p>}
                  {weather.season && <p><b>Season:</b> {Array.isArray(weather.season) ? weather.season.join(', ') : weather.season}</p>}
                  {weather.sources && weather.sources.length>0 && (
                    <p className="muted">Sources: {weather.sources.join(', ')}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="row">
            <div className="card">
              <h3>✅ Recommended Crops</h3>
              {recs.length === 0 && <p className="muted">No recommendations returned.</p>}
              {recs.length > 0 && (
                <div className="grid-3" style={{gap:16}}>
                  {recs.map((r, i)=> (
                    <div key={i} className="card card-interactive">
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h4 style={{margin:0}}>{r.crop || r.name || 'Crop'}</h4>
                        {typeof r.score === 'number' && (
                          <span className="tag success">Score: {Math.round(r.score*100)/100}</span>
                        )}
                      </div>
                      {r.season && <p className="muted">Season: {Array.isArray(r.season) ? r.season.join(', ') : r.season}</p>}
                      {r.soil_match && <p className="muted">Soil match: {String(r.soil_match)}</p>}
                      {typeof r.weather_match !== 'undefined' && <p className="muted">Weather match: {r.weather_match ? 'Yes' : 'No'}</p>}
                      {r.temp_range && <p className="muted">Temp range: {r.temp_range}</p>}
                      {r.rainfall_range && <p className="muted">Rainfall: {r.rainfall_range}</p>}
                      {r.rotation_benefit && <p className="muted">Rotation: {r.rotation_benefit}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {tips.length>0 && (
            <div className="row">
              <div className="card">
                <h3>🌟 Tips</h3>
                <ul>
                  {tips.map((t,i)=> <li key={i}>{t}</li>)}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
