import { getSupabase } from './supabase'

export type Profile = {
  id: string
  name?: string
  points: number
  completedQuests: string[]
  lastSyncAt?: number
  pending?: Array<{ type: string; data?: Record<string, unknown>; ts: number }>
}

const KEY = 'agri_profile'

function genId(): string {
  try {
    // Prefer crypto UUID if available
    // @ts-ignore
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  } catch {}
  return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      // basic shape fill
      return {
        id: p.id || genId(),
        name: p.name,
        points: typeof p.points === 'number' ? p.points : 0,
        completedQuests: Array.isArray(p.completedQuests) ? p.completedQuests : [],
        lastSyncAt: p.lastSyncAt,
        pending: Array.isArray(p.pending) ? p.pending : []
      }
    }
  } catch {}
  const fresh: Profile = { id: genId(), points: 0, completedQuests: [], pending: [] }
  saveProfile(fresh)
  return fresh
}

export function saveProfile(p: Profile) {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch {}
  try {
    const evt = new CustomEvent('profile:changed', { detail: { profile: p } })
    window.dispatchEvent(evt)
  } catch {}
}

export function getProfile(): Profile {
  return loadProfile()
}

export function addPoints(points: number, reason?: string): Profile {
  const p = loadProfile()
  if (points > 0) p.points += points
  p.pending = p.pending || []
  p.pending.push({ type: 'addPoints', data: { points, reason }, ts: Date.now() })
  saveProfile(p)
  // Fire and forget sync
  void syncProfile()
  return p
}

export function deductPoints(points: number, reason?: string): Profile {
  const p = loadProfile()
  if (points > 0) p.points = Math.max(0, (p.points || 0) - points)
  p.pending = p.pending || []
  p.pending.push({ type: 'deductPoints', data: { points, reason }, ts: Date.now() })
  saveProfile(p)
  void syncProfile()
  return p
}

export function markQuestComplete(questId: string, rewardPoints: number): Profile {
  const p = loadProfile()
  if (!p.completedQuests.includes(questId)) {
    p.completedQuests.push(questId)
    p.pending = p.pending || []
    p.pending.push({ type: 'questComplete', data: { questId, rewardPoints }, ts: Date.now() })
    // award points once per quest
    if (rewardPoints > 0) p.points += rewardPoints
    saveProfile(p)
    void syncProfile()
  }
  return p
}

export function unmarkQuestComplete(questId: string, rewardPoints: number): Profile {
  const p = loadProfile()
  if (p.completedQuests.includes(questId)) {
    p.completedQuests = p.completedQuests.filter(q => q !== questId)
    p.pending = p.pending || []
    p.pending.push({ type: 'questRevoke', data: { questId, rewardPoints }, ts: Date.now() })
    if (rewardPoints > 0) p.points = Math.max(0, (p.points || 0) - rewardPoints)
    saveProfile(p)
    void syncProfile()
  }
  return p
}

export async function syncProfile(): Promise<boolean> {
  const supa = getSupabase()
  if (!supa) return false
  const p = loadProfile()
  try {
    // Best-effort upsert; requires a 'profiles' table with matching columns
    const payload = {
      id: p.id,
      name: p.name ?? null,
      points: p.points,
      quests_completed: p.completedQuests,
      updated_at: new Date().toISOString()
    }
    const { error } = await supa.from('profiles').upsert(payload, { onConflict: 'id' })
    if (error) throw error
    p.lastSyncAt = Date.now()
    p.pending = []
    saveProfile(p)
    return true
  } catch {
    // keep pending for later
    return false
  }
}

// Attach online listener once per session
let onlineHooked = false
export function ensureOnlineSyncListener() {
  if (onlineHooked) return
  onlineHooked = true
  try {
    window.addEventListener('online', () => { void syncProfile() })
  } catch {}
}

// Bootstrap from cloud profile if available, merging with local
let bootstrapped = false
export async function ensureProfileBootstrap(): Promise<boolean> {
  if (bootstrapped) return true
  const supa = getSupabase()
  if (!supa) return false
  const local = loadProfile()
  try {
    const { data, error } = await supa
      .from('profiles')
      .select('id,name,points,quests_completed,updated_at')
      .eq('id', local.id)
      .maybeSingle()

    if (error) throw error
    if (data) {
      // Merge: max points and union of completed quests; prefer most recent updated_at for name
      const remotePoints = typeof data.points === 'number' ? data.points : 0
      const remoteQuestsRaw = (data as any).quests_completed
      const remoteQuests: string[] = Array.isArray(remoteQuestsRaw)
        ? remoteQuestsRaw.map(String)
        : (() => { try { const arr = JSON.parse(String(remoteQuestsRaw)); return Array.isArray(arr) ? arr.map(String) : [] } catch { return [] } })()
      const merged: Profile = {
        id: local.id,
        name: local.name,
        points: Math.max(local.points || 0, remotePoints || 0),
        completedQuests: Array.from(new Set([...(local.completedQuests||[]), ...remoteQuests]))
      }
      // Choose latest name if remote updated_at is newer
      try {
        const lUpd = local.lastSyncAt || 0
        const rUpd = data.updated_at ? Date.parse(String(data.updated_at)) : 0
        if (rUpd > lUpd) merged.name = (data as any).name ?? merged.name
      } catch {}
      saveProfile(merged)
      bootstrapped = true
      return true
    } else {
      // No remote row yet: push local up
      await syncProfile()
      bootstrapped = true
      return true
    }
  } catch {
    return false
  }
}
