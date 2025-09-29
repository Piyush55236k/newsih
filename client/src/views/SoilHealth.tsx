import React, { useState } from 'react';
import { motion } from 'framer-motion';

const crops = [
  'Wheat', 'Rice', 'Maize', 'Barley', 'Soybean', 'Cotton', 'Sugarcane', 'Potato', 'Tomato', 'Onion', 'Other'
];

export default function SoilHealth() {
  const [form, setForm] = useState({
    crop: crops[0],
    N: '', P: '', K: '',
    S: '', Zn: '', Fe: '', Cu: '', Mn: '', B: '',
    OC: '', pH: '', EC: ''
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

    // Prepare soil data
    const soilData: Record<string, number> = {};
    ['N','P','K','S','Zn','Fe','Cu','Mn','B','OC','pH','EC'].forEach(key => {
      soilData[key] = parseFloat(form[key as keyof typeof form]) || 0;
    });

    try {
      const payload = {
        crop: form.crop,
        soil: soilData
      };
      const r = await fetch('https://fertilizer-5hx9.onrender.com/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error(`Request failed (${r.status})`);
      const resp = await r.json();
      if(resp.status === 'success') {
        setAi(resp.data);
      } else {
        setAiError(resp.message || 'Unknown error from API');
      }
    } catch (e: any) {
      setAiError(String(e?.message || e));
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <motion.div className="grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <motion.section className="card fade-in" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <h2>🌱 Fertilizer Recommendations</h2>
        <p className="muted">Enter crop and soil nutrient values to get AI-powered fertilizer guidance.</p>

        <div className="form-grid">
          <div className="form-group">
            <label>Crop Type</label>
            <select value={form.crop} onChange={e => update('crop', e.target.value)} className="form-select">
              {crops.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {['N','P','K','S','Zn','Fe','Cu','Mn','B','OC','pH','EC'].map(key => (
            <div className="form-group" key={key}>
              <label>{key} {['N','P','K'].includes(key) ? '(kg/ha)' : ['S','Zn','Fe','Cu','Mn','B'].includes(key) ? '(ppm)' : key==='OC' ? '(%)' : key==='EC' ? '(dS/m)' : ''}</label>
              <input
                type="number"
                value={form[key as keyof typeof form]}
                onChange={e => update(key, e.target.value)}
                placeholder={`Enter ${key} value`}
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
            animate={aiLoading ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.5, repeat: aiLoading ? Infinity : 0 }}
          >
            {aiLoading ? 'Running AI Analysis...' : 'Get AI Recommendation'}
          </motion.button>
          {aiError && <div className="error-message">{aiError}</div>}
        </div>
      </motion.section>

      {ai && (
        <motion.section className="card result-card fade-in-delay-1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <h3>🎯 AI Model Recommendation</h3>
          {ai.recommendations && (
            <ul>
              {ai.recommendations.map((rec: string, i: number) => <li key={i}>{rec}</li>)}
            </ul>
          )}
          {ai.doses && (
            <div>
              <h4>Fertilizer Quantities</h4>
              <ul>
                {Object.entries(ai.doses).map(([fert, qty]) => <li key={fert}>{fert}: {qty}</li>)}
              </ul>
            </div>
          )}
        </motion.section>
      )}
    </motion.div>
  );
}
