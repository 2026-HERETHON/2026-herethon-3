import os
import json
import numpy as np
import pandas as pd
import geopandas as gpd
import requests

from datetime import datetime, timezone
from PIL import Image
from io import BytesIO
from shapely.geometry import Point
from shapely.prepared import prep
from shapely.ops import unary_union
from dotenv import load_dotenv

load_dotenv()
SAFEMAP_API_KEY = os.getenv("SAFEMAP_API_KEY")
KAKAO_API_KEY = os.getenv("KAKAO_API_KEY")

DATA_DIR = "data"


# ══════════════════════════════════════════════════════════════
# 설정
# ══════════════════════════════════════════════════════════════

DONG_GROUPS = {
    "상계동": {"gu_code": "11110", "names": None, "name_contains": "상계"},
    "신림동": {
        "gu_code": "11210",
        "names": ['서원동', '신원동', '서림동', '신사동', '신림동', '난향동', '조원동', '대학동', '난곡동', '삼성동', '미성동'],
        "name_contains": None,
    },
}

GU_MAP = {
    "상계동": "노원구",
    "신림동": "관악구",
}
SIDO = "서울특별시"

SEOUL_DISTRICTS = [
    "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구",
    "성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구",
    "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구",
    "서초구", "강남구", "송파구", "강동구",
]

INDICATORS = [
    {"key": "cctv",   "type": "count", "df": "cctv",  "lat_col": "WGS84위도", "lon_col": "WGS84경도", "count_col": None,      "weight": 20, "invert": False},
    {"key": "light",  "type": "count", "df": "light", "lat_col": "위도",       "lon_col": "경도",       "count_col": "설치개수", "weight": 15, "invert": False},
    {"key": "bell",   "type": "count", "df": "bell",  "lat_col": "WGS84위도", "lon_col": "WGS84경도", "count_col": None,      "weight": 5,  "invert": False},
    {"key": "police", "type": "count", "df": "police","lat_col": "위도",       "lon_col": "경도",       "count_col": None,      "weight": 5,  "invert": False},
    {"key": "night_safety", "type": "wms", "url": "http://safemap.go.kr/openapi2/IF_0080_WMS", "legend_id": "IF_0080", "weight": 30, "invert": True},
    {"key": "crime_zone",   "type": "wms", "url": "http://safemap.go.kr/openapi2/IF_0087_WMS", "legend_id": "IF_0087", "weight": 25, "invert": True},
]

assert sum(i["weight"] for i in INDICATORS) == 100

STATIC_LEGEND = {
    (255, 255, 178): 1, (254, 232, 139): 2, (254, 209, 101): 3, (253, 183, 81): 4,
    (253, 155, 67): 5, (250, 122, 53): 6, (244, 86, 41): 7, (234, 52, 32): 8,
    (211, 26, 35): 9, (189, 0, 38): 10,
}

WMS_TIMEOUT = 15


# ══════════════════════════════════════════════════════════════
# 1. 데이터 로드
# ══════════════════════════════════════════════════════════════

def load_csv(path: str) -> pd.DataFrame:
    try:
        return pd.read_csv(path, encoding="cp949")
    except UnicodeDecodeError:
        return pd.read_csv(path, encoding="utf-8")


def geocode_address(address: str, api_key: str):
    url = "https://dapi.kakao.com/v2/local/search/address.json"
    headers = {"Authorization": f"KakaoAK {api_key}"}
    res = requests.get(url, headers=headers, params={"query": address})
    if res.status_code != 200:
        return None, None
    docs = res.json().get("documents", [])
    if docs:
        return float(docs[0]["y"]), float(docs[0]["x"])
    return None, None


def load_police_geocoded() -> pd.DataFrame:
    cache_path = os.path.join(DATA_DIR, "station_geocoded.csv")
    if os.path.exists(cache_path):
        print("지구대/파출소 캐시 로드 완료")
        return load_csv(cache_path)

    print("지구대/파출소 지오코딩 시작...")
    df_raw = load_csv(os.path.join(DATA_DIR, "경찰청_전국 지구대 파출소 주소 현황.csv"))
    df_raw["주소"] = df_raw["주소"].str.replace(r"\s+", " ", regex=True).str.strip()
    coords = [geocode_address(addr, KAKAO_API_KEY) for addr in df_raw["주소"]]
    df_raw["위도"] = [c[0] for c in coords]
    df_raw["경도"] = [c[1] for c in coords]
    df_geocoded = df_raw.dropna(subset=["위도", "경도"]).copy()
    df_geocoded.to_csv(cache_path, index=False, encoding="utf-8")
    print(f"지오코딩 완료: {len(df_geocoded)}건")
    return df_geocoded


