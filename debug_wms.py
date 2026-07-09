import os
import requests
import numpy as np
from PIL import Image
from io import BytesIO
from collections import Counter
from dotenv import load_dotenv

load_dotenv()
SAFEMAP_API_KEY = os.getenv("SAFEMAP_API_KEY")

CRIME_ZONE_URL = "http://safemap.go.kr/openapi2/IF_0087_WMS"
NIGHT_SAFETY_URL = "http://safemap.go.kr/openapi2/IF_0080_WMS"


def center_to_bbox(lat: float, lon: float, half_size_km: float) -> str:
    delta_lat = half_size_km / 111
    delta_lon = half_size_km / (111 * np.cos(np.radians(lat)))
    return f"{lon-delta_lon},{lat-delta_lat},{lon+delta_lon},{lat+delta_lat}"


# ══════════════════════════════════════════════
# 1. 범례(색상 → 등급) 가져오기
# ══════════════════════════════════════════════

def fetch_legend(int_id: str, api_key: str) -> dict:
    """색상 RGB -> 등급(1~10) 매핑 딕셔너리 반환"""
    url = "http://www.safemap.go.kr/openapi2/lgdInfo"
    params = {"serviceKey": api_key, "intId": int_id}
    res = requests.get(url, params=params)
    data = res.json()
    items = data["body"]["items"]["item"]

    color_to_grade = {}
    for item in items:
        hex_color = item["IMAGE"].lstrip("#")
        rgb = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        grade = int(item["LGD_NO"])
        color_to_grade[rgb] = grade
    return color_to_grade


# ══════════════════════════════════════════════
# 2. 등급 가중 밀도 계산
# ══════════════════════════════════════════════

def closest_grade(pixel_rgb, color_to_grade: dict, tolerance=15):
    """픽셀 색상과 가장 가까운 등급 찾기 (안티앨리어싱 대응)"""
    best_grade = None
    best_dist = float("inf")
    for rgb, grade in color_to_grade.items():
        dist = sum((a - b) ** 2 for a, b in zip(pixel_rgb, rgb)) ** 0.5
        if dist < best_dist:
            best_dist = dist
            best_grade = grade
    if best_dist <= tolerance:
        return best_grade
    return None


def get_weighted_density(layer_url: str, bbox: str, api_key: str,
                          color_to_grade: dict, size: int = 256) -> dict:
    """등급 가중 평균 위험도 반환 (1~10 스케일)"""
    params = {
        "serviceKey": api_key, "srs": "EPSG:4326", "bbox": bbox,
        "format": "image/png", "width": size, "height": size, "transparent": "TRUE",
    }
    res = requests.get(layer_url, params=params)
    img = Image.open(BytesIO(res.content)).convert("RGBA")
    pixels = list(img.getdata())

    graded_pixels = []
    unmatched_count = 0
    transparent_count = 0

    for p in pixels:
        if p[3] == 0:
            transparent_count += 1
            continue
        grade = closest_grade(p[:3], color_to_grade)
        if grade is not None:
            graded_pixels.append(grade)
        else:
            unmatched_count += 1

    total = len(pixels)
    avg_grade = sum(graded_pixels) / len(graded_pixels) if graded_pixels else 0

    return {
        "avg_grade": round(avg_grade, 2),
        "graded_pixel_ratio": round(len(graded_pixels) / total, 3),
        "no_facility_ratio": round(unmatched_count / total, 3),
        "transparent_ratio": round(transparent_count / total, 3),
    }


# ══════════════════════════════════════════════
# 3. 실행
# ══════════════════════════════════════════════

DONGS = {
    "상계동": {"lat": 37.67299, "lon": 127.07035},
    "신림동": {"lat": 37.46320, "lon": 126.93581},
}

print("범례 가져오는 중...")
crime_zone_legend = fetch_legend("IF_0087", SAFEMAP_API_KEY)
night_safety_legend = fetch_legend("IF_0080", SAFEMAP_API_KEY)
print(f"범죄주의구간 범례: {crime_zone_legend}")
print(f"여성밤길치안안전 범례: {night_safety_legend}")

for name, info in DONGS.items():
    bbox = center_to_bbox(info["lat"], info["lon"], 1.5)

    print(f"\n=== {name} ===")
    crime_result = get_weighted_density(CRIME_ZONE_URL, bbox, SAFEMAP_API_KEY, crime_zone_legend)
    print(f"범죄주의구간: {crime_result}")

    night_result = get_weighted_density(NIGHT_SAFETY_URL, bbox, SAFEMAP_API_KEY, night_safety_legend)
    print(f"여성밤길치안안전: {night_result}")