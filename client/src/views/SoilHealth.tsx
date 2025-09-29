import React, { useState } from 'react';
import { motion } from 'framer-motion';

const crops = ['Wheat', 'Paddy', 'Maize', 'Cotton', 'Mustard'];

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

    try {
      const payload = {
        crop: form.crop,
        soil: {
          N: Number(form.N),
          P: Number(form.P),
          K: Number(form.K),
          S: Number(form.S),
          Zn: Number(form.Zn),
          Fe: Number(form.Fe),
          Cu: Number(form.Cu),
          Mn: Number(form.Mn),
          B: Number(form.B),
          OC: Number(form.OC),
          pH: Number(form.pH),
          EC: Number(form.EC)
        }
      };

      const res = await fetch('http://localhost:8080/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Server error (${res.status})`);

      const data = await res.json();
      if (data.status === 'success') {
        setAi(data.data);
      } else {
        setAiError(data.message || 'Unknown server error');
      }
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
      <motion.section className="card">
        <h2>🌱 Fertilizer Recommendations</h2>
        <p className="muted">Enter crop and soil data to get AI-powered fertilizer guidance.</p>

        <div className="form-grid">
          <div className="form-group">
            <label>Crop Type</label>
            <select value={form.crop} onChange={e => update('crop', e.target.value)}>
              {crops.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {['N','P','K','S','Zn','Fe','Cu','Mn','B','OC','pH','EC'].map(nutrient => (
            <div className="form-group" key={nutrient}>
              <label>{nutrient}{['N','P','K'].includes(nutrient)? ' (kg/ha)' : nutrient==='OC'? ' (%)' : nutrient==='pH'? '' : ' (ppm)'}</label>
              <input
                type="number"
                value={(form as any)[nutrient]}
                onChange={e => update(nutrient, e.target.value)}
                placeholder={`Enter ${nutrient}`}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={runAI} disabled={aiLoading}>
            {aiLoading ? 'Running AI Analysis...' : 'Get Recommendation'}
          </button>
          {aiError && <p style={{color:'red'}}>{aiError}</p>}
        </div>
      </motion.section>

      {ai && (
        <motion.section className="card" style={{marginTop:12}}>
          <h3>🎯 AI Model Recommendation</h3>

          {ai.recommendations?.length > 0 && (
            <div>
              <h4>📋 Recommendations</h4>
              <ul>
                {ai.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {ai.doses && (
            <div>
              <h4>🌿 Fertilizer Quantities</h4>
              <ul>
                {Object.entries(ai.doses).map(([fert, qty]) => (
                  <li key={fert}>{fert}: {qty}</li>
                ))}
              </ul>
            </div>
          )}
        </motion.section>
      )}
    </motion.div>
  );
}
