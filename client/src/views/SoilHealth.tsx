import { useState } from "react";
import { motion } from "framer-motion";

const crops = ["Wheat", "Paddy", "Maize", "Cotton", "Mustard", "Other"];

export default function SoilHealth() {
  const [form, setForm] = useState({
    crop: crops[0],
    N: 0, P: 0, K: 0,
    S: 0, Zn: 0, Fe: 0, Cu: 0, Mn: 0, B: 0,
    OC: 0, pH: 7, EC: 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const update = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: parseFloat(value) }));
  };

  const runAI = async () => {
    setError("");
    setResult(null);

    setLoading(true);
    try {
      const payload = {
        crop: form.crop.toLowerCase(),
        soil: { ...form }
      };

      const res = await fetch("https://fertilizer-5hx9.onrender.com/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();

      if (data.status === "success") {
        setResult(data.data);
      } else {
        throw new Error(data.message || "Failed to get recommendations");
      }
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <motion.section className="card" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
        <h2>🌱 Fertilizer Recommendations</h2>
        <p className="muted">Enter crop and soil values to get AI-powered fertilizer guidance.</p>

        <div className="form-grid">
          <div className="form-group">
            <label>Crop</label>
            <select value={form.crop} onChange={e => update("crop", e.target.value)}>
              {crops.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group"><label>N (kg/ha)</label><input type="number" value={form.N} onChange={e => update("N", e.target.value)} /></div>
          <div className="form-group"><label>P (kg/ha)</label><input type="number" value={form.P} onChange={e => update("P", e.target.value)} /></div>
          <div className="form-group"><label>K (kg/ha)</label><input type="number" value={form.K} onChange={e => update("K", e.target.value)} /></div>

          <div className="form-group"><label>S (ppm)</label><input type="number" value={form.S} onChange={e => update("S", e.target.value)} /></div>
          <div className="form-group"><label>Zn (ppm)</label><input type="number" value={form.Zn} onChange={e => update("Zn", e.target.value)} /></div>
          <div className="form-group"><label>Fe (ppm)</label><input type="number" value={form.Fe} onChange={e => update("Fe", e.target.value)} /></div>
          <div className="form-group"><label>Cu (ppm)</label><input type="number" value={form.Cu} onChange={e => update("Cu", e.target.value)} /></div>
          <div className="form-group"><label>Mn (ppm)</label><input type="number" value={form.Mn} onChange={e => update("Mn", e.target.value)} /></div>
          <div className="form-group"><label>B (ppm)</label><input type="number" value={form.B} onChange={e => update("B", e.target.value)} /></div>

          <div className="form-group"><label>Organic Carbon (%)</label><input type="number" value={form.OC} onChange={e => update("OC", e.target.value)} /></div>
          <div className="form-group"><label>pH</label><input type="number" value={form.pH} onChange={e => update("pH", e.target.value)} /></div>
          <div className="form-group"><label>EC (dS/m)</label><input type="number" value={form.EC} onChange={e => update("EC", e.target.value)} /></div>
        </div>

        <motion.button
          onClick={runAI}
          disabled={loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`primary-btn ${loading ? "loading" : ""}`}
          style={{ marginTop: 12 }}
        >
          {loading ? "Running AI Analysis..." : "Get Recommendations"}
        </motion.button>

        {error && <div className="error-message">{error}</div>}
      </motion.section>

      {result && (
        <motion.section className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} style={{ marginTop: 12 }}>
          <h3>🎯 Recommendations</h3>
          <ul>{result.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>

          {result.doses && Object.keys(result.doses).length > 0 && (
            <>
              <h4>💊 Fertilizer Quantities</h4>
              <ul>{Object.entries(result.doses).map(([fert, qty], i) => <li key={i}>{fert}: {qty}</li>)}</ul>
            </>
          )}
        </motion.section>
      )}
    </motion.div>
  );
}
