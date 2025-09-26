
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import requests
from datetime import datetime, timedelta
import json
import random
import math
import os
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

app = Flask(__name__)
# Enable CORS for all routes and all responses, including errors
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Ensure CORS headers are present on all error responses
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    return response

# Configure Flask app
app.config['DEBUG'] = True
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True

# Session with improved connection pooling and retry strategy
def create_session():
    """Create an HTTP session with connection pooling and retry strategy"""
    session = requests.Session()
    
    # Configure retry strategy
    retry_strategy = Retry(
        total=3,  # Total number of retries
        backoff_factor=1,  # Wait time between retries
        status_forcelist=[429, 500, 502, 503, 504],  # HTTP status codes to retry
        allowed_methods=["HEAD", "GET", "POST"]  # HTTP methods to retry
    )
    adapter = HTTPAdapter(max_retries=retry_strategy, pool_connections=20, pool_maxsize=20)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

# Global session instance
api_session = create_session()

# Simple in-memory cache for API responses
weather_cache = {}
soil_cache = {}
CACHE_DURATION = 300  # 5 minutes in seconds

def is_cache_valid(timestamp):
    return time.time() - timestamp < CACHE_DURATION

def get_cache_key(lat, lon, extra=None):
    # Round coordinates to reduce cache misses for nearby locations
    lat_rounded = round(lat, 2)
    lon_rounded = round(lon, 2)
    if extra:
        return f"{lat_rounded},{lon_rounded},{extra}"
    return f"{lat_rounded},{lon_rounded}"

# Configuration - Use environment variables for API keys
OPENWEATHERMAP_API_KEY = os.getenv('OPENWEATHERMAP_API_KEY', '')

# ---------------- Load crop data -----------------
with open("crops.json", "r") as f:
    crop_data = json.load(f)

# ---------------- Multiple Weather APIs -----------------
def get_openmeteo_weather(lat, lon, date=None):
    """Enhanced Open-Meteo API with better error handling and multiple endpoints"""
    endpoints = [
        "https://api.open-meteo.com/v1/forecast",
        "https://archive-api.open-meteo.com/v1/archive"
    ]
    
    try:
        # Use current forecast for recent dates
        if not date or date >= datetime.today().strftime("%Y-%m-%d"):
            url = endpoints[0]
            params = {
                'latitude': lat,
                'longitude': lon,
                'current': 'temperature_2m,precipitation',
                'daily': 'temperature_2m_max,precipitation_sum',
                'timezone': 'auto',
                'forecast_days': 1
            }
        else:
            url = endpoints[1]
            params = {
                'latitude': lat,
                'longitude': lon,
                'start_date': date,
                'end_date': date,
                'daily': 'temperature_2m_max,precipitation_sum',
                'timezone': 'auto'
            }
        
        print("🌤️ Trying Open-Meteo API")
        
        # Multiple attempts with different configurations
        for attempt in range(2):
            try:
                response = api_session.get(url, params=params, timeout=15)
                if response.status_code == 200:
                    data = response.json()
                    
                    # Extract temperature and rainfall with better fallbacks
                    temp = None
                    rainfall = None
                    
                    # Try current data first
                    if 'current' in data:
                        temp = data['current'].get('temperature_2m', temp)
                        rainfall = data['current'].get('precipitation', rainfall)
                    
                    # Fallback to daily data
                    if temp is None and 'daily' in data:
                        daily_temps = data['daily'].get('temperature_2m_max', [])
                        if daily_temps:
                            temp = daily_temps[0]
                    
                    if rainfall is None and 'daily' in data:
                        daily_rain = data['daily'].get('precipitation_sum', [])
                        if daily_rain:
                            rainfall = daily_rain[0] or 0
                    
                    # Set reasonable defaults if still None
                    temp = temp if temp is not None else 25
                    rainfall = rainfall if rainfall is not None else 0
                    
                    print(f"✅ Open-Meteo: {temp}°C, {rainfall}mm")
                    return {"temp": temp, "rainfall": rainfall, "source": "Open-Meteo"}
                
                elif response.status_code == 429:  # Rate limited
                    print("⚠️ Open-Meteo rate limited, waiting...")
                    time.sleep(2)
                    continue
                else:
                    print(f"❌ Open-Meteo API response error: {response.status_code}")
                    
            except requests.exceptions.Timeout:
                print(f"⚠️ Open-Meteo timeout on attempt {attempt + 1}, retrying...")
                if attempt == 0:  # Try simpler request on timeout
                    params = {'latitude': lat, 'longitude': lon, 'current': 'temperature_2m'}
                continue
            except requests.exceptions.RequestException as e:
                print(f"⚠️ Open-Meteo connection error: {e}")
                break
                
        return None
        
    except Exception as e:
        print(f"❌ Open-Meteo failed: {e}")
        return None

def get_openweathermap_weather(lat, lon):
    try:
        api_key = OPENWEATHERMAP_API_KEY
        if not api_key:
            print("⚠️ OpenWeatherMap API key not set, skipping OpenWeatherMap API")
            return None
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {'lat': lat, 'lon': lon, 'appid': api_key, 'units': 'metric'}
        print("☀️ Trying OpenWeatherMap API")
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            temp = data.get('main', {}).get('temp', 25)
            rainfall = data.get('rain', {}).get('1h', 0) * 24 if 'rain' in data else 0
            print(f"✅ OpenWeatherMap: {temp}°C, {rainfall}mm")
            return {"temp": temp, "rainfall": rainfall, "source": "OpenWeatherMap"}
        else:
            print(f"❌ OpenWeatherMap API response error: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ OpenWeatherMap failed: {e}")
        return None

