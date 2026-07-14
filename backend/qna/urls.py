from django.urls import path
from . import views

app_name = 'qna'

urlpatterns =[
  path('grid/<int:grid_id>/', views.question_list, name='list'),
  path('grid/<int:grid_id>/create/', views.question_create, name='create'),
  path('question/<int:question_id>/', views.question_detail, name='detail'),
  path('question/<int:question_id>/answer/', views.answer_create, name='answer_create'),
]