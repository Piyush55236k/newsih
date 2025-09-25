import { useEffect, useMemo, useState } from 'react'
import { trackEvent } from '../lib/analytics'
import { ensureOnlineSyncListener, getProfile, markQuestComplete } from '../lib/profile'

type Quest = { id: string; title: string; steps: string[]; reward: number }
type State = { done: Record<string, boolean>; profilePoints: number; completed: Record<string, boolean> }

const QUESTS: Quest[] = [
	{ id:'soil-setup', title:'Soil Test Setup', reward: 50, steps:['Collect soil sample','Measure pH','Record N-P-K','Get recommendations'] },
	{ id:'pest-scout', title:'Pest Scouting', reward: 40, steps:['Check 5 random plants','Photograph suspicious leaves','Log findings','Plan treatment if needed'] },
	{ id:'market-check', title:'Market Check', reward: 25, steps:['Pick commodity','Record local price','Compare with last week'] },
]

const KEY = 'agri_quests_state'

export default function Quests(){
	const [state, setState] = useState<State>(()=>{
		try{ const r = localStorage.getItem(KEY); return r? JSON.parse(r) : { done:{}, profilePoints: getProfile().points, completed: {} } } catch { return { done:{}, profilePoints: getProfile().points, completed: {} } }
	})

	useEffect(()=>{ ensureOnlineSyncListener() }, [])

	const toggle = (id: string, idx: number) => {
		const key = `${id}:${idx}`
		const next = { ...state, done: { ...state.done, [key]: !state.done[key] } }
		setState(next)
		try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
		trackEvent('quest_toggle', { id, step: idx, done: next.done[key] })
	}

	const isQuestCompleted = (q: Quest): boolean => q.steps.every((_, i)=> !!state.done[`${q.id}:${i}`])

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
							<div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
								<h3 style={{marginBottom:0}}>{q.title}</h3>
								<span className="tag warning">+{q.reward} pts</span>
							</div>
							<div className="progress" aria-label="quest progress" title={`${pct}%`}>
								<div className="progress-bar" style={{width: `${pct}%`}}></div>
							</div>
							<ul className="quest-steps">
								{q.steps.map((s, i)=> (
									<li key={i}>
										<label style={{display:'flex', alignItems:'center', gap:10}}>
											<input type="checkbox" checked={!!state.done[`${q.id}:${i}`]} onChange={()=>toggle(q.id, i)} />
											<span>{s}</span>
										</label>
									</li>
								))}
							</ul>
							<div className="quest-actions">
								<button type="button" onClick={()=>completeQuest(q)} disabled={!isQuestCompleted(q) || !!state.completed[q.id]}>
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
