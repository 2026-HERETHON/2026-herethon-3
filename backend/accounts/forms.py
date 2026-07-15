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

    class Meta:
        model = User
        fields = ['username', 'nickname', 'email', 'gender', 'password1', 'password2', 'profile_image']
        widgets = {
            'gender': forms.RadioSelect,  # choices는 모델 걸 그대로 씀
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 🎯 [단순화] 프론트 회원가입 화면엔 비밀번호 입력칸이 1개뿐이라
        # password2(비밀번호 확인) 필드는 폼에서 아예 제거하고, clean()에서
        # password1 값을 그대로 password2 자리에 채워 넣어 검증을 통과시킨다.
        del self.fields['password2']

    def clean_nickname(self):
        nickname = self.cleaned_data.get('nickname')
        if User.objects.filter(nickname=nickname).exists():
            raise forms.ValidationError('이미 사용 중인 닉네임입니다.')
        return nickname

    def clean_email(self):
        email = self.cleaned_data.get('email')
        # 🎯 [단순화] 이메일은 선택 입력이라, 비워뒀을 땐 중복 체크를 건너뛴다.
        # (안 그러면 이메일을 안 적은 두 번째 사용자가 "이미 가입된 이메일"로 막힘)
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
        # 🎯 UserCreationForm._post_clean()이 비밀번호 강도 검증을 할 때
        # cleaned_data["password2"]를 읽으므로, password1 값을 그대로 복사해둔다.
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
