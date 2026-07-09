import pandas as pd
import os

DATA_DIR = "data"

def load_csv(path):
    try:
        return pd.read_csv(path, encoding="cp949")
    except UnicodeDecodeError:
        return pd.read_csv(path, encoding="utf-8")

df_light = load_csv(os.path.join(DATA_DIR, "전국보안등정보표준데이터.csv"))

print("=== 기본 정보 ===")
print(f"전체 행 개수: {len(df_light)}")
print(f"컬럼: {df_light.columns.tolist()}")

print("\n=== dtype 확인 ===")
print(f"위도 dtype: {df_light['위도'].dtype}")
print(f"경도 dtype: {df_light['경도'].dtype}")

print("\n=== 좌표 범위 확인 (한국이면 위도 33~43, 경도 124~132) ===")
print(df_light[['위도', '경도']].describe())

print("\n=== 서울 포함 여부 확인 ===")
seoul_count = df_light['소재지도로명주소'].str.contains('서울', na=False).sum()
print(f"주소에 '서울' 포함된 행: {seoul_count}건")

print("\n=== 관리기관명 종류 (지역 분포 확인) ===")
print(df_light['관리기관명'].value_counts().head(20))

print("\n=== 상계동/신림동 bbox로 직접 필터링 테스트 ===")
def count_in_bbox(df, bbox, lat_col, lon_col, count_col=None):
    min_lon, min_lat, max_lon, max_lat = map(float, bbox.split(","))
    mask = (
        (df[lat_col] >= min_lat) & (df[lat_col] <= max_lat) &
        (df[lon_col] >= min_lon) & (df[lon_col] <= max_lon)
    )
    filtered = df[mask]
    if count_col and count_col in df.columns:
        return filtered[count_col].sum()
    return len(filtered)

sanggye_bbox = "127.05535,37.65799,127.08535,37.68799"  # 상계동 대략 bbox
sillim_bbox = "126.91581,37.44820,126.95581,37.47820"   # 신림동 대략 bbox

print(f"상계동 bbox 결과: {count_in_bbox(df_light, sanggye_bbox, '위도', '경도', '설치개수')}")
print(f"신림동 bbox 결과: {count_in_bbox(df_light, sillim_bbox, '위도', '경도', '설치개수')}")