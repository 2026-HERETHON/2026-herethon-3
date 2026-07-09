# Create your views here.
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .forms import SignUpForm, LoginForm

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
        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            next_url = request.GET.get('next', 'home')
            return redirect(next_url)
        return render(request, 'accounts/login.html', {'form': form})

    form = LoginForm()
    return render(request, 'accounts/login.html', {'form': form})

@login_required
def logout_view(request):  # AUTH-003
    logout(request)
    return redirect('home')


@login_required
def profile_view(request):
    return render(request, 'accounts/profile.html', {'user': request.user})