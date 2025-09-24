# Smart Agri Assistant (React + Vite)

Features
- Soil health recommendations and fertilizer guidance
- Weather-based alerts and predictive insights
- Pest/disease detection via image uploads (on-device heuristic)
- Market price tracking (local persistence)
- Voice assistance (multilingual TTS + STT if supported)
- Feedback and usage data collection (local analytics)
- Community posts (local-only)
- Quests (guided tasks)

Dev
```powershell
npm install
npm run dev
```

Build
```powershell
npm run build
npm run preview
```

Notes
- STT requires Chromium-based browsers. TTS uses Web Speech API.
- Weather uses open-meteo (no key). Market/community/feedback stored in localStorage.