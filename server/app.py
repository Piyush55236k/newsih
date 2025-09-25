import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from supabase import create_client, Client
try:
    # storage3 is used under the hood by supabase-py; FileOptions ensures headers are strings
    from storage3.utils import FileOptions  # type: ignore
except Exception:
    FileOptions = None  # type: ignore
import base64
import json

# IMPORTANT: Load environment variables BEFORE reading them
load_dotenv()

APP_URL = os.getenv('SUPABASE_URL')
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE')
ADMIN_KEY = os.getenv('ADMIN_KEY')
BUCKET = os.getenv('EVIDENCE_BUCKET', 'evidence')
app = Flask(__name__)
# Allow all API routes for simplicity
CORS(app, resources={r"/api/*": {"origins": "*"}})

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
    # Use FileOptions to avoid sending boolean header types which cause: "Header value must be str or bytes"
    try:
        if FileOptions is not None:
            opts = FileOptions(content_type="image/jpeg", upsert=True)
            client.storage.from_(BUCKET).upload(path, blob, opts)
        else:
            # Call without options when utils are unavailable
            client.storage.from_(BUCKET).upload(path, blob)
    except Exception:
        # Last resort: try without options at all
        client.storage.from_(BUCKET).upload(path, blob)
    # Convert to public URL
    pub = client.storage.from_(BUCKET).get_public_url(path)
    return pub

def storage_path_from_public_url(url: str) -> str | None:
    # public url looks like: https://<proj>.supabase.co/storage/v1/object/public/<bucket>/<path>
    try:
        marker = f"/storage/v1/object/public/{BUCKET}/"
        if marker in url:
            return url.split(marker, 1)[1]
    except Exception:
        pass
    return None

# ---- Profile helpers ----
def _parse_quests(value):
    try:
        if isinstance(value, list):
            return [str(x) for x in value]
        if value is None:
            return []
        arr = json.loads(str(value))
        return [str(x) for x in arr] if isinstance(arr, list) else []
    except Exception:
        return []

def _ensure_profile(client: Client, profile_id: str):
    """Ensure a profile row exists; return the row as dict."""
    row = { 'id': profile_id, 'points': 0, 'quests_completed': [] }
    try:
        res = client.table('profiles').select('*').eq('id', profile_id).maybe_single().execute()
        data = getattr(res, 'data', None)
        if data:
            return data
        # create
        client.table('profiles').insert(row).execute()
        return row
    except Exception:
        # best effort upsert
        try:
            client.table('profiles').upsert(row).execute()
        except Exception:
            pass
        return row

@app.get('/api/profile/state')
def profile_state():
    try:
        profile_id = request.args.get('profileId')
        if not profile_id:
            return jsonify({ 'error': 'profileId required' }), 400
        client = supa()
        prof = _ensure_profile(client, profile_id)
        points = int(prof.get('points') or 0)
        completed = _parse_quests(prof.get('quests_completed'))
        # last 50 ledger entries
        try:
            led = client.table('point_ledger').select('*').eq('user_id', profile_id).order('created_at', desc=True).limit(50).execute().data or []
        except Exception:
            led = []
        # last 50 claims
        try:
            claims = client.table('quest_claims').select('*').eq('user_id', profile_id).order('claimed_at', desc=True).limit(50).execute().data or []
        except Exception:
            claims = []
        return jsonify({ 'ok': True, 'profile': { 'id': profile_id, 'points': points, 'completedQuests': completed }, 'ledger': led, 'claims': claims })
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500

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
        # Duplicate prevention: do not allow new submission if an active one exists
        existing = client.table('quest_evidence').select('id,status').eq('profile_id', profile_id).eq('quest_id', quest_id).in_('status', ['pending','approved']).limit(1).execute()
        if existing.data:
            return jsonify({ 'error': 'An active submission already exists for this quest.' }), 409
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
        decision = payload.get('decision')  # 'approved' | 'rejected' | 'pending'
        # reward is not applied server-side to avoid double counting; client will claim points after approval
        if not evid_id or decision not in ('approved','rejected','pending'):
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

@app.post('/api/review/admin/evidence/delete')
def admin_delete():
    if not require_admin(request):
        return jsonify({ 'error': 'unauthorized' }), 401
    try:
        payload = request.get_json(force=True)
        evid_id = payload.get('id')
        if not evid_id:
            return jsonify({ 'error': 'id required' }), 400
        client = supa()
        # fetch record first to know image path
        rec = client.table('quest_evidence').select('*').eq('id', evid_id).maybe_single().execute()
        image_url = None
        try:
            data_obj = rec.data if isinstance(rec, object) else None
            if isinstance(data_obj, dict):
                image_url = data_obj.get('image_url')
        except Exception:
            pass
        # delete row
        client.table('quest_evidence').delete().eq('id', evid_id).execute()
        # attempt to remove file if exists
        if image_url:
            rel = storage_path_from_public_url(str(image_url))
            if rel:
                try:
                    client.storage.from_(BUCKET).remove([rel])
                except Exception:
                    pass
        return jsonify({ 'ok': True })
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500