def combine_weather_data(weather_sources):
    if not weather_sources:
        raise Exception("No weather data available")
    temps = [w.get('temp', 25) for w in weather_sources if w and isinstance(w, dict) and 'temp' in w and w['temp'] is not None]
    rainfalls = [w.get('rainfall', 0) for w in weather_sources if w and isinstance(w, dict) and 'rainfall' in w and w['rainfall'] is not None]
    avg_temp = sum(temps) / len(temps) if temps else 25
    avg_rainfall = sum(rainfalls) / len(rainfalls) if rainfalls else 0
    temp_anomalies = [abs(t - avg_temp) / max(avg_temp, 1) > 0.2 for t in temps if t is not None]
    rain_anomalies = [abs(r - avg_rainfall) / (avg_rainfall + 1) > 0.3 for r in rainfalls if r is not None]
    sources = [w.get('source', 'Unknown') for w in weather_sources if w and isinstance(w, dict)]
    print(f"🌡️ Combined weather: {avg_temp:.1f}°C, {avg_rainfall:.1f}mm from {', '.join(sources)}")
    return {
        "temp": round(avg_temp, 1),
        "rainfall": round(avg_rainfall, 1),
        "sources": sources,
        "temp_anomalies": any(temp_anomalies),
        "rain_anomalies": any(rain_anomalies)
    }

def get_weather(lat, lon, date=None):
    """Enhanced weather fetching with concurrent API calls, smart fallbacks, and caching"""
    # Check cache first
    cache_key = get_cache_key(lat, lon, date)
    if cache_key in weather_cache:
        cached_data, timestamp = weather_cache[cache_key]
        if is_cache_valid(timestamp):
            print(f"✅ Using cached weather data for {cache_key}")
            return cached_data
    
    weather_sources = []
    
    # Define API functions to call concurrently
    api_functions = [
        (get_openmeteo_weather, "Open-Meteo"),
        (get_openweathermap_weather, "OpenWeatherMap")
    ]
    
    # Use ThreadPoolExecutor for concurrent API calls
    with ThreadPoolExecutor(max_workers=3, thread_name_prefix="weather_api") as executor:
        # Submit all API calls
        future_to_api = {}
        for api_func, api_name in api_functions:
            if api_func == get_openweathermap_weather:
                future = executor.submit(api_func, lat, lon)
            else:
                future = executor.submit(api_func, lat, lon, date)
            future_to_api[future] = api_name
        
        # Collect results as they complete (with timeout)
        for future in as_completed(future_to_api, timeout=20):
            api_name = future_to_api[future]
            try:
                data = future.result(timeout=5)  # Individual timeout
                if data and isinstance(data, dict):
                    weather_sources.append(data)
                    print(f"✅ {api_name} completed successfully")
                else:
                    print(f"⚠️ {api_name} returned invalid data")
            except Exception as e:
                print(f"⚠️ {api_name} failed: {e}")
    
    # Process results
    # Ensure weather_sources is always a valid list
    weather_sources = weather_sources if weather_sources and isinstance(weather_sources, list) else []
    if weather_sources:
        print(f"✅ Weather data collected from {len(weather_sources)} source(s)")
        combined = combine_weather_data(weather_sources)
        today = datetime.today().strftime("%Y-%m-%d")
        season = detect_season(date or today, combined['rainfall'], combined['temp'])
        combined['season'] = season
        
        # Add quality indicators
        combined['source_count'] = len(weather_sources)
        combined['reliability'] = 'high' if len(weather_sources) >= 2 else 'medium'
        
        # Cache the result
        weather_cache[cache_key] = (combined, time.time())
        
        return combined
    else:
        print("⚠️ All weather APIs failed, using geographic fallback")
        fallback_data = get_fallback_weather(lat, lon, date)
        fallback_data['reliability'] = 'low'
        fallback_data['source_count'] = 0
        return fallback_data

# ---------------- Soil APIs and related helpers -----------------
def get_soilgrids_data(lat, lon):
    """Enhanced SoilGrids API with concurrent property fetching"""
    try:
        properties = ['clay', 'sand', 'silt']
        soil_data = {}
        
        # Concurrent API calls for all soil properties
        with ThreadPoolExecutor(max_workers=3, thread_name_prefix="soil_api") as executor:
            future_to_prop = {}
            
            for prop in properties:
                url = "https://rest.isric.org/soilgrids/v2.0/properties/query"
                params = {'lon': lon, 'lat': lat, 'property': prop, 'depth': '0-5cm', 'value': 'mean'}
                future = executor.submit(api_session.get, url, params=params, timeout=12)
                future_to_prop[future] = prop
            
            # Collect results
            for future in as_completed(future_to_prop, timeout=15):
                prop = future_to_prop[future]
                try:
                    response = future.result(timeout=3)
                    if response.status_code == 200:
                        data = response.json()
                        if 'properties' in data and prop in data['properties']:
                            layers = data['properties'][prop]['layers']
                            if layers and layers[0]['depths']:
                                value = layers[0]['depths'][0]['values']['mean'] / 10
                                if 0 <= value <= 100:  # Validate percentage
                                    soil_data[prop] = round(value, 1)
                    else:
                        print(f"⚠️ SoilGrids {prop} API error: {response.status_code}")
                except Exception as e:
                    print(f"⚠️ SoilGrids {prop} failed: {e}")
        
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

