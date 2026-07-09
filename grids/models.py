from django.db import models

# Create your models here.
class Grid(models.Model):
    dong = models.CharField(max_length=50)
    latitude = models.FloatField()
    longitude = models.FloatField()
    safety_score = models.IntegerField(default=0)