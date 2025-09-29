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
  const currentLangLabel = useMemo(() => LANGUAGES.find(l => l.code === lang)?.label || 'English', [lang]);

  // Apply language on mount and whenever it changes
  useEffect(() => {
    // Persist and apply
    try { localStorage.setItem('lang', lang); } catch {}
    // Apply without reload first for instant feedback
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

  // Responsive: show hamburger only on mobile, slide menu from top, no overlays
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
          <NavLink to="/" label="Home" icon="🏠" />
          <NavLink to="/shop" label="Shop" icon="🛒" />
        </nav>
        <div className="header-actions mobile-hide">
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
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="tag success">
              <span className="star-icon">⭐</span>
              <span className="points-text">{points} pts</span>
            </span>
          </motion.div>
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
              {currentLangLabel}
              <span style={{ marginLeft: 6, opacity: 0.7 }}>▾</span>
            </motion.button>
            {langOpen && (
              <ul
                role="listbox"
                className="card"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '110%',
                  minWidth: 180,
                  maxHeight: 220,
                  overflowY: 'auto',
                  padding: 8,
                  zIndex: 20,
                  background: 'var(--bg-elevated, #ffffff)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  border: '1px solid var(--border-color, #eee)'
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
                        background: 'transparent',
                        color: 'var(--text-primary)'
                      }}
                      onClick={() => {
                        setLang(l.code);
                        setLangOpen(false);
                        setTimeout(() => applyLanguage(l.code, { reload: true }), 10);
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
              </ul>
            )}
          </div>
          <NavLink to="/profile" label="Profile" icon="🧑‍🌾" />
        </div>
        <button 
          className="mobile-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle mobile menu"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}
        >
          <span style={{ fontSize: 28 }}>{menuOpen ? '✕' : '☰'}</span>
        </button>
      </div>
      {/* Mobile menu: slide down, no overlay, dynamic, attractive */}
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`} style={{ display: menuOpen ? 'block' : 'none', position: 'fixed', top: 60, left: 0, right: 0, background: 'var(--panel-bg-glass)', zIndex: 99, borderRadius: '0 0 18px 18px', boxShadow: '0 8px 32px rgba(31,38,135,0.12)', transition: 'all 0.3s', padding: 0 }}>
        <nav className="mobile-nav" style={{ padding: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 16 }}>
            <span className="tag success" style={{ marginBottom: 4 }}><span className="star-icon">⭐</span> <span className="points-text">{points} pts</span></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
              <span>🌐</span>
              <select
                value={lang}
                onChange={e => {
                  setLang(e.target.value);
                  setTimeout(() => applyLanguage(e.target.value, { reload: true }), 10);
                }}
                aria-label="Select language"
                style={{ flex: 1, borderRadius: 8, padding: '8px 10px', fontSize: 16 }}
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </span>
            <NavLink to="/profile" label="Profile" icon="🧑‍🌾" onClick={() => setMenuOpen(false)} />
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <li><NavLink to="/" label="Home" icon="🏠" onClick={() => setMenuOpen(false)} /></li>
            <li><NavLink to="/shop" label="Shop" icon="🛒" onClick={() => setMenuOpen(false)} /></li>
            <li><NavLink to="/fertilizer" label="Fertilizer" icon="🌱" onClick={() => setMenuOpen(false)} /></li>
            <li><NavLink to="/weather" label="Weather" icon="🌤️" onClick={() => setMenuOpen(false)} /></li>
            <li><NavLink to="/advisory" label="Advisory" icon="🌾" onClick={() => setMenuOpen(false)} /></li>
            <li><NavLink to="/community" label="Community" icon="👥" onClick={() => setMenuOpen(false)} /></li>
            <li><NavLink to="/quests" label="Quests" icon="🎯" onClick={() => setMenuOpen(false)} /></li>
            <li><NavLink to="/market" label="Market" icon="💰" onClick={() => setMenuOpen(false)} /></li>
            <li><NavLink to="/pests" label="Pests" icon="🐛" onClick={() => setMenuOpen(false)} /></li>
            <li><NavLink to="/feedback" label="Feedback" icon="💬" onClick={() => setMenuOpen(false)} /></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
