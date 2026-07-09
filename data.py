# data/safety_scores_backup_wms_ok.json 이 없다면 아래 내용으로 생성
import json

backup_data = {
    "상계동": {"summary_raw": {"night_safety_density": 0.2910134060440809, "crime_zone_density": 0.17124719295215063}},
    "신림동": {"summary_raw": {"night_safety_density": 0.20117032155436881, "crime_zone_density": 0.20053299492385784}},
}
with open("data/safety_scores_backup_wms_ok.json", "w", encoding="utf-8") as f:
    json.dump(backup_data, f, ensure_ascii=False, indent=2)