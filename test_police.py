import pandas as pd
import os

DATA_DIR = "data"

def load_csv(path):
    try:
        return pd.read_csv(path, encoding="cp949")
    except UnicodeDecodeError:
        return pd.read_csv(path, encoding="utf-8")

df_police = load_csv(os.path.join(DATA_DIR, "police_geocoded.csv"))

print("=== 기본 정보 ===")
print(f"전체 행 개수: {len(df_police)}")
print(f"컬럼: {df_police.columns.tolist()}")

print("\n=== 좌표 범위 확인 ===")
print(df_police[['위도', '경도']].describe())

print("\n=== 서울/노원구/관악구 포함 여부 확인 ===")
if '주소' in df_police.columns:
    print(f"'서울' 포함: {df_police['주소'].str.contains('서울', na=False).sum()}건")
    print(f"'노원' 포함: {df_police['주소'].str.contains('노원', na=False).sum()}건")
    print(f"'관악' 포함: {df_police['주소'].str.contains('관악', na=False).sum()}건")

print("\n=== 반경을 넓혀가며 근처에 있는지 확인 ===")
import numpy as np

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arcsin(np.sqrt(a))
    return R * c

def count_in_radius(df, center_lat, center_lon, radius_km, lat_col, lon_col):
    distances = haversine_distance(center_lat, center_lon, df[lat_col], df[lon_col])
    return (distances <= radius_km).sum()

centers = {
    "상계동": (37.67299, 127.07035),
    "신림동": (37.46320, 126.93581),
}

for name, (lat, lon) in centers.items():
    for r in [1.5, 3, 5, 10]:
        count = count_in_radius(df_police, lat, lon, r, '위도', '경도')
        print(f"{name} 반경 {r}km: {count}건")