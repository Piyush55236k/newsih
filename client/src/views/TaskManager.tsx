

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const cropSteps: Record<string, string[]> = {
  Wheat: [
    'Select high-quality wheat seeds suited for your region and climate.',
    'Test soil for pH and nutrients; amend as needed for optimal wheat growth.',
    'Plow, harrow, and level the field to create a fine seedbed.',
    'Apply basal fertilizers (NPK) as per soil test recommendations.',
    'Sow seeds at 4-5 cm depth, spacing 20 cm between rows, 5 cm between plants.',
    'Irrigate immediately after sowing, then at tillering, booting, and grain filling stages.',
    'Scout for rust, blight, and aphids; use recommended fungicides/insecticides if needed.',
    'Remove weeds at 2-3 week intervals using manual or chemical methods.',
    'Monitor crop for lodging and support if necessary.',
    'Harvest when grains are hard and moisture is below 14%.',
    'Dry grains thoroughly and store in moisture-proof containers.'
  ],
  Rice: [
    'Select region-appropriate rice variety (short/long duration, flood/drought tolerant).',
    'Prepare nursery beds; treat seeds with fungicide before sowing.',
    'Transplant healthy seedlings (20-25 days old) at 20x15 cm spacing.',
    'Maintain 5-10 cm standing water in the field during vegetative growth.',
    'Apply split doses of nitrogen fertilizer at transplanting, tillering, and panicle initiation.',
    'Control weeds with pre-emergence herbicide and hand weeding.',
    'Monitor for stem borer, leaf folder, blast; use IPM practices.',
    'Drain water before harvest; cut when grains are mature and golden.',
    'Dry and store rice in aerated, pest-free storage.'
  ],
  Maize: [
    'Choose hybrid maize seeds suited for local climate.',
    'Test soil and apply lime if acidic; add organic manure.',
    'Sow seeds at 75x20 cm spacing, 4-5 cm deep.',
    'Apply starter fertilizer and top-dress with nitrogen at knee-high and tasseling stages.',
    'Irrigate during dry spells, especially at flowering and grain filling.',
    'Scout for fall armyworm, stem borer, and treat as needed.',
    'Remove weeds early; use mulching for moisture conservation.',
    'Harvest when husks are dry and kernels are hard.',
    'Shell and store maize in dry, ventilated bins.'
  ],
  Potato: [
    'Select certified, disease-free potato tubers.',
    'Prepare soil with compost and ensure loose, well-drained texture.',
    'Cut large tubers into pieces with at least one eye each.',
    'Plant tubers 10 cm deep, 30 cm apart in rows 60 cm apart.',
    'Apply phosphorus and potassium fertilizer at planting; nitrogen after emergence.',
    'Irrigate regularly, avoid waterlogging; hill up soil around stems as plants grow.',
    'Monitor for late blight, aphids, and treat promptly.',
    'Remove weeds and maintain soil moisture.',
    'Harvest when foliage yellows and dies back.',
    'Cure potatoes for 1-2 weeks in cool, dark place before storage.'
  ]
};

function getWeatherAlerts(wx: { temperature?: number; windspeed?: number; precipitation?: number } | null): string[] {
  if (!wx) return [];
  const alerts: string[] = [];
  if (typeof wx.precipitation === 'number' && wx.precipitation > 0.5) alerts.push('Rain expected: delay irrigation and protect inputs.');
  if (typeof wx.windspeed === 'number' && wx.windspeed > 30) alerts.push('High winds: avoid spraying; stake/support tender crops.');
  if (typeof wx.temperature === 'number' && wx.temperature < 5) alerts.push('Frost risk: use mulching/irrigation to buffer soil heat.');
  if (typeof wx.temperature === 'number' && wx.temperature > 38) alerts.push('Heat stress: irrigate early morning/late evening.');
  return alerts;
}

export default function TaskManager() {
  const cropList = Object.keys(cropSteps);
  const [crop, setCrop] = useState(cropList[0]);
  const [checked, setChecked] = useState<boolean[]>(() => cropSteps[crop].map(() => false));
  const [wx, setWx] = useState<{ temperature?: number; windspeed?: number; precipitation?: number } | null>(null);

  // Fetch weather data using Open-Meteo API
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,wind_speed_10m&timezone=auto`;
      fetch(url)
        .then(r => r.json())
        .then(d => {
          const c = d.current;
          setWx({ temperature: c.temperature_2m, windspeed: c.wind_speed_10m, precipitation: c.precipitation });
        })
        .catch(() => setWx(null));
    }, () => setWx(null));
  }, []);

  // Update checkboxes when crop changes
  const handleCropChange = (newCrop: string) => {
    setCrop(newCrop);
    setChecked(cropSteps[newCrop].map(() => false));
  };

  const handleCheck = (idx: number) => {
    setChecked(arr => arr.map((v, i) => i === idx ? !v : v));
  };

  const weatherAlerts = getWeatherAlerts(wx);

  return (
    <motion.div className="fade-in" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.4 }}>
      <div className="card bg-gradient-blue" style={{ marginBottom: 16 }}>
        <h2>📝 Task Manager</h2>
        <p className="muted">Choose a crop to see step-by-step instructions for growing it. Mark steps as completed.</p>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <label htmlFor="crop-select">Select Crop:</label>
        <select id="crop-select" value={crop} onChange={e => handleCropChange(e.target.value)} style={{ marginLeft: 8 }}>
          {cropList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {weatherAlerts.length > 0 && (
        <div className="card alerts-card" style={{ marginBottom: 16 }}>
          <h3>🌤️ Weather Alerts</h3>
          <ul>
            {weatherAlerts.map((alert, idx) => (
              <li key={idx} style={{ color: '#d9534f', marginBottom: 4 }}>⚠️ {alert}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="card">
        <h3>Steps to Grow {crop}</h3>
        <ul className="task-steps">
          {cropSteps[crop].map((step, idx) => (
            <li key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <input type="checkbox" checked={checked[idx]} onChange={() => handleCheck(idx)} style={{ marginRight: 8 }} />
              <span style={{ textDecoration: checked[idx] ? 'line-through' : 'none' }}>{step}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