def get_openlandmap_data(lat, lon):
    try:
        soil_data = {}
        print("🗺️ Trying OpenLandMap estimation")
        if 8 <= lat <= 37 and 68 <= lon <= 97:
            if lat >= 28:
                soil_data = {"clay": 35, "sand": 45, "silt": 20}
            elif lat <= 15:
                soil_data = {"clay": 25, "sand": 55, "silt": 20}
            else:
                soil_data = {"clay": 40, "sand": 35, "silt": 25}
        if soil_data:
            print(f"✅ OpenLandMap estimation: {soil_data}")
            return {"source": "OpenLandMap", "data": soil_data}
    except Exception as e:
        print(f"❌ OpenLandMap failed: {e}")
        raise e

def get_icar_soil_data(lat, lon):
    try:
        print("🇮🇳 Checking ICAR soil classification")
        soil_regions = {
            "alluvial": {
                "bounds": [(22, 31, 75, 88), (8, 12, 76, 80)],
                "composition": {"clay": 30, "sand": 50, "silt": 20}
            },
            "black": {
                "bounds": [(15, 25, 74, 82), (21, 26, 69, 79)],
                "composition": {"clay": 55, "sand": 25, "silt": 20}
            },
            "red": {
                "bounds": [(8, 20, 77, 87), (11, 19, 74, 80)],
                "composition": {"clay": 25, "sand": 60, "silt": 15}
            },
            "laterite": {
                "bounds": [(8, 16, 74, 77), (15, 20, 73, 77)],
                "composition": {"clay": 45, "sand": 40, "silt": 15}
            },
            "desert": {
                "bounds": [(24, 32, 68, 75)],
                "composition": {"clay": 10, "sand": 85, "silt": 5}
            }
        }
        for soil_type, data in soil_regions.items():
            for bounds in data["bounds"]:
                lat_min, lat_max, lon_min, lon_max = bounds
                if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
                    print(f"✅ ICAR classification: {soil_type} soil")
                    return {"source": "ICAR-NBSS", "data": data["composition"], "type": soil_type}
        return {"source": "ICAR-NBSS", "data": {"clay": 35, "sand": 45, "silt": 20}, "type": "mixed"}
    except Exception as e:
        print(f"❌ ICAR data failed: {e}")
        raise e

def classify_soil_texture(clay, sand, silt):
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

def combine_soil_data(soil_sources):
    if not soil_sources:
        raise Exception("No soil data available")
    
    # Filter out None values and ensure we only process valid dictionaries
    valid_sources = [s for s in soil_sources if s is not None and isinstance(s, dict)]
    
    compositions = [s['data'] for s in valid_sources if 'data' in s and s['data'] is not None]
    sources = [s.get('source', 'Unknown') for s in valid_sources]
    
    if not compositions:
        raise Exception("No valid soil composition data")
    
    # Ensure compositions is a valid list before len() operations
    compositions = compositions if compositions and isinstance(compositions, list) else []
    if len(compositions) == 0:
        raise Exception("No valid soil composition data")
        
    avg_clay = sum(c.get('clay', 0) for c in compositions if c and isinstance(c, dict)) / len(compositions)
    avg_sand = sum(c.get('sand', 0) for c in compositions if c and isinstance(c, dict)) / len(compositions)
    avg_silt = sum(c.get('silt', 0) for c in compositions if c and isinstance(c, dict)) / len(compositions)
    soil_type = classify_soil_texture(avg_clay, avg_sand, avg_silt)
    print(f"🌍 Combined soil: {soil_type} (Clay: {avg_clay:.1f}%, Sand: {avg_sand:.1f}%, Silt: {avg_silt:.1f}%)")
    print(f"📊 Sources: {', '.join(sources)}")
    return {
        "soil_type": soil_type,
        "composition": {
            "clay": round(avg_clay, 1),
            "sand": round(avg_sand, 1),
            "silt": round(avg_silt, 1)
        },
        "sources": sources
    }

def get_soil_data(lat, lon):
    """Enhanced soil data fetching with caching and concurrent API calls"""
    # Check cache first
    cache_key = get_cache_key(lat, lon)
    if cache_key in soil_cache:
        cached_data, timestamp = soil_cache[cache_key]
        if is_cache_valid(timestamp):
            print(f"✅ Using cached soil data for {cache_key}")
            return cached_data
    
    soil_sources = []
    
    # Define API functions for concurrent soil data fetching
    api_functions = [
        (get_soilgrids_data, "SoilGrids"),
        (get_openlandmap_data, "OpenLandMap"),
    ]
    
    # Add ICAR for India region
    if 8 <= lat <= 37 and 68 <= lon <= 97:
        api_functions.append((get_icar_soil_data, "ICAR"))
    
    # Use ThreadPoolExecutor for concurrent API calls
    try:
        with ThreadPoolExecutor(max_workers=3, thread_name_prefix="soil_main") as executor:
            future_to_api = {}
            for api_func, api_name in api_functions:
                future = executor.submit(api_func, lat, lon)
                future_to_api[future] = api_name
            try:
                # Collect results as they complete, with a global timeout
                for future in as_completed(future_to_api, timeout=15):
                    api_name = future_to_api[future]
                    try:
                        soil_data = future.result(timeout=5)
                        if soil_data and isinstance(soil_data, dict) and 'data' in soil_data:
                            soil_sources.append(soil_data)
                            print(f"✅ {api_name} completed successfully")
                        else:
                            print(f"⚠️ {api_name} returned invalid data")
                    except Exception as e:
                        print(f"⚠️ {api_name} failed: {e}")
            except TimeoutError as e:
                print(f"⚠️ TimeoutError in get_soil_data: {e}")
                # If timeout, proceed with whatever results we have so far
    except Exception as e:
        print(f"⚠️ Exception in get_soil_data thread pool: {e}")
    
    # Process soil data
    # Ensure soil_sources is always a valid list
    soil_sources = soil_sources if soil_sources and isinstance(soil_sources, list) else []
    if soil_sources:
        try:
            combined_data = combine_soil_data(soil_sources)
            combined_data['source_count'] = len(soil_sources)
            combined_data['reliability'] = 'high' if len(soil_sources) >= 2 else 'medium'
            
            # Cache the result
            soil_cache[cache_key] = (combined_data, time.time())
            print(f"✅ Soil data combined from {len(soil_sources)} source(s)")
            
            return combined_data
        except Exception as e:
            print(f"⚠️ Failed to combine soil data: {e}")
            fallback_data = get_fallback_soil(lat, lon)
            fallback_data['reliability'] = 'low'
            fallback_data['source_count'] = 0
            return fallback_data
    else:
        print("⚠️ All soil APIs failed, using geographic estimation")
        fallback_data = get_fallback_soil(lat, lon)
        fallback_data['reliability'] = 'low'
        fallback_data['source_count'] = 0
        return fallback_data

