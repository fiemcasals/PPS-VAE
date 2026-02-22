from django.urls import path
from . import views

urlpatterns = [
    path('api/auth/check/', views.check_auth, name='check_auth'),
    path('api/config/', views.get_config, name='get_config'),
    path('api/config/update/', views.update_config, name='update_config'),
    path('api/scenarios/', views.list_scenarios, name='list_scenarios'),
    path('api/scenarios/save/', views.save_scenario, name='save_scenario'),
    path('api/scenarios/delete/', views.delete_scenario, name='delete_scenario'),
    path('api/sync/', views.sync_state, name='sync_state'),
    path('logout/', views.logout_view, name='logout'),
    path('', views.login_view, name='login'),
]
