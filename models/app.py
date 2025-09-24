from flask import Flask, request, jsonify
from flask_cors import CORS
from math import ceil
import logging
import os
from typing import Any, Dict, Tuple, List, Optional

def create_app() -> Flask:
    
    app = Flask(__name__)
    # Restrict CORS to frontend domain when provided, else allow all (dev)
    frontend_origin = os.environ.get("FRONTEND_ORIGIN")
    if frontend_origin:
        CORS(app, origins=[frontend_origin], supports_credentials=True)
    else:
        CORS(app)

    # Set up logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')

    @app.route("/")
    def home():
        return "Agro_Mitra Python backend is running!", 200

    # Secondary health path for serverless routing checks
    @app.route("/api/health")
    def health():
        return jsonify({"ok": True}), 200

    @app.errorhandler(Exception)
    def handle_exception(e):
        logging.error(f"Unhandled error: {e}")
        return jsonify({"error": "Internal server error"}), 500

    # ---------------- API Endpoint ---------------- #
    @app.route("/recommend", methods=["POST"])
    def recommend():
        """API endpoint for fertilizer recommendation."""
        data = request.json
        crop = data.get("crop")
        inputs = data.get("inputs", {})
        try:
            msgs, plan = recommend_for_farmer(inputs, crop)
            return jsonify({"messages": msgs, "fertilizer_plan": plan})
        except ValueError as ve:
            logging.warning(f"Validation error: {ve}")
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            logging.error(f"Error in recommend: {e}")
            return jsonify({"error": "Prediction failed"}), 500

    return app

app = create_app()

# ---------------- Utility Functions ---------------- #

def interpret(value: Any, low: Optional[float]=None, high: Optional[float]=None) -> Optional[float]:
    """Interpret qualitative or quantitative soil test values."""
    if isinstance(value, (int, float)):
        return float(value)
    v = str(value).strip().lower()
    if v in ("low", "l"): return low * 0.8
    if v in ("medium", "med", "m"): return (low + high)/2
    if v in ("high", "h"): return high * 1.2
    try: return float(value)
    except: return None

def round_up(x: float) -> int:
    """Round up to nearest integer."""
    return ceil(x)

baseline_npk: Dict[str, Tuple[int, int, int]] = {
    "wheat": (120, 60, 40),
    "paddy": (150, 60, 40),
    "maize": (150, 75, 50),
    "cotton": (100, 50, 50),
    "mustard": (80, 40, 30),
}

FERT_N_CONTENT = {
    "urea": 0.46,
    "dap": {"N": 0.18, "P2O5": 0.46},
    "mop": {"K2O": 0.60},
    "gypsum": {"S": 0.18},
    "znso4": {"Zn": 0.21},
    "borax": {"B": 0.11},
    "compost": {"OC": 0.5}
}

ref_thresholds = {
    "N": (280, 500), "P": (10, 25), "K": (120, 280), "S": (10,20),
    "Zn": (0.6, 1.5), "Fe": (4.5,10), "Cu":(0.2,1), "Mn":(2,5),
    "B":(0.5,1), "OC":(0.5,0.8), "pH":(6.5,7.5), "EC":(0,4)
}

