# Review Backend (Flask + Supabase)

This lightweight backend handles quest evidence submissions and admin reviews. Farmers upload images/screenshots as evidence; admins approve or reject, unlocking claim on the frontend.

## Requirements
- Python 3.10+
- Supabase project URL and Service Role key (for server-side writes)
- Storage bucket named `evidence` (public)

## Setup
1. Create env file (.env.local or OS env):
   - SUPABASE_URL=...
   - SUPABASE_SERVICE_KEY=...
   - ADMIN_KEY=some-strong-random
   - EVIDENCE_BUCKET=evidence
2. Create the table and policies in Supabase (SQL editor):
   - run `SUPABASE_SCHEMA.sql` from this folder.
3. Install deps and run:
   - pip install -r requirements.txt
   - python app.py

The server exposes:
- POST /api/review/evidence/submit
- GET  /api/review/evidence/status?profileId=...
- GET  /api/review/admin/evidence  (header X-Admin-Key required)
- POST /api/review/admin/evidence/decision (header X-Admin-Key required)

## Frontend Configuration
Set in client env (.env):
- VITE_REVIEW_API_BASE=https://your-backend.example.com
- VITE_ADMIN_KEY=... (only used by your browser when opening /admin)

Security note: For production, prefer an admin-only deployment for the Admin UI or protect it behind authentication rather than a shared header key. This repo keeps it simple for demo.