def load_all_data() -> dict:
    print("데이터 로딩 중...")
    df_light = pd.concat([
        load_csv(os.path.join(DATA_DIR, "서울특별시_노원구_보안등정보.csv")),
        load_csv(os.path.join(DATA_DIR, "서울특별시_관악구_보안등정보.csv")),
    ], ignore_index=True)

    dataframes = {
        "cctv": load_csv(os.path.join(DATA_DIR, "CCTV정보_서울특별시.csv")),
        "light": df_light,
        "bell": load_csv(os.path.join(DATA_DIR, "안전비상벨위치정보_서울특별시.csv")),
        "police": load_police_geocoded(),
    }
    for name, df in dataframes.items():
        print(f"  {name}: {len(df)}건")
    return dataframes


def load_boundary() -> gpd.GeoDataFrame:
    print("행정동 경계 로딩 중...")
    gdf = gpd.read_file(os.path.join(DATA_DIR, "행정동경계.shp"), encoding="cp949")
    gdf = gdf.to_crs(epsg=4326)
    return gdf


def get_subdongs(boundary_gdf: gpd.GeoDataFrame, group_key: str) -> gpd.GeoDataFrame:
    cfg = DONG_GROUPS[group_key]
    gu_gdf = boundary_gdf[boundary_gdf["ADM_CD"].astype(str).str.startswith(cfg["gu_code"])]
    if cfg["names"]:
        return gu_gdf[gu_gdf["ADM_NM"].isin(cfg["names"])].reset_index(drop=True)
    else:
        return gu_gdf[gu_gdf["ADM_NM"].str.contains(cfg["name_contains"])].reset_index(drop=True)


def load_wms_fallback() -> dict:
    path = os.path.join(DATA_DIR, "safety_scores_backup_wms_ok.json")
    with open(path, encoding="utf-8") as f:
        backup = json.load(f)
    return {
        group_key: {
            "night_safety": backup[group_key]["summary_raw"]["night_safety_density"],
            "crime_zone": backup[group_key]["summary_raw"]["crime_zone_density"],
        }
        for group_key in DONG_GROUPS
    }


# ══════════════════════════════════════════════════════════════
# 2. CSV 지표 - 공간 조인으로 세부 행정동별 집계
# ══════════════════════════════════════════════════════════════

def count_by_subdong(df: pd.DataFrame, lat_col: str, lon_col: str,
                    subdongs_gdf: gpd.GeoDataFrame, count_col: str = None) -> pd.Series:
    valid = df.dropna(subset=[lat_col, lon_col])
    gdf_points = gpd.GeoDataFrame(
        valid, geometry=gpd.points_from_xy(valid[lon_col], valid[lat_col]), crs="EPSG:4326"
    )
    joined = gpd.sjoin(gdf_points, subdongs_gdf[["ADM_NM", "geometry"]], how="inner", predicate="within")
    result = joined.groupby("ADM_NM")[count_col].sum() if count_col else joined.groupby("ADM_NM").size()
    return result.reindex(subdongs_gdf["ADM_NM"], fill_value=0)


# ══════════════════════════════════════════════════════════════
# 3. WMS 지표 - 폴리곤 클리핑 기반 등급 평균 (+ 폴백 처리)
# ══════════════════════════════════════════════════════════════

def closest_grade(pixel_rgb, color_to_grade: dict, tolerance: int = 15):
    best_grade, best_dist = None, float("inf")
    for rgb, grade in color_to_grade.items():
        dist = sum((a - b) ** 2 for a, b in zip(pixel_rgb, rgb)) ** 0.5
        if dist < best_dist:
            best_dist, best_grade = dist, grade
    return best_grade if best_dist <= tolerance else None


def pixel_to_latlon(px, py, bbox, width, height):
    min_lon, min_lat, max_lon, max_lat = bbox
    lon = min_lon + (px / width) * (max_lon - min_lon)
    lat = max_lat - (py / height) * (max_lat - min_lat)
    return lat, lon