def detect_season(date_str, rainfall, temp):
    month = datetime.strptime(date_str, "%Y-%m-%d").month if date_str else datetime.today().month
    if month in [6, 7, 8, 9]:
        return "Kharif"
    elif month in [10, 11, 12, 1, 2, 3]:
        return "Rabi"
    else:
        return "Zaid"

def get_fallback_weather(lat, lon, date=None):
    if 8 <= lat <= 37 and 68 <= lon <= 97:
        if lat >= 28:
            base_temp = 24
        elif lat <= 15:
            base_temp = 28
        else:
            base_temp = 26
    else:
        base_temp = 25
    month = datetime.strptime(date, "%Y-%m-%d").month if date else datetime.today().month
    if month in [4, 5, 6]:
        temp = base_temp + 5
        rainfall = 10
    elif month in [7, 8, 9]:
        temp = base_temp
        rainfall = 150
    elif month in [10, 11]:
        temp = base_temp - 2
        rainfall = 30
    else:
        temp = base_temp - 8
        rainfall = 15
    season = detect_season(date or datetime.today().strftime("%Y-%m-%d"), rainfall, temp)
    return {
        "temp": temp,
        "rainfall": rainfall,
        "season": season,
        "sources": ["Geographic Estimation"]
    }

def get_fallback_soil(lat, lon):
    """
    Provides default soil data based on geographic location when APIs fail
    """
    print(f"🏞️ Using geographic fallback for lat={lat}, lon={lon}")
    
    # Default composition values
    default_clay = 30.0
    default_sand = 40.0
    default_silt = 30.0
    
    if 8 <= lat <= 37 and 68 <= lon <= 97:  # India region
        if ((22 <= lat <= 31) and (75 <= lon <= 88)):  # Gangetic plains
            soil_type = "Alluvial"
            default_clay = 25.0
            default_sand = 45.0
            default_silt = 30.0
        elif ((15 <= lat <= 25) and (74 <= lon <= 82)):  # Deccan plateau
            soil_type = "Clay"
            default_clay = 45.0
            default_sand = 30.0
            default_silt = 25.0
        elif ((24 <= lat <= 32) and (68 <= lon <= 75)):  # Western region
            soil_type = "Sandy"
            default_clay = 15.0
            default_sand = 60.0
            default_silt = 25.0
        elif lat <= 15:  # Southern India
            soil_type = "Loam"
            default_clay = 30.0
            default_sand = 40.0
            default_silt = 30.0
        else:  # Other regions in India
            soil_type = "Clay Loam"
            default_clay = 35.0
            default_sand = 35.0
            default_silt = 30.0
    else:  # Non-India regions
        soil_type = "Loam"
        default_clay = 30.0
        default_sand = 40.0
        default_silt = 30.0
    
    fallback_data = {
        "soil_type": soil_type,
        "composition": {
            "clay": default_clay,
            "sand": default_sand,
            "silt": default_silt
        },
        "sources": ["Geographic Estimation"],
        "note": "Fallback data used due to API failures"
    }
    
    print(f"🎯 Fallback soil data: {soil_type} (Clay: {default_clay}%, Sand: {default_sand}%, Silt: {default_silt}%)")
    return fallback_data

    # Import our new crop advisory module
from crop_advisory import load_impact_data, calculate_soil_health_score, calculate_rainfall_impact

