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
        fields = ['nickname', 'email', 'gender', 'password1', 'password2', 'profile_image']
        widgets = {
            'gender': forms.RadioSelect,
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        del self.fields['password2']
        self.fields['password1'].required = False  # 비밀번호도 선택 입력으로

    def clean_nickname(self):
        nickname = self.cleaned_data.get('nickname')
        if User.objects.filter(nickname=nickname).exists():
            raise forms.ValidationError('이미 사용 중인 닉네임입니다.')
        return nickname

    def clean_email(self):
        email = self.cleaned_data.get('email')
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
        cleaned_data['password2'] = cleaned_data.get('password1')
        return cleaned_data

    def _post_clean(self):
        # UserCreationForm._post_clean()은 비밀번호 강도 검증(길이, 공통 비밀번호 등)을
        # 수행하는데, 비밀번호가 아예 없을 땐 이 검증 자체를 건너뛰어야 함
        if not self.cleaned_data.get('password1'):
            forms.ModelForm._post_clean(self)  # UserCreationForm을 건너뛰고 순수 ModelForm 검증만
        else:
            super()._post_clean()

    def save(self, commit=True):
        user = super().save(commit=False)
        password1 = self.cleaned_data.get('password1')
        if password1:
            user.set_password(password1)
        else:
            user.set_unusable_password()  # 비밀번호 없이 가입 -> 로그인 불가 계정
        if commit:
            user.save()
        return user


class LoginForm(AuthenticationForm):
    username = forms.CharField(
        label='아이디',
        widget=forms.TextInput(attrs={'placeholder': '아이디를 입력하세요'})
    )
    password = forms.CharField(
        label='비밀번호',
        widget=forms.PasswordInput(attrs={'placeholder': '비밀번호를 입력하세요'})
    )

class ProfileEditForm(forms.ModelForm):
    grid_id = forms.IntegerField(required=False)
    new_password1 = forms.CharField(required=False, widget=forms.PasswordInput, label='새 비밀번호')
    new_password2 = forms.CharField(required=False, widget=forms.PasswordInput, label='새 비밀번호 확인')

    class Meta:
        model = User
        fields = ['nickname', 'email', 'gender']
        widgets = {
            'gender': forms.RadioSelect(choices=User.gender.field.choices),
        }

    def clean_nickname(self):
        nickname = self.cleaned_data.get('nickname')
        if User.objects.filter(nickname=nickname).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError('이미 사용 중인 닉네임입니다.')
        return nickname

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError('이미 사용 중인 아이디(이메일)입니다.')
        return email

    def clean(self):
        cleaned_data = super().clean()
        p1 = cleaned_data.get('new_password1')
        p2 = cleaned_data.get('new_password2')
        if p1 or p2:
            if p1 != p2:
                raise forms.ValidationError('새 비밀번호가 일치하지 않아요.')
            if len(p1) < 8:
                raise forms.ValidationError('비밀번호는 8자 이상이어야 해요.')
        return cleaned_data