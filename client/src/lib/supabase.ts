import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null | undefined

function isValidHttpUrl(value?: string): boolean {
  if (!value) return false
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client
  const url = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined
  const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!isValidHttpUrl(url) || !key) {
    console.warn('Supabase disabled: missing or invalid VITE_SUPABASE_URL/ANON_KEY')
    client = null
    return client
  }
  try {
    client = createClient(url as string, key as string)
  } catch (e) {
    console.warn('Supabase initialization failed:', e)
    client = null
  }
  return client
}

export function hasSupabase(): boolean {
  return !!getSupabase()
}