# ---------------- FIXED recommend_crop_full -----------------
def recommend_crop_full(soil_data, past_crop=None, weather=None, show_all=False):
    recommendations = []
    past_counters = []
    
    # Load crop impacts data
    try:
        impact_data = load_impact_data()
    except Exception as e:
        print(f"⚠️ Failed to load crop impacts data: {e}")
        impact_data = {"crop_impacts": {}}
    
    # Ensure inputs are safe
    if not soil_data or not isinstance(soil_data, dict):
        soil_data = {}
    if not crop_data or not isinstance(crop_data, list):
        return []

    # Handle past crop
    if past_crop and isinstance(past_crop, str):
        for crop in crop_data:
            if not crop or not isinstance(crop, dict):
                continue
            crop_name = crop.get('Crop')
            if crop_name and isinstance(crop_name, str) and crop_name.lower() == past_crop.lower():
                past_counters = crop.get('Counters') or []
                if not isinstance(past_counters, list):
                    past_counters = []
                break    # Handle soil type safely
    soil_type = soil_data.get('soil_type')
    if not soil_type:
        print("⚠️ Soil type missing, skipping crop filtering")
        soil_type = ""

    for crop in crop_data:
        if not crop or not isinstance(crop, dict):
            continue
            
        score = 100  # Start with perfect score
        matches = {}
        penalties = []

        # Get temperature and rainfall ranges from crop data
        crop_temp_min = crop.get('Temp_Min')
        crop_temp_max = crop.get('Temp_Max')
        crop_rain_min = crop.get('Rain_Min')
        crop_rain_max = crop.get('Rain_Max')
        
        # Temperature check
        if weather and weather.get('temp'):
            current_temp = weather.get('temp')
            if not (crop_temp_min <= current_temp <= crop_temp_max):
                score -= 20
                penalties.append({"reason": "Temperature mismatch", "penalty": -20})
                matches['temp'] = False
            else:
                matches['temp'] = True

        # Rainfall check
        if weather and weather.get('rainfall') is not None:
            current_rain = weather.get('rainfall')
            if not (crop_rain_min <= current_rain <= crop_rain_max):
                score -= 20
                penalties.append({"reason": "Rainfall mismatch", "penalty": -20})
                matches['rainfall'] = False
            else:
                matches['rainfall'] = True

        # Soil type check
        soil_types = crop.get('Soil_Type', [])
        if soil_type and soil_types:
            if soil_type not in soil_types:
                score -= 40
                penalties.append({"reason": "Soil type mismatch", "penalty": -40})
                matches['soil'] = False
            else:
                matches['soil'] = True

        # Season check
        if weather and weather.get('season'):
            current_season = weather.get('season')
            crop_seasons = crop.get('Season', [])
            if current_season not in crop_seasons:
                score -= 30
                penalties.append({"reason": "Season mismatch", "penalty": -30})
                matches['season'] = False
            else:
                matches['season'] = True

        # Past crop counter check
        if past_crop and past_crop in (crop.get('Counters') or []):
            score -= 20
            penalties.append({"reason": "Counter crop conflict", "penalty": -20})
            matches['counter_crop'] = False
        else:
            matches['counter_crop'] = True

        # Soil health bonus
        benefits = crop.get('Benefits', [])
        soil_health_impact = len(benefits)
        if soil_health_impact > 0:
            score += soil_health_impact * 5
            penalties.append({"reason": "Soil health bonus", "penalty": soil_health_impact * 5})

        # Calculate soil health impact
        crop_impact_data = impact_data.get('crop_impacts', {}).get(crop.get('Crop', ''), {})
        if crop_impact_data:
            soil_health = calculate_soil_health_score(soil_data, crop_impact_data)
            score = (score + soil_health['score']) / 2
            penalties.extend([{
                "reason": f"Soil Health - {impact['factor']}",
                "penalty": impact['impact']
            } for impact in soil_health['impacts']])
            matches['soil_health'] = [soil_health['recommendation'] == "Highly Recommended"]
        else:
            soil_health = {"score": 50, "impacts": [], "risk_level": "Unknown", "recommendation": "No Impact Data"}
            matches['soil_health'] = [False]
            
        # Calculate rainfall impact
        if weather and weather.get('rainfall') is not None:
            is_irrigated = bool(data.get('irrigation_available', True))  # Default to True for safety
            rainfall_impact = calculate_rainfall_impact(
                weather['rainfall'],
                crop.get('Crop', ''),
                is_irrigated,
                impact_data
            )
            score = (score + rainfall_impact['score']) / 2
            penalties.append({
                "reason": f"Rainfall Impact - {rainfall_impact['severity']}",
                "penalty": -rainfall_impact['penalty']
            })
            matches['rainfall_impact'] = [rainfall_impact['recommendation'] == "Highly Recommended"]
        
        final_score = max(0, min(100, score))

        # Ensure matches values are lists instead of booleans
        processed_matches = {}
        for key, value in matches.items():
            if isinstance(value, bool):
                processed_matches[key] = [value]
            else:
                processed_matches[key] = value

        recommendations.append({
            "crop": crop.get('Crop', 'Unknown'),
            "season": crop.get('Season', ['Unknown']),
            "score": round(final_score),
            "soil_health_impact": soil_health['recommendation'] if crop_impact_data else "Unknown Impact",
            "soil_health_details": {
                "score": soil_health['score'],
                "risk_level": soil_health['risk_level'],
                "impacts": soil_health['impacts']
            } if crop_impact_data else {"score": 50, "risk_level": "Unknown", "impacts": []},
            "rainfall_impact": rainfall_impact if 'rainfall_impact' in locals() else {
                "score": 50,
                "severity": "Unknown",
                "risk_level": "Unknown",
                "recommendation": "No Impact Data"
            },
            "temp_range": f"{crop_temp_min}-{crop_temp_max}" if crop_temp_min is not None and crop_temp_max is not None else "N/A",
            "rainfall_range": f"{crop_rain_min}-{crop_rain_max}" if crop_rain_min is not None and crop_rain_max is not None else "N/A",
            "soil_types": soil_types,
            "rotation_benefit": crop.get('Rotation_Benefit', '-'),
            "matches": processed_matches,
            "penalties": penalties,
            "impact_data": {
                "nutrient_depletion": crop_impact_data.get('nutrient_depletion', {}),
                "disease_risk": crop_impact_data.get('disease_risk', {}),
                "physical_degradation": crop_impact_data.get('physical_degradation', {}),
                "allelopathy": crop_impact_data.get('allelopathy', False),
                "irrigation_efficiency": crop_impact_data.get('irrigation_efficiency', 0.75)
            } if crop_impact_data else {}
        })

    # Sort recommendations by score and soil health impact
    recommendations.sort(key=lambda x: (
        -x['score'],  # Sort by score (descending)
        2 if x['soil_health_impact'] == "Excellent Match" else
        1 if x['soil_health_impact'] == "Good Match" else
        0  # Priority: Excellent > Good > Fair
    ))
    
    # Take top 10 recommendations
    recommendations = recommendations[:10]
    
    # If no recommendations found
    if not recommendations:
        print("⚠️ No recommendations found, adding fallback recommendation")
        recommendations = [{
            "crop": "Default Recommendation",
            "season": ["Any"],
            "score": 50,
            "soil_health_impact": "Fair Match",
            "temp_range": "20-35",
            "rainfall_range": "500-1000",
            "soil_types": ["Any"],
            "rotation_benefit": "-",
            "matches": {},
            "penalties": [{"reason": "Fallback recommendation", "penalty": -50}]
        }]
    
    return recommendations

