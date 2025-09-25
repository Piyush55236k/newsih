import { useEffect, useState } from 'react'
import { adminDecision, adminList } from '../lib/review'

type Item = { id: string; profile_id: string; quest_id: string; image_url?: string; notes?: string; status: string; created_at?: string }

export default function Admin(){
  const [items, setItems] = useState<Item[]>([])
  const [status, setStatus] = useState<'pending'|'approved'|'rejected'|'all'>('pending')
  const [err, setErr] = useState<string|null>(null)

  const load = async () => {
    setErr(null)
    try { const r = await adminList({ status }); setItems(r.items || []) } catch(e:any){ setErr(String(e?.message||e)) }
  }

  useEffect(()=>{ load() }, [status])

  const decide = async (id: string, decision: 'approved'|'rejected') => {
    const reward = decision === 'approved' ? Number(prompt('Reward points to grant:', '25') || 0) : 0
    try { await adminDecision({ id, decision, reward }); await load() } catch(e:any){ alert(String(e?.message||e)) }
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
                    <button style={{marginLeft:8}} onClick={()=>decide(it.id, 'approved')}>Approve & Award</button>
                  </>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
