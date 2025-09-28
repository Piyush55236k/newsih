import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { trackEvent } from '../lib/analytics'
import { getSupabase } from '../lib/supabase'

type Post = { id: string; author: string | null; content: string; tags: string[]; at: string }
const KEY = 'agri_community_posts'

// ✅ wrap textarea so it works with framer-motion
const MotionTextarea = motion.textarea

export default function Community() {
	const [posts, setPosts] = useState<Post[]>(()=>{
		try { const r = localStorage.getItem(KEY); return r? JSON.parse(r): [] } catch { return [] }
	})
	const [author, setAuthor] = useState('Farmer')
	const [content, setContent] = useState('')
	const [tags, setTags] = useState('advice,help')

	useEffect(()=>{
		(async () => {
			try {
				const supa = getSupabase();
				if (!supa) return
				const { data, error } = await supa
					.from('posts')
					.select('id, created_at, author, content')
					.order('created_at', { ascending: false })
					.limit(100)
				if (!error && data) {
					const mapped = (data as any[]).map(r=> ({
						id: r.id,
						author: r.author ?? 'Anon',
						content: r.content,
						tags: [],
						at: r.created_at
					}))
					setPosts(mapped)
				}
			} catch {}
		})()
	}, [])

	const add = async () => {
		if (!content.trim()) return
		const p: Post = {
			id: Math.random().toString(36).slice(2),
			author,
			content,
			tags: tags.split(',').map(s=>s.trim()).filter(Boolean),
			at: new Date().toISOString()
		}
		const next = [p, ...posts]
		setPosts(next)
		try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
		try {
			const supa = getSupabase();
			if (supa) {
				const { error } = await supa.from('posts').insert({ author, content })
				if (error) console.error('Supabase posts insert error:', error)
			}
		} catch (e) { console.error('Supabase posts insert exception:', e) }
		trackEvent('community_post', { len: content.length, tags: p.tags })
		setContent('')
	}

	return (
		<motion.div className="grid" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.4 }}>
			<motion.section className="card" initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
				<h2>Community</h2>
				<motion.div className="row" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
					<div className="col">
						<label>Name</label>
						<input value={author} onChange={e=>setAuthor(e.target.value)} />
					</div>
					<div className="col">
						<label>Tags (comma separated)</label>
						<input value={tags} onChange={e=>setTags(e.target.value)} />
					</div>
				</motion.div>
				<label>Share your question or tip</label>
				<MotionTextarea
					rows={4}
					value={content}
					onChange={e=>setContent(e.target.value)}
					placeholder="How to manage blight after rain?"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.5 }}
				/>
				<motion.div style={{marginTop:10}} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
					<motion.button onClick={add} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>Post</motion.button>
				</motion.div>
			</motion.section>
			<motion.section className="card" initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
				<h3>Latest Posts</h3>
				{posts.length===0 && <motion.p className="muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>No posts yet.</motion.p>}
				<motion.div className="grid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.4 }}>
					{posts.map(p=> (
						<motion.div className="card" key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
							<div className="row">
								<div className="col"><b>{p.author}</b></div>
								<div className="col" style={{textAlign:'right'}}>{new Date(p.at).toLocaleString()}</div>
							</div>
							<p>{p.content}</p>
							<div>{p.tags.map(t=> <span className="tag" key={t} style={{marginRight:6}}>{t}</span>)}</div>
						</motion.div>
					))}
				</motion.div>
			</motion.section>
		</motion.div>
	)
}
