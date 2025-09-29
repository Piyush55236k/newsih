import { Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LANGUAGES, applyLanguage } from './i18n';

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
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState<string>(() => localStorage.getItem('lang') || 'en');

  // Apply language on mount and whenever it changes
  useEffect(() => {
    // Persist and apply
    try { localStorage.setItem('lang', lang); } catch {}
    void applyLanguage(lang);
  }, [lang]);

  // Close language dropdown on outside click
  useEffect(() => {
    if (!langOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest?.('.lang-selector')) setLangOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [langOpen]);

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
          
          {/* Language Selector (desktop) */}
          <div className="lang-selector" style={{ position: 'relative' }}>
            <motion.button
              className="secondary"
              onClick={() => setLangOpen((v) => !v)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-haspopup="listbox"
              aria-expanded={langOpen}
            >
              <span style={{ marginRight: 6 }}>🌐</span>
              {useMemo(() => LANGUAGES.find(l => l.code === lang)?.label || 'English', [lang])}
              <span style={{ marginLeft: 6, opacity: 0.7 }}>▾</span>
            </motion.button>
            <AnimatePresence>
              {langOpen && (
                <motion.ul
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  role="listbox"
                  className="card"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    minWidth: 220,
                    padding: 8,
                    zIndex: 20,
                  }}
                >
                  {LANGUAGES.map((l) => (
                    <li key={l.code}>
                      <button
                        className={l.code === lang ? 'secondary' : ''}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 10px',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                        onClick={() => {
                          setLang(l.code);
                          setLangOpen(false);
                        }}
                      >
                        <span style={{ fontSize: 16 }}>🌐</span>
                        <span>{l.label}</span>
                        {l.code === lang && (
                          <span style={{ marginLeft: 'auto' }}>✓</span>
                        )}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

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
                <h4>Language</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🌐</span>
                  <select
                    value={lang}
                    onChange={(e) => {
                      setLang(e.target.value);
                    }}
                    aria-label="Select language"
                    style={{ flex: 1 }}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                </div>
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
