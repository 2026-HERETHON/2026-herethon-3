from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django import forms
from .models import User


class SignUpForm(UserCreationForm):
    email = forms.EmailField(required=False)
    gender = forms.ChoiceField(
        choices=User.gender.field.choices, 
        required=True,
        label='성별'
    )
    agree_privacy = forms.BooleanField(
        required=True,
        label='개인정보 수집 및 이용에 동의합니다. (필수)',
        error_messages={'required': '개인정보 수집·이용에 동의해야 회원가입이 가능해요.'}
    )
    grid_id = forms.IntegerField(required=True)

    class Meta:
        model = User
        fields = ['username', 'nickname', 'email', 'gender', 'password1', 'password2', 'profile_image']
        widgets = {
            'gender': forms.RadioSelect,  # choices는 모델 걸 그대로 씀
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 프론트 회원가입 화면엔 비밀번호 입력칸이 1개뿐이라 password2
        # 필드는 제거하고, clean()에서 password1 값을 복사해 넣음
        del self.fields['password2']

    def clean_nickname(self):
        nickname = self.cleaned_data.get('nickname')
        if User.objects.filter(nickname=nickname).exists():
            raise forms.ValidationError('이미 사용 중인 닉네임입니다.')
        return nickname

    def clean_email(self):
        email = self.cleaned_data.get('email')
        # 이메일은 선택 입력이라 비워뒀을 땐 중복 체크 건너뜀
        if not email:
            return email
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError('이미 가입된 이메일입니다.')
        return email

    def clean_agree_privacy(self):
        agreed = self.cleaned_data.get('agree_privacy')
        if not agreed:
            raise forms.ValidationError('개인정보 수집·이용에 동의해야 회원가입이 가능해요.')
        return agreed

    def clean(self):
        cleaned_data = super().clean()
        # UserCreationForm._post_clean()이 비밀번호 강도 검증 시
        # cleaned_data["password2"]를 읽으므로 password1 값을 복사해둠
        cleaned_data['password2'] = cleaned_data.get('password1')
        return cleaned_data


class LoginForm(AuthenticationForm):
    username = forms.CharField(
        label='아이디',
        widget=forms.TextInput(attrs={'placeholder': '아이디를 입력하세요'})
    )
    password = forms.CharField(
        label='비밀번호',
        widget=forms.PasswordInput(attrs={'placeholder': '비밀번호를 입력하세요'})
    )
