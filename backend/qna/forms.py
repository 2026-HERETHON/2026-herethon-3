from django import forms
from .models import Question, Answer


class QuestionForm(forms.ModelForm):
    class Meta:
        model = Question
        fields = ['question_content']
        widgets = {
            'question_content': forms.Textarea(attrs={'rows': 3, 'placeholder': '이 동네에 대해 궁금한 점을 남겨주세요.'}),
        }

    def clean_question_content(self):
        content = self.cleaned_data.get('question_content', '').strip()
        if not content:
            raise forms.ValidationError('질문 내용을 입력해주세요.')
        return content


class AnswerForm(forms.ModelForm):
    class Meta:
        model = Answer
        fields = ['answer_content']
        widgets = {
            'answer_content': forms.Textarea(attrs={'rows': 3, 'placeholder': '답변을 입력해주세요.'}),
        }

    def clean_answer_content(self):
        content = self.cleaned_data.get('answer_content', '').strip()
        if not content:
            raise forms.ValidationError('답변 내용을 입력해주세요.')
        return content