def get_wms_grade_for_polygon(layer_url: str, polygon, api_key: str, legend: dict, size: int = 256) -> float:
    min_lon, min_lat, max_lon, max_lat = polygon.bounds
    bbox_str = f"{min_lon},{min_lat},{max_lon},{max_lat}"
    params = {
        "serviceKey": api_key, "srs": "EPSG:4326", "bbox": bbox_str,
        "format": "image/png", "width": size, "height": size, "transparent": "TRUE",
    }
    res = requests.get(layer_url, params=params, timeout=WMS_TIMEOUT)
    if "image" not in res.headers.get("Content-Type", ""):
        raise ValueError(f"이미지 아님 (status={res.status_code})")

    img = Image.open(BytesIO(res.content)).convert("RGBA")
    pixels = list(img.getdata())
    prepared = prep(polygon)
    bbox_tuple = (min_lon, min_lat, max_lon, max_lat)
    graded = []

    for idx, p in enumerate(pixels):
        if p[3] == 0:
            continue
        py, px = divmod(idx, size)
        lat, lon = pixel_to_latlon(px, py, bbox_tuple, size, size)
        if not prepared.contains(Point(lon, lat)):
            continue
        grade = closest_grade(p[:3], legend)
        if grade is not None:
            graded.append(grade)

    if not graded:
        raise ValueError("등급 매겨진 픽셀 없음")
    return sum(graded) / len(graded) / 10


def get_wms_with_fallback(layer_url: str, polygon, api_key: str, legend: dict,
                        fallback_value: float, subdong_name: str, indicator_key: str, size: int = 256) -> float:
    try:
        return get_wms_grade_for_polygon(layer_url, polygon, api_key, legend, size)
    except Exception as e:
        print(f"    [{subdong_name}] {indicator_key} - 실패({e}), 폴백값으로 대체")
        return fallback_value


# ══════════════════════════════════════════════════════════════
# 4. 정규화 + 점수 산출
# ══════════════════════════════════════════════════════════════

def normalize(value: float, max_value: float) -> float:
    if max_value == 0:
        return 0.0
    return min(100.0, (value / max_value) * 100)


def compute_score(raw: dict, max_vals: dict) -> float:
    total = 0.0
    for ind in INDICATORS:
        key, weight, invert = ind["key"], ind["weight"], ind["invert"]
        if ind["type"] == "count":
            score = normalize(raw[key], max_vals[key])
        else:
            score = raw[key] * 100
        if invert:
            score = 100 - score
        total += score * weight
    return round(total / 100, 1)


# ══════════════════════════════════════════════════════════════
# 5. 법정동 전체 단위 통합 점수
# ══════════════════════════════════════════════════════════════

def compute_dong_level_scores(results: dict, boundary_gdf: gpd.GeoDataFrame,
                                legends: dict, wms_fallback: dict) -> dict:
    dong_raws = {}
    for group_key in DONG_GROUPS:
        subdongs = get_subdongs(boundary_gdf, group_key)
        raw = {}
        for ind in INDICATORS:
            if ind["type"] == "count":
                raw[ind["key"]] = sum(sd["raw"][ind["key"]] for sd in results[group_key]["subdongs"])

        union_polygon = unary_union(subdongs.geometry)
        for ind in INDICATORS:
            if ind["type"] == "wms":
                raw[ind["key"]] = get_wms_with_fallback(
                    ind["url"], union_polygon, SAFEMAP_API_KEY, legends[ind["legend_id"]],
                    fallback_value=wms_fallback[group_key][ind["key"]],
                    subdong_name=f"{group_key}(전체)", indicator_key=ind["key"],
                )

        dong_raws[group_key] = raw
        print(f"[{group_key} 전체] {raw}")

    return dong_raws


# ══════════════════════════════════════════════════════════════
# 6. 프론트엔드용 GeoJSON export
# ══════════════════════════════════════════════════════════════

def export_points_geojson(df: pd.DataFrame, lat_col: str, lon_col: str,
                            boundary_union, output_path: str, extra_cols: list = None):
    """개별 시설 좌표를 GeoJSON Point로 export (마커 클러스터링용, 대상 영역 안의 것만)"""
    valid = df.dropna(subset=[lat_col, lon_col]).copy()
    gdf_points = gpd.GeoDataFrame(
        valid, geometry=gpd.points_from_xy(valid[lon_col], valid[lat_col]), crs="EPSG:4326"
    )
    filtered = gdf_points[gdf_points.within(boundary_union)].copy()

    cols = ["geometry"] + (extra_cols or [])
    filtered = filtered[cols]

    if os.path.exists(output_path):
        os.remove(output_path)
    filtered.to_file(output_path, driver="GeoJSON")
    print(f"{output_path}: {len(filtered)}건 저장")


