import json

from django.db import models
from shapely.geometry import shape


class Grid(models.Model):
    # 시/도 (예: "서울특별시", "경기도") - 필터/그룹핑용
    sido = models.CharField(max_length=20, blank=True) 
    # 시/군/구 (예: "노원구", "관악구") - 필터/그룹핑용
    gu = models.CharField(max_length=20, blank=True) 
    # 법정동 (예: "상계동", "신림동") - 필터/그룹핑용
    dong_group = models.CharField(max_length=50)
    is_legal_dong = models.BooleanField(default=False)  # True: 법정동 전체(상계동/신림동), False: 세부 행정동


    # 세부 행정동 (예: "상계1동", "상계3·4동") - 실제 표시 단위
    dong = models.CharField(max_length=50)

    # 폴리곤 중심점 (마커 표시, 지도 초기 위치용)
    latitude = models.FloatField()
    longitude = models.FloatField()

    # 폴리곤 경계 좌표 (choropleth 색칠용) - GeoJSON 형식 문자열로 저장
    boundary_geojson = models.TextField(blank=True, null=True)

    # 최종 안심 점수 (소수점 있음 -> FloatField로 변경)
    safety_score = models.FloatField(default=0)

    # 원본 지표 값 (지도 클릭 시 상세 팝업에 사용)
    cctv_count = models.IntegerField(default=0)
    light_count = models.IntegerField(default=0)
    bell_count = models.IntegerField(default=0)
    police_count = models.IntegerField(default=0)
    night_safety_grade = models.FloatField(default=0)   # 추가: 1~10 등급 (낮을수록 안전)
    crime_zone_grade = models.FloatField(default=0)      # 추가: 1~10 등급 (낮을수록 안전)

    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.dong

    @property
    def thumbnail_polygon_points(self, size=100, padding=14):
        """
        법정동/행정동 실제 사진 대신, boundary_geojson 좌표만으로 폴리곤
        모양을 그대로 살린 SVG용 좌표 문자열을 생성 (마이페이지 찜한 동네
        카드처럼 지도 캡처 없이 동네 모양 아이콘만 필요할 때 사용).
        size x size 뷰박스 안에서 사방으로 padding만큼 여백을 두고 정규화한
        "x1,y1 x2,y2 ..." 문자열 반환.
        """
        if not self.boundary_geojson:
            return ""

        try:
            geom = shape(json.loads(self.boundary_geojson))
        except (ValueError, TypeError, KeyError):
            return ""

        # MultiPolygon이면 가장 넓은 폴리곤 하나만 사용 (지도 렌더링과 동일한 방식)
        if geom.geom_type == "MultiPolygon":
            if not geom.geoms:
                return ""
            geom = max(geom.geoms, key=lambda g: g.area)
        if geom.geom_type != "Polygon":
            return ""

        coords = list(geom.exterior.coords)
        if len(coords) < 3:
            return ""

        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        min_lon, max_lon = min(lons), max(lons)
        min_lat, max_lat = min(lats), max(lats)
        lon_range = (max_lon - min_lon) or 1
        lat_range = (max_lat - min_lat) or 1

        # 여백을 뺀 실제 그릴 영역 크기
        draw_size = size - 2 * padding

        # 가로세로 비율을 유지한 채 긴 쪽을 draw_size에 맞추고, 짧은 쪽은 가운데 정렬
        scale = draw_size / max(lon_range, lat_range)
        off_x = padding + (draw_size - lon_range * scale) / 2
        off_y = padding + (draw_size - lat_range * scale) / 2

        points = []
        for lon, lat in coords:
            x = (lon - min_lon) * scale + off_x
            # 위도는 위로 갈수록 커지지만 SVG는 아래로 갈수록 커지므로 뒤집음
            y = size - ((lat - min_lat) * scale + off_y)
            points.append(f"{x:.1f},{y:.1f}")
        return " ".join(points)

    class Meta:
        ordering = ['dong_group', 'dong']
        constraints = [
            models.UniqueConstraint(fields=['dong', 'is_legal_dong'], name='unique_dong_per_level')
        ]


class Facility(models.Model):
    FACILITY_TYPES = [
        ('cctv', 'CCTV'),
        ('light', '가로등'),
        ('bell', '비상벨'),
        ('police', '파출소/지구대'),
    ]

    type = models.CharField(max_length=10, choices=FACILITY_TYPES)
    latitude = models.FloatField()
    longitude = models.FloatField()
    count = models.IntegerField(default=1)  # 가로등처럼 한 지점에 여러 개 설치된 경우 반영

    class Meta:
        indexes = [
            models.Index(fields=['type']),
        ]

    def __str__(self):
        return f"{self.get_type_display()} ({self.latitude}, {self.longitude})"

class District(models.Model):
    """서울 25개 구 참고용 목록 (상단 지역 선택 드롭다운용)"""
    name = models.CharField(max_length=20, unique=True)
    has_data = models.BooleanField(default=False)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name