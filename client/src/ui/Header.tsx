import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NavLink = ({ to, label, icon }: { to: string; label: string; icon: string }) => {
  const loc = useLocation();
  const active = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to));
  return (
    <Link className={active ? 'nav-link active' : 'nav-link'} to={to}>
      <span className="nav-icon">{icon}</span>
      {label}
    </Link>
  );
};

export default function Header({ points }: { points: number }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-logo">
          <Link to="/">AgriAssist</Link>
        </div>
        <nav className="header-nav">
          <NavLink to="/soil" label="Soil Health" icon="🌱" />
          <NavLink to="/weather" label="Weather" icon="🌤️" />
          <NavLink to="/pests" label="Pest Detect" icon="🐛" />
          <NavLink to="/market" label="Market Prices" icon="💰" />
          <NavLink to="/advisory" label="Crop Advisory" icon="🌾" />
          <NavLink to="/community" label="Community" icon="👥" />
          <NavLink to="/quests" label="Quests" icon="🎯" />
        </nav>
        <div className="header-actions">
          <span className="tag success">⭐ {points} pts</span>
          <Link className="nav-link" to="/profile">
            <span className="nav-icon">🧑‍🌾</span>
            Profile
          </Link>
          <button className="mobile-menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <nav>
              <NavLink to="/soil" label="Soil Health" icon="🌱" />
              <NavLink to="/weather" label="Weather" icon="🌤️" />
              <NavLink to="/pests" label="Pest Detect" icon="🐛" />
              <NavLink to="/market" label="Market Prices" icon="💰" />
              <NavLink to="/advisory" label="Crop Advisory" icon="🌾" />
              <NavLink to="/community" label="Community" icon="👥" />
              <NavLink to="/quests" label="Quests" icon="🎯" />
              <NavLink to="/profile" label="Profile" icon="🧑‍🌾" />
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
