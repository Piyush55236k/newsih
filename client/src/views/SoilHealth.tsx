import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Supported crops
const crops = ['Wheat', 'Paddy', 'Maize', 'Cotton', 'Mustard'];

type SoilInput = {
  N: number;
  P: number;
  K: number;
  S: number;
  Zn: number;
  Fe: number;
  Cu: number;
  Mn: number;
  B: number;
  OC: number;
  pH: number;
  EC: number;
};

type AIResponse = {
  recommendations: string[];
  doses: Record<string, number>;
};

// Grouping nutrients for cleaner UI
const groups: { label: string; fields: (keyof SoilInput)[] }[] = [
  { label: 'Major Nutrients', fields: ['N', 'P', 'K'] },
  { label: 'Secondary Nutrients', fields: ['S'] },
  { label: 'Micronutrients', fields: ['Zn', 'Fe', 'Cu', 'Mn', 'B'] },
  { label: 'Soil Properties', fields: ['OC', 'pH', 'EC'] },
];

export default function SoilHealth() {
  const [crop, setCrop] = useState(crops[0]);
  const [soil, setSoil] = useState<SoilInput>({
    N: 0, P: 0, K: 0, S: 0, Zn: 0, Fe: 0, Cu: 0, Mn: 0, B: 0, OC: 0, pH: 7, EC: 0
  });

  const [ai, setAi] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function updateSoil(field: keyof SoilInput, value: string) {
    const num = parseFloat(value);
    setSoil(prev => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
  }

  async function runAI() {
    setError('');
    setAi(null);
    setLoading(true);

    try {
      const payload = { crop, soil };
      const res = await fetch('https://fertilizer-5hx9.onrender.com/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();

      if (data.status === 'success') {
        setAi(data.data as AIResponse);
      } else {
        throw new Error(data.message || 'Unknown API error');
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div className="grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <motion.section className="card fade-in" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <h2>🌱 Fertilizer Recommendations</h2>
        <p className="muted">Enter crop and soil nutrient values to get AI-powered fertilizer guidance.</p>

        <div className="form-group">
          <label>Crop Type</label>
          <select value={crop} onChange={e => setCrop(e.target.value)} className="form-select">
            {crops.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {groups.map(group => (
          <div key={group.label} style={{ marginTop: 16 }}>
            <h4>{group.label}</h4>
            <div className="grid" style={{ gap: 8 }}>
              {group.fields.map(field => (
                <div className="form-group" key={field}>
                  <label>{field}</label>
                  <input
                    type="number"
                    value={soil[field]}
                    step="0.1"
                    onChange={e => updateSoil(field, e.target.value)}
                    className="form-input"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <motion.button
          onClick={runAI}
          disabled={loading}
          className={`primary-btn ${loading ? 'loading' : ''}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ marginTop: 16 }}
        >
          {loading ? 'Running AI Analysis…' : 'Get AI Recommendation'}
        </motion.button>

        {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
      </motion.section>

      {ai && (
        <motion.section className="card fade-in-delay-1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <h3>🎯 AI Model Recommendation</h3>

          {ai.recommendations.length > 0 && (
            <div>
              <h4>📋 Recommendations</h4>
              <ul>
                {ai.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
              </ul>
            </div>
          )}

          {Object.keys(ai.doses).length > 0 && (
            <div>
              <h4>🌿 Fertilizer Quantities</h4>
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
