import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from supabase import create_client, Client
import base64

# IMPORTANT: Load environment variables BEFORE reading them
load_dotenv()

APP_URL = os.getenv('SUPABASE_URL')
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE')
ADMIN_KEY = os.getenv('ADMIN_KEY')
BUCKET = os.getenv('EVIDENCE_BUCKET', 'evidence')
app = Flask(__name__)
CORS(app, resources={r"/api/review/*": {"origins": "*"}})

if not APP_URL or not SERVICE_KEY:
    print('[server] Warning: SUPABASE_URL or SUPABASE_SERVICE_KEY missing; admin/review endpoints will fail')

def supa() -> Client:
    if not APP_URL or not SERVICE_KEY:
        raise RuntimeError('Server not configured: set SUPABASE_URL and SUPABASE_SERVICE_KEY in environment/.env')
    return create_client(APP_URL, SERVICE_KEY)

def require_admin(req):
    key = req.headers.get('X-Admin-Key')
    return ADMIN_KEY and key and key == ADMIN_KEY

def upload_data_url(client: Client, data_url: str, path: str) -> str:
    """Upload a data URL image to Supabase storage and return public URL"""
    if not data_url.startswith('data:'):
        raise ValueError('Invalid data URL')
    b64 = data_url.split(',', 1)[1]
    blob = base64.b64decode(b64)
    resp = client.storage.from_(BUCKET).upload(path, blob, { 'contentType': 'image/jpeg', 'upsert': True })
    # Convert to public URL
    pub = client.storage.from_(BUCKET).get_public_url(path)
    return pub

@app.get('/api/review/health')
def health():
    return jsonify({ 'ok': True, 'time': datetime.utcnow().isoformat() + 'Z' })

@app.post('/api/review/evidence/submit')
def submit_evidence():
    try:
        payload = request.get_json(force=True)
        profile_id = payload.get('profileId')
        quest_id = payload.get('questId')
        notes = payload.get('notes')
        image_url = payload.get('imageUrl')
        image_data = payload.get('imageData')
        if not profile_id or not quest_id:
            return jsonify({ 'error': 'profileId and questId required' }), 400
        client = supa()
        if image_data and not image_url:
            path = f"{profile_id}/{int(datetime.utcnow().timestamp())}_{quest_id}.jpg"
            image_url = upload_data_url(client, image_data, path)
        row = {
            'profile_id': profile_id,
            'quest_id': quest_id,
            'image_url': image_url,
            'notes': notes,
            'status': 'pending'
        }
        data = client.table('quest_evidence').insert(row).execute()
        return jsonify({ 'ok': True, 'id': data.data[0]['id'], 'status': 'pending', 'imageUrl': image_url })
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500

@app.get('/api/review/evidence/status')
def evidence_status():
    try:
        profile_id = request.args.get('profileId')
        if not profile_id:
            return jsonify({ 'error': 'profileId required' }), 400
        client = supa()
        # Get latest status per quest for this profile
        # Supabase does not support DISTINCT ON easily; fetch recent and reduce client-side
        res = client.table('quest_evidence').select('*').eq('profile_id', profile_id).order('created_at', desc=True).limit(200).execute()
        latest = {}
        for r in res.data or []:
            qid = r.get('quest_id')
            if qid not in latest:
                latest[qid] = { 'status': r.get('status'), 'id': r.get('id'), 'imageUrl': r.get('image_url'), 'notes': r.get('notes') }
        return jsonify({ 'ok': True, 'byQuest': latest })
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500

# Admin endpoints
@app.get('/api/review/admin/evidence')
def admin_list():
    if not require_admin(request):
        return jsonify({ 'error': 'unauthorized' }), 401
    try:
        status = request.args.get('status') or 'pending'
        client = supa()
        q = client.table('quest_evidence').select('*').order('created_at', desc=True).limit(200)
        if status and status != 'all':
            q = q.eq('status', status)
        res = q.execute()
        return jsonify({ 'ok': True, 'items': res.data })
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500

@app.post('/api/review/admin/evidence/decision')
def admin_decide():
    if not require_admin(request):
        return jsonify({ 'error': 'unauthorized' }), 401
    try:
        payload = request.get_json(force=True)
        evid_id = payload.get('id')
        decision = payload.get('decision')  # 'approved' | 'rejected'
        # reward is not applied server-side to avoid double counting; client will claim points after approval
        if not evid_id or decision not in ('approved','rejected'):
            return jsonify({ 'error': 'id and decision required' }), 400
        client = supa()
        # Update evidence row
        client.table('quest_evidence').update({
            'status': decision,
            'decided_at': datetime.utcnow().isoformat() + 'Z'
        }).eq('id', evid_id).execute()
        return jsonify({ 'ok': True })
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', '8000')))
