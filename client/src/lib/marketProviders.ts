export type LivePrice = {
  commodity: string
  market: string
  district?: string
  state?: string
  modal?: number
  min?: number
  max?: number
  date?: string
}

function getEnv(name: string) {
  return (import.meta as any).env?.[name]
}

export function agmarkEnvStatus() {
  const key = getEnv('VITE_AGMARK_API_KEY')?.trim()
  const resource = getEnv('VITE_AGMARK_RESOURCE_ID')?.trim()
  const base = getEnv('VITE_AGMARK_BASE_URL')?.trim()
  const missing: string[] = []
  if (!key) missing.push('VITE_AGMARK_API_KEY')
  if (!resource) missing.push('VITE_AGMARK_RESOURCE_ID')
  const warnings: string[] = []
  if (getEnv('VITE_AGMARK_BASE_URL') && getEnv('VITE_AGMARK_BASE_URL') !== base) warnings.push('VITE_AGMARK_BASE_URL has trailing spaces; please remove them')
  if (resource) {
    const looksUrl = /^https?:\/\//i.test(resource)
    const hasSlash = /\//.test(resource)
    const looksUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resource)
    if (looksUrl) warnings.push('VITE_AGMARK_RESOURCE_ID looks like a URL; set just the UUID, e.g., 9ef84268-…')
    else if (hasSlash && !looksUuid) warnings.push('VITE_AGMARK_RESOURCE_ID contains "/"; use only the UUID segment')
    else if (!looksUuid) warnings.push('VITE_AGMARK_RESOURCE_ID may be incorrect; it should be a UUID')
  }
  return { ok: missing.length === 0, missing, warnings }
}

function buildEndpoint(base: string, resource: string): string {
  // If resource is a full URL, use it directly
  if (/^https?:\/\//i.test(resource)) return resource.trim()
  const trimmedBase = base.trim().replace(/\/+$/,'')
  const trimmedRes = resource.trim().replace(/^\/+/, '')
  // Avoid duplicate 'resource' segment
  if (trimmedBase.endsWith('/resource') && trimmedRes.startsWith('resource/')) {
    return `${trimmedBase}/${trimmedRes.replace(/^resource\//,'')}`
  }
  return `${trimmedBase}/${trimmedRes}`
}

export async function fetchAgmarknetPrices(params: {
  commodity?: string
  state?: string
  district?: string
  market?: string
  limit?: number
  strict?: boolean
}): Promise<LivePrice[]> {
  const key = getEnv('VITE_AGMARK_API_KEY')?.trim()
  const resource = getEnv('VITE_AGMARK_RESOURCE_ID')?.trim()
  const base = (getEnv('VITE_AGMARK_BASE_URL') || 'https://api.data.gov.in/resource').trim()
  if (!key || !resource) return []

  const today = ymdLocal(new Date())
  const yday = ymdLocal(new Date(Date.now() - 24*60*60*1000))

  function titleCase(s?: string){
    if(!s) return s
    return s
      .toLowerCase()
      .split(/\s+/)
      .map(w=> w ? w[0].toUpperCase() + w.slice(1) : w)
      .join(' ')
  }

  const normalized = {
    commodity: titleCase(params.commodity),
    state: titleCase(params.state),
    district: titleCase(params.district),
    market: titleCase(params.market)
  }

  type Q = Partial<typeof normalized> & { arrival_date?: string }
  const tries: Q[] = []
  const strict = !!params.strict
  // Always try newest dates first
  tries.push({ ...normalized, arrival_date: today })
  tries.push({ ...normalized, arrival_date: yday })
  if (strict) {
    // Do not broaden beyond provided fields
    tries.push({ ...normalized })
  } else {
    // Broaden progressively
    tries.push({ ...normalized })
    tries.push({ commodity: normalized.commodity, state: normalized.state })
    tries.push({ commodity: normalized.commodity })
    tries.push({})
  }

  for (const t of tries) {
  const q = new URLSearchParams({ 'api-key': key, format: 'json', offset: '0', limit: String(params.limit ?? 50) })
  if (t.commodity) q.append('filters[commodity]', t.commodity)
  if (t.state) q.append('filters[state]', t.state)
  if (t.district) q.append('filters[district]', t.district)
  if (t.market) q.append('filters[market]', t.market)
  if (t.arrival_date) q.append('filters[arrival_date]', t.arrival_date)
  // Avoid API-side sorting to prevent fielddata errors; we'll sort client-side.

  const endpoint = buildEndpoint(base, resource)
  const url = `${endpoint}?${q.toString()}`
    const res = await fetch(url)
    if (!res.ok) {
      // 401/403 usually means invalid key or quota; surface a helpful error
      if (res.status === 401 || res.status === 403) {
        throw new Error(`Agmark API auth failed (${res.status}). Check VITE_AGMARK_API_KEY and resource.`)
      }
      continue
    }
    const json = await res.json()
    if (json?.error) {
      throw new Error(String(json.error?.message || 'Agmark API error'))
    }
    const records: any[] = json.records || []
    if (records.length > 0) {
      const items = records.map(r => ({
        commodity: r.commodity || r.variety || 'Unknown',
        market: r.market || r.market_center || r.mandi || 'Unknown',
        district: r.district || r.district_name,
        state: r.state || r.state_name,
        modal: num(r.modal_price ?? r.modal ?? r.price),
        min: num(r.min_price ?? r.min),
        max: num(r.max_price ?? r.max),
        date: r.arrival_date || r.date
      }))
      // Sort newest first by date string if parsable
      items.sort((a,b)=>{
        const ta = a.date ? Date.parse(a.date) : NaN
        const tb = b.date ? Date.parse(b.date) : NaN
        const aValid = !Number.isNaN(ta)
        const bValid = !Number.isNaN(tb)
        if (aValid && bValid) return tb - ta // newest first
        if (aValid && !bValid) return -1
        if (!aValid && bValid) return 1
        return 0
      })
      return items
    }
  }
  return []
}

function ymdLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}

function num(v: any): number | undefined {
  if (v === undefined || v === null) return undefined
  const n = Number(String(v).replace(/[,]/g, ''))
  return Number.isFinite(n) ? n : undefined
}