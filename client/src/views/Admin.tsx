import { useEffect, useMemo, useState } from 'react'
import { adminDecision, adminList } from '../lib/review'

type Item = { id: string; profile_id: string; quest_id: string; image_url?: string; notes?: string; status: string; created_at?: string }

export default function Admin(){
  const [items, setItems] = useState<Item[]>([])
  const [status, setStatus] = useState<'pending'|'approved'|'rejected'|'all'>('pending')
  const [err, setErr] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')

  // Read default password from VITE_ADMIN_KEY if provided; otherwise require manual entry
  const defaultPwd = useMemo(()=> (import.meta as any).env?.VITE_ADMIN_KEY || '', [])

  const load = async () => {
    setErr(null)
    setLoading(true)
    try { const r = await adminList({ status }); setItems(r.items || []) }
    catch(e:any){ setErr(String(e?.message||e)) }
    finally { setLoading(false) }
  }

  useEffect(()=>{ if (authed) load() }, [status, authed])

  const login = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) { setErr('Password required'); return }
    // Store in sessionStorage so admin calls can include it
    sessionStorage.setItem('adminPassword', password)
    setAuthed(true)
    setErr(null)
  }

  const decide = async (id: string, decision: 'approved'|'rejected') => {
    try {
      await adminDecision({ id, decision })
      await load()
      if (decision === 'approved') {
        alert('Request approved. Grant points to the user in your system if applicable.')
      }
    } catch(e:any){ alert(String(e?.message||e)) }
  }

  if (!authed) {
    return (
      <div className="grid">
        <section className="card">
          <h2>Admin Access</h2>
          <p className="muted">Enter admin password to continue.</p>
          {defaultPwd ? <p className="muted">Tip: an admin key is set in env; you can paste it here.</p> : null}
          {err && <p className="text-danger" style={{marginBottom:8}}>{err}</p>}
          <form onSubmit={login} className="row" style={{alignItems:'end'}}>
            <div className="col">
              <label>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter admin password" />
            </div>
            <div className="col" style={{textAlign:'right'}}>
              <button type="submit">Enter</button>
            </div>
          </form>
        </section>
      </div>
    )
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>Admin: Review Quest Evidence</h2>
        <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:12}}>
          <label>Status</label>
          <select value={status} onChange={e=>setStatus(e.target.value as any)}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
          <button className="secondary" onClick={load}>Refresh</button>
        </div>
        {err && <p className="text-danger">{err}</p>}
        {loading ? (
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <span className="loading" /> Loading...
          </div>
        ) : (
          <div className="grid">
            {items.map(it=> (
              <div className="card" key={it.id}>
                <div className="row" style={{marginBottom:8}}>
                  <div className="col"><b>Profile:</b> {it.profile_id}</div>
                  <div className="col" style={{textAlign:'right'}}><b>Quest:</b> {it.quest_id}</div>
                </div>
                {it.image_url && <img src={it.image_url} alt="evidence" style={{maxHeight:240, objectFit:'contain', border:'1px solid var(--panel-border)'}} />}
                {it.notes && <p className="muted" style={{marginTop:8}}>{it.notes}</p>}
                <div className="row" style={{marginTop:8}}>
                  <div className="col"><span className={`tag ${it.status==='approved'?'success':it.status==='rejected'?'danger':'warning'}`}>{it.status}</span></div>
                  <div className="col" style={{textAlign:'right'}}>
                    {it.status==='pending' && <>
                      <button className="secondary" onClick={()=>decide(it.id, 'rejected')}>Reject</button>
                      <button style={{marginLeft:8}} onClick={()=>decide(it.id, 'approved')}>Approve</button>
                    </>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
