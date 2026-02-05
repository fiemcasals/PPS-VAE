from django.db import models
from django.contrib.auth.models import User

class SimConfig(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    arrival_threshold = models.FloatField(default=3.0, help_text="Distancia para considerar llegada al nodo (m)")
    arrival_threshold_maneuver = models.FloatField(default=0.5, help_text="Distancia para llegada en maniobras (m)")

    def __str__(self):
        return f"Config for {self.user.username}"
