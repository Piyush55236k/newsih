import { useEffect, useState } from 'react'
import { getProfile, syncProfile } from '../lib/profile'

export default function Profile(){
  const [pts, setPts] = useState(getProfile().points)
  const [quests, setQuests] = useState<string[]>(getProfile().completedQuests)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState<string|null>(null)

  useEffect(()=>{
    const h = (e: any)=>{
      setPts(e?.detail?.profile?.points ?? getProfile().points)
      setQuests(e?.detail?.profile?.completedQuests ?? getProfile().completedQuests)
    }
    window.addEventListener('profile:changed', h)
    return ()=> window.removeEventListener('profile:changed', h)
  }, [])

  const doSync = async ()=>{
    setSyncing(true); setMsg(null)
    const ok = await syncProfile()
    setSyncing(false)
    setMsg(ok ? 'Synced with cloud.' : 'Saved locally. Will sync when online.')
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>Farmer Profile</h2>
        <p className="muted">Your points and progress. Stored locally and synced when possible.</p>
        <div style={{display:'flex', gap:12, alignItems:'center', marginTop:8}}>
          <span className="tag success">⭐ Points: {pts}</span>
          <button className="secondary" onClick={doSync} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync now'}</button>
          {msg && <span className="tag info">{msg}</span>}
        </div>
      </section>
      <section className="card">
        <h3>Completed Quests</h3>
        {quests.length === 0 ? (
          <p className="muted">No quests completed yet.</p>
        ) : (
          <ul>
            {quests.map(q=> (<li key={q}>{q}</li>))}
          </ul>
        )}
      </section>
    </div>
  )
}
