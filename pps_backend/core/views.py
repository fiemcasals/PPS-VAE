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
        "maneuver_threshold": config.arrival_threshold_maneuver
    })

@csrf_exempt
def update_config(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            # Buscar el config existente (del primer usuario o crear uno default)
            config = SimConfig.objects.first()
            if not config:
                # Si no existe, no podemos guardar sin usuario.
                # Retornamos error o mocks
                return JsonResponse({"status": "error", "message": "No user config found"}, status=404)

            config.arrival_threshold = float(data.get("arrival_threshold", config.arrival_threshold))
            config.arrival_threshold_maneuver = float(data.get("maneuver_threshold", config.arrival_threshold_maneuver))
            config.save()
            return JsonResponse({"status": "ok"})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)
