import { useEffect, useState } from 'react'
import { trackEvent } from '../lib/analytics'
import { getSupabase } from '../lib/supabase'

type Post = { id: string; author: string | null; content: string; tags: string[]; at: string }
const KEY = 'agri_community_posts'

export default function Community(){
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
					const { data, error } = await supa.from('posts').select('id, created_at, author, content').order('created_at', { ascending: false }).limit(100)
					if (!error && data) {
						const mapped = (data as any[]).map(r=> ({ id: r.id, author: r.author ?? 'Anon', content: r.content, tags: [], at: r.created_at }))
						setPosts(mapped)
					}
				} catch {}
			})()
		}, [])

		const add = async () => {
		if (!content.trim()) return
		const p: Post = { id: Math.random().toString(36).slice(2), author, content, tags: tags.split(',').map(s=>s.trim()).filter(Boolean), at: new Date().toISOString() }
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
		<div className="grid">
			<section className="card">
				<h2>Community</h2>
				<div className="row">
					<div className="col">
						<label>Name</label>
						<input value={author} onChange={e=>setAuthor(e.target.value)} />
					</div>
					<div className="col">
						<label>Tags (comma separated)</label>
						<input value={tags} onChange={e=>setTags(e.target.value)} />
					</div>
				</div>
				<label>Share your question or tip</label>
				<textarea rows={4} value={content} onChange={e=>setContent(e.target.value)} placeholder="How to manage blight after rain?" />
				<div style={{marginTop:10}}>
					<button onClick={add}>Post</button>
				</div>
			</section>

			<section className="card">
				<h3>Latest Posts</h3>
				{posts.length===0 && <p className="muted">No posts yet.</p>}
				<div className="grid">
					{posts.map(p=> (
						<div className="card" key={p.id}>
							<div className="row"><div className="col"><b>{p.author}</b></div><div className="col" style={{textAlign:'right'}}>{new Date(p.at).toLocaleString()}</div></div>
							<p>{p.content}</p>
							<div>{p.tags.map(t=> <span className="tag" key={t} style={{marginRight:6}}>{t}</span>)}</div>
						</div>
					))}
				</div>
			</section>
		</div>
	)
}
