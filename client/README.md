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

Backend (AI model)
- Render (recommended): deploy `models/app.py` as a Render Web Service.
	- Build: `pip install -r requirements.txt` (in `models/`)
	- Start: `gunicorn app:app --bind 0.0.0.0:10000`
	- Copy your service URL, e.g., `https://sihdemo75.onrender.com`
- Frontend env:
	- Set `VITE_SIH_API_URL` to your Render URL so the app calls `POST <URL>/recommend`.
	- For Vercel serverless instead, the app uses relative paths under `/api/model/*` automatically.

Notes
- STT requires Chromium-based browsers. TTS uses Web Speech API.
- Weather uses open-meteo (no key). Market/community/feedback stored in localStorage.