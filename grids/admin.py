from django.contrib import admin

# Register your models here.
from .models import Grid


@admin.register(Grid)
class GridAdmin(admin.ModelAdmin):
    list_display = ('id', 'dong', 'latitude', 'longitude', 'safety_score')
    search_fields = ('dong',)