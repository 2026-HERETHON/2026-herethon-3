from django.conf import settings
from django.db import models
from grids.models import Grid


class Question(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='questions'
    )
    grid = models.ForeignKey(
        Grid, on_delete=models.CASCADE, related_name='questions'
    )
    question_content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.nickname} - {self.grid.dong}'


class Answer(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='answers'
    )
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name='answers'
    )
    answer_content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']  # 답변은 오래된 순 (대화 흐름)

    def __str__(self):
        return f'{self.user.nickname} - Q{self.question.id}'


class Comment(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments'
    )
    answer = models.ForeignKey(
        Answer, on_delete=models.CASCADE, related_name='comments'
    )
    comment_content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.user.nickname} - A{self.answer.id}'