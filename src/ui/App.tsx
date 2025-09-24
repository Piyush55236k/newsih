import { Link, Outlet, useLocation } from 'react-router-dom'

const NavLink = ({ to, label }: { to: string; label: string }) => {
	const loc = useLocation()
	const active = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to))
	return (
		<Link className={active ? 'nav-link active' : 'nav-link'} to={to}>
			{label}
		</Link>
	)
}

export default function App() {
	return (
		<div className="app">
			<aside className="sidebar">
				<h1>AgriAssist</h1>
				<nav>
					<NavLink to="/soil" label="Soil Health" />
					<NavLink to="/weather" label="Weather" />
					<NavLink to="/pests" label="Pest Detect" />
					<NavLink to="/market" label="Market Prices" />
					<NavLink to="/voice" label="Voice Assist" />
					<NavLink to="/community" label="Community" />
					<NavLink to="/quests" label="Quests" />
					<NavLink to="/feedback" label="Feedback" />
				</nav>
				<footer>
					<small>v0.1 • Demo</small>
				</footer>
			</aside>
			<main className="content">
				<Outlet />
			</main>
		</div>
	)
}