@app.post('/api/review/admin/revoke')
def admin_revoke():
    """Revoke a quest approval: set evidence to rejected or delete, deduct points, and remove quest from profile."""
    if not require_admin(request):
        return jsonify({ 'error': 'unauthorized' }), 401
    try:
        payload = request.get_json(force=True)
        profile_id = payload.get('profileId')
        quest_id = payload.get('questId')
        points = int(payload.get('points') or 0)
        delete_evidence = bool(payload.get('deleteEvidence'))
        if not profile_id or not quest_id:
            return jsonify({ 'error': 'profileId and questId required' }), 400
        client = supa()
        # Adjust profile: deduct points and remove quest from completed list
        prof = client.table('profiles').select('id,points,quests_completed').eq('id', profile_id).maybe_single().execute()
        cur_points = 0
        cur_quests = []
        try:
            d = getattr(prof, 'data', None) or {}
            cur_points = int(d.get('points') or 0)
            qraw = d.get('quests_completed')
            if isinstance(qraw, list):
                cur_quests = [str(x) for x in qraw]
            else:
                try:
                    import json
                    parsed = json.loads(str(qraw))
                    if isinstance(parsed, list):
                        cur_quests = [str(x) for x in parsed]
                except Exception:
                    pass
        except Exception:
            pass
        new_points = max(0, cur_points - max(0, points))
        new_quests = [q for q in cur_quests if q != quest_id]
        client.table('profiles').upsert({
            'id': profile_id,
            'points': new_points,
            'quests_completed': new_quests,
            'updated_at': datetime.utcnow().isoformat() + 'Z'
        }).execute()
        # Update or delete evidence rows
        if delete_evidence:
            client.table('quest_evidence').delete().eq('profile_id', profile_id).eq('quest_id', quest_id).execute()
        else:
            client.table('quest_evidence').update({ 'status': 'rejected' }).eq('profile_id', profile_id).eq('quest_id', quest_id).execute()
        # Mark active claim as revoked if exists
        try:
            client.table('quest_claims').update({ 'status': 'revoked' }).eq('user_id', profile_id).eq('quest_id', quest_id).eq('status','claimed').execute()
        except Exception:
            pass
        return jsonify({ 'ok': True, 'newPoints': new_points })
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500

# Community and Feedback admin management
@app.get('/api/admin/posts')
def admin_posts_list():
    if not require_admin(request):
        return jsonify({ 'error': 'unauthorized' }), 401
    try:
        client = supa()
        res = client.table('posts').select('id,created_at,author,content').order('created_at', desc=True).limit(200).execute()
        return jsonify({ 'ok': True, 'items': res.data })
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500

@app.post('/api/admin/posts/delete')
def admin_posts_delete():
    if not require_admin(request):
        return jsonify({ 'error': 'unauthorized' }), 401
    try:
        payload = request.get_json(force=True)
        pid = payload.get('id')
        if not pid:
            return jsonify({ 'error': 'id required' }), 400
        client = supa()
        client.table('posts').delete().eq('id', pid).execute()
        return jsonify({ 'ok': True })
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500

@app.get('/api/admin/feedback')
def admin_feedback_list():
    if not require_admin(request):
        return jsonify({ 'error': 'unauthorized' }), 401
    try:
        client = supa()
        res = client.table('feedback').select('id,created_at,rating,comment').order('created_at', desc=True).limit(200).execute()
        return jsonify({ 'ok': True, 'items': res.data })
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500

@app.post('/api/admin/feedback/delete')
def admin_feedback_delete():
    if not require_admin(request):
        return jsonify({ 'error': 'unauthorized' }), 401
    try:
        payload = request.get_json(force=True)
        fid = payload.get('id')
        if not fid:
            return jsonify({ 'error': 'id required' }), 400
        client = supa()
        client.table('feedback').delete().eq('id', fid).execute()
        return jsonify({ 'ok': True })
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500

@app.post('/api/quests/claim')
def quests_claim():
    """Claim quest reward after approval. Prevents double-claiming and updates points and completed list.
    Body: { profileId, questId, reward, evidenceId? }
    """
    try:
        payload = request.get_json(force=True)
        profile_id = payload.get('profileId')
        quest_id = payload.get('questId')
        reward = int(payload.get('reward') or 0)
        evidence_id = payload.get('evidenceId')
        if not profile_id or not quest_id:
            return jsonify({ 'error': 'profileId and questId required' }), 400
        client = supa()
        _ensure_profile(client, profile_id)
        # Verify evidence approved
        q = client.table('quest_evidence').select('id,status').eq('profile_id', profile_id).eq('quest_id', quest_id).eq('status','approved').order('created_at', desc=True).limit(1).execute()
        if not q.data:
            return jsonify({ 'error': 'No approved evidence found' }), 400
        evid = q.data[0]['id']
        if evidence_id and str(evidence_id) != str(evid):
            # not a hard error; proceed if there is an approved one
            pass
        # Prevent double claim
        already = client.table('quest_claims').select('id').eq('user_id', profile_id).eq('quest_id', quest_id).eq('status','claimed').limit(1).execute()
        if already.data:
            return jsonify({ 'error': 'Quest already claimed' }), 409
        # Update profile
        prof_res = client.table('profiles').select('points,quests_completed').eq('id', profile_id).maybe_single().execute()
        prof = getattr(prof_res, 'data', None) or {}
        points = int(prof.get('points') or 0) + max(0, reward)
        completed = _parse_quests(prof.get('quests_completed'))
        if quest_id not in completed:
            completed.append(quest_id)
        client.table('profiles').upsert({ 'id': profile_id, 'points': points, 'quests_completed': completed, 'updated_at': datetime.utcnow().isoformat() + 'Z' }).execute()
        # Insert claim and ledger (best-effort)
        try:
            client.table('quest_claims').insert({ 'user_id': profile_id, 'quest_id': quest_id, 'reward': reward, 'status': 'claimed', 'evidence_id': evid }).execute()
        except Exception:
            pass
        try:
            client.table('point_ledger').insert({ 'user_id': profile_id, 'delta': reward, 'reason': quest_id, 'source': 'quest', 'evidence_id': evid }).execute()
        except Exception:
            pass
        return jsonify({ 'ok': True, 'points': points, 'completedQuests': completed })
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', '8000')))