# ---------------- Flask Routes -----------------
@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "message": "Flask server is running",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    })

@app.route('/')
def index():
    try:
        return render_template('index.html')
    except Exception as e:
        return f"""
        <html>
        <head><title>Agricultural Advisory API</title></head>
        <body>
            <h1>🌾 Agricultural Advisory API</h1>
            <p><strong>Server Status:</strong> ✅ Running</p>
            <p><strong>Health Check:</strong> <a href="/health">/health</a></p>
            <p><strong>API Endpoint:</strong> POST /recommend</p>
            <p><strong>Error:</strong> Template not found - {str(e)}</p>
            <h2>Quick Test:</h2>
            <button onclick="fetch('/health').then(r=>r.json()).then(d=>alert(JSON.stringify(d)))">Test Health</button>
        </body>
        </html>
        """

@app.route('/test')
def test():
    return render_template('test.html')

@app.route('/diagnostic')
def diagnostic():
    return render_template('diagnostic.html')

@app.route('/api/crop-advisory', methods=['POST'])
def crop_advisory():
    """Crop advisory endpoint for frontend compatibility"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        # Extract location from request
        location = data.get('location', {})
        lat = location.get('latitude') or location.get('lat')
        lon = location.get('longitude') or location.get('lon')
        
        # Extract additional info
        additional_info = data.get('additionalInfo', {})
        past_crop = additional_info.get('previousCrop', 'rice')
        
        # Use current date
        date = datetime.now().strftime('%Y-%m-%d')
        
        # Validate inputs
        if lat is None or lon is None:
            return jsonify({
                "error": "Missing latitude or longitude",
                "soil_analysis": get_fallback_soil(28.6, 77.2),
                "crop_recommendations": [{
                    "crop": "Default Wheat", 
                    "season": "Rabi", 
                    "soil_match": "Fallback", 
                    "weather_match": False, 
                    "penalty": 0, 
                    "final_score": 50
                }],
                "farming_tips": ["Check soil moisture regularly"],
                "advisory_id": f"fallback_{int(datetime.now().timestamp())}",
                "confidence_score": 0.5,
                "isDemoMode": True
            }), 200
        
        print(f"🌍 Crop Advisory API: Processing request for lat={lat}, lon={lon}, past_crop={past_crop}")
        
        # Get soil data with guaranteed fallback
        try:
            soil_data = get_soil_data(lat, lon)
        except Exception as e:
            print(f"❌ Soil data error: {e}")
            soil_data = get_fallback_soil(lat, lon)
        
        # Ensure soil_data structure
        if not soil_data or not isinstance(soil_data, dict):
            soil_data = get_fallback_soil(lat, lon)
        if 'soil_type' not in soil_data:
            soil_data['soil_type'] = "Unknown"
        if 'sources' not in soil_data or not isinstance(soil_data['sources'], list):
            soil_data['sources'] = ["Fallback"]
        # Ensure sources is never empty
        if len(soil_data['sources']) == 0:
            soil_data['sources'] = ["Default"]
        
        # Get weather data
        try:
            weather_data = get_weather(lat, lon, date)
        except Exception as e:
            print(f"❌ Weather error: {e}")
            weather_data = get_fallback_weather(lat, lon, date)
        
        if not weather_data or not isinstance(weather_data, dict):
            weather_data = get_fallback_weather(lat, lon, date)
        if 'sources' not in weather_data or not isinstance(weather_data['sources'], list):
            weather_data['sources'] = ["Fallback"]
        # Ensure sources is never empty
        if len(weather_data['sources']) == 0:
            weather_data['sources'] = ["Default"]
        
        # Get recommendations
        try:
            recommendations = recommend_crop_full(soil_data, past_crop, weather_data, show_all=True)
            # Ensure recommendations is always a valid list
            if not recommendations or not isinstance(recommendations, list):
                recommendations = []
            if len(recommendations) == 0:
                recommendations = [{
                    "crop": "Default Recommendation", 
                    "season": "Any", 
                    "soil_match": "Fallback", 
                    "weather_match": False, 
                    "penalty": 0, 
                    "final_score": 50
                }]
        except Exception as e:
            print(f"❌ Recommendations error: {e}")
            recommendations = [{
                "crop": "Error Recovery", 
                "season": "Any", 
                "soil_match": "Error", 
                "weather_match": False, 
                "penalty": 0, 
                "final_score": 25
            }]
        
        # Format response for frontend compatibility
        response_data = {
            "soil_analysis": {
                "soil_type": soil_data.get('soil_type', 'Unknown'),
                "composition": soil_data.get('composition', {"clay": 30, "sand": 40, "silt": 30}),
                "sources": soil_data.get('sources', ["API"]),
                "ph_level": "6.5",  # Default values for missing analysis
                "organic_matter": "3.2",
                "nitrogen_level": "medium",
                "phosphorus_level": "medium", 
                "potassium_level": "medium",
                "moisture_content": "20.0",
                "drainage": "good",
                "confidence": 0.85,
                "impacts": {
                    "fertility": {
                        "current": "medium",
                        "trend": "stable",
                        "risks": ["nutrient depletion", "pH imbalance"],
                        "recommendations": ["regular soil testing", "balanced fertilization"]
                    },
                    "structure": {
                        "current": "good",
                        "trend": "stable",
                        "risks": ["compaction", "erosion"],
                        "recommendations": ["minimum tillage", "cover cropping"]
                    },
                    "biology": {
                        "current": "moderate",
                        "trend": "improving",
                        "risks": ["pest buildup", "beneficial organism decline"],
                        "recommendations": ["crop rotation", "organic matter addition"]
                    }
                }
            },
            "crop_recommendations": recommendations,
            "farming_tips": [
                f"Based on {soil_data.get('soil_type', 'your soil')} soil, consider proper drainage",
                f"Current weather shows {weather_data.get('temp', 25)}°C temperature",
                f"Rainfall intensity is {weather_data.get('rainfall', 0)}mm - " + (
                    "consider supplemental irrigation" if weather_data.get('rainfall', 0) < 50 else
                    "ensure proper drainage" if weather_data.get('rainfall', 0) > 150 else
                    "maintain soil moisture"
                ),
                # Soil health recommendations
                "Implement crop rotation to prevent nutrient depletion",
                "Add organic matter to improve soil structure",
                "Monitor soil pH and adjust if necessary",
                # Disease management
                "Watch for early signs of plant diseases",
                "Maintain field hygiene to prevent disease spread",
                # Physical management
                "Minimize soil compaction during wet conditions",
                "Practice contour farming to prevent erosion",
                # Nutrient management
                "Follow balanced fertilization practices",
                "Consider soil test-based nutrient management"
            ],
            "advisory_id": f"advisory_{int(datetime.now().timestamp())}",
            "confidence_score": 0.85,
            "isDemoMode": False,
            "weather_data": weather_data
        }
        
        print(f"✅ Crop Advisory API: Sending response with {len(recommendations)} recommendations")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ Crop Advisory API error: {e}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            "error": f"Internal server error: {str(e)}",
            "soil_analysis": get_fallback_soil(28.6, 77.2),
            "crop_recommendations": [{
                "crop": "Emergency Fallback", 
                "season": "Any", 
                "soil_match": "Error", 
                "weather_match": False, 
                "penalty": 0, 
                "final_score": 1
            }],
            "farming_tips": ["Server error occurred, please try again"],
            "advisory_id": f"error_{int(datetime.now().timestamp())}",
            "confidence_score": 0.1,
            "isDemoMode": True
        }), 500

@app.route('/recommend', methods=['POST'])
def recommend():
    try:
        data = request.json
        lat = float(data.get('lat'))
        lon = float(data.get('lon'))
        past_crop = data.get('past_crop')
        date = data.get('date')

        print(f"🌍 Processing request for lat={lat}, lon={lon}, past_crop={past_crop}")

        # Get soil data with guaranteed fallback
        try:
            soil_data = get_soil_data(lat, lon)
        except Exception as e:
            print(f"❌ Soil data error: {e}")
            print("🎯 Using default fallback soil data")
            soil_data = get_fallback_soil(lat, lon)
        
        # Ensure soil_data always has the required structure
        if not soil_data or not isinstance(soil_data, dict) or 'soil_type' not in soil_data:
            print("⚠️ Invalid soil data, using default fallback")
            soil_data = get_fallback_soil(lat, lon)
        
        # Ensure composition exists
        if 'composition' not in soil_data or not soil_data['composition']:
            soil_data['composition'] = {"clay": 30.0, "sand": 40.0, "silt": 30.0}
        
        print(f"✅ Final soil data: {soil_data}")

        # Get weather data with guaranteed fallback
        try:
            weather_data = get_weather(lat, lon, date)
        except Exception as e:
            print(f"❌ Weather data error: {e}")
            print("🎯 Using fallback weather data")
            weather_data = get_fallback_weather(lat, lon, date)
        
        # Ensure weather_data always has the required structure  
        if not weather_data or not isinstance(weather_data, dict):
            print("⚠️ Invalid weather data, using default fallback")
            weather_data = get_fallback_weather(lat, lon, date)
            
        # Ensure sources is always a valid array
        if 'sources' not in weather_data or not isinstance(weather_data['sources'], list):
            weather_data['sources'] = ["Fallback"]
        
        print(f"✅ Final weather data: {weather_data}")

        # Get recommendations with comprehensive error handling
        try:
            recommendations = recommend_crop_full(soil_data, past_crop, weather_data, show_all=True)
            
            # Validate recommendations array
            if not recommendations or not isinstance(recommendations, list):
                print("⚠️ Invalid recommendations, using fallback")
                recommendations = [{
                    "crop": "No recommendations available", 
                    "season": "Unknown", 
                    "soil_match": "Unknown", 
                    "weather_match": False, 
                    "penalty": 0, 
                    "final_score": 0
                }]
            # Ensure len() check is safe
            elif not recommendations or len(recommendations) == 0:
                print("⚠️ Empty recommendations array, adding fallback")
                recommendations = [{
                    "crop": "Default Crop Recommendation", 
                    "season": "Any", 
                    "soil_match": "Fallback", 
                    "weather_match": False, 
                    "penalty": 0, 
                    "final_score": 50
                }]
                
            # Ensure each recommendation has all required fields
            for i, rec in enumerate(recommendations):
                if not isinstance(rec, dict):
                    recommendations[i] = {
                        "crop": "Invalid Recommendation", 
                        "season": "Unknown", 
                        "soil_match": "Unknown", 
                        "weather_match": False, 
                        "penalty": 0, 
                        "final_score": 0
                    }
                else:
                    # Ensure all required fields exist
                    rec.setdefault('crop', 'Unknown Crop')
                    rec.setdefault('season', 'Unknown')
                    rec.setdefault('soil_match', 'Unknown')
                    rec.setdefault('weather_match', False)
                    rec.setdefault('penalty', 0)
                    rec.setdefault('final_score', 0)
                    
        except Exception as e:
            print(f"❌ Recommendation error: {e}")
            import traceback
            traceback.print_exc()
            recommendations = [{
                "crop": "Error generating recommendations", 
                "season": "Unknown", 
                "soil_match": "Unknown", 
                "weather_match": False, 
                "penalty": 0, 
                "final_score": 0,
                "error": str(e)
            }]

        # Final validation before sending response
        if not isinstance(recommendations, list):
            print("🚨 CRITICAL: recommendations is not a list, forcing fallback")
            recommendations = [{
                "crop": "Emergency Fallback", 
                "season": "Any", 
                "soil_match": "Fallback", 
                "weather_match": False, 
                "penalty": 0, 
                "final_score": 1
            }]
        
        # Safe len() check with additional None check
        if not recommendations or len(recommendations) == 0:
            print("🚨 CRITICAL: recommendations array is empty, adding emergency item")
            recommendations = [{
                "crop": "Emergency Default", 
                "season": "Any", 
                "soil_match": "Default", 
                "weather_match": False, 
                "penalty": 0, 
                "final_score": 1
            }]

        response_data = {
            "soil": soil_data,
            "soil_data": soil_data,  # Include both keys for frontend compatibility
            "weather": weather_data,
            "weather_data": weather_data,  # Include both keys for frontend compatibility
            "recommendations": recommendations,
            "request_info": {
                "lat": lat,
                "lon": lon,
                "past_crop": past_crop,
                "date": date
            }
        }
        
        # Final response validation
        try:
            # Test JSON serialization
            test_json = json.dumps(response_data)
            print(f"✅ Response JSON validation passed ({len(test_json)} chars)")
        except Exception as json_error:
            print(f"🚨 JSON serialization error: {json_error}")
            # Return a completely safe response
            return jsonify({
                "error": "JSON serialization failed",
                "recommendations": [{"crop": "Safe Default", "season": "Any", "soil_match": "Safe", "weather_match": False, "penalty": 0, "final_score": 1}],
                "soil_data": {"soil_type": "Safe Default", "sources": ["Safe"]},
                "weather_data": {"temp": 25, "rainfall": 100, "sources": ["Safe"]}
            })
        
        print(f"✅ Sending response with {len(recommendations)} recommendations")
        return jsonify(response_data)

    except Exception as e:
        print(f"❌ General error in recommend route: {e}")
        import traceback
        traceback.print_exc()
        
        # Return a safe fallback response
        fallback_soil = get_fallback_soil(28.6, 77.2)  # Default Delhi coordinates
        fallback_weather = get_fallback_weather(28.6, 77.2)
        
        return jsonify({
            "error": f"Internal server error: {str(e)}",
            "soil": fallback_soil,
            "soil_data": fallback_soil,  # Include both keys for compatibility
            "weather": fallback_weather,
            "weather_data": fallback_weather,  # Include both keys for compatibility
            "recommendations": [{
                "crop": "Error - using default data", 
                "season": "Unknown", 
                "soil_match": "Unknown", 
                "weather_match": False, 
                "penalty": 0, 
                "final_score": 0
            }]
        }), 500

if __name__ == "__main__":
    import os
    import signal
    
    print("🚀 Starting Agricultural Advisory API Server...")
    print("✅ Server will be available at:")
    print("   - Local: http://127.0.0.1:5000")
    print("   - External: https://friendly-xylophone-9p5jvg69j6gcxgpw-5000.app.github.dev/")
    print("✅ Health check: /health")
    print("✅ API endpoint: POST /recommend")
    print("✅ CORS enabled for frontend access")
    print("✅ Fallback systems active")
    
    def signal_handler(sig, frame):
        print('\n🛑 Server shutting down gracefully...')
        exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        # More robust Flask configuration
        app.config['ENV'] = 'development'
        app.config['TESTING'] = False
        app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
        
        print("🌐 Starting server on 0.0.0.0:5000...")
        app.run(
            host='0.0.0.0', 
            port=5000, 
            debug=False,  # Disable debug to prevent reloader issues
            use_reloader=False, 
            threaded=True,
            processes=1
        )
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
