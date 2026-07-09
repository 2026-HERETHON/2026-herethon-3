import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()
SAFEMAP_API_KEY = os.getenv("SAFEMAP_API_KEY")

URL = "http://safemap.go.kr/openapi2/IF_0080_WMS"

def test(name, bbox, size, timeout=30):
    params = {
        "serviceKey": SAFEMAP_API_KEY, "srs": "EPSG:4326",
        "bbox": bbox,
        "format": "image/png", "width": size, "height": size, "transparent": "TRUE",
    }
    start = time.time()
    try:
        res = requests.get(URL, params=params, timeout=timeout)
        elapsed = time.time() - start
        ct = res.headers.get("Content-Type", "")
        status = "이미지 성공" if "image" in ct else f"에러(status={res.status_code})"
        print(f"[{name}] {elapsed:.1f}초 - {status}")
    except requests.exceptions.Timeout:
        elapsed = time.time() - start
        print(f"[{name}] {elapsed:.1f}초 - 타임아웃")


precise_bbox = "127.04815819854959,37.6705008153511,127.08517719650642,37.696137462338186"
rounded_bbox = "127.048158,37.670501,127.085177,37.696137"
doc_example_bbox = "126.848,35.137,126.859,35.146"

print("=== 1. 좌표 정밀도 테스트 (256x256 고정) ===")
test("정밀 좌표(현재 방식)", precise_bbox, 256)
test("반올림 좌표(6자리)", rounded_bbox, 256)
test("문서 예제 bbox", doc_example_bbox, 256)

print("\n=== 2. 이미지 해상도 테스트 (정밀 좌표 고정) ===")
test("256x256", precise_bbox, 256)
test("128x128", precise_bbox, 128)
test("64x64", precise_bbox, 64)