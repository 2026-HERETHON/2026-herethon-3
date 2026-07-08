from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Review, ReviewLike


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'grid', 'rating_night', 'rating_amenity', 'rating_mood', 'like_count', 'created_at')
    list_filter = ('grid',)
    search_fields = ('review_content', 'user__nickname')


@admin.register(ReviewLike)
class ReviewLikeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'review')