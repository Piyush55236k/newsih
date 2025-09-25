import { useState } from 'react'
import { getEvents, trackEvent, clearEvents } from '../lib/analytics'
import { getSupabase } from '../lib/supabase'

const KEY = 'agri_feedback'

export default function Feedback(){
	const [rating, setRating] = useState(5)
	const [text, setText] = useState('')
	const [sent, setSent] = useState(false)

		const send = async () => {
			const payload = { rating, text, at: new Date().toISOString(), usage: getEvents().slice(-100) }
			try { localStorage.setItem(KEY, JSON.stringify(payload)) } catch {}
			let sentRemote = false
			try {
				const supa = getSupabase()
				if (supa) {
					const { error } = await supa.from('feedback').insert({ rating, comment: text })
					if (error) console.error('Supabase feedback insert error:', error)
					else sentRemote = true
				}
			} catch (e) { console.error('Supabase feedback insert exception:', e) }
			trackEvent('feedback_submit', { rating, text_len: text.length, remote: sentRemote })
			setSent(true)
		}

	return (
		<div className="grid">
			<section className="card">
				<h2>Feedback</h2>
				{!sent ? (
					<div className="grid">
						<div className="card">
							<label>Overall rating</label>
							<input type="range" min={1} max={5} value={rating} onChange={e=>setRating(Number(e.target.value))} />
							<div>Rating: {rating}</div>
						</div>
						<div className="card">
							<label>Comments</label>
							<textarea rows={5} value={text} onChange={e=>setText(e.target.value)} placeholder="What can we improve?" />
							<div style={{marginTop:10}}>
								<button onClick={send}>Submit</button>
								<button className="secondary" style={{marginLeft:8}} onClick={()=>{ clearEvents(); location.reload() }}>Clear Usage Logs</button>
							</div>
						</div>
					</div>
				) : (
					<p className="ok">Thanks! Your feedback is recorded. If connected, it was also sent to the server.</p>
				)}
			</section>
		</div>
	)
}
