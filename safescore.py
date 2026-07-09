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


def load_csv(path):
    try:
        return pd.read_csv(path, encoding="cp949")
    except UnicodeDecodeError:
        return pd.read_csv(path, encoding="utf-8")

print("데이터 로딩 중...")
df_cctv = load_csv(os.path.join(DATA_DIR, "CCTV정보_서울특별시.csv"))
df_light = load_csv(os.path.join(DATA_DIR, "전국보안등정보표준데이터.csv"))
df_bell = load_csv(os.path.join(DATA_DIR, "안전비상벨위치정보_서울특별시.csv"))

police_geocoded_path = os.path.join(DATA_DIR, "police_geocoded.csv")

if os.path.exists(police_geocoded_path):
    df_police_geocoded = load_csv(police_geocoded_path)
    print(f"치안시설 캐시 로드 완료: {len(df_police_geocoded)}건")
else:
    print("치안시설 지오코딩 시작 (처음 한 번만 실행됨)...")
    df_police_raw = load_csv(os.path.join(DATA_DIR, "경찰청_전국 치안센터 주소 현황_20251231.csv"))

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
    df_police_geocoded.to_csv(police_geocoded_path, index=False, encoding="utf-8")
    print(f"치안시설 지오코딩 완료 및 캐싱: {len(df_police_geocoded)}건")
    
    
    
    print(df_bell.columns.tolist())