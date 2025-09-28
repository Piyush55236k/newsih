import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getEvents, trackEvent, clearEvents } from '../lib/analytics'
import { getSupabase } from '../lib/supabase'

const KEY = 'agri_feedback'

export default function Feedback() {
	const [rating, setRating] = useState(5);
	const [text, setText] = useState('');
	const [sent, setSent] = useState(false);

	const send = async () => {
		const payload = { rating, text, at: new Date().toISOString(), usage: getEvents().slice(-100) };
		try { localStorage.setItem(KEY, JSON.stringify(payload)) } catch {}
		let sentRemote = false;
		try {
			const supa = getSupabase();
			if (supa) {
				const { error } = await supa.from('feedback').insert({ rating, comment: text });
				if (error) console.error('Supabase feedback insert error:', error);
				else sentRemote = true;
			}
		} catch (e) { console.error('Supabase feedback insert exception:', e); }
		trackEvent('feedback_submit', { rating, text_len: text.length, remote: sentRemote });
		setSent(true);
	};

	return (
		<motion.div className="grid" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.4 }}>
			<motion.section className="card" initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
				<h2>Feedback</h2>
				<AnimatePresence>
					{!sent ? (
						<motion.div className="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
							<motion.div className="card" initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
								<label>Overall rating</label>
								<input type="range" min={1} max={5} value={rating} onChange={e=>setRating(Number(e.target.value))} />
								<div>Rating: {rating}</div>
							</motion.div>
							<motion.div className="card" initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
								<label>Comments</label>
								<textarea rows={5} value={text} onChange={e=>setText(e.target.value)} placeholder="What can we improve?" />
								<div style={{marginTop:10}}>
									<motion.button onClick={send} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>Submit</motion.button>
									<motion.button className="secondary" style={{marginLeft:8}} onClick={()=>{ clearEvents(); location.reload() }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>Clear Usage Logs</motion.button>
								</div>
							</motion.div>
						</motion.div>
					) : (
						<motion.p className="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Thanks! Your feedback is recorded. If connected, it was also sent to the server.</motion.p>
					)}
				</AnimatePresence>
			</motion.section>
		</motion.div>
	);
}
