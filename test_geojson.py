import geopandas as gpd

boundary_gdf = gpd.read_file("data/행정동경계.shp", encoding="cp949")
boundary_gdf = boundary_gdf.to_crs(epsg=4326)

# 관악구 코드로 먼저 좁히기 (동명이인 방지)
gwanak_gdf = boundary_gdf[boundary_gdf['ADM_CD'].astype(str).str.startswith('11210')]

sillim_subdong_names = ['조원동', '신사동', '신림동', '미성동', '신원동', '서원동','난곡동', '난향동', '삼성동', '서림동', '대학동']
sillim_matches = gwanak_gdf[gwanak_gdf['ADM_NM'].isin(sillim_subdong_names)]

print(f"신림동 세부 행정동: {len(sillim_matches)}개 확인")
print(sillim_matches[['ADM_CD', 'ADM_NM']])

nowon_gdf = boundary_gdf[boundary_gdf['ADM_CD'].astype(str).str.startswith('11110')]
sanggye_matches = nowon_gdf[nowon_gdf['ADM_NM'].str.contains('상계')]

print(f"상계동 세부 행정동: {len(sanggye_matches)}개 확인")
print(sanggye_matches[['ADM_CD', 'ADM_NM']])