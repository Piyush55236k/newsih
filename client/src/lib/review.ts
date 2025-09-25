export type EvidenceStatus = 'pending' | 'approved' | 'rejected'

function base() {
  const env: any = (import.meta as any).env || {}
  return (env.VITE_REVIEW_API_BASE as string) || ''
}

export async function submitEvidence(args: { profileId: string; questId: string; notes?: string; imageData?: string; imageUrl?: string }) {
  const url = `${base()}/api/review/evidence/submit`
  const r = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(args) })
  if (!r.ok) {
    const ct = r.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      throw new Error((await r.json().catch(()=>null))?.error || `Submit failed (${r.status})`)
    } else {
      const txt = await r.text().catch(()=> '')
      throw new Error(txt || `Submit failed (${r.status})`)
    }
  }
  return r.json()
}

export async function getEvidenceStatus(profileId: string) {
  const url = `${base()}/api/review/evidence/status?profileId=${encodeURIComponent(profileId)}`
  const r = await fetch(url)
  if (!r.ok) {
    const ct = r.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      throw new Error((await r.json().catch(()=>null))?.error || `Status failed (${r.status})`)
    } else {
      const txt = await r.text().catch(()=> '')
      throw new Error(txt || `Status failed (${r.status})`)
    }
  }
  return r.json() as Promise<{ ok: boolean; byQuest: Record<string, { status: EvidenceStatus; id: string; imageUrl?: string; notes?: string }> }>
}

export async function adminList(params: { status?: EvidenceStatus | 'all' } = {}) {
  const url = `${base()}/api/review/admin/evidence${params.status ? `?status=${params.status}` : ''}`
  const r = await fetch(url, { headers: { 'X-Admin-Key': (import.meta as any).env?.VITE_ADMIN_KEY || '' } })
  if (!r.ok) {
    const ct = r.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      throw new Error((await r.json().catch(()=>null))?.error || `List failed (${r.status})`)
    } else {
      const txt = await r.text().catch(()=> '')
      throw new Error(txt || `List failed (${r.status})`)
    }
  }
  return r.json()
}

export async function adminDecision(args: { id: string; decision: EvidenceStatus; reward?: number }) {
  const url = `${base()}/api/review/admin/evidence/decision`
  const r = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json', 'X-Admin-Key': (import.meta as any).env?.VITE_ADMIN_KEY || '' }, body: JSON.stringify(args) })
  if (!r.ok) {
    const ct = r.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      throw new Error((await r.json().catch(()=>null))?.error || `Decision failed (${r.status})`)
    } else {
      const txt = await r.text().catch(()=> '')
      throw new Error(txt || `Decision failed (${r.status})`)
    }
  }
  return r.json()
}
