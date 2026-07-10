import os
import json
import numpy as np
import requests
import geopandas as gpd
from PIL import Image, ImageFilter
from io import BytesIO
from shapely.geometry import Point
from shapely.prepared import prep
from shapely.ops import unary_union
from dotenv import load_dotenv

load_dotenv()
SAFEMAP_API_KEY = os.getenv("SAFEMAP_API_KEY")
DATA_DIR = "data"


# ══════════════════════════════════════════════════════════════
# 설정
# ══════════════════════════════════════════════════════════════

DONG_GROUPS = {
    "상계동": {"gu_code": "11110", "names": None, "name_contains": "상계"},
    "신림동": {
        "gu_code": "11210",
        "names": ['서원동', '신원동', '서림동', '신사동', '신림동', '난향동',
                '조원동', '대학동', '난곡동', '삼성동', '미성동'],
        "name_contains": None,
    },
}

INDICATORS = {
    "night_safety": "http://safemap.go.kr/openapi2/IF_0080_WMS",
    "crime_zone": "http://safemap.go.kr/openapi2/IF_0087_WMS",
}

# safemap 원본 색상 -> 등급(1~10) 매핑
STATIC_LEGEND = {
    (255, 255, 178): 1, (254, 232, 139): 2, (254, 209, 101): 3, (253, 183, 81): 4,
    (253, 155, 67): 5, (250, 122, 53): 6, (244, 86, 41): 7, (234, 52, 32): 8,
    (211, 26, 35): 9, (189, 0, 38): 10,
}

# 우리 서비스 색상 팔레트: 안전(1)할수록 진한 파랑, 위험(10)할수록 옅은 파랑
BLUE_SHADES_SAFE_TO_RISKY = [
    (12, 68, 124),    # 등급 1 - 가장 안전 (진한 파랑)
    (24, 95, 165),
    (36, 116, 195),
    (55, 138, 221),
    (98, 163, 226),
    (133, 183, 235),
    (159, 195, 240),
    (181, 212, 244),
    (197, 224, 247),
    (230, 241, 251),  # 등급 10 - 가장 위험 (옅은 파랑)
]
OUR_COLOR_SCALE = {grade: color for grade, color in enumerate(BLUE_SHADES_SAFE_TO_RISKY, start=1)}

BLUR_RADIUS = 3
# 가우시안 블러 강도 (숫자 클수록 더 부드럽게 퍼짐)


# ══════════════════════════════════════════════════════════════
# 1. 등급 매칭
# ══════════════════════════════════════════════════════════════

def closest_grade(pixel_rgb, legend, tolerance=15):
    best_grade, best_dist = None, float("inf")
    for rgb, grade in legend.items():
        dist = sum((a - b) ** 2 for a, b in zip(pixel_rgb, rgb)) ** 0.5
        if dist < best_dist:
            best_dist, best_grade = dist, grade
    return best_grade if best_dist <= tolerance else None


# ══════════════════════════════════════════════════════════════
# 2. 행정동 경계 로드
# ══════════════════════════════════════════════════════════════

def get_subdongs(boundary_gdf: gpd.GeoDataFrame, group_key: str) -> gpd.GeoDataFrame:
    cfg = DONG_GROUPS[group_key]
    gu_gdf = boundary_gdf[boundary_gdf["ADM_CD"].astype(str).str.startswith(cfg["gu_code"])]
    if cfg["names"]:
        return gu_gdf[gu_gdf["ADM_NM"].isin(cfg["names"])].reset_index(drop=True)
    return gu_gdf[gu_gdf["ADM_NM"].str.contains(cfg["name_contains"])].reset_index(drop=True)


# ══════════════════════════════════════════════════════════════
# 3. 가우시안 블러 (premultiplied alpha 방식 - 경계 검은 테두리 방지)
# ══════════════════════════════════════════════════════════════

