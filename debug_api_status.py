import os
import requests
import time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
SAFEMAP_API_KEY = os.getenv("SAFEMAP_API_KEY")

print(f"테스트 시각: {datetime.now()}\n")

url = "http://safemap.go.kr/openapi2/IF_0080_WMS"
params = {
    "serviceKey": SAFEMAP_API_KEY, "srs": "EPSG:4326",
    "bbox": "126.848,35.137,126.859,35.146",
    "format": "image/png", "width": 256, "height": 256, "transparent": "TRUE",
}

start = time.time()
try:
    res = requests.get(url, params=params, timeout=120)
    print(f"성공! 소요시간: {time.time()-start:.1f}초, status={res.status_code}")
except requests.exceptions.Timeout:
    print(f"120초 타임아웃 도달, 소요시간: {time.time()-start:.1f}초")