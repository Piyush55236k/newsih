import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

def get_soilgrids_data(lat, lon, retries=2):
    """Enhanced SoilGrids API with better error handling and data processing"""
    def fetch_property(prop, attempt=0):
        try:
            url = f"https://rest.isric.org/soilgrids/v2.0/properties/query"
            params = {
                'lat': lat,
                'lon': lon,
                'property': prop,
                'depth': '0-5cm',
                'value': 'mean'
            }
            
            # Exponential backoff
            if attempt > 0:
                time.sleep(2 ** attempt)
            
            response = requests.get(url, params=params, timeout=15)
            if response.status_code == 200:
                data = response.json()
                if 'properties' in data and prop in data['properties']:
                    layers = data['properties'][prop]['layers']
                    if layers and layers[0]['depths']:
                        value = layers[0]['depths'][0]['values'][0]
                        return round(value / 10, 1)  # Convert from g/kg to percentage
            return None
        except Exception as e:
            print(f"⚠️ SoilGrids {prop} attempt {attempt + 1} failed: {e}")
            if attempt < retries:
                return fetch_property(prop, attempt + 1)
            return None
    
    try:
        print("🌍 Fetching SoilGrids data with retries")
        properties = ['clay', 'sand', 'silt']
        soil_data = {}
        
        # Sequential fetching with retries
        for prop in properties:
            value = fetch_property(prop)
            if value is not None:
                soil_data[prop] = value
                print(f"✅ Got {prop}: {value}%")
        
        # Convert values to percentages and validate
        soil_data = {}
        for prop, value in properties.items():
            if value is not None and 0 <= value <= 1000:
                soil_data[prop] = round(value / 10, 1)  # Convert from g/kg to percentage
        
        # Validate we have enough data
        if len(soil_data) >= 2:
            print(f"✅ SoilGrids data: {soil_data}")
            return {"source": "SoilGrids", "data": soil_data}
        else:
            print(f"⚠️ SoilGrids insufficient data: {soil_data}")
            return None
            
    except Exception as e:
        print(f"❌ SoilGrids failed: {e}")
        return None

def classify_soil_texture(clay, sand, silt):
    """Classify soil texture based on composition percentages"""
    total = clay + sand + silt
    if total == 0:
        return "Unknown"
    
    clay_pct = (clay / total) * 100
    sand_pct = (sand / total) * 100
    silt_pct = (silt / total) * 100
    
    if clay_pct >= 40:
        if sand_pct <= 45:
            return "Clay"
        else:
            return "Sandy Clay"
    elif clay_pct >= 27:
        if sand_pct <= 20:
            return "Silty Clay"
        elif sand_pct <= 45:
            return "Clay Loam"
        else:
            return "Sandy Clay Loam"
    elif clay_pct >= 12:
        if silt_pct >= 50:
            return "Silt Loam"
        elif sand_pct >= 52:
            return "Sandy Loam"
        else:
            return "Loam"
    else:
        if silt_pct >= 50:
            if silt_pct >= 80:
                return "Silt"
            else:
                return "Silt Loam"
        elif sand_pct >= 85:
            return "Sandy"
        elif sand_pct >= 70:
            return "Loamy Sand"
        else:
            return "Loam"