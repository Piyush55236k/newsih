import React, { useState } from 'react';
import { motion } from 'framer-motion';

const crops = ['Wheat', 'Paddy', 'Maize', 'Cotton', 'Mustard'];

export default function SoilHealth() {
  const [form, setForm] = useState({
    crop: crops[0],
    N: '',
    P: '',
    K: '',
    S: '',
    Zn: '',
    Fe: '',
    Cu: '',
    Mn: '',
    B: '',
    OC: '',
    pH: '',
    EC: ''
  });
  const [ai, setAi] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function runAI() {
    setAiError('');
    setAiLoading(true);
    setAi(null);
    try {
      const payload = {
        crop: form.crop,
        soil: {
          N: parseFloat(form.N),
          P: parseFloat(form.P),
          K: parseFloat(form.K),
          S: parseFloat(form.S),
          Zn: parseFloat(form.Zn),
          Fe: parseFloat(form.Fe),
          Cu: parseFloat(form.Cu),
          Mn: parseFloat(form.Mn),
          B: parseFloat(form.B),
          OC: parseFloat(form.OC),
          pH: parseFloat(form.pH),
          EC: parseFloat(form.EC)
        }
      };
      const r = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let resp: any;
      try {
        resp = await r.json();
      } catch {
        throw new Error(`Server returned no JSON (status ${r.status})`);
      }

      if (!r.ok || resp.status === 'error') {
        throw new Error(resp?.message || `Request failed (${r.status})`);
      }

      setAi(resp.data);
    } catch (e: any) {
      setAiError(String(e?.message || e));
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <motion.div
      className="grid"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.section className="card fade-in">
        <div className="card-header">
          <h2>🌱 Fertilizer Recommendations</h2>
          <p className="muted">Enter crop and soil test values.</p>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Crop Type</label>
            <select
              value={form.crop}
              onChange={e => update('crop', e.target.value)}
              className="form-select"
            >
              {crops.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {['N','P','K','S','Zn','Fe','Cu','Mn','B','OC','pH','EC'].map(field => (
            <div className="form-group" key={field}>
              <label>{field}</label>
              <input
                type="number"
                value={(form as any)[field]}
                onChange={e => update(field, e.target.value)}
                className="form-input"
              />
            </div>
          ))}
        </div>

        <div className="action-section">
          <motion.button
            onClick={runAI}
            disabled={aiLoading}
            className={`primary-btn ${aiLoading ? 'loading' : ''}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {aiLoading ? 'Running AI Analysis...' : 'Get AI Recommendation'}
          </motion.button>
          {aiError && <div className="error-message">⚠️ {aiError}</div>}
        </div>
      </motion.section>

      {ai && (
        <motion.section className="card result-card">
          <div className="result-header">
            <h3>🎯 Recommendations</h3>
          </div>
          <ul>
            {ai.recommendations.map((m: string, i: number) => (
              <li key={i}>💡 {m}</li>
            ))}
          </ul>
          <h4>🌿 Fertilizer Doses</h4>
          <ul>
            {Object.entries(ai.doses).map(([fert, qty], i) => (
              <li key={i}>{fert}: {qty}</li>
            ))}
          </ul>
        </motion.section>
      )}
    </motion.div>
  );
}
