import React, { useState } from 'react';
import { motion } from 'framer-motion';

const crops = ['Wheat', 'Paddy', 'Maize', 'Cotton', 'Mustard'];

type FertilizerResult = {
  recommendations: string[];
  doses: Record<string, number>;
};

export default function SoilHealth() {
  const [form, setForm] = useState({
    crop: crops[0],
    N: 0,
    P: 0,
    K: 0,
    S: 0,
    Zn: 0,
    Fe: 0,
    Cu: 0,
    Mn: 0,
    B: 0,
    OC: 0,
    pH: 7,
    EC: 0
  });

  const [result, setResult] = useState<FertilizerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: string) {
    const val = parseFloat(value);
    setForm(f => ({ ...f, [field]: isNaN(val) ? 0 : val }));
  }

  async function runAI() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('https://fertilizer-5hx9.onrender.com/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop: form.crop,
          soil: {
            N: form.N,
            P: form.P,
            K: form.K,
            S: form.S,
            Zn: form.Zn,
            Fe: form.Fe,
            Cu: form.Cu,
            Mn: form.Mn,
            B: form.B,
            OC: form.OC,
            pH: form.pH,
            EC: form.EC
          }
        })
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = (await res.json()) as { status: string; data?: FertilizerResult; message?: string };
      if (data.status === 'success' && data.data) {
        setResult(data.data);
      } else {
        throw new Error(data.message || 'Failed to get recommendations');
      }
    } catch (e: any) {
      setError(e?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="grid"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.section
        className="card"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2>🌱 Fertilizer Recommendations</h2>
        <p className="muted">Enter crop and soil values to get AI-powered fertilizer guidance.</p>

        <div className="form-grid">
          <div className="form-group">
            <label>Crop Type</label>
            <select value={form.crop} onChange={e => setForm(f => ({ ...f, crop: e.target.value }))}>
              {crops.map(c => (
                <option key={c} value={c}>{c}</option>
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
                min={0}
                step={field === 'pH' || field === 'EC' ? 0.1 : 1}
              />
            </div>
          ))}
        </div>

        <div className="action-section">
          <button onClick={runAI} disabled={loading}>
            {loading ? 'Calculating...' : 'Get Recommendations'}
          </button>
          {error && <div className="error-message">{error}</div>}
        </div>
      </motion.section>

      {result && (
        <motion.section
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h3>🎯 AI Recommendations</h3>

          {result.recommendations.length > 0 && (
            <>
              <h4>📋 Advice</h4>
              <ul>
                {result.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </>
          )}

          {Object.keys(result.doses).length > 0 && (
            <>
              <h4>🌿 Fertilizer Doses</h4>
              <ul>
                {Object.entries(result.doses).map(([fert, qty], i) => (
                  <li key={i}>
                    {fert}: {qty}
                  </li>
                ))}
              </ul>
            </>
          )}
        </motion.section>
      )}
    </motion.div>
  );
}
