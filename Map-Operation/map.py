import json
from shapely.geometry import shape, Point

# Load Pune Ward GeoJSON file
with open(r"S:\sem6\hackathon\k2\Garbage_project\Map-Operation\Pune\pune-electoral-wards-2022.geojson", "r", encoding="utf-8") as f:
    wards_geojson = json.load(f)

# Load Muqqadam GeoJSON file
with open(r"S:\sem6\hackathon\k2\Garbage_project\Map-Operation\Sukhsagar.geojson", "r", encoding="utf-8") as f:
    muqqadam_geojson = json.load(f)

# Define the coordinate to check
latitude = 18.464002474404847
longitude = 73.86373927307856
#18.463826817490844, 73.86830128726508
point = Point(longitude, latitude)  # shapely uses (longitude, latitude) order

# Step 1: Check if the coordinate is inside "Upper Super Indiranagar"
ward_name = None
for feature in wards_geojson["features"]:
    polygon = shape(feature["geometry"])
    if polygon.contains(point):
        ward_name = feature["properties"].get("Name2")  # Adjust based on actual property name
        print("Coordinate is in Ward:", ward_name)
        break

# Step 2: If the ward is "Upper Super Indiranagar", check for Muqqadam regions
if ward_name == "Sukhsagarnagar - Rajiv Gandhinagar":
    found_muqqadam = False
    for feature in muqqadam_geojson["features"]:
        if "M" in feature["properties"]["Name"]:  # Ensure we filter only Muqqadam entries
            muqqadam_polygon = shape(feature["geometry"])
            if muqqadam_polygon.contains(point):
                print("Coordinate is in Muqqadam:", feature["properties"]["Name"])
                print("Muqqadam Description:", feature["properties"]["description"])
                found_muqqadam = True
                break
    if not found_muqqadam:
        print("Coordinate is not in any Muqqadam region within Upper Super Indiranagar.")
else:
    print("Coordinate is not in Upper Super Indiranagar.")
