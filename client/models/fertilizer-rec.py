

def fertilizer_recommendation(crop, soil):
    """
    crop: string, crop name
    soil: dictionary containing soil report values
        - N, P, K: kg/ha
        - S, Zn, Fe, Cu, Mn, B: ppm (mg/kg)
        - OC: %
        - pH, EC: as reported
    Returns:
        - recommendations: list of advice strings
        - fertilizer_doses: dict of fertilizer quantities
    """

    # Crop-specific nutrient thresholds (kg/ha or ppm)
    crop_thresholds = {
        "wheat": {"N": 250, "P": 20, "K": 120, "S": 10, "Zn": 0.6, "Fe": 4.5, "Cu": 0.2, "Mn": 1.5, "B": 0.5},
        "paddy": {"N": 280, "P": 18, "K": 100, "S": 10, "Zn": 0.6, "Fe": 4.5, "Cu": 0.2, "Mn": 1.5, "B": 0.5},
        "maize": {"N": 250, "P": 22, "K": 100, "S": 12, "Zn": 0.6, "Fe": 4.5, "Cu": 0.2, "Mn": 1.5, "B": 0.5},
        "cotton": {"N": 180, "P": 20, "K": 120, "S": 12, "Zn": 0.75, "Fe": 4.5, "Cu": 0.2, "Mn": 1.5, "B": 0.5},
        "mustard": {"N": 150, "P": 25, "K": 100, "S": 15, "Zn": 0.6, "Fe": 4.5, "Cu": 0.2, "Mn": 1.5, "B": 0.5},
    }

    thresholds = crop_thresholds.get(crop.lower())
    if not thresholds:
        return f"❌ Crop '{crop}' not supported.", {}

    recommendations = []
    fertilizer_doses = {}

    # Fertilizer contents
    fert_content = {
        "urea": 0.46,                 # 46% N
        "dap": {"N": 0.18, "P": 0.20},# 18% N, 20% P
        "mop": {"K": 0.50},           # 50% K
        "gypsum": {"S": 0.18},        # 18% S
        "znso4": {"Zn": 0.21},        # 21% Zn
        "borax": {"B": 0.11},         # 11% B
        "compost": {"OC": 0.005}      # 0.5% OC contribution
    }

    # --- Major nutrients: N, P, K ---
    if soil["P"] < thresholds["P"]:
        deficit_P = thresholds["P"] - soil["P"]
        dap_needed = round(deficit_P / fert_content["dap"]["P"])
        recommendations.append(f"✔ Apply {dap_needed} kg/ha DAP because phosphorus is below recommended level.")
        fertilizer_doses["DAP_kg/ha"] = dap_needed
        N_from_dap = dap_needed * fert_content["dap"]["N"]
    else:
        N_from_dap = 0

    if soil["N"] < thresholds["N"]:
        deficit_N = thresholds["N"] - soil["N"] - N_from_dap
        if deficit_N > 0:
            urea_needed = round(deficit_N / fert_content["urea"])
            recommendations.append(f"✔ Apply {urea_needed} kg/ha Urea because nitrogen is below recommended level.")
            fertilizer_doses["Urea_kg/ha"] = urea_needed

    if soil["K"] < thresholds["K"]:
        deficit_K = thresholds["K"] - soil["K"]
        mop_needed = round(deficit_K / fert_content["mop"]["K"])
        recommendations.append(f"✔ Apply {mop_needed} kg/ha MOP (Potash) because potassium is low.")
        fertilizer_doses["MOP_kg/ha"] = mop_needed

    # --- Secondary nutrients ---
    if soil["S"] < thresholds["S"]:
        deficit_S = thresholds["S"] - soil["S"]
        gypsum_needed = round(deficit_S / fert_content["gypsum"]["S"])
        recommendations.append(f"✔ Apply {gypsum_needed} kg/ha Gypsum because soil sulphur is low.")
        fertilizer_doses["Gypsum_kg/ha"] = gypsum_needed

    # --- Micronutrients ---
    if soil["Zn"] < thresholds["Zn"]:
        deficit_Zn = thresholds["Zn"] - soil["Zn"]
        znso4_needed = round(deficit_Zn / fert_content["znso4"]["Zn"])
        recommendations.append(f"✔ Apply {znso4_needed} kg/ha Zinc Sulfate because soil zinc is deficient.")
        fertilizer_doses["ZnSO4_kg/ha"] = znso4_needed

    if soil["B"] < thresholds["B"]:
        deficit_B = thresholds["B"] - soil["B"]
        borax_needed = round(deficit_B / fert_content["borax"]["B"])
        recommendations.append(f"✔ Apply {borax_needed} kg/ha Borax because soil boron is deficient.")
        fertilizer_doses["Borax_kg/ha"] = borax_needed

    if soil["Fe"] < thresholds["Fe"]:
        recommendations.append("✔ Iron low: Apply 0.5% FeSO₄ foliar spray twice during crop growth.")

    if soil["Cu"] < thresholds["Cu"]:
        recommendations.append("✔ Copper low: Apply 5 kg/ha CuSO₄ or foliar spray (0.2%).")

    if soil["Mn"] < thresholds["Mn"]:
        recommendations.append("✔ Manganese low: Apply foliar spray of 0.5% MnSO₄.")

    # --- Soil amendments ---
    if soil["OC"] < 0.5:
        recommendations.append("✔ Add 5–10 tons/ha FYM/compost to improve soil organic matter.")
        fertilizer_doses["Compost_tons/ha"] = 5

    if soil["pH"] > 8.5:
        recommendations.append("⚠ Soil is alkaline. Apply gypsum and use acid-forming fertilizers.")

    if soil["EC"] > 4.0:
        recommendations.append("⚠ Soil is saline. Improve drainage and consider salt-tolerant varieties.")

    return recommendations, fertilizer_doses


# ============================
# Interactive Input
# ============================
if __name__ == "__main__":
    crop = input("Enter crop (wheat/paddy/maize/cotton/mustard): ")

    soil = {}
    for nutrient in ["N", "P", "K"]:
        soil[nutrient] = float(input(f"Enter {nutrient} value (kg/ha): "))
    for nutrient in ["S", "Zn", "Fe", "Cu", "Mn", "B"]:
        soil[nutrient] = float(input(f"Enter {nutrient} value (ppm): "))
    soil["OC"] = float(input("Enter Organic Carbon %: "))
    soil["pH"] = float(input("Enter soil pH: "))
    soil["EC"] = float(input("Enter EC (dS/m): "))

    recs, doses = fertilizer_recommendation(crop, soil)

    print("\n--- Fertilizer Recommendations ---")
    for r in recs:
        print(r)

    print("\n--- Fertilizer Quantities ---")
    for fert, qty in doses.items():
        print(f" - {fert}: {qty}")
