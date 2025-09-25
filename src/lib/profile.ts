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