def recommend_for_farmer(inputs: Dict[str, Any], crop_name: str) -> Tuple[List[str], Dict[str, Any]]:
    """
    Generate fertilizer recommendations for a farmer based on soil test inputs and crop.
    N, P, K, pH, EC are mandatory; others are optional.
    """
    crop = crop_name.lower()
    if crop not in baseline_npk:
        raise ValueError(f"Unsupported crop: {crop}")

    # Mandatory inputs
    missing = [k for k in ["N", "P", "K", "pH", "EC"] if inputs.get(k) is None]
    if missing:
        raise ValueError(f"Missing mandatory input(s): {', '.join(missing)}")

    N = interpret(inputs.get("N"), *ref_thresholds["N"])
    P = interpret(inputs.get("P"), *ref_thresholds["P"])
    K = interpret(inputs.get("K"), *ref_thresholds["K"])
    pH = interpret(inputs.get("pH"), *ref_thresholds["pH"])
    EC = interpret(inputs.get("EC"), *ref_thresholds["EC"])

    # Optional inputs
    S = interpret(inputs.get("S"), *ref_thresholds["S"]) if inputs.get("S") is not None else None
    Zn = interpret(inputs.get("Zn"), *ref_thresholds["Zn"]) if inputs.get("Zn") is not None else None
    Fe = interpret(inputs.get("Fe"), *ref_thresholds["Fe"]) if inputs.get("Fe") is not None else None
    Cu = interpret(inputs.get("Cu"), *ref_thresholds["Cu"]) if inputs.get("Cu") is not None else None
    Mn = interpret(inputs.get("Mn"), *ref_thresholds["Mn"]) if inputs.get("Mn") is not None else None
    B = interpret(inputs.get("B"), *ref_thresholds["B"]) if inputs.get("B") is not None else None
    OC = interpret(inputs.get("OC"), *ref_thresholds["OC"]) if inputs.get("OC") is not None else None

    base_N, base_P2O5, base_K2O = baseline_npk[crop]

    # Compute nutrient gaps
    need_N = max(0.0, base_N - (N if N else 0))
    need_P2O5 = max(0.0, base_P2O5 - (P if P else 0))
    need_K2O = max(0.0, base_K2O - (K if K else 0))

    if OC is not None and OC < ref_thresholds["OC"][0]:
        need_N *= 1.1
    if EC is not None and EC > 4:
        need_N *= 0.8; need_P2O5 *= 0.8; need_K2O *= 0.8

    fert_plan = {}
    messages = []

    if need_P2O5 > 0:
        dap_needed = round_up(need_P2O5 / FERT_N_CONTENT["dap"]["P2O5"])
        N_from_dap = dap_needed * FERT_N_CONTENT["dap"]["N"]
        fert_plan["DAP_kg/ha"] = dap_needed
        messages.append(f"Apply {dap_needed} kg/ha DAP because phosphorus is below recommended level for {crop_name}.")
    else:
        N_from_dap = 0

    remaining_N = max(0.0, need_N - N_from_dap)
    if remaining_N > 0:
        urea_needed = round_up(remaining_N / FERT_N_CONTENT["urea"])
        fert_plan["Urea_kg/ha"] = urea_needed
        messages.append(f"Apply {urea_needed} kg/ha Urea because nitrogen is below recommended level for {crop_name}.")

    if need_K2O > 0:
        mop_needed = round_up(need_K2O / FERT_N_CONTENT["mop"]["K2O"])
        fert_plan["MOP_kg/ha"] = mop_needed
        messages.append(f"Apply {mop_needed} kg/ha MOP because potassium is below recommended level for {crop_name}.")

    if S is not None and S < ref_thresholds["S"][0]:
        gypsum_needed = round_up((ref_thresholds["S"][0] - S) / FERT_N_CONTENT["gypsum"]["S"])
        fert_plan["Gypsum_kg/ha"] = gypsum_needed
        messages.append(f"Apply {gypsum_needed} kg/ha Gypsum because soil sulphur is low for {crop_name}.")

    if Zn is not None and Zn < ref_thresholds["Zn"][0]:
        zn_needed = round_up((ref_thresholds["Zn"][0] - Zn) / FERT_N_CONTENT["znso4"]["Zn"])
        fert_plan["ZnSO4_kg/ha"] = zn_needed
        messages.append(f"Apply {zn_needed} kg/ha Zinc Sulfate because soil zinc is below recommended levels.")

    if B is not None and B < ref_thresholds["B"][0]:
        borax_needed = round_up((ref_thresholds["B"][0] - B) / FERT_N_CONTENT["borax"]["B"])
        fert_plan["Borax_kg/ha"] = borax_needed
        messages.append(f"Apply {borax_needed} kg/ha Borax because soil boron is below recommended levels.")

    if OC is not None and OC < ref_thresholds["OC"][0]:
        compost_needed = round_up((ref_thresholds["OC"][0] - OC) / FERT_N_CONTENT["compost"]["OC"])
        fert_plan["Compost_kg/ha"] = compost_needed * 1000
        messages.append(f"Apply approx {compost_needed} tons/ha Compost/FYM to improve soil organic matter.")

    if Fe is not None and Fe < ref_thresholds["Fe"][0]:
        messages.append("Iron low: consider foliar Fe spray because soil Fe is insufficient.")
    if Cu is not None and Cu < ref_thresholds["Cu"][0]:
        messages.append("Copper low: consider foliar Cu spray because soil Cu is insufficient.")
    if Mn is not None and Mn < ref_thresholds["Mn"][0]:
        messages.append("Manganese low: consider foliar Mn spray because soil Mn is insufficient.")

    if pH is not None and pH < 6.0:
        messages.append("Soil acidic: apply lime to raise pH.")
    elif pH is not None and pH > 8.5:
        messages.append("Soil alkaline: apply gypsum or acidifying measures to lower pH.")

    if EC is not None and EC > 4:
        messages.append("High salinity: grow salt-tolerant crops and improve irrigation.")

    return messages, fert_plan

# ---------------- Run API ---------------- #

# Production WSGI entry point: use with Gunicorn or uWSGI
# Example: gunicorn app:app --bind 0.0.0.0:10000