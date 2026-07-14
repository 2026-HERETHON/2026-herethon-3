from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns =[
  path('signup/', views.signup_view, name='signup'),
  path('login/', views.login_view, name='login'),
  path('logout/', views.logout_view, name='logout'),
  path('grid/<int:grid_id>/save/', views.saved_grid_toggle, name='save_toggle'),
  path('profile/', views.profile_view, name='profile'),
  path('profile/residence/', views.profile_residence_view, name='profile_residence'),
  path('profile/residence/set/', views.set_residence, name='set_residence'),
  path('profile/residence/confirm/', views.confirm_residence, name='confirm_residence'),
  path('profile/posts/', views.profile_posts_view, name='profile_posts'),
  path('profile/saved/', views.profile_saved_view, name='profile_saved'),
]