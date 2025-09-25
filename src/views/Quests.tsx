import { useEffect, useMemo, useState } from 'react'
import { trackEvent, getVerifiedSet, DEFAULT_RULES } from '../lib/analytics'
import { ensureOnlineSyncListener, getProfile, markQuestComplete } from '../lib/profile'
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

	useEffect(()=>{
		const onEv = () => setVerified(new Set(getVerifiedSet(DEFAULT_RULES)))
		window.addEventListener('analytics:event', onEv as any)
		// initial refresh in case events were emitted earlier in session
		setVerified(new Set(getVerifiedSet(DEFAULT_RULES)))
		return ()=> window.removeEventListener('analytics:event', onEv as any)
	}, [])

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
			<div className="quests-grid">
				{QUESTS.map(q => {
					const doneCount = q.steps.reduce((acc, _s, i)=> acc + (state.done[`${q.id}:${i}`] ? 1 : 0), 0)
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
											<label style={{display:'flex', alignItems:'center', gap:10}} title={auto ? 'Verified from activity' : 'Mark done'}>
												<input type="checkbox" checked={checked} onChange={()=>!auto && toggle(q.id, i)} disabled={auto} />
												<span>{s}{auto && ' • auto-verified'}</span>
											</label>
										</li>
									)
								})}
							</ul>
							<div className="quest-actions">
								<button className="btn-claim" type="button" onClick={()=>completeQuest(q)} disabled={!isQuestCompleted(q) || !!state.completed[q.id]}>
									{state.completed[q.id] ? 'Completed' : 'Claim Reward'}
								</button>
								{state.completed[q.id] && <span className="tag success">Reward claimed</span>}
							</div>
						</section>
					)
				})}
			</div>
		</div>
	)
}
