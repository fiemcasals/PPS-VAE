from django.urls import path
from . import views

urlpatterns = [
    path('api/config/', views.get_config, name='get_config'),
    path('api/config/update/', views.update_config, name='update_config'),
    path('login/', views.login_view, name='login'),
]
