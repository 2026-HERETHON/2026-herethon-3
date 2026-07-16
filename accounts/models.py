from django.db import models

# Create your models here.
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    nickname = models.CharField(max_length=30, unique=True)
    gender = models.CharField(
        max_length=10,
        choices=[('F', '여성'), ('M', '남성')],
    )
    # 개인정보 수집 동의 여부 기록
    privacy_agreed_at = models.DateTimeField(null=True, blank=True) 
    # 프로필 사진
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)

    # 실거주지 인증
    verified_grid = models.ForeignKey(
        'grids.Grid', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='verified_users'
    )
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # email, password는 AbstractUser에 이미 있음
    def __str__(self):
        return self.nickname

class SavedGrid(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_grids')
    grid = models.ForeignKey('grids.Grid', on_delete=models.CASCADE, related_name='saved_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'grid')  # 중복 저장 방지
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.nickname} saved {self.grid.dong}'