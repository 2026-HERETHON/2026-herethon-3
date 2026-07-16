import json
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import Grid, Facility, District
from django.views.decorators.csrf import csrf_exempt
from shapely.geometry import Point, shape


from .models import Grid, Facility, District

def grid_list(request):
    grids = Grid.objects.all()

    is_legal_param = request.GET.get('is_legal_dong')
    if is_legal_param is not None:
        is_legal = is_legal_param.lower() == 'true'
        grids = grids.filter(is_legal_dong=is_legal)

    gu_param = request.GET.get('gu')
    if gu_param:
        grids = grids.filter(gu=gu_param)

    search_param = request.GET.get('search')
    if search_param:
        grids = grids.filter(dong_group__icontains=search_param)

    data = []
    for grid in grids:
        data.append({
            "id": grid.id,
            "dong": grid.dong,
            "dong_group": grid.dong_group,
            "sido": grid.sido,
            "gu": grid.gu,
            "is_legal_dong": grid.is_legal_dong,
            "latitude": grid.latitude,
            "longitude": grid.longitude,
            "safety_score": grid.safety_score,
            "cctv_count": grid.cctv_count,
            "light_count": grid.light_count,
            "bell_count": grid.bell_count,
            "police_count": grid.police_count,
            "night_safety_grade": grid.night_safety_grade,
            "crime_zone_grade": grid.crime_zone_grade,
            "boundary": json.loads(grid.boundary_geojson) if grid.boundary_geojson else None,
        })

    return JsonResponse({"grids": data}, json_dumps_params={'ensure_ascii': False})


def district_list(request):
    districts = District.objects.all().order_by('name')
    data = [{"name": d.name, "has_data": d.has_data} for d in districts]
    return JsonResponse({"districts": data}, json_dumps_params={'ensure_ascii': False})


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
        "sido": grid.sido,
        "gu": grid.gu,
        "is_legal_dong": grid.is_legal_dong,
        "latitude": grid.latitude,
        "longitude": grid.longitude,
        "safety_score": grid.safety_score,
        "cctv_count": grid.cctv_count,
        "light_count": grid.light_count,
        "bell_count": grid.bell_count,
        "police_count": grid.police_count,
        "night_safety_grade": grid.night_safety_grade,
        "crime_zone_grade": grid.crime_zone_grade,
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

# 판정로직
#
# 🎯 [502 버그 수정] accounts.views.confirm_residence가 예전엔 이 판정을
# requests.post()로 "자기 자신"(/grids/verify-location/)에게 HTTP 요청을 보내는
# 방식으로 재사용했었다. Render 무료 티어처럼 gunicorn worker가 1개뿐인
# 환경에서는, 요청 A가 그 하나뿐인 worker를 붙잡은 채로 자기 서버에 요청 B를
# 보내는 셈이라 B를 처리할 여유 worker가 없어 영원히 응답을 못 받고
# timeout=3 뒤 502로 죽어버렸다(자기 자신과의 교착상태).
# 그래서 판정 로직 자체를 순수 함수로 분리해, HTTP 왕복 없이 파이썬에서
# 직접 호출할 수 있게 했다 — worker 개수와 완전히 무관해진다.
def check_dong_contains_point(dong, lat, lon):
    """GPS 좌표가 지정한 법정동 경계 안에 있는지 판정 (내부 재사용용).
    반환: (is_verified: bool|None, error: dict|None)"""
    try:
        grid = Grid.objects.get(dong=dong, is_legal_dong=True)
    except Grid.DoesNotExist:
        return None, {"error": f"'{dong}'에 해당하는 법정동을 찾을 수 없습니다", "status": 404}
    except Grid.MultipleObjectsReturned:
        return None, {"error": "동 이름이 중복됩니다. is_legal_dong 확인 필요", "status": 400}

    if not grid.boundary_geojson:
        return None, {"error": "해당 법정동에 경계 데이터가 없습니다", "status": 500}

    boundary = shape(json.loads(grid.boundary_geojson))
    point = Point(lon, lat)  # GeoJSON은 (경도, 위도) 순서

    return boundary.contains(point), None


@csrf_exempt
def verify_location(request):
    """GPS 좌표가 지정한 법정동 경계 안에 있는지 판정 (실거주지 인증용) - 외부/JS용 HTTP 엔드포인트"""
    if request.method != "POST":
        return JsonResponse({"error": "POST 요청만 허용됩니다"}, status=405)

    try:
        body = json.loads(request.body)
        lat = float(body["latitude"])
        lon = float(body["longitude"])
        dong = body["dong"]
    except (KeyError, ValueError, json.JSONDecodeError):
        return JsonResponse({"error": "latitude, longitude, dong 파라미터가 필요합니다"}, status=400)

    is_verified, error = check_dong_contains_point(dong, lat, lon)
    if error:
        return JsonResponse({"error": error["error"]}, status=error["status"])

    return JsonResponse({
        "dong": dong,
        "is_verified": is_verified,
        "latitude": lat,
        "longitude": lon,
    })
