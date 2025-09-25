import { useEffect, useMemo, useState } from 'react'
import { trackEvent, getVerifiedSet, DEFAULT_RULES } from '../lib/analytics'
import { getEvidenceStatus, submitEvidence, type EvidenceStatus } from '../lib/review'
import { showToast } from '../ui/Toast'
import { ensureOnlineSyncListener, getProfile, markQuestComplete, unmarkQuestComplete, deductPoints } from '../lib/profile'
import { QUESTS } from '../lib/quests'

type Quest = { id: string; title: string; steps: string[]; reward: number }
type State = { done: Record<string, boolean>; profilePoints: number; completed: Record<string, boolean> }

// Using shared QUESTS from lib

const KEY = 'agri_quests_state'

export default function Quests(){
	const [state, setState] = useState<State>(()=>{
		const profile = getProfile()
		// default points to 0 when absent
		const base = { done:{}, profilePoints: typeof profile.points === 'number' ? profile.points : 0, completed: {} as Record<string, boolean> }
		// seed completed map from profile so UI reflects claimed quests across sessions/devices
		for (const qid of profile.completedQuests || []) base.completed[qid] = true
		try{ const r = localStorage.getItem(KEY); return r? { ...base, ...JSON.parse(r) } : base } catch { return base }
	})

	useEffect(()=>{ ensureOnlineSyncListener() }, [])

	const toggle = (id: string, idx: number) => {
		const key = `${id}:${idx}`
		const next = { ...state, done: { ...state.done, [key]: !state.done[key] } }
		setState(next)
		try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
		trackEvent('quest_toggle', { id, step: idx, done: next.done[key] })
	}

	// Build a map of verification markers that correspond to specific quest steps
	const [verified, setVerified] = useState<Set<string>>(()=> getVerifiedSet(DEFAULT_RULES))
	const [evidenceByQuest, setEvidenceByQuest] = useState<Record<string, { status: EvidenceStatus; id: string; imageUrl?: string }>>({})
	const [uploading, setUploading] = useState<Record<string, boolean>>({})
	const [selectedFile, setSelectedFile] = useState<Record<string, File|undefined>>({})
	const [uploadErr, setUploadErr] = useState<Record<string, string|undefined>>({})

	useEffect(()=>{
		const onEv = () => setVerified(new Set(getVerifiedSet(DEFAULT_RULES)))
		window.addEventListener('analytics:event', onEv as any)
		// initial refresh in case events were emitted earlier in session
		setVerified(new Set(getVerifiedSet(DEFAULT_RULES)))
		return ()=> window.removeEventListener('analytics:event', onEv as any)
	}, [])

	// Load evidence review status for this profile
		useEffect(()=>{
		const pid = getProfile().id
		const run = async()=>{
				try {
					const r = await getEvidenceStatus(pid); const latest = r.byQuest || {}
					// revoke if necessary
					let changed = false
					const nextCompleted = { ...state.completed }
					for (const q of QUESTS) {
						const st = latest[q.id]?.status
						if (state.completed[q.id] && st !== 'approved') {
							unmarkQuestComplete(q.id, q.reward)
							nextCompleted[q.id] = false as any
							changed = true
						}
					}
					setEvidenceByQuest(latest)
					if (changed) {
						const newState = { ...state, profilePoints: getProfile().points, completed: nextCompleted }
						setState(newState)
						try { localStorage.setItem(KEY, JSON.stringify(newState)) } catch {}
					}
				} catch {}
		}
		run()
		// Re-check when tab gains focus
		const onVis = () => { if (document.visibilityState === 'visible') run() }
		document.addEventListener('visibilitychange', onVis)
		return ()=> document.removeEventListener('visibilitychange', onVis)
	}, [])

	const [refreshing, setRefreshing] = useState(false)
		const refreshStatus = async () => {
		setRefreshing(true)
			try {
				const pid = getProfile().id; const r = await getEvidenceStatus(pid); const latest = r.byQuest || {}
				// If any quest was previously completed but its approval is now missing (rejected or no record), auto-revoke locally
				const nextCompleted = { ...state.completed }
				let changed = false
				for (const q of QUESTS) {
					const st = latest[q.id]?.status
					if (state.completed[q.id] && st !== 'approved') {
						// revoke
						const p = unmarkQuestComplete(q.id, q.reward)
						nextCompleted[q.id] = false as any
						changed = true
					}
				}
				setEvidenceByQuest(latest)
				if (changed) {
					const newState = { ...state, profilePoints: getProfile().points, completed: nextCompleted }
					setState(newState)
					try { localStorage.setItem(KEY, JSON.stringify(newState)) } catch {}
					showToast('A quest approval was revoked. Points updated.', 'warning')
				} else {
					showToast('Status refreshed', 'info', 1500)
				}
			}
		catch(e:any){ showToast(String(e?.message||e), 'error') }
		finally { setRefreshing(false) }
	}

	// Declarative mapping: questId -> stepIndex -> verification id
	const verifyMap: Record<string, Record<number, string>> = {
		'pest-scout': { 0: 'pest:imageUploaded', 1: 'pest:imageAnalyzed' },
		'weather-prep': { 0: 'weather:viewed' },
		'market-check': { 0: 'market:fetched' },
		'feedback-app': { 1: 'feedback:submitted' },
	}

	const isStepAutoVerified = (qId: string, idx: number) => {
		const id = verifyMap[qId]?.[idx]
		return !!(id && verified.has(id))
	}

	const isQuestCompleted = (q: Quest): boolean => q.steps.every((_, i)=> isStepAutoVerified(q.id, i) || !!state.done[`${q.id}:${i}`])

	const statusFor = (qId: string): EvidenceStatus | undefined => evidenceByQuest[qId]?.status
	const canClaim = (q: Quest): boolean => isQuestCompleted(q) && statusFor(q.id) === 'approved' && !state.completed[q.id]

		const onUpload = async (q: Quest, file: File) => {
			// Block uploads if quest is already claimed or evidence is already pending/approved
			const st = statusFor(q.id)
			if (state.completed[q.id]) { setUploadErr((s: Record<string, string|undefined>)=>({ ...s, [q.id]: 'This quest is already completed. Upload not allowed.' })); showToast('Quest already completed. Upload not allowed.', 'warning'); return }
			if (st === 'pending' || st === 'approved') { setUploadErr((s: Record<string, string|undefined>)=>({ ...s, [q.id]: 'Evidence is already submitted for review.' })); showToast('Evidence already submitted for this quest.', 'info'); return }
		const reader = new FileReader()
		setUploading((s: Record<string, boolean>)=>({ ...s, [q.id]: true }))
		setUploadErr((s: Record<string, string|undefined>)=>({ ...s, [q.id]: undefined }))
		reader.onload = async () => {
			try {
				const pid = getProfile().id
				await submitEvidence({ profileId: pid, questId: q.id, imageData: String(reader.result) })
				const r = await getEvidenceStatus(pid)
				setEvidenceByQuest(r.byQuest || {})
			setSelectedFile((s: Record<string, File|undefined>)=>({ ...s, [q.id]: undefined }))
					showToast('Evidence uploaded. Awaiting review.', 'success')
			} catch (e:any) {
				const msg = String(e?.message||e)
				setUploadErr((s: Record<string, string|undefined>)=>({ ...s, [q.id]: msg }))
					showToast(msg, 'error')
			} finally {
			setUploading((s: Record<string, boolean>)=>({ ...s, [q.id]: false }))
			}
		}
		reader.readAsDataURL(file)
	}

	const completeQuest = (q: Quest) => {
		if (isQuestCompleted(q) && !state.completed[q.id]){
			const updatedProfile = markQuestComplete(q.id, q.reward)
			const next = { ...state, profilePoints: updatedProfile.points, completed: { ...state.completed, [q.id]: true } }
			setState(next)
			try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
			trackEvent('quest_completed', { id: q.id, reward: q.reward })
		}
	}

	const totalPossible = useMemo(()=> QUESTS.reduce((acc,q)=> acc + q.reward, 0), [])

	return (
		<div>
			<section className="card">
				<h2>Quests</h2>
				<p className="muted">Complete quests to earn points and improve your farm. Points are stored locally and synced when online.</p>
				<div style={{display:'flex', gap:16, alignItems:'center', marginTop:8}}>
					<span className="tag success">Points: {state.profilePoints}</span>
					<span className="tag info">Total available: {totalPossible}</span>
				</div>
			</section>
			<div style={{display:'flex', justifyContent:'flex-end', marginBottom:8}}>
				<button className="secondary" onClick={refreshStatus} disabled={refreshing}>
					{refreshing ? 'Refreshing...' : 'Refresh status'}
				</button>
			</div>
			<div className="quests-grid">
				{QUESTS.map(q => {
					const doneCount = q.steps.reduce((acc, _s, i)=> acc + ((isStepAutoVerified(q.id, i) || state.done[`${q.id}:${i}`]) ? 1 : 0), 0)
					const pct = Math.round((doneCount / q.steps.length) * 100)
					return (
						<section className="card quest-card" key={q.id}>
							<div className="quest-header">
								<h3 style={{marginBottom:0}}>{q.title}</h3>
								<span className="tag warning">+{q.reward} pts</span>
							</div>
							<div className="progress" aria-label="quest progress" title={`${pct}%`}>
								<div className="progress-bar" style={{width: `${pct}%`}}></div>
							</div>
							<div className="muted" style={{fontSize:12, marginTop:4}}>{doneCount}/{q.steps.length} steps</div>
							<ul className="quest-steps">
								{q.steps.map((s, i)=> {
									const auto = isStepAutoVerified(q.id, i)
									const checked = auto || !!state.done[`${q.id}:${i}`]
									return (
										<li key={i}>
											<div style={{display:'flex', alignItems:'center', gap:10, cursor: auto ? 'default' : 'pointer'}} onClick={()=> !auto && toggle(q.id, i)} title={auto ? 'Verified from activity' : 'Tap to mark done'}>
												<span className={`step-dot ${checked?'on':''} ${auto?'auto':''}`} aria-hidden="true" />
												<span>{s}{auto && ' • auto-verified'}</span>
											</div>
										</li>
									)
								})}
							</ul>
							<div style={{display:'flex', flexDirection:'column', gap:8, marginTop:12}}>
								<div className="row" style={{alignItems:'center'}}>
									<div className="col">
										<label className="muted" style={{marginBottom:6}}>Evidence (image/screenshot)</label>
										<div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
											<input id={`file-${q.id}`} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{ const f=e.target.files?.[0]; setSelectedFile(s=>({ ...s, [q.id]: f })) }} />
											<button type="button" className="secondary" onClick={()=> document.getElementById(`file-${q.id}`)?.click()} disabled={uploading[q.id]}>Choose Image</button>
											<button type="button" onClick={()=>{ const f=selectedFile[q.id]; if (!f) { setUploadErr(s=>({ ...s, [q.id]: 'Please choose an image first.' })); return; } onUpload(q, f) }} disabled={!!uploading[q.id]}>Upload Evidence</button>
											{selectedFile[q.id] && <span className="muted">{selectedFile[q.id]?.name}</span>}
										</div>
										{uploadErr[q.id] && <div className="text-danger" style={{marginTop:6}}>{uploadErr[q.id]}</div>}
									</div>
									<div className="col" style={{textAlign:'right'}}>
										{statusFor(q.id) && <span className={`tag ${statusFor(q.id)==='approved'?'success':statusFor(q.id)==='rejected'?'danger':'warning'}`}>Review: {statusFor(q.id)}</span>}
									</div>
								</div>
								<div className="quest-actions">
									<button className="btn-claim" type="button" onClick={()=>completeQuest(q)} disabled={!canClaim(q)}>
										{state.completed[q.id] ? 'Completed' : 'Claim Reward'}
									</button>
									{!state.completed[q.id] && statusFor(q.id)!=='approved' && <span className="muted">Claim unlocks after admin approves.</span>}
									{state.completed[q.id] && <span className="tag success">Reward claimed</span>}
								</div>
							</div>
						</section>
					)
				})}
			</div>
		</div>
	)
}
