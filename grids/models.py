from django.db import models

# Create your models here.
class Grid(models.Model):
    dong = models.CharField(max_length=50)
    latitude = models.FloatField()
    longitude = models.FloatField()
    safety_score = models.IntegerField(default=0)

    def __str__(self):
        return self.dong

    class Meta:
        ordering = ['dong']