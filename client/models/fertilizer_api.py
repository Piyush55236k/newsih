from flask import Flask, request, jsonify
from flask_cors import CORS
from fertilizer_rec import fertilizer_recommendation

app = Flask(__name__)

# Global CORS setup
CORS(
    app,
    origins=["https://newsih-gtmo.vercel.app", "http://localhost:5173"],
    supports_credentials=True,
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"]
)

@app.route('/recommend', methods=['POST', 'OPTIONS'])
def recommend():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON body'}), 400

    crop = data.get('crop')
    soil = data.get('soil')

    if not crop or not soil:
        return jsonify({'error': 'Missing crop or soil data'}), 400
    if not isinstance(crop, str) or not isinstance(soil, str):
        return jsonify({'error': 'Invalid input format'}), 400

    try:
        recs, doses = fertilizer_recommendation(crop, soil)
        return jsonify({
            'status': 'success',
            'data': {
                'recommendations': recs,
                'doses': doses
            }
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
