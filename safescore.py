import os
import json
import numpy as np
import pandas as pd
import requests
from PIL import Image
from io import BytesIO
from dotenv import load_dotenv

load_dotenv()
SAFEMAP_API_KEY = os.getenv("SAFEMAP_API_KEY")
KAKAO_API_KEY = os.getenv("KAKAO_API_KEY")

DATA_DIR = "data"


# ══════════════════════════════════════════════
# 1. 데이터 로드
# ══════════════════════════════════════════════

def load_csv(path):
    try:
        return pd.read_csv(path, encoding="cp949")
    except UnicodeDecodeError:
        return pd.read_csv(path, encoding="utf-8")

print("데이터 로딩 중...")

# CCTV
df_cctv = load_csv(os.path.join(DATA_DIR, "CCTV정보_서울특별시.csv"))

# 보안등: 노원구 + 관악구 (전국본은 5만 건 제한으로 서울 데이터 없음)
df_light_nowon = load_csv(os.path.join(DATA_DIR, "서울특별시_노원구_보안등정보.csv"))
df_light_gwanak = load_csv(os.path.join(DATA_DIR, "서울특별시_관악구_보안등정보.csv"))
df_light = pd.concat([df_light_nowon, df_light_gwanak], ignore_index=True)
print(f"보안등 로드 완료: 노원구 {len(df_light_nowon)}건 + 관악구 {len(df_light_gwanak)}건 = 총 {len(df_light)}건")

# 안전비상벨
df_bell = load_csv(os.path.join(DATA_DIR, "안전비상벨위치정보_서울특별시.csv"))

# 지구대/파출소 (치안센터 618건 대신 사용 - 밀도가 훨씬 높음)
station_geocoded_path = os.path.join(DATA_DIR, "station_geocoded.csv")

if os.path.exists(station_geocoded_path):
    df_police_geocoded = load_csv(station_geocoded_path)
    print(f"지구대/파출소 캐시 로드 완료: {len(df_police_geocoded)}건")
else:
    print("지구대/파출소 지오코딩 시작 (2047건, 시간 좀 걸립니다)...")
    df_police_raw = load_csv(os.path.join(DATA_DIR, "경찰청_전국 지구대 파출소 주소 현황.csv"))
    df_police_raw['주소'] = df_police_raw['주소'].str.replace(r'\s+', ' ', regex=True).str.strip()

    def geocode_address(address: str):
        url = "https://dapi.kakao.com/v2/local/search/address.json"
        headers = {"Authorization": f"KakaoAK {KAKAO_API_KEY}"}
        res = requests.get(url, headers=headers, params={"query": address})
        if res.status_code != 200:
            return None, None
        docs = res.json().get("documents", [])
        if docs:
            return float(docs[0]['y']), float(docs[0]['x'])
        return None, None

    coords = [geocode_address(addr) for addr in df_police_raw['주소']]
    df_police_raw['위도'] = [c[0] for c in coords]
    df_police_raw['경도'] = [c[1] for c in coords]
    df_police_geocoded = df_police_raw.dropna(subset=['위도', '경도']).copy()
    df_police_geocoded.to_csv(station_geocoded_path, index=False, encoding="utf-8")
    print(f"지오코딩 완료 및 캐싱: {len(df_police_geocoded)}건")


# ══════════════════════════════════════════════
# 2. bbox 필터링 함수 (CSV 좌표 지표 4개 공용)
# ══════════════════════════════════════════════

def count_in_bbox(df: pd.DataFrame, bbox: str, lat_col: str, lon_col: str, count_col: str = None) -> float:
    """bbox = 'minLon,minLat,maxLon,maxLat'. count_col 있으면 합산, 없으면 개수"""
    min_lon, min_lat, max_lon, max_lat = map(float, bbox.split(","))
    mask = (
        (df[lat_col] >= min_lat) & (df[lat_col] <= max_lat) &
        (df[lon_col] >= min_lon) & (df[lon_col] <= max_lon)
    )
    filtered = df[mask]
    if count_col and count_col in df.columns:
        return float(filtered[count_col].sum())
    return float(len(filtered))


# ══════════════════════════════════════════════
# 3. WMS 밀도 계산 함수 (이미지 지표 2개 공용)
# ══════════════════════════════════════════════

NIGHT_SAFETY_URL = "http://safemap.go.kr/openapi2/IF_0080_WMS"
CRIME_ZONE_URL = "http://safemap.go.kr/openapi2/IF_0087_WMS"

