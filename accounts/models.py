from datetime import timedelta

from django.db import models
from django.utils import timezone

# Create your models here.
from django.contrib.auth.models import AbstractUser

# 실거주지 인증 유효기간 (6개월)
RESIDENCE_VERIFICATION_VALID_DAYS = 180


class User(AbstractUser):
    nickname = models.CharField(max_length=30, unique=True)
    email = models.EmailField(unique=True)
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

    @property
    def verification_expires_at(self):
        """
        실거주지 인증 만료 일시 (verified_at + 6개월).
        인증한 적이 없으면 None. 템플릿에서 만료일 표시용으로 사용.
        """
        if not self.verified_at:
            return None
        return self.verified_at + timedelta(days=RESIDENCE_VERIFICATION_VALID_DAYS)

    @property
    def has_valid_verification(self):
        """
        is_verified=True여도 인증한 지 RESIDENCE_VERIFICATION_VALID_DAYS
        (6개월)가 지났으면 만료된 것으로 취급한다.
        DB의 is_verified를 별도 배치/크론으로 False로 되돌리진 않고,
        조회 시점마다 계산만 해서 항상 최신 상태를 보장한다.
        (verified_residence_required 데코레이터, 마이페이지 표시에서 사용)
        """
        if not self.is_verified or not self.verification_expires_at:
            return False
        return timezone.now() < self.verification_expires_at

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