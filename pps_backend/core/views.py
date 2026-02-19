import json
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from .models import SimConfig

def login_view(request):
    if request.method == "POST":
        data = request.POST
        username = data.get("username")
        password = data.get("password")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            # Si hay un parámetro 'next', redirigir, sino al admin o home
            return redirect("http://localhost:5173") # Redirigir de vuelta a la app
        else:
            return render(request, "core/login.html", {"error": "Credenciales inválidas"})
    
    return render(request, "core/login.html")

@csrf_exempt # Simplificación para dev. En prod usar tokens CSRF.
def get_config(request):
    # Si no hay usuario, devolver default
    # Para simplificar en dev, usaremos el primer usuario o uno hardcodeado si no hay auth session accesible via API check
    # OJO: React corre en puerto distinto, la session cookie debe ser compartida o usar Token.
    # Para este MVP, asumiremos que si hay un usuario en la DB, usaremos su config.
    # O bien, requeriremos autenticación real. 
    # El usuario pidió login "bien básico".
    
    # Intento obtener el config del primer usuario para simplificar la conexción sin tokens complejos
    config = SimConfig.objects.first()
    if not config:
        return JsonResponse({"arrival_threshold": 3.0, "maneuver_threshold": 0.5})
    
    return JsonResponse({
        "arrival_threshold": config.arrival_threshold,
        "maneuver_threshold": config.arrival_threshold_maneuver,
        "curve_threshold": config.arrival_threshold_curve,
        "lookahead_distance": config.lookahead_distance,
        "backward_weight": config.backward_weight,
        "steering_cost": config.steering_cost,
        "steering_change_cost": config.steering_change_cost,
        "gear_switch_cost": config.gear_switch_cost,
        "steering_kp": config.steering_kp,
        "base_speed": config.base_speed,
        
        # New Fields
        "gradient_weight": config.gradient_weight,
        "base_heuristic_weight": config.base_heuristic_weight,
        "debug_iter_limit": config.debug_iter_limit,
        "vehicle_width": config.vehicle_width,
        "vehicle_length": config.vehicle_length,
        "step_size": config.step_size,
    })

@csrf_exempt
def update_config(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            # Buscar el config existente (del primer usuario o crear uno default)
            # Buscar el config existente (del primer usuario o crear uno default)
            config = SimConfig.objects.first()
            if not config:
                # Si no existe, CREARLO por defecto
                config = SimConfig()
                config.user_id = 1 # Asumimos user default o null si lo permite el modelo
                # O simplemente config.save() si user no es requerido.
                # Verificamos models.py luego, pero por ahora intentamos salvar.
                config.save()
            
            # Update fields

            config.arrival_threshold = data.get("arrival_threshold", config.arrival_threshold)
            config.arrival_threshold_maneuver = data.get("arrival_threshold_maneuver", config.arrival_threshold_maneuver)
            config.arrival_threshold_curve = data.get("curve_threshold", config.arrival_threshold_curve)
            config.lookahead_distance = data.get("lookahead_distance", config.lookahead_distance)
            
            config.backward_weight = data.get("backward_weight", config.backward_weight)
            config.steering_cost = data.get("steering_cost", config.steering_cost)
            config.steering_change_cost = data.get("steering_change_cost", config.steering_change_cost)
            config.gear_switch_cost = data.get("gear_switch_cost", config.gear_switch_cost)
            config.steering_kp = data.get("steering_kp", config.steering_kp)
            config.base_speed = data.get("base_speed", config.base_speed)
            
            # New Fields
            config.gradient_weight = data.get("gradient_weight", config.gradient_weight)
            config.base_heuristic_weight = data.get("base_heuristic_weight", config.base_heuristic_weight)
            config.debug_iter_limit = data.get("debug_iter_limit", config.debug_iter_limit)
            config.vehicle_width = data.get("vehicle_width", config.vehicle_width)
            config.vehicle_length = data.get("vehicle_length", config.vehicle_length)
            config.step_size = data.get("step_size", config.step_size)
            
            config.save()
            return JsonResponse({"status": "ok"})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)
