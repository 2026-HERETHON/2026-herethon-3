from django.urls import path
from . import views

app_name = 'qna'

urlpatterns =[
  path('grid/<int:grid_id>/', views.question_list, name='list'),
  path('grid/<int:grid_id>/create/', views.question_create, name='create'),
  path('question/<int:question_id>/', views.question_detail, name='detail'),
  path('question/<int:question_id>/answer/', views.answer_create, name='answer_create'),
  path('question/<int:question_id>/edit/', views.question_edit, name='question_edit'),
  path('question/<int:question_id>/delete/', views.question_delete, name='question_delete'),
  path('answer/<int:answer_id>/edit/', views.answer_edit, name='answer_edit'),
  path('answer/<int:answer_id>/delete/', views.answer_delete, name='answer_delete'),
]