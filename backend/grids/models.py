from django.db import models


class Grid(models.Model):
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