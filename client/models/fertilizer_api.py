from flask import Flask, request, jsonify
from fertilizer_rec import fertilizer_recommendation

app = Flask(__name__)

@app.route('/fertilizer', methods=['POST'])
def recommend():
    data = request.json
    crop = data.get('crop')
    soil = data.get('soil')
    if not crop or not soil:
        return jsonify({'error': 'Missing crop or soil data'}), 400
    recs, doses = fertilizer_recommendation(crop, soil)
    return jsonify({'recommendations': recs, 'doses': doses})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