def blur_rgba(img: Image.Image, radius: float = BLUR_RADIUS) -> Image.Image:
    """RGBA 이미지에 안전하게 가우시안 블러 적용"""
    arr = np.array(img).astype(np.float32)
    rgb = arr[..., :3]
    alpha = arr[..., 3:4] / 255.0

    premultiplied = rgb * alpha

    premult_img = Image.fromarray(premultiplied.astype(np.uint8))
    alpha_img = Image.fromarray((alpha[..., 0] * 255).astype(np.uint8))

    premult_blurred = premult_img.filter(ImageFilter.GaussianBlur(radius))
    alpha_blurred = alpha_img.filter(ImageFilter.GaussianBlur(radius))

    premult_arr = np.array(premult_blurred).astype(np.float32)
    alpha_arr = np.array(alpha_blurred).astype(np.float32) / 255.0
    alpha_safe = np.where(alpha_arr[..., None] == 0, 1, alpha_arr[..., None])

    rgb_final = (premult_arr / alpha_safe).clip(0, 255).astype(np.uint8)
    alpha_final = (alpha_arr * 255).astype(np.uint8)

    result = np.dstack([rgb_final, alpha_final])
    return Image.fromarray(result, mode="RGBA")


# ══════════════════════════════════════════════════════════════
# 4. WMS 이미지 재색칠
# ══════════════════════════════════════════════════════════════

def recolor_wms_image(layer_url: str, polygon, api_key: str, legend: dict, color_scale: dict,
                    size: int = 512, timeout: int = 20, blur_radius: float = BLUR_RADIUS):
    """WMS 이미지를 받아서 폴리곤 안 픽셀만 우리 색상으로 재색칠 후 블러 적용"""
    min_lon, min_lat, max_lon, max_lat = polygon.bounds
    bbox_str = f"{min_lon},{min_lat},{max_lon},{max_lat}"

    params = {
        "serviceKey": api_key, "srs": "EPSG:4326", "bbox": bbox_str,
        "format": "image/png", "width": size, "height": size, "transparent": "TRUE",
    }
    res = requests.get(layer_url, params=params, timeout=timeout)
    if "image" not in res.headers.get("Content-Type", ""):
        raise ValueError(f"이미지 아님 (status={res.status_code})")

    img = Image.open(BytesIO(res.content)).convert("RGBA")
    pixels = img.load()
    prepared = prep(polygon)

    for py in range(img.height):
        for px in range(img.width):
            r, g, b, a = pixels[px, py]
            if a == 0:
                continue

            lon = min_lon + (px / size) * (max_lon - min_lon)
            lat = max_lat - (py / size) * (max_lat - min_lat)
            if not prepared.contains(Point(lon, lat)):
                pixels[px, py] = (0, 0, 0, 0)
                continue

            grade = closest_grade((r, g, b), legend)
            if grade is None:
                pixels[px, py] = (0, 0, 0, 0)
                continue

            nr, ng, nb = color_scale[grade]
            pixels[px, py] = (nr, ng, nb, min(a, 200))

    # 블러 미적용
    # img = blur_rgba(img, radius=blur_radius)

    return img, (min_lon, min_lat, max_lon, max_lat)


# ══════════════════════════════════════════════════════════════
# 5. 실행
# ══════════════════════════════════════════════════════════════

def main():
    print("행정동 경계 로딩 중...")
    boundary_gdf = gpd.read_file(os.path.join(DATA_DIR, "행정동경계.shp"), encoding="cp949")
    boundary_gdf = boundary_gdf.to_crs(epsg=4326)

    overlay_meta = {}

    for group_key in DONG_GROUPS:
        subdongs = get_subdongs(boundary_gdf, group_key)
        union_polygon = unary_union(subdongs.geometry)

        for indicator_key, url in INDICATORS.items():
            print(f"[{group_key}] {indicator_key} 재색칠 중...")
            img, bounds = recolor_wms_image(url, union_polygon, SAFEMAP_API_KEY, STATIC_LEGEND, OUR_COLOR_SCALE)

            filename = f"heatmap_{indicator_key}_{group_key}.png"
            output_path = os.path.join(DATA_DIR, filename)
            img.save(output_path, optimize=True)
            print(f"  저장 완료: {output_path}")

            overlay_meta[f"{group_key}_{indicator_key}"] = {
                "file": filename,
                "bounds": {
                    "min_lon": bounds[0], "min_lat": bounds[1],
                    "max_lon": bounds[2], "max_lat": bounds[3],
                },
            }

    meta_path = os.path.join(DATA_DIR, "heatmap_overlay_meta.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(overlay_meta, f, ensure_ascii=False, indent=2)
    print(f"\n오버레이 메타데이터 저장 완료: {meta_path}")


if __name__ == "__main__":
    main()