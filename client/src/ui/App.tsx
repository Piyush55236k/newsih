import { Link, Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import VoiceAssist from './VoiceAssist'
import { ensureProfileBootstrap, getProfile } from '../lib/profile'
import { ToastHost } from './Toast'
import Onboarding from './Onboarding'
import { LANGUAGES, applyLanguage } from './i18n'
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
	const [lang, setLang] = useState<string>(()=> localStorage.getItem('preferredLanguage') || 'en')
	const [showVoice, setShowVoice] = useState(false)
    
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
		// Bootstrap from cloud if available
		void ensureProfileBootstrap().then(()=> setPoints(getProfile().points))
		return () => window.removeEventListener('profile:changed', handler)
	}, [])

	return (
		<div className="app">
			{/* Floating chatbot icon */}
			<button
				className="chatbot-fab"
				style={{
					position: 'fixed',
					bottom: 32,
					right: 32,
					zIndex: 1000,
					background: '#fff',
					borderRadius: '50%',
					boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
					width: 56,
					height: 56,
					border: 'none',
					cursor: 'pointer',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: 32
				}}
				aria-label="Open Voice Assistant"
				onClick={()=>setShowVoice(true)}
			>
				<span role="img" aria-label="Chatbot">💬</span>
			</button>
			{/* Modal for VoiceAssist */}
			{showVoice && (
				<div
					className="voice-modal"
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						width: '100vw',
						height: '100vh',
						background: 'rgba(0,0,0,0.25)',
						zIndex: 1001,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center'
					}}
					onClick={()=>setShowVoice(false)}
				>
					<div
						style={{
							background: '#fff',
							borderRadius: 12,
							boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
							padding: 24,
							minWidth: 340,
							maxWidth: '90vw',
							maxHeight: '90vh',
							overflowY: 'auto',
							position: 'relative'
						}}
						onClick={e=>e.stopPropagation()}
					>
						<button
							style={{
								position: 'absolute',
								top: 12,
								right: 12,
								background: 'none',
								border: 'none',
								fontSize: 24,
								cursor: 'pointer'
							}}
							aria-label="Close Voice Assistant"
							onClick={()=>setShowVoice(false)}
						>✕</button>
						<VoiceAssist />
					</div>
				</div>
			)}
			{/* Onboarding overlay (language, name, auth/guest) */}
			<Onboarding />
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
					<NavLink to="/advisory" label="Crop Advisory" icon="🌾" />
					<NavLink to="/voice" label="Voice Assist" icon="🎤" />
					<NavLink to="/community" label="Community" icon="👥" />
					<NavLink to="/quests" label="Quests" icon="🎯" />
					<NavLink to="/feedback" label="Feedback" icon="💬" />
					{/* Admin link hidden from navigation; route still exists */}
				</nav>
				<footer>
					<div style={{display:'flex', flexDirection:'column', gap:8}}>
						<label style={{fontSize:12}} className="muted">Language</label>
						<select
							value={lang}
							onChange={(e)=>{
								const v = e.target.value
								setLang(v)
								localStorage.setItem('preferredLanguage', v)
								// Debounce quick toggles using a stable window timer
								if ((window as any).__langTimer) window.clearTimeout((window as any).__langTimer)
								;(window as any).__langTimer = window.setTimeout(()=>{
									void applyLanguage(v)
								}, 200)
							}}
						>
							{LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
						</select>
						<small>v0.1 • Agricultural Assistant Demo</small>
					</div>
				</footer>
			</aside>
			
			<main className="content">
				<div className="content-inner">
					<ToastHost />
					<div className="fade-in">
						<Outlet />
					</div>
				</div>
			</main>
		</div>
	)
}
