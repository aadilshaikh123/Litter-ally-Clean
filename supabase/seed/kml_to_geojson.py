"""Convert a PMC ward KML into GeoJSON for seeding.

The PMC publishes wards as KML only. This keeps the conversion in-repo so the
committed seed files are reproducible from the published source, rather than
being opaque blobs someone exported by hand once.

Usage:
    python kml_to_geojson.py in.kml out.geojson --name-field Name2 --num-field wardnum
    python kml_to_geojson.py in.kml out.geojson --num-field qwr   # 2025: unnamed
"""
import argparse
import json
import xml.etree.ElementTree as ET

KML_NS = {"k": "http://www.opengis.net/kml/2.2"}


def _ring(elem):
    """KML coordinate string -> GeoJSON linear ring (lon, lat)."""
    text = elem.findtext("k:coordinates", default="", namespaces=KML_NS).strip()
    ring = []
    for tok in text.split():
        lon, lat, *_ = tok.split(",")
        ring.append([float(lon), float(lat)])
    if ring and ring[0] != ring[-1]:
        ring.append(ring[0])  # GeoJSON requires closure; KML does not
    return ring


def _polygon(poly):
    outer = poly.find("k:outerBoundaryIs/k:LinearRing", KML_NS)
    rings = [_ring(outer)] if outer is not None else []
    for inner in poly.findall("k:innerBoundaryIs/k:LinearRing", KML_NS):
        rings.append(_ring(inner))
    return rings


def convert(kml_path, name_field, num_field):
    root = ET.parse(kml_path).getroot()
    features = []

    for pm in root.iter("{http://www.opengis.net/kml/2.2}Placemark"):
        props = {
            sd.get("name"): (sd.text or "").strip()
            for sd in pm.iter("{http://www.opengis.net/kml/2.2}SimpleData")
        }

        raw_num = props.get(num_field, "")
        try:
            ward_no = int(float(raw_num))
        except (TypeError, ValueError):
            continue  # skip anything without a usable ward number

        polys = [_polygon(p) for p in pm.iter("{http://www.opengis.net/kml/2.2}Polygon")]
        polys = [p for p in polys if p]
        if not polys:
            continue

        geometry = (
            {"type": "Polygon", "coordinates": polys[0]}
            if len(polys) == 1
            else {"type": "MultiPolygon", "coordinates": polys}
        )

        name = props.get(name_field, "").strip() if name_field else ""
        features.append({
            "type": "Feature",
            "properties": {"ward_no": ward_no, "ward_name": name or f"Prabhag {ward_no}"},
            "geometry": geometry,
        })

    features.sort(key=lambda f: f["properties"]["ward_no"])
    return {"type": "FeatureCollection", "features": features}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("kml")
    ap.add_argument("out")
    ap.add_argument("--name-field", default=None)
    ap.add_argument("--num-field", default="wardnum")
    a = ap.parse_args()

    fc = convert(a.kml, a.name_field, a.num_field)
    with open(a.out, "w", encoding="utf-8") as fh:
        json.dump(fc, fh)
    print(f"{a.out}: {len(fc['features'])} wards")
