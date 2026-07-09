from django import forms
from .models import Review

RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]


class ReviewForm(forms.ModelForm):
    rating_night = forms.ChoiceField(choices=RATING_CHOICES, label='밤길 체감 안전도')
    rating_amenity = forms.ChoiceField(choices=RATING_CHOICES, label='편의시설 만족도')
    rating_mood = forms.ChoiceField(choices=RATING_CHOICES, label='동네 분위기')

    class Meta:
        model = Review
        fields = ['review_content', 'rating_night', 'rating_amenity', 'rating_mood']
        widgets = {
            'review_content': forms.Textarea(attrs={'rows': 4, 'placeholder': '이 동네 후기를 남겨주세요.'}),
        }

    def clean_review_content(self):
        content = self.cleaned_data.get('review_content', '').strip()
        if not content:
            raise forms.ValidationError('후기 내용을 입력해주세요.')
        return content