from django.db import models

# Create your models here.
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    nickname = models.CharField(max_length=30, unique=True)
    gender = models.CharField(
        max_length=10,
        choices=[('M', '남성'), ('F', '여성')],
        blank=True,
    )
    # email, password는 AbstractUser에 이미 있음
    def __str__(self):
        return self.nickname