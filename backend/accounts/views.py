# Create your views here.
import json
import requests
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, render, redirect
from .forms import SignUpForm, LoginForm
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from grids.models import Grid
from .models import SavedGrid
from django.utils import timezone

from reviews.models import Review
from qna.models import Question, Answer

def signup_view(request):  # AUTH-001
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == 'POST':
        form = SignUpForm(request.POST, request.FILES)
        if form.is_valid():
            user = form.save(commit=False)
            user.privacy_agreed_at = timezone.now()
            user.save()
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


@login_required
@require_POST
def saved_grid_toggle(request, grid_id):
    grid = get_object_or_404(Grid, pk=grid_id)

    if grid.is_legal_dong:
        target_grid = grid
    else:
        target_grid = get_object_or_404(
            Grid, dong_group=grid.dong_group, is_legal_dong=True
        )

    saved, created = SavedGrid.objects.get_or_create(user=request.user, grid=target_grid)

    if created:
        is_saved = True
    else:
        saved.delete()
        is_saved = False

    return JsonResponse({'saved': is_saved})

@login_required
def profile_residence_view(request):
    context = {}
    if not request.user.verified_grid:
        context['legal_grids'] = Grid.objects.filter(is_legal_dong=True)
    return render(request, 'accounts/profile_residence.html', context)


@login_required
@require_POST
def set_residence(request):  # 실거주지 "설정" (인증 아님, 선언만)
    grid_id = request.POST.get('grid_id')
    grid = get_object_or_404(Grid, pk=grid_id, is_legal_dong=True)

    user = request.user
    user.verified_grid = grid
    user.is_verified = False   # 실거주지가 바뀌면 기존 인증은 초기화
    user.verified_at = None
    user.save()
    return JsonResponse({'success': True, 'dong': grid.dong})


@login_required
@require_POST
def confirm_residence(request):  # GPS 인증 (BE1의 grids API 호출)
    user = request.user
    if not user.verified_grid:
        return JsonResponse({'error': '먼저 실거주지를 설정해주세요.'}, status=400)

    try:
        body = json.loads(request.body)
        lat = body['latitude']
        lng = body['longitude']
    except (KeyError, json.JSONDecodeError):
        return JsonResponse({'error': '좌표 형식이 올바르지 않아요.'}, status=400)

    dong = user.verified_grid.dong  # 클라이언트 값 안 믿고 DB 저장값 사용

    try:
        resp = requests.post(
            request.build_absolute_uri('/grids/verify-location/'),
            json={'latitude': lat, 'longitude': lng, 'dong': dong},
            timeout=3
        )
    except requests.RequestException:
        return JsonResponse({'error': '위치 인증 서버에 연결할 수 없어요.'}, status=502)

    if resp.status_code == 404:
        return JsonResponse({'error': f'"{dong}"은 인증 대상 법정동이 아니에요.'}, status=400)
    if resp.status_code != 200:
        return JsonResponse({'error': '위치 인증 처리 중 오류가 발생했어요.'}, status=502)

    result = resp.json()
    if result.get('is_verified'):
        user.is_verified = True
        user.verified_at = timezone.now()
        user.save()
        return JsonResponse({'verified': True, 'message': f'{dong} 거주 인증 완료!'})

    return JsonResponse({'verified': False, 'message': f'현재 위치가 {dong}과 일치하지 않아요.'})


# 마이페이지: 내가 작성한 글

@login_required
def profile_posts_view(request):
    context = {
        'reviews': Review.objects.filter(user=request.user).select_related('grid'),
        'questions': Question.objects.filter(user=request.user).select_related('grid').prefetch_related('answers'),
        'answers': Answer.objects.filter(user=request.user).select_related('question', 'question__grid'),
    }
    return render(request, 'accounts/profile_posts.html', context)


# 마이페이지: 찜한 동네 

@login_required
def profile_saved_view(request):
    context = {
        'saved_grids': SavedGrid.objects.filter(user=request.user).select_related('grid'),
    }
    return render(request, 'accounts/profile_saved.html', context)