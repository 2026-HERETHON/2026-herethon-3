from django.contrib import admin
from .models import Grid, Facility


@admin.register(Grid)
class GridAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'dong', 'safety_score',
        'cctv_count', 'light_count', 'bell_count', 'police_count',
        'latitude', 'longitude',
    )
    search_fields = ('dong',)
    readonly_fields = ('boundary_geojson',)


@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ('id', 'type', 'latitude', 'longitude', 'count')
    list_filter = ('type',)