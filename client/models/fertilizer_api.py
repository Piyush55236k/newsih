from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from fertilizer_rec import fertilizer_recommendation

app = Flask(__name__)
CORS(app, origins=["https://newsih-gtmo.vercel.app", "http://localhost:5173"], supports_credentials=True, methods=["GET", "POST", "OPTIONS"])


@app.route('/recommend', methods=['OPTIONS', 'POST'])
@cross_origin(origins=["https://newsih-gtmo.vercel.app", "http://localhost:5173"], methods=["POST", "OPTIONS"], allow_headers=["Content-Type"])
def recommend():
    if request.method == 'OPTIONS':
        return '', 200
    data = request.json
    crop = data.get('crop')
    soil = data.get('soil')
    if not crop or not soil:
        return jsonify({'error': 'Missing crop or soil data'}), 400
    recs, doses = fertilizer_recommendation(crop, soil)
    return jsonify({'recommendations': recs, 'doses': doses})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
