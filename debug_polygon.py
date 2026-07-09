import os
import geopandas as gpd
import requests
from PIL import Image
from io import BytesIO
from shapely.geometry import Point
from dotenv import load_dotenv

load_dotenv()
SAFEMAP_API_KEY = os.getenv("SAFEMAP_API_KEY")
DATA_DIR = "data"


def test_wms(name, bbox_str, api_key):
    params = {
        "serviceKey": api_key, "srs": "EPSG:4326", "bbox": bbox_str,
        "format": "image/png", "width": 256, "height": 256, "transparent": "TRUE",
    }
    res = requests.get("http://safemap.go.kr/openapi2/IF_0080_WMS", params=params)
    print(f"[{name}] status={res.status_code}, content-type={res.headers.get('Content-Type')}")
    if "image" not in res.headers.get("Content-Type", ""):
        print(f"  -> 이미지 아님 (에러 응답)")
    else:
        print(f"  -> 이미지 정상 수신")


# 세부 행정동(상계1동) bbox
boundary_gdf = gpd.read_file(os.path.join(DATA_DIR, "행정동경계.shp"), encoding="cp949")
boundary_gdf = boundary_gdf.to_crs(epsg=4326)
nowon_gdf = boundary_gdf[boundary_gdf["ADM_CD"].astype(str).str.startswith("11110")]
sanggye1 = nowon_gdf[nowon_gdf["ADM_NM"] == "상계1동"].iloc[0]
min_lon, min_lat, max_lon, max_lat = sanggye1.geometry.bounds
new_bbox = f"{min_lon},{min_lat},{max_lon},{max_lat}"

test_wms("세부 행정동(상계1동)", new_bbox, SAFEMAP_API_KEY)

# 예전에 성공했던 상계동 전체 bbox
old_bbox = "127.05327695730104,37.65947648648648,127.08742304269897,37.686503513513514"
test_wms("예전 상계동 전체", old_bbox, SAFEMAP_API_KEY)