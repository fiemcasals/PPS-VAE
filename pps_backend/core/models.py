from django.db import models
from django.contrib.auth.models import User

class SimConfig(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    arrival_threshold = models.FloatField(default=3.0, help_text="Distancia para considerar llegada al nodo (m)")
    arrival_threshold_maneuver = models.FloatField(default=0.5, help_text="Distancia para llegada en maniobras (m)")
    arrival_threshold_curve = models.FloatField(default=1.5, help_text="Distancia para llegada en curvas (m)")
    lookahead_distance = models.FloatField(default=2.0, help_text="Distancia de visión a futuro (m)")
    
    # A* Planner Config
    backward_weight = models.FloatField(default=30.0, help_text="Penalización por ir marcha atrás")
    steering_cost = models.FloatField(default=20.0, help_text="Penalización por girar")
    gear_switch_cost = models.FloatField(default=150.0, help_text="Penalización por cambio de marcha")

    # Controller Config
    steering_kp = models.FloatField(default=5.0, help_text="Ganancia proporcional del volante (Sensibilidad)")
    base_speed = models.FloatField(default=0.4, help_text="Velocidad base en rectas")

    def __str__(self):
        return f"Config for {self.user.username}"
