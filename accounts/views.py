# Create your views here.
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .forms import SignUpForm

def signup_view(request):  # AUTH-001
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('home')
        return render(request, 'accounts/signup.html', {'form': form})

    form = SignUpForm()
    return render(request, 'accounts/signup.html', {'form': form})


def login_view(request):  # AUTH-002
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')

        if not username or not password:
            return render(request, 'accounts/login.html', {'error': '아이디와 비밀번호를 모두 입력해주세요.'})

        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            next_url = request.GET.get('next', 'home')
            return redirect(next_url)

        return render(request, 'accounts/login.html', {'error': '아이디 또는 비밀번호가 일치하지 않습니다.'})

    return render(request, 'accounts/login.html')


@login_required
def logout_view(request):  # AUTH-003
    logout(request)
    return redirect('home')


@login_required
def profile_view(request):
    return render(request, 'accounts/profile.html', {'user': request.user})