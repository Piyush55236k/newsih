export type AdvisoryRequest = {
  lat: number
  lon: number
  past_crop?: string
  date?: string // YYYY-MM-DD
}

export type SoilAnalysis = {
  soil_type?: string
  composition?: { clay?: number; sand?: number; silt?: number }
  sources?: string[]
}

export type WeatherData = {
  temp?: number
  rainfall?: number
  season?: string
  sources?: string[]
}

export type Recommendation = {
  crop: string
  season?: string | string[]
  score?: number
  soil_match?: string
  weather_match?: boolean
  temp_range?: string
  rainfall_range?: string
  soil_types?: string[]
  rotation_benefit?: string
}

export type AdvisoryResponse = {
  soil?: SoilAnalysis
  soil_data?: SoilAnalysis
  weather?: WeatherData
  weather_data?: WeatherData
  recommendations?: Recommendation[]
  error?: string
}

const API_BASE = 'https://crop-advisory-gneg.onrender.com'

export async function fetchCropAdvisory(body: AdvisoryRequest): Promise<AdvisoryResponse> {
  const base = API_BASE.replace(/\/$/, '')
  const attempts: Array<{ url: string; payload: any }> = [
    {
      url: `${base}/recommend`,
      payload: {
        lat: body.lat,
        lon: body.lon,
        past_crop: body.past_crop || undefined,
        date: body.date || undefined,
      }
    }
  ]

  let lastErr: any = null
  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attempt.payload)
      })
      if (res.ok) return res.json()
      lastErr = new Error(`Advisory API error ${res.status} at ${attempt.url}`)
    } catch (e:any) {
      lastErr = e
    }
  }
  throw new Error(lastErr?.message || 'Failed to reach advisory API')
}
