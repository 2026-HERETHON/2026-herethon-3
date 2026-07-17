from django import forms
from .models import Review
from decimal import Decimal

#RATING_CHOICES = [(i, str(i)) for i in range(1, 6)] #정수 단위
RATING_CHOICES = [
    (Decimal(f"{i * 0.5:.1f}"), f"{i * 0.5:.1f}") for i in range(0, 11)
] # 0.5 단위

class ReviewForm(forms.ModelForm):
    rating_night = forms.TypedChoiceField(
        choices=RATING_CHOICES, coerce=Decimal, label='밤길 체감 안전도'
    )
    rating_amenity = forms.TypedChoiceField(
        choices=RATING_CHOICES, coerce=Decimal, label='편의시설 만족도'
    )
    rating_mood = forms.TypedChoiceField(
        choices=RATING_CHOICES, coerce=Decimal, label='동네 분위기'
    )

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