def get_density_ratio(layer_url: str, bbox: str, api_key: str, size: int = 256) -> float:
    """bbox 영역의 WMS 이미지에서 색칠된(불투명) 픽셀 비율 반환 (0.0~1.0)"""
    params = {
        "serviceKey": api_key,
        "srs": "EPSG:4326",
        "bbox": bbox,
        "format": "image/png",
        "width": size,
        "height": size,
        "transparent": "TRUE",
    }
    try:
        res = requests.get(layer_url, params=params, timeout=10)
        if "image" not in res.headers.get("Content-Type", ""):
            print(f"  WMS 응답 오류: {res.text[:200]}")
            return 0.0
        img = Image.open(BytesIO(res.content)).convert("RGBA")
        pixels = img.getdata()
        colored = sum(1 for p in pixels if p[3] > 0)
        return colored / len(pixels)
    except Exception as e:
        print(f"  WMS 호출 실패: {e}")
        return 0.0


# ══════════════════════════════════════════════
# 4. bbox / 격자 생성 유틸
# ══════════════════════════════════════════════

def center_to_bbox(lat: float, lon: float, half_size_km: float) -> str:
    """중심 좌표 기준 정사각형 bbox 생성"""
    delta_lat = half_size_km / 111
    delta_lon = half_size_km / (111 * np.cos(np.radians(lat)))
    return f"{lon-delta_lon},{lat-delta_lat},{lon+delta_lon},{lat+delta_lat}"

def make_grid_cells(center_lat: float, center_lon: float, half_size_km: float = 1.5, n: int = 4) -> list:
    """전체 정사각형 영역을 n x n 격자로 분할, 각 칸의 bbox 리스트 반환"""
    delta_lat = half_size_km / 111
    delta_lon = half_size_km / (111 * np.cos(np.radians(center_lat)))

    min_lat, max_lat = center_lat - delta_lat, center_lat + delta_lat
    min_lon, max_lon = center_lon - delta_lon, center_lon + delta_lon

    lat_step = (max_lat - min_lat) / n
    lon_step = (max_lon - min_lon) / n

    cells = []
    for i in range(n):
        for j in range(n):
            cell_min_lat = min_lat + i * lat_step
            cell_max_lat = min_lat + (i + 1) * lat_step
            cell_min_lon = min_lon + j * lon_step
            cell_max_lon = min_lon + (j + 1) * lon_step
            cells.append({
                "row": i,
                "col": j,
                "bbox": f"{cell_min_lon},{cell_min_lat},{cell_max_lon},{cell_max_lat}",
                "center_lat": (cell_min_lat + cell_max_lat) / 2,
                "center_lon": (cell_min_lon + cell_max_lon) / 2,
            })
    return cells


# ══════════════════════════════════════════════
# 5. 지표 계산 (한 bbox당 6개 지표)
# ══════════════════════════════════════════════

def get_raw_indicators(bbox: str, include_wms: bool = True) -> dict:
    result = {
        "cctv": count_in_bbox(df_cctv, bbox, 'WGS84위도', 'WGS84경도'),
        "light": count_in_bbox(df_light, bbox, '위도', '경도', count_col='설치개수'),
        "bell": count_in_bbox(df_bell, bbox, 'WGS84위도', 'WGS84경도'),
        "police": count_in_bbox(df_police_geocoded, bbox, '위도', '경도'),
    }
    if include_wms:
        result["night_safety_density"] = get_density_ratio(NIGHT_SAFETY_URL, bbox, SAFEMAP_API_KEY)
        result["crime_zone_density"] = get_density_ratio(CRIME_ZONE_URL, bbox, SAFEMAP_API_KEY)
    return result


# ══════════════════════════════════════════════
# 6. 정규화 + 안심 점수 산출
# ══════════════════════════════════════════════

def normalize(value: float, max_value: float) -> float:
    if max_value == 0:
        return 0.0
    return min(100.0, (value / max_value) * 100)

WEIGHTS = {
    "cctv": 25,
    "light": 20,
    "bell": 15,
    "police": 15,
    "night_safety_density": 12.5,
    "crime_zone_inverse": 12.5,
}

