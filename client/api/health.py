from flask import jsonify

def handler(request):
    return jsonify({"ok": True}), 200
