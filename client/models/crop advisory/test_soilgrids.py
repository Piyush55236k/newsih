from soil_utils import get_soilgrids_data

# Test coordinates (example from India)
lat = 28.6139  # New Delhi
lon = 77.2090

print("Testing SoilGrids data fetching...")
result = get_soilgrids_data(lat, lon)
print("\nResult:", result)