def export_all_facility_points(dataframes: dict, boundary_gdf: gpd.GeoDataFrame):
    all_subdongs = pd.concat([
        get_subdongs(boundary_gdf, "상계동"),
        get_subdongs(boundary_gdf, "신림동"),
    ])
    boundary_union = unary_union(all_subdongs.geometry)

    export_points_geojson(dataframes["cctv"], "WGS84위도", "WGS84경도", boundary_union,
                        os.path.join(DATA_DIR, "points_cctv.geojson"))
    export_points_geojson(dataframes["light"], "위도", "경도", boundary_union,
                        os.path.join(DATA_DIR, "points_light.geojson"),
                        extra_cols=["설치개수"])
    export_points_geojson(dataframes["bell"], "WGS84위도", "WGS84경도", boundary_union,
                        os.path.join(DATA_DIR, "points_bell.geojson"))
    export_points_geojson(dataframes["police"], "위도", "경도", boundary_union,
                        os.path.join(DATA_DIR, "points_police.geojson"))


def export_safety_score_polygons(boundary_gdf: gpd.GeoDataFrame, results: dict, output_path: str):
    """세부 행정동 폴리곤 + 안심점수를 GeoJSON으로 export (choropleth 색칠용)"""
    all_features = []

    for group_key in DONG_GROUPS:
        subdongs = get_subdongs(boundary_gdf, group_key)
        score_map = {sd["name"]: sd for sd in results[group_key]["subdongs"]}

        for _, row in subdongs.iterrows():
            name = row["ADM_NM"]
            sd_data = score_map[name]
            all_features.append({
                "ADM_NM": name,
                "dong_group": group_key,
                "safety_score": sd_data["safety_score"],
                "cctv": sd_data["raw"]["cctv"],
                "light": sd_data["raw"]["light"],
                "bell": sd_data["raw"]["bell"],
                "police": sd_data["raw"]["police"],
                "geometry": row.geometry,
            })

    gdf_out = gpd.GeoDataFrame(all_features, crs="EPSG:4326")
    if os.path.exists(output_path):
        os.remove(output_path)
    gdf_out.to_file(output_path, driver="GeoJSON")
    print(f"{output_path}: {len(gdf_out)}개 세부 행정동 저장")
    

# ══════════════════════════════════════════════════════════════
# 7. Django fixture export (Grid, Facility 모델용)
# ══════════════════════════════════════════════════════════════


def export_grid_fixture(boundary_gdf: gpd.GeoDataFrame, results: dict, output_path: str,
                        app_label: str = "grids"):
    """세부 행정동 데이터를 Django Grid 모델 fixture(JSON)로 변환"""
    records = []
    pk = 1
    now_str = datetime.now(timezone.utc).isoformat()

    for group_key in DONG_GROUPS:
        subdongs = get_subdongs(boundary_gdf, group_key)
        score_map = {sd["name"]: sd for sd in results[group_key]["subdongs"]}

        for _, row in subdongs.iterrows():
            name = row["ADM_NM"]
            sd = score_map[name]
            centroid = row.geometry.centroid

            geom_json = json.loads(gpd.GeoSeries([row.geometry], crs="EPSG:4326").to_json())
            boundary_geometry = geom_json["features"][0]["geometry"]

            records.append({
                "model": f"{app_label}.grid",
                "pk": pk,
                "fields": {
                    "sido": SIDO,
                    "gu": GU_MAP[group_key],
                    "dong_group": group_key,
                    "dong": name,
                    "is_legal_dong": False,
                    "latitude": centroid.y,
                    "longitude": centroid.x,
                    "boundary_geojson": json.dumps(boundary_geometry, ensure_ascii=False),
                    "safety_score": sd["safety_score"],
                    "cctv_count": int(sd["raw"]["cctv"]),
                    "light_count": int(sd["raw"]["light"]),
                    "bell_count": int(sd["raw"]["bell"]),
                    "police_count": int(sd["raw"]["police"]),
                    "night_safety_grade": round(sd["raw"]["night_safety"] * 10, 2),
                    "crime_zone_grade": round(sd["raw"]["crime_zone"] * 10, 2),
                    "created_at": now_str,
                    "updated_at": now_str,
                }
            })
            pk += 1

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"{output_path}: Grid(세부 행정동) {len(records)}건 저장")



