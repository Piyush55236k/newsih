"""
This module provides functions for crop advisory based on soil health, crop impacts, and rainfall severity.
"""

import json
import math
from typing import Dict, List, Optional, Union, Any

def load_impact_data() -> Dict[str, Any]:
    """Load crop impacts data from JSON file."""
    with open("crop_impacts.json", "r") as f:
        return json.load(f)

def calculate_soil_health_score(soil_data: Dict[str, Any], crop_impact: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate soil health impact score based on crop impact data and current soil conditions.
    
    Parameters:
    - soil_data: Dictionary containing soil composition and properties
    - crop_impact: Dictionary containing crop's impact on soil
    
    Returns:
    - Dictionary containing score and detailed impacts
    """
    score = 100
    impacts = []
    
    # Get soil composition
    clay = soil_data.get('composition', {}).get('clay', 30)
    sand = soil_data.get('composition', {}).get('sand', 40)
    silt = soil_data.get('composition', {}).get('silt', 30)
    
    # Calculate nutrient depletion impact
    nutrient_depletion = crop_impact.get('nutrient_depletion', {})
    nitrogen_impact = nutrient_depletion.get('nitrogen', 0) * 10
    phosphorus_impact = nutrient_depletion.get('phosphorus', 0) * 8
    potassium_impact = nutrient_depletion.get('potassium', 0) * 7
    
    nutrient_score_impact = -(nitrogen_impact + phosphorus_impact + potassium_impact) / 3
    if nutrient_score_impact != 0:
        impacts.append({
            "factor": "Nutrient Depletion",
            "impact": nutrient_score_impact,
            "details": {
                "nitrogen": nitrogen_impact,
                "phosphorus": phosphorus_impact,
                "potassium": potassium_impact
            }
        })
    score += nutrient_score_impact
    
    # Calculate disease risk impact
    disease_risk = crop_impact.get('disease_risk', {})
    fungi_risk = disease_risk.get('fungi', 0) * 10
    bacteria_risk = disease_risk.get('bacteria', 0) * 8
    nematodes_risk = disease_risk.get('nematodes', 0) * 7
    
    disease_score_impact = -(fungi_risk + bacteria_risk + nematodes_risk) / 3
    if disease_score_impact != 0:
        impacts.append({
            "factor": "Disease Risk",
            "impact": disease_score_impact,
            "details": {
                "fungi": fungi_risk,
                "bacteria": bacteria_risk,
                "nematodes": nematodes_risk
            }
        })
    score += disease_score_impact
    
    # Calculate physical degradation impact
    physical_deg = crop_impact.get('physical_degradation', {})
    compaction = physical_deg.get('compaction', 0) * 10
    erosion = physical_deg.get('erosion', 0) * 9
    structure = physical_deg.get('structure', 0) * 8
    
    physical_score_impact = -(compaction + erosion + structure) / 3
    if physical_score_impact != 0:
        impacts.append({
            "factor": "Physical Degradation",
            "impact": physical_score_impact,
            "details": {
                "compaction": compaction,
                "erosion": erosion,
                "structure": structure
            }
        })
    score += physical_score_impact
    
    # Adjust for allelopathy
    if crop_impact.get('allelopathy', False):
        allelopathy_impact = -10
        impacts.append({
            "factor": "Allelopathy",
            "impact": allelopathy_impact,
            "details": {"allelopathic": True}
        })
        score += allelopathy_impact
    
    # Normalize score to 0-100 range
    score = max(0, min(100, score))
    
    return {
        "score": round(score, 1),
        "impacts": impacts,
        "risk_level": "High" if score < 40 else "Medium" if score < 70 else "Low",
        "recommendation": "Not Recommended" if score < 40 else 
                         "Recommended with Caution" if score < 70 else 
                         "Highly Recommended"
    }

def calculate_rainfall_impact(rainfall: float, crop_name: str, is_irrigated: bool, impact_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate rainfall impact score based on crop requirements and current rainfall.
    
    Parameters:
    - rainfall: Current rainfall in mm
    - crop_name: Name of the crop
    - is_irrigated: Whether irrigation is available
    - impact_data: Dictionary containing rainfall severity factors
    
    Returns:
    - Dictionary containing score and detailed impacts
    """
    # Get crop's irrigation efficiency
    crop_impacts = impact_data.get('crop_impacts', {})
    crop_info = crop_impacts.get(crop_name, {})
    irrigation_efficiency = crop_info.get('irrigation_efficiency', 0.75)
    
    # Get rainfall requirements and factors
    irrigation_reqs = impact_data.get('irrigation_requirements', {})
    rainfall_severity = impact_data.get('rainfall_severity_factors', {})
    
    if is_irrigated:
        requirements = irrigation_reqs.get('irrigated', {})
        min_water = requirements.get('minimum_water', 300)
        supplement = requirements.get('supplement_factor', 0.7)
        max_efficiency = requirements.get('maximum_efficiency', 0.85)
        deficit_penalty = requirements.get('deficit_penalty', 0.8)
        excess_penalty = requirements.get('excess_penalty', 0.6)
    else:
        requirements = irrigation_reqs.get('rainfed', {})
        min_rainfall = requirements.get('minimum_rainfall', 500)
        optimal_rainfall = requirements.get('optimal_rainfall', 1000)
        max_rainfall = requirements.get('maximum_rainfall', 2000)
        deficit_penalty = requirements.get('deficit_penalty', 1.2)
        excess_penalty = requirements.get('excess_penalty', 0.8)
    
    # Calculate water adequacy ratio
    if is_irrigated:
        water_ratio = (rainfall + min_water * supplement) / min_water
    else:
        water_ratio = rainfall / optimal_rainfall
    
    # Determine severity level and calculate score
    score = 100
    severity = None
    
    if water_ratio < rainfall_severity['severe_deficit']['threshold']:
        severity = 'severe_deficit'
        penalty = rainfall_severity['severe_deficit']['penalty']
    elif water_ratio < rainfall_severity['moderate_deficit']['threshold']:
        severity = 'moderate_deficit'
        penalty = rainfall_severity['moderate_deficit']['penalty']
    elif water_ratio < rainfall_severity['mild_deficit']['threshold']:
        severity = 'mild_deficit'
        penalty = rainfall_severity['mild_deficit']['penalty']
    elif water_ratio <= rainfall_severity['optimal']['threshold']:
        severity = 'optimal'
        penalty = rainfall_severity['optimal']['penalty']
    elif water_ratio <= rainfall_severity['mild_excess']['threshold']:
        severity = 'mild_excess'
        penalty = rainfall_severity['mild_excess']['penalty']
    else:
        severity = 'severe_excess'
        penalty = rainfall_severity['severe_excess']['penalty']
    
    # Apply penalties
    base_penalty = penalty * (1 - irrigation_efficiency if is_irrigated else 1)
    score -= base_penalty * 100
    
    # Normalize score
    score = max(0, min(100, score))
    
    return {
        "score": round(score, 1),
        "severity": severity,
        "water_ratio": round(water_ratio, 2),
        "efficiency": round(irrigation_efficiency, 2),
        "is_irrigated": is_irrigated,
        "penalty": round(base_penalty * 100, 1),
        "risk_level": "High" if score < 40 else "Medium" if score < 70 else "Low",
        "recommendation": "Not Recommended" if score < 40 else 
                         "Recommended with Caution" if score < 70 else 
                         "Highly Recommended"
    }