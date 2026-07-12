import json
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import Grid, Facility


def grid_list(request):
    """세부 행정동 또는 법정동 전체 데이터를 JSON으로 반환. ?is_legal_dong=true/false로 필터링 가능"""
    grids = Grid.objects.all()

    is_legal_param = request.GET.get('is_legal_dong')
    if is_legal_param is not None:
        is_legal = is_legal_param.lower() == 'true'
        grids = grids.filter(is_legal_dong=is_legal)

    data = []
    for grid in grids:
        data.append({
            "id": grid.id,
            "dong": grid.dong,
            "dong_group": grid.dong_group,
            "is_legal_dong": grid.is_legal_dong,
            "latitude": grid.latitude,
            "longitude": grid.longitude,
            "safety_score": grid.safety_score,
            "cctv_count": grid.cctv_count,
            "light_count": grid.light_count,
            "bell_count": grid.bell_count,
            "police_count": grid.police_count,
            "boundary": json.loads(grid.boundary_geojson) if grid.boundary_geojson else None,
        })

    return JsonResponse({"grids": data}, json_dumps_params={'ensure_ascii': False})


def grid_detail(request, dong):
    """특정 세부 행정동 또는 법정동 상세 정보 조회.
    기본은 세부 행정동, ?is_legal_dong=true 이면 법정동 전체 조회"""
    is_legal_param = request.GET.get('is_legal_dong', 'false')
    is_legal = is_legal_param.lower() == 'true'

    grid = get_object_or_404(Grid, dong=dong, is_legal_dong=is_legal)

    data = {
        "id": grid.id,
        "dong": grid.dong,
        "dong_group": grid.dong_group,
        "is_legal_dong": grid.is_legal_dong,
        "latitude": grid.latitude,
        "longitude": grid.longitude,
        "safety_score": grid.safety_score,
        "cctv_count": grid.cctv_count,
        "light_count": grid.light_count,
        "bell_count": grid.bell_count,
        "police_count": grid.police_count,
        "boundary": json.loads(grid.boundary_geojson) if grid.boundary_geojson else None,
    }

    return JsonResponse(data, json_dumps_params={'ensure_ascii': False})


def facility_list(request):
    """개별 시설 좌표 조회 (마커 클러스터링용). ?type=cctv 형태로 종류 지정"""
    facility_type = request.GET.get('type')

    if not facility_type:
        return JsonResponse({"error": "type 파라미터가 필요합니다 (cctv/light/bell/police)"}, status=400)

    valid_types = dict(Facility.FACILITY_TYPES).keys()
    if facility_type not in valid_types:
        return JsonResponse({"error": f"올바르지 않은 type입니다. 사용 가능: {list(valid_types)}"}, status=400)

    facilities = Facility.objects.filter(type=facility_type)

    data = [
        {"latitude": f.latitude, "longitude": f.longitude, "count": f.count}
        for f in facilities
    ]

    return JsonResponse({"type": facility_type, "count": len(data), "facilities": data},
                        json_dumps_params={'ensure_ascii': False})