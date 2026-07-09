import pandas as pd

def load_csv(path):
    try:
        return pd.read_csv(path, encoding="cp949")
    except UnicodeDecodeError:
        return pd.read_csv(path, encoding="utf-8")

df_light_nowon = load_csv("data/서울특별시_노원구_보안등정보_20260410.csv")  # 실제 파일명으로 교체
df_light_gwanak = load_csv("data/서울특별시_관악구_보안등정보_20251120.csv")

print("노원구:", df_light_nowon.columns.tolist())
print(df_light_nowon.head())
print("\n관악구:", df_light_gwanak.columns.tolist())
print(df_light_gwanak.head())