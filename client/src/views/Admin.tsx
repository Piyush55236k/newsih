import { useEffect, useState, FormEvent } from 'react'
import { adminDecision, adminDelete, adminList, adminRevoke, adminListPosts, adminDeletePost, adminListFeedback, adminDeleteFeedback } from '../lib/review'
import { QUESTS } from '../lib/quests'

type Item = { id: string; profile_id: string; quest_id: string; image_url?: string; notes?: string; status: string; created_at?: string }

export default function Admin(){
  const [items, setItems] = useState<Item[]>([])
  const [tab, setTab] = useState<'evidence'|'community'|'feedback'>('evidence')
  const [posts, setPosts] = useState<Array<{ id: string; author?: string; content: string; created_at?: string }>>([])
  const [feedback, setFeedback] = useState<Array<{ id: string; rating: number; comment?: string; created_at?: string }>>([])
  const [status, setStatus] = useState<'pending'|'approved'|'rejected'|'all'>('pending')
  const [err, setErr] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [confirmId, setConfirmId] = useState<string|null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string|null>(null)
  const [confirmResetId, setConfirmResetId] = useState<string|null>(null)

  const statuses: Array<'pending'|'approved'|'rejected'|'all'> = ['pending','approved','rejected','all']

  const load = async () => {
    setErr(null)
    setLoading(true)
    try {
      if (tab==='evidence') {
        const r = await adminList({ status }); setItems(r.items || [])
      } else if (tab==='community') {
        const r = await adminListPosts(); setPosts(r.items || [])
      } else if (tab==='feedback') {
        const r = await adminListFeedback(); setFeedback(r.items || [])
      }
    }
    catch(e:any){ setErr(String(e?.message||e)) }
    finally { setLoading(false) }
  }

  useEffect(()=>{ if (authed) load() }, [status, authed, tab])

  const login = (e: FormEvent) => {
    e.preventDefault()
    if (!password) { setErr('Password required'); return }
    // Store in sessionStorage so admin calls can include it
    sessionStorage.setItem('adminPassword', password)
    setAuthed(true)
    setErr(null)
  }

  const doDecision = async (id: string, decision: 'approved'|'rejected') => {
    try { await adminDecision({ id, decision }); await load() }
    catch(e:any){ alert(String(e?.message||e)) }
  }
  const decide = (id: string, decision: 'approved'|'rejected') => {
    if (decision === 'approved') { setConfirmId(id); return }
    void doDecision(id, decision)
  }

  if (!authed) {
    return (
      <div className="grid">
        <section className="card">
          <h2>Admin Access</h2>
          <p className="muted">Enter admin password to continue.</p>
          {err && <p className="text-danger" style={{marginBottom:8}}>{err}</p>}
          <form onSubmit={login} className="row" style={{alignItems:'end'}}>
            <div className="col">
              <label>Password</label>
              <div style={{display:'flex', gap:8}}>
                <input type={showPwd? 'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter admin password" />
                <button type="button" className="secondary" onClick={()=>setShowPwd((s: boolean)=>!s)}>{showPwd? 'Hide' : 'Show'}</button>
              </div>
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
        <h2>Admin</h2>
        <div style={{display:'flex', gap:8, marginBottom:10}}>
          <button className={tab==='evidence'? '' : 'secondary'} onClick={()=>setTab('evidence')}>Evidence</button>
          <button className={tab==='community'? '' : 'secondary'} onClick={()=>setTab('community')}>Community</button>
          <button className={tab==='feedback'? '' : 'secondary'} onClick={()=>setTab('feedback')}>Feedback</button>
        </div>
        {tab==='evidence' && <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:12, flexWrap:'wrap'}}>
          <div style={{display:'inline-flex', border:'1px solid var(--panel-border)', borderRadius:999, overflow:'hidden'}}>
            {statuses.map(s => (
              <button key={s} className={s===status? '' : 'secondary'} style={{borderRadius:0}} onClick={()=>setStatus(s)}>{s[0].toUpperCase()+s.slice(1)}</button>
            ))}
          </div>
          <button className="secondary" onClick={load}>Refresh</button>
        </div>}
        {err && <p className="text-danger">{err}</p>}
        {loading ? (
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <span className="loading" /> Loading...
          </div>
        ) : tab==='evidence' && items.length === 0 ? (
          <div className="card" style={{textAlign:'center'}}>
            <p className="muted">No items found for this filter.</p>
          </div>
        ) : tab==='evidence' ? (
          <div className="grid">
            {items.map(it=> (
              <div className="card" key={it.id}>
                <div className="row" style={{marginBottom:8}}>
                  <div className="col"><b>Profile:</b> {it.profile_id}</div>
                  <div className="col" style={{textAlign:'right'}}>
                    <span className={`tag ${it.status==='approved'?'success':it.status==='rejected'?'danger':'warning'}`}>{it.status}</span>
                  </div>
                </div>
                <div className="row" style={{marginTop:0}}>
                  <div className="col"><b>Quest:</b> {it.quest_id}</div>
                  {it.created_at && <div className="col" style={{textAlign:'right'}}><small className="muted">{new Date(it.created_at).toLocaleString()}</small></div>}
                </div>
                {it.image_url && <div style={{marginTop:8}}>
                  <img src={it.image_url} alt="evidence" style={{maxHeight:240, objectFit:'contain', border:'1px solid var(--panel-border)'}} />
                  <div style={{display:'flex', gap:8, marginTop:6}}>
                    <a className="secondary" href={it.image_url} target="_blank" rel="noreferrer">Open</a>
                    <button className="secondary" onClick={()=>{ navigator.clipboard.writeText(it.image_url||'') }}>Copy Link</button>
                  </div>
                </div>}
                {it.notes && <p className="muted" style={{marginTop:8}}>{it.notes}</p>}
                <div className="row" style={{marginTop:8}}>
                  <div className="col" />
                  <div className="col" style={{textAlign:'right'}}>
                    {it.status==='pending' && <>
                      <button className="secondary" onClick={()=>decide(it.id, 'rejected')}>Reject</button>
                      <button style={{marginLeft:8}} onClick={()=>decide(it.id, 'approved')}>Approve</button>
                    </>}
                    {it.status!=='pending' && <button className="secondary" onClick={()=>setConfirmResetId(it.id)}>Reset to Pending</button>}
                    <button className="danger" style={{marginLeft:8}} onClick={()=>setConfirmDeleteId(it.id)}>Delete</button>
                    {it.status==='approved' && <button className="danger" style={{marginLeft:8}} onClick={async ()=>{
                      if (!confirm('Revoke approval, deduct points, and mark quest incomplete?')) return
                      const reward = QUESTS.find(q=>q.id===it.quest_id)?.reward || 0
                      try { await adminRevoke({ profileId: it.profile_id, questId: it.quest_id, points: reward, deleteEvidence: false }); await load() } catch(e:any){ alert(String(e?.message||e)) }
                    }}>Revoke</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab==='community' && !loading && (
          <div className="grid">
            {posts.length===0 && <p className="muted">No posts.</p>}
            {posts.map(p=> (
              <div className="card" key={p.id}>
                <div className="row"><div className="col"><b>{p.author||'Anon'}</b></div><div className="col" style={{textAlign:'right'}}>{p.created_at? new Date(p.created_at).toLocaleString(): ''}</div></div>
                <p>{p.content}</p>
                <div style={{textAlign:'right'}}>
                  <button className="danger" onClick={async()=>{ if (!confirm('Delete this post?')) return; try{ await adminDeletePost(p.id); await load() }catch(e:any){ alert(String(e?.message||e)) } }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==='feedback' && !loading && (
          <div className="grid">
            {feedback.length===0 && <p className="muted">No feedback.</p>}
            {feedback.map(f=> (
              <div className="card" key={f.id}>
                <div className="row"><div className="col">Rating: <b>{f.rating}</b></div><div className="col" style={{textAlign:'right'}}>{f.created_at? new Date(f.created_at).toLocaleString(): ''}</div></div>
                <p>{f.comment}</p>
                <div style={{textAlign:'right'}}>
                  <button className="danger" onClick={async()=>{ if (!confirm('Delete this feedback?')) return; try{ await adminDeleteFeedback(f.id); await load() }catch(e:any){ alert(String(e?.message||e)) } }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {confirmId && (
        <>
          <div className="modal-backdrop" onClick={()=>setConfirmId(null)} />
          <div className="modal">
            <h3>Approve Evidence</h3>
            <p className="muted">Approve this submission? The user will then be able to claim the reward.</p>
            <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
              <button className="secondary" onClick={()=>setConfirmId(null)}>Cancel</button>
              <button onClick={()=>{ const id = confirmId; setConfirmId(null); if (id) void doDecision(id, 'approved') }}>Approve</button>
            </div>
          </div>
        </>
      )}
      {confirmDeleteId && (
        <>
          <div className="modal-backdrop" onClick={()=>setConfirmDeleteId(null)} />
          <div className="modal">
            <h3>Delete Evidence</h3>
            <p className="muted">This will permanently delete the record and try to remove the image from storage.</p>
            <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
              <button className="secondary" onClick={()=>setConfirmDeleteId(null)}>Cancel</button>
              <button className="danger" onClick={async ()=>{ const id = confirmDeleteId; setConfirmDeleteId(null); if (id){ try{ const it: Item | undefined = items.find((x: Item)=>x.id===id); if (it && it.status==='approved'){ const reward = QUESTS.find(q=>q.id===it.quest_id)?.reward || 0; await adminRevoke({ profileId: it.profile_id, questId: it.quest_id, points: reward, deleteEvidence: true }); } else { await adminDelete({ id }); } await load() } catch(e:any){ alert(String(e?.message||e)) } } }}>Delete</button>
            </div>
          </div>
        </>
      )}
      {confirmResetId && (
        <>
          <div className="modal-backdrop" onClick={()=>setConfirmResetId(null)} />
          <div className="modal">
            <h3>Reset to Pending</h3>
            <p className="muted">Set this evidence back to Pending for re-review?</p>
            <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
              <button className="secondary" onClick={()=>setConfirmResetId(null)}>Cancel</button>
              <button onClick={async ()=>{ const id = confirmResetId; setConfirmResetId(null); if (id){ try{ await adminDecision({ id, decision: 'pending' as any }); await load() } catch(e:any){ alert(String(e?.message||e)) } } }}>Reset</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
