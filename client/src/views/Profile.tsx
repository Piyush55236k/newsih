import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ensureProfileBootstrap, getProfile, syncProfile } from '../lib/profile';
import { getEvidenceStatus } from '../lib/review';
import { questTitleById } from '../lib/quests';

export default function Profile() {
  const [pts, setPts] = useState(getProfile().points);
  const [review, setReview] = useState<Record<string, any>>({});
  const [quests, setQuests] = useState<string[]>(getProfile().completedQuests);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // Always fetch profile data on mount (navigation or reload)
    const fetchProfile = async () => {
      await ensureProfileBootstrap();
      const p = getProfile();
      setPts(p.points);
      setQuests(p.completedQuests);
      try {
        const r = await getEvidenceStatus(getProfile().id);
        setReview(r.byQuest || {});
      } catch {}
    };
    fetchProfile();

    // Listen for profile changes
    const h = (e: any) => {
      setPts(e?.detail?.profile?.points ?? getProfile().points);
      setQuests(e?.detail?.profile?.completedQuests ?? getProfile().completedQuests);
    };
    window.addEventListener('profile:changed', h);
    return () => window.removeEventListener('profile:changed', h);
  }, []);

  const doSync = async () => {
    setSyncing(true);
    setMsg(null);
    const ok = await syncProfile();
    setSyncing(false);
    setMsg(ok ? '✅ Synced with cloud.' : '⚠️ Saved locally. Will sync when online.');
  };

  const doSignOut = () => {
    if (!confirm('Are you sure you want to sign out? This will clear your local data.')) return;
    
    // Clear all local storage data
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear any cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // Reload the page to reset the app state
    window.location.href = '/';
  };

  return (
    <motion.div
      className="profile-container"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="card"
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="profile-header">
          <h2>Profile</h2>
          <p className="muted">
            Your points and progress. Stored locally and synced when possible.
          </p>
        </div>
        <div className="profile-stats">
          <span className="tag success">⭐ Points: {pts}</span>
          <motion.button
            className="secondary"
            onClick={doSync}
            disabled={syncing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </motion.button>
          <motion.button
            className="danger"
            onClick={doSignOut}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            style={{ marginLeft: 8 }}
          >
            🚪 Sign Out
          </motion.button>
          {msg && (
            <span
              className={`tag ${msg.includes('✅') ? 'success' : 'warning'}`}
            >
              {msg}
            </span>
          )}
        </div>
      </motion.div>

      <motion.div
        className="card"
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h3>Completed Quests</h3>
        {quests.length === 0 ? (
          <p className="muted">No quests completed yet. 🚀 Start your journey!</p>
        ) : (
          <motion.ul
            style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {quests.map((q) => (
              <motion.li
                key={q}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  padding: '6px 0',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <b>{questTitleById(q)}</b>
                {review[q] && (
                  <span
                    className={`tag ${
                      review[q].status === 'approved'
                        ? 'success'
                        : review[q].status === 'pending'
                        ? 'warning'
                        : 'info'
                    }`}
                    style={{ marginLeft: 8 }}
                  >
                    {review[q].status}
                  </span>
                )}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </motion.div>
    </motion.div>
  );
}