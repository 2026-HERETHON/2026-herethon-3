from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns =[
  path('signup/', views.signup_view, name='signup'),
  path('login/', views.login_view, name='login'),
  path('logout/', views.logout_view, name='logout'),
  path('grid/<int:grid_id>/save/', views.saved_grid_toggle, name='save_toggle'),
  path('profile/', views.profile_view, name='profile'),
]