def export_facility_fixture(dataframes: dict, boundary_gdf: gpd.GeoDataFrame, output_path: str, app_label: str = "grids"):
    """개별 시설(CCTV/가로등/비상벨/파출소) 데이터를 Django Facility 모델 fixture(JSON)로 변환"""
    all_subdongs = pd.concat([
        get_subdongs(boundary_gdf, "상계동"),
        get_subdongs(boundary_gdf, "신림동"),
    ])
    boundary_union = unary_union(all_subdongs.geometry)

    facility_specs = [
        {"type": "cctv",   "df": "cctv",   "lat_col": "WGS84위도", "lon_col": "WGS84경도", "count_col": None},
        {"type": "light",  "df": "light",  "lat_col": "위도",       "lon_col": "경도",       "count_col": "설치개수"},
        {"type": "bell",   "df": "bell",   "lat_col": "WGS84위도", "lon_col": "WGS84경도", "count_col": None},
        {"type": "police", "df": "police", "lat_col": "위도",       "lon_col": "경도",       "count_col": None},
    ]

    records = []
    pk = 1

    for spec in facility_specs:
        df = dataframes[spec["df"]]
        valid = df.dropna(subset=[spec["lat_col"], spec["lon_col"]]).copy()
        gdf_points = gpd.GeoDataFrame(
            valid, geometry=gpd.points_from_xy(valid[spec["lon_col"]], valid[spec["lat_col"]]), crs="EPSG:4326"
        )
        filtered = gdf_points[gdf_points.within(boundary_union)]

        for _, row in filtered.iterrows():
            count_value = int(row[spec["count_col"]]) if spec["count_col"] else 1
            records.append({
                "model": f"{app_label}.facility",
                "pk": pk,
                "fields": {
                    "type": spec["type"],
                    "latitude": row.geometry.y,
                    "longitude": row.geometry.x,
                    "count": count_value,
                }
            })
            pk += 1

        print(f"  {spec['type']}: {len(filtered)}건 준비 완료")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"{output_path}: Facility {len(records)}건 저장")

def export_legal_dong_fixture(boundary_gdf: gpd.GeoDataFrame, results: dict, output_path: str,
                                start_pk: int, app_label: str = "grids"):
    """법정동(상계동/신림동) 전체 단위 Grid 레코드 fixture 생성 (후기/QNA용)"""
    records = []
    pk = start_pk
    now_str = datetime.now(timezone.utc).isoformat()
    dong_level = results["dong_level_totals"]

    for group_key in DONG_GROUPS:
        subdongs = get_subdongs(boundary_gdf, group_key)
        union_polygon = unary_union(subdongs.geometry)
        centroid = union_polygon.centroid

        geom_json = json.loads(gpd.GeoSeries([union_polygon], crs="EPSG:4326").to_json())
        boundary_geometry = geom_json["features"][0]["geometry"]

        raw = dong_level[group_key]["raw"]
        score = dong_level[group_key]["safety_score"]

        records.append({
            "model": f"{app_label}.grid",
            "pk": pk,
            "fields": {
                "sido": SIDO,
                "gu": GU_MAP[group_key],
                "dong_group": group_key,
                "dong": group_key,
                "is_legal_dong": True,
                "latitude": centroid.y,
                "longitude": centroid.x,
                "boundary_geojson": json.dumps(boundary_geometry, ensure_ascii=False),
                "safety_score": score,
                "cctv_count": int(raw["cctv"]),
                "light_count": int(raw["light"]),
                "bell_count": int(raw["bell"]),
                "police_count": int(raw["police"]),
                "night_safety_grade": round(raw["night_safety"] * 10, 2),
                "crime_zone_grade": round(raw["crime_zone"] * 10, 2),
                "created_at": now_str,
                "updated_at": now_str,
            }
        })
        pk += 1

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"{output_path}: 법정동 전체 Grid {len(records)}건 저장 (pk {start_pk}~{pk-1})")


def export_district_fixture(output_path: str, app_label: str = "grids"):
    records = []
    for i, name in enumerate(SEOUL_DISTRICTS, start=1):
        records.append({
            "model": f"{app_label}.district",
            "pk": i,
            "fields": {
                "name": name,
                "has_data": name in GU_MAP.values(),
            }
        })
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"{output_path}: District {len(records)}건 저장")

