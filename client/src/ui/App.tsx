import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { ensureProfileBootstrap, getProfile } from '../lib/profile';
import { ToastHost } from './Toast';
import Onboarding from './Onboarding';
import Header from './Header';
import FloatingVoiceAssistant from './FloatingVoiceAssistant';

export default function App() {
  const [points, setPoints] = useState<number>(() => getProfile().points);
  const location = useLocation();

  // Listen for profile changes to update points badge
  useEffect(() => {
    const handler = (e: any) => setPoints(e?.detail?.profile?.points ?? getProfile().points);
    window.addEventListener('profile:changed', handler);
    // Bootstrap from cloud if available
    void ensureProfileBootstrap().then(() => setPoints(getProfile().points));
    return () => window.removeEventListener('profile:changed', handler);
  }, []);

  return (
    <div className="app">
      <Header points={points} />
      <motion.main className="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <div className="content-inner">
          <ToastHost />
          <Suspense fallback={<div className="loading">Loading…</div>}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16, scale: 0.995, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </Suspense>
        </div>
      </motion.main>
      <Suspense fallback={<div className="loading">Loading…</div>}>
        <Onboarding />
      </Suspense>
      <FloatingVoiceAssistant />
    </div>
  );
}