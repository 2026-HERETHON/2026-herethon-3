from django.urls import path
from . import views

app_name = 'grids'

urlpatterns = [
    path('', views.grid_list, name='list'),
    path('facilities/', views.facility_list, name='facilities'),  
    path('<str:dong>/', views.grid_detail, name='detail'),        
]
