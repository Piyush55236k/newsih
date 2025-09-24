import { useState } from 'react'
import { trackEvent } from '../lib/analytics'

type Quest = { id: string; title: string; steps: string[] }
type State = { done: Record<string, boolean> }

const QUESTS: Quest[] = [
	{ id:'soil-setup', title:'Soil Test Setup', steps:['Collect soil sample','Measure pH','Record N-P-K','Get recommendations'] },
	{ id:'pest-scout', title:'Pest Scouting', steps:['Check 5 random plants','Photograph suspicious leaves','Log findings','Plan treatment if needed'] },
	{ id:'market-check', title:'Market Check', steps:['Pick commodity','Record local price','Compare with last week'] },
]

const KEY = 'agri_quests_state'

export default function Quests(){
	const [state, setState] = useState<State>(()=>{
		try{ const r = localStorage.getItem(KEY); return r? JSON.parse(r) : { done:{} } } catch { return { done:{} } }
	})

	const toggle = (id: string, idx: number) => {
		const key = `${id}:${idx}`
		const next = { ...state, done: { ...state.done, [key]: !state.done[key] } }
		setState(next)
		try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
		trackEvent('quest_toggle', { id, step: idx, done: next.done[key] })
	}

	return (
		<div className="grid">
			<section className="card">
				<h2>Quests</h2>
				<p className="muted">Guided, step-by-step actions to improve outcomes.</p>
			</section>
			{QUESTS.map(q => (
				<section className="card" key={q.id}>
					<h3>{q.title}</h3>
					<ul>
						{q.steps.map((s, i)=> (
							<li key={i}>
								<label style={{display:'flex', alignItems:'center', gap:8}}>
									<input type="checkbox" checked={!!state.done[`${q.id}:${i}`]} onChange={()=>toggle(q.id, i)} />
									<span>{s}</span>
								</label>
							</li>
						))}
					</ul>
				</section>
			))}
		</div>
	)
}
