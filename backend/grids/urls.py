from django.urls import path
from . import views

app_name = 'grids'

urlpatterns = [
    path('', views.grid_list, name='list'),
    path('facilities/', views.facility_list, name='facilities'),  
    path('verify-location/', views.verify_location, name='verify_location'),  # 추가
    path('<str:dong>/', views.grid_detail, name='detail'),        
]
