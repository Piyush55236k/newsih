import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NavLink = ({ to, label, icon }: { to: string; label: string; icon: string }) => {
  const loc = useLocation();
  const active = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to));
  return (
    <Link className={active ? 'nav-link active' : 'nav-link'} to={to}>
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
          <NavLink to="/soil" label="Soil Health" icon="🌱" />
          <NavLink to="/weather" label="Weather" icon="🌤️" />
          <NavLink to="/features" label="All Features" icon="✨" />
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
          
          <Link 
            className="nav-link profile-link" 
            to="/profile"
            onClick={(e) => {
              console.log('Profile link clicked!');
              // Optional: Force navigation if there are issues
              // e.preventDefault();
              // window.location.href = '/profile';
            }}
          >
            <span className="nav-icon">🧑‍🌾</span>
            <span className="nav-label">Profile</span>
          </Link>
          
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
                <h4>Core Features</h4>
                <NavLink to="/soil" label="Soil Health" icon="🌱" />
                <NavLink to="/weather" label="Weather" icon="🌤️" />
                <NavLink to="/pests" label="Pest Detection" icon="🐛" />
                <NavLink to="/market" label="Market Prices" icon="💰" />
              </div>
              <div className="mobile-nav-section">
                <h4>More Features</h4>
                <NavLink to="/features" label="All Features" icon="✨" />
                <NavLink to="/advisory" label="Crop Advisory" icon="🌾" />
                <NavLink to="/community" label="Community" icon="👥" />
                <NavLink to="/quests" label="Quests" icon="🎯" />
              </div>
              <div className="mobile-nav-section">
                <h4>Account</h4>
                <NavLink to="/profile" label="Profile" icon="🧑‍🌾" />
                <NavLink to="/feedback" label="Feedback" icon="💬" />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