# ══════════════════════════════════════════════════════════════
# 8. 실행
# ══════════════════════════════════════════════════════════════

def main():
    dataframes = load_all_data()
    boundary_gdf = load_boundary()
    wms_fallback = load_wms_fallback()
    legends = {ind["legend_id"]: STATIC_LEGEND for ind in INDICATORS if ind["type"] == "wms"}

    results = {}
    for group_key in DONG_GROUPS:
        print(f"\n[{group_key}] 처리 중...")
        subdongs = get_subdongs(boundary_gdf, group_key)
        print(f"  세부 행정동 {len(subdongs)}개: {subdongs['ADM_NM'].tolist()}")

        count_results = {}
        for ind in INDICATORS:
            if ind["type"] == "count":
                count_results[ind["key"]] = count_by_subdong(
                    dataframes[ind["df"]], ind["lat_col"], ind["lon_col"], subdongs, ind.get("count_col")
                )

        subdong_raws = []
        for _, row in subdongs.iterrows():
            name = row["ADM_NM"]
            raw = {key: float(series[name]) for key, series in count_results.items()}
            for ind in INDICATORS:
                if ind["type"] == "wms":
                    raw[ind["key"]] = get_wms_with_fallback(
                        ind["url"], row.geometry, SAFEMAP_API_KEY, legends[ind["legend_id"]],
                        fallback_value=wms_fallback[group_key][ind["key"]],
                        subdong_name=name, indicator_key=ind["key"],
                    )
            subdong_raws.append({"name": name, "raw": raw})
            print(f"    {name}: {raw}")

        results[group_key] = {"group_key": group_key, "subdongs": subdong_raws}

    all_raws = [sd["raw"] for g in results.values() for sd in g["subdongs"]]
    max_vals = {
        ind["key"]: max(r[ind["key"]] for r in all_raws) or 1
        for ind in INDICATORS if ind["type"] == "count"
    }

    for group in results.values():
        for sd in group["subdongs"]:
            sd["safety_score"] = compute_score(sd["raw"], max_vals)

    print("\n" + "=" * 40)
    print("세부 행정동 결과")
    print("=" * 40)
    for group_key, group in results.items():
        print(f"\n=== {group_key} ===")
        for sd in group["subdongs"]:
            print(f"  {sd['name']}: {sd['safety_score']}점")

    print("\n" + "=" * 40)
    print("법정동 전체 통합 결과")
    print("=" * 40)
    dong_raws = compute_dong_level_scores(results, boundary_gdf, legends, wms_fallback)

    dong_max_vals = {
        ind["key"]: max(dong_raws[g][ind["key"]] for g in DONG_GROUPS) or 1
        for ind in INDICATORS if ind["type"] == "count"
    }

    dong_level_results = {}
    for group_key in DONG_GROUPS:
        score = compute_score(dong_raws[group_key], dong_max_vals)
        dong_level_results[group_key] = {"raw": dong_raws[group_key], "safety_score": score}
        print(f"\n[{group_key} 전체] 안심 점수: {score}점")

    results["dong_level_totals"] = dong_level_results

    output_path = os.path.join(DATA_DIR, "safety_scores_subdong.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\n결과 저장 완료: {output_path}")

    # 프론트엔드용 GeoJSON export
    print("\n" + "=" * 40)
    print("프론트엔드용 GeoJSON export")
    print("=" * 40)
    export_all_facility_points(dataframes, boundary_gdf)
    export_safety_score_polygons(boundary_gdf, results, os.path.join(DATA_DIR, "safety_score_polygons.geojson"))

    # Django fixture export (BE1 - grids 앱)
    print("\n" + "=" * 40)
    print("Django fixture export")
    print("=" * 40)
    export_grid_fixture(boundary_gdf, results, os.path.join(DATA_DIR, "grid_fixture.json"))
    export_legal_dong_fixture(boundary_gdf, results, os.path.join(DATA_DIR, "legal_dong_fixture.json"), start_pk=20)
    export_facility_fixture(dataframes, boundary_gdf, os.path.join(DATA_DIR, "facility_fixture.json"))
    export_district_fixture(os.path.join(DATA_DIR, "district_fixture.json"))

    return results, boundary_gdf



if __name__ == "__main__":
    main()