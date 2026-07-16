from django.urls import path
from . import views

app_name = 'reviews'

urlpatterns =[
  path('grid/<int:grid_id>/', views.review_list, name='list'),
  path('grid/<int:grid_id>/create/', views.review_create, name='create'),
  path('<int:review_id>/like/', views.review_like_toggle, name='like_toggle'),
]