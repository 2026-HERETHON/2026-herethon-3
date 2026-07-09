# 경찰청_전국 지구대 파출소 주소 현황_20251231
import os
import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv()
KAKAO_API_KEY = os.getenv("KAKAO_API_KEY")
DATA_DIR = "data"


def load_csv(path):
    try:
        return pd.read_csv(path, encoding="cp949")
    except UnicodeDecodeError:
        return pd.read_csv(path, encoding="utf-8")


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


station_geocoded_path = os.path.join(DATA_DIR, "station_geocoded.csv")

if os.path.exists(station_geocoded_path):
    df_station_geocoded = load_csv(station_geocoded_path)
    print(f"지구대/파출소 캐시 로드 완료: {len(df_station_geocoded)}건")
else:
    print("지구대/파출소 지오코딩 시작 (2047건, 시간 좀 걸립니다)...")
    df_station_raw = load_csv(os.path.join(DATA_DIR, "경찰청_전국 지구대 파출소 주소 현황_20251231.csv"))

    # ── 전처리: 연속 공백 정리 ──────────────────
    df_station_raw['주소'] = df_station_raw['주소'].str.replace(r'\s+', ' ', regex=True).str.strip()

    coords = [geocode_address(addr) for addr in df_station_raw['주소']]
    df_station_raw['위도'] = [c[0] for c in coords]
    df_station_raw['경도'] = [c[1] for c in coords]

    df_station_geocoded = df_station_raw.dropna(subset=['위도', '경도']).copy()
    df_failed = df_station_raw[df_station_raw['위도'].isna()]

    df_station_geocoded.to_csv(station_geocoded_path, index=False, encoding="utf-8")
    print(f"지오코딩 완료 및 캐싱: {len(df_station_geocoded)}건 성공 / {len(df_failed)}건 실패")

    if len(df_failed) > 0:
        print("\n실패한 주소 목록:")
        print(df_failed[['관서명', '구분', '주소']].to_string())