"""Regenerate the ward seed migration from the committed GeoJSON.

    python supabase/seed/build_seed_migration.py

Source data comes from the PMC KML on OpenCity (Public Domain), converted by
kml_to_geojson.py:

    curl -o pmc2022.kml "https://data.opencity.in/dataset/98f28dac-9158-46ee-a91e-a514d9af427c/resource/db368dd7-03ab-458f-a17d-ac87e04f11fb/download/24b7649d-0039-4dee-872a-621fa2b129d2.kml"
    python kml_to_geojson.py pmc2022.kml pune-wards-2022.geojson --name-field Name2 --num-field wardnum
"""
