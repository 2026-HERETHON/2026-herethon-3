import os
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
SAFEMAP_API_KEY = os.getenv("SAFEMAP_API_KEY")

print(f"테스트 시각: {datetime.now()}\n")

def test_endpoint(name, url, params=None):
    try:
        res = requests.get(url, params=params, timeout=60)
        content_type = res.headers.get("Content-Type", "")
        print(f"[{name}]")
        print(f"  status: {res.status_code}")
        print(f"  content-type: {content_type}")
        if "image" in content_type:
            print(f"  -> 정상 (이미지)")
        elif "json" in content_type:
            print(f"  -> 정상 (JSON), 앞부분: {res.text[:150]}")
        else:
            print(f"  -> 비정상, 앞부분: {res.text[:150]}")
        print()
    except Exception as e:
        print(f"[{name}] 요청 자체 실패: {e}\n")


# 1. safemap 메인 페이지 (사이트 자체 살아있는지)
test_endpoint("메인 페이지", "http://safemap.go.kr")

# 2. 예전에 성공했던 보안등 WMS (다른 레이어)
test_endpoint("보안등 WMS (IF_0102)", "http://safemap.go.kr/openapi2/IF_0102_WMS", {
    "serviceKey": SAFEMAP_API_KEY, "srs": "EPSG:4326",
    "bbox": "126.848,35.137,126.859,35.146",
    "format": "image/png", "width": 256, "height": 256, "transparent": "TRUE",
})

# 3. 여성밤길치안안전 WMS (지금 문제되는 레이어)
test_endpoint("여성밤길치안안전 WMS (IF_0080)", "http://safemap.go.kr/openapi2/IF_0080_WMS", {
    "serviceKey": SAFEMAP_API_KEY, "srs": "EPSG:4326",
    "bbox": "126.848,35.137,126.859,35.146",
    "format": "image/png", "width": 256, "height": 256, "transparent": "TRUE",
})

# 4. 범죄주의구간 WMS
test_endpoint("범죄주의구간 WMS (IF_0087)", "http://safemap.go.kr/openapi2/IF_0087_WMS", {
    "serviceKey": SAFEMAP_API_KEY, "srs": "EPSG:4326",
    "bbox": "126.848,35.137,126.859,35.146",
    "format": "image/png", "width": 256, "height": 256, "transparent": "TRUE",
})

# 5. 범례 API
test_endpoint("범례 API (lgdInfo)", "http://www.safemap.go.kr/openapi2/lgdInfo", {
    "serviceKey": SAFEMAP_API_KEY, "intId": "IF_0080",
})

# 6. https로도 시도 (http 대신)
test_endpoint("여성밤길치안안전 WMS - HTTPS 시도", "https://safemap.go.kr/openapi2/IF_0080_WMS", {
    "serviceKey": SAFEMAP_API_KEY, "srs": "EPSG:4326",
    "bbox": "126.848,35.137,126.859,35.146",
    "format": "image/png", "width": 256, "height": 256, "transparent": "TRUE",
})