from django.contrib import admin

# Register your models here.
from .models import Question, Answer, Comment


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'grid', 'question_content', 'created_at')
    search_fields = ('question_content', 'user__nickname')


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'question', 'answer_content', 'created_at')


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'answer', 'comment_content', 'created_at')