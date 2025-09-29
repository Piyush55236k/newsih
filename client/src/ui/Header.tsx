import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NavLink = ({ to, label, icon, onClick }: { to: string; label: string; icon: string; onClick?: () => void }) => {
  const loc = useLocation();
  const active = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to));
  return (
    <Link className={active ? 'nav-link active' : 'nav-link'} to={to} onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
    </Link>
  );
};

export default function Header({ points }: { points: number }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="header-container">
        <motion.div 
          className="header-logo"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link to="/">
            <span className="logo-text">🌱 Agro Mitra</span>
          </Link>
        </motion.div>
        
        <nav className="header-nav">
          <NavLink to="/" label="Home Page" icon="🏠" />
          <NavLink to="/soil" label="Fertilizer Recommendation" icon="🌱" />
          <NavLink to="/weather" label="Weather" icon="🌤️" />
        </nav>
        
        <div className="header-actions">
          <motion.div
            className="points-badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 15,
              delay: 0.3 
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="tag success">
              <span className="star-icon">⭐</span>
              <span className="points-text">{points} pts</span>
            </span>
          </motion.div>
          
          <NavLink to="/profile" label="Profile" icon="🧑‍🌾" />
          
          <motion.button 
            className="mobile-menu-toggle" 
            onClick={() => setMenuOpen(!menuOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Toggle mobile menu"
          >
            <motion.span
              animate={{ rotate: menuOpen ? 45 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {menuOpen ? '✕' : '☰'}
            </motion.span>
          </motion.button>
        </div>
      </div>
      
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <nav className="mobile-nav">
              <div className="mobile-nav-section">
                <h4>Main</h4>
                <NavLink to="/" label="Home Page" icon="🏠" onClick={() => setMenuOpen(false)} />
              </div>
              <div className="mobile-nav-section">
                <h4>Core Features</h4>
                <NavLink to="/soil" label="Fertilizer Recommendation" icon="🌱" onClick={() => setMenuOpen(false)} />
                <NavLink to="/weather" label="Weather" icon="🌤️" onClick={() => setMenuOpen(false)} />
                <NavLink to="/pests" label="Pest Detection" icon="🐛" onClick={() => setMenuOpen(false)} />
                <NavLink to="/market" label="Market Prices" icon="💰" onClick={() => setMenuOpen(false)} />
              </div>
              <div className="mobile-nav-section">
                <h4>More Features</h4>
                <NavLink to="/advisory" label="Crop Advisory" icon="🌾" />
                <NavLink to="/community" label="Community" icon="👥" />
                <NavLink to="/quests" label="Quests" icon="🎯" />
              </div>
              <div className="mobile-nav-section">
                <h4>Account</h4>
                <NavLink to="/profile" label="Profile" icon="🧑‍🌾" onClick={() => setMenuOpen(false)} />
                <NavLink to="/feedback" label="Feedback" icon="💬" onClick={() => setMenuOpen(false)} />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