def compute_safety_score(raw: dict, max_vals: dict) -> float:
    cctv_score = normalize(raw["cctv"], max_vals["cctv"])
    light_score = normalize(raw["light"], max_vals["light"])
    bell_score = normalize(raw["bell"], max_vals["bell"])
    police_score = normalize(raw["police"], max_vals["police"])
    night_score = raw["night_safety_density"] * 100
    crime_score = (1 - raw["crime_zone_density"]) * 100

    total = (
        cctv_score * WEIGHTS["cctv"] +
        light_score * WEIGHTS["light"] +
        bell_score * WEIGHTS["bell"] +
        police_score * WEIGHTS["police"] +
        night_score * WEIGHTS["night_safety_density"] +
        crime_score * WEIGHTS["crime_zone_inverse"]
    ) / 100
    return round(total, 1)


# ══════════════════════════════════════════════
# 7. 실행: 상계동 / 신림동 처리
# ══════════════════════════════════════════════

DONGS = {
    "상계동": {"lat": 37.67299, "lon": 127.07035},
    "신림동": {"lat": 37.46320, "lon": 126.93581},
}

HALF_SIZE_KM = 1.5
GRID_N = 4

def process_dong(name: str, lat: float, lon: float) -> dict:
    print(f"\n[{name}] 처리 중...")

    summary_bbox = center_to_bbox(lat, lon, HALF_SIZE_KM)
    summary_raw = get_raw_indicators(summary_bbox, include_wms=True)
    print(f"  전체 요약 raw: {summary_raw}")

    cells = make_grid_cells(lat, lon, HALF_SIZE_KM, GRID_N)
    for cell in cells:
        cell["raw"] = get_raw_indicators(cell["bbox"], include_wms=False)
    print(f"  격자 {GRID_N*GRID_N}칸 계산 완료")

    return {
        "name": name,
        "center": {"lat": lat, "lon": lon},
        "bbox": summary_bbox,
        "summary_raw": summary_raw,
        "cells": cells,
    }

results = {name: process_dong(name, info["lat"], info["lon"]) for name, info in DONGS.items()}


# ══════════════════════════════════════════════
# 8. 정규화 기준값(max) 계산 후 최종 점수 산출
# ══════════════════════════════════════════════

max_vals = {
    "cctv": max(r["summary_raw"]["cctv"] for r in results.values()) or 1,
    "light": max(r["summary_raw"]["light"] for r in results.values()) or 1,
    "bell": max(r["summary_raw"]["bell"] for r in results.values()) or 1,
    "police": max(r["summary_raw"]["police"] for r in results.values()) or 1,
}

for name, r in results.items():
    r["safety_score"] = compute_safety_score(r["summary_raw"], max_vals)
    for cell in r["cells"]:
        cell["safety_score_partial"] = round(
            normalize(cell["raw"]["cctv"], max_vals["cctv"]) * 0.4 +
            normalize(cell["raw"]["light"], max_vals["light"]) * 0.3 +
            normalize(cell["raw"]["bell"], max_vals["bell"]) * 0.15 +
            normalize(cell["raw"]["police"], max_vals["police"]) * 0.15,
            1
        )

# 8번 섹션에 추가 — 모든 격자를 통틀어 지표별 최댓값 계산
all_cells = [cell for r in results.values() for cell in r["cells"]]
cell_max_vals = {
    "cctv": max(c["raw"]["cctv"] for c in all_cells) or 1,
    "light": max(c["raw"]["light"] for c in all_cells) or 1,
    "bell": max(c["raw"]["bell"] for c in all_cells) or 1,
    "police": max(c["raw"]["police"] for c in all_cells) or 1,
}

for name, r in results.items():
    for cell in r["cells"]:
        cell["safety_score_partial"] = round(
            normalize(cell["raw"]["cctv"], cell_max_vals["cctv"]) * 0.4 +
            normalize(cell["raw"]["light"], cell_max_vals["light"]) * 0.3 +
            normalize(cell["raw"]["bell"], cell_max_vals["bell"]) * 0.15 +
            normalize(cell["raw"]["police"], cell_max_vals["police"]) * 0.15,
            1
        )

# ══════════════════════════════════════════════
# 9. 결과 출력 + 프론트 전달용 JSON 저장
# ══════════════════════════════════════════════

for name, r in results.items():
    print(f"\n=== {name} ===")
    print(f"안심 점수: {r['safety_score']} / 100")
    print(f"원본 수치: {r['summary_raw']}")

output_path = os.path.join(DATA_DIR, "safety_scores.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f"\n결과 저장 완료: {output_path}")