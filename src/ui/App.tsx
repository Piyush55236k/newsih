import { Link, Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getProfile } from '../lib/profile'
import { hasSupabase } from '../lib/supabase'

const NavLink = ({ to, label, icon }: { to: string; label: string; icon: string }) => {
	const loc = useLocation()
	const active = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to))
	return (
		<Link className={active ? 'nav-link active' : 'nav-link'} to={to}>
			<span className="nav-icon">{icon}</span>
			{label}
		</Link>
	)
}

export default function App() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const [points, setPoints] = useState<number>(()=>getProfile().points)
	
	// Close mobile menu when route changes
	const location = useLocation()
	useEffect(() => {
		setMobileMenuOpen(false)
	}, [location])
	
	// Close mobile menu when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Element
			if (mobileMenuOpen && 
				!target.closest('.sidebar') && 
				!target.closest('.mobile-menu-toggle')) {
				setMobileMenuOpen(false)
			}
		}
		
		if (mobileMenuOpen) {
			document.addEventListener('mousedown', handleClickOutside)
			// Prevent body scroll when menu is open
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = 'unset'
		}
		
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
			document.body.style.overflow = 'unset'
		}
	}, [mobileMenuOpen])

		// Listen for profile changes to update points badge
		useEffect(() => {
			const handler = (e: any) => setPoints(e?.detail?.profile?.points ?? getProfile().points)
			window.addEventListener('profile:changed', handler)
			return () => window.removeEventListener('profile:changed', handler)
		}, [])

	return (
		<div className="app">
			{/* Mobile Menu Toggle */}
			<button 
				className="mobile-menu-toggle"
				onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
				aria-label="Toggle Menu"
			>
				{mobileMenuOpen ? '✕' : '☰'}
			</button>
			
			{/* Mobile Backdrop */}
			<div 
				className={`mobile-backdrop ${mobileMenuOpen ? 'show' : ''}`}
				onClick={() => setMobileMenuOpen(false)}
			></div>
			
			<aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
				<h1>AgriAssist</h1>
								<div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16}}>
									<span className="tag success">⭐ {points} pts</span>
									{hasSupabase() && <Link className="nav-link" to="/profile"><span className="nav-icon">🧑‍🌾</span>Profile</Link>}
								</div>
				<nav>
					<NavLink to="/soil" label="Soil Health" icon="🌱" />
					<NavLink to="/weather" label="Weather" icon="🌤️" />
					<NavLink to="/pests" label="Pest Detect" icon="🐛" />
					<NavLink to="/market" label="Market Prices" icon="💰" />
					<NavLink to="/voice" label="Voice Assist" icon="🎤" />
					<NavLink to="/community" label="Community" icon="👥" />
					<NavLink to="/quests" label="Quests" icon="🎯" />
					<NavLink to="/feedback" label="Feedback" icon="💬" />
				</nav>
				<footer>
					<small>v0.1 • Agricultural Assistant Demo</small>
				</footer>
			</aside>
			
			<main className="content">
				<div className="fade-in">
					<Outlet />
				</div>
			</main>
		</div>
	)
}
