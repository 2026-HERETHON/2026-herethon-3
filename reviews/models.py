from django.db import models

# Create your models here.
from django.conf import settings
from grids.models import Grid
from django.core.validators import MinValueValidator, MaxValueValidator

class Review(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    grid = models.ForeignKey(Grid, on_delete=models.CASCADE, related_name='reviews')
    review_content = models.TextField()
    rating_night = models.DecimalField(
        max_digits=2, decimal_places=1,
        validators=[MinValueValidator(0.5), MaxValueValidator(5.0)]
    )
    rating_amenity = models.DecimalField(
        max_digits=2, decimal_places=1,
        validators=[MinValueValidator(0.5), MaxValueValidator(5.0)]
    )
    rating_mood = models.DecimalField(
        max_digits=2, decimal_places=1,
        validators=[MinValueValidator(0.5), MaxValueValidator(5.0)]
    )
    like_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.nickname} - {self.grid.dong}'

    @property
    def average_rating(self):
        return round((self.rating_night + self.rating_amenity + self.rating_mood) / 3, 1)

class ReviewLike(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='likes')

    class Meta:
        unique_together = ('user', 'review')  # 중복 좋아요 방지 (예외처리 REV-003)
        
    def __str__(self):
        return f'{self.user.nickname} likes {self.review.id}'