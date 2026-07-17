# Create your views here.
import json
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, render, redirect
from .forms import SignUpForm, LoginForm
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from grids.models import Grid
from grids.views import check_dong_contains_point
from .models import SavedGrid
from django.utils import timezone

from reviews.models import Review
from qna.models import Question, Answer

def signup_view(request):  # AUTH-001
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == 'POST':
        form = SignUpForm(request.POST, request.FILES)
        grid_id = request.POST.get('grid_id')

        if form.is_valid():
            if not grid_id:
                form.add_error(None, '거주지를 선택해주세요.')
                return render(request, 'accounts/signup.html', {
                    'form': form,
                    'grids': Grid.objects.filter(is_legal_dong=True),
                })

            grid = get_object_or_404(Grid, pk=grid_id, is_legal_dong=True)

            user = form.save(commit=False)
            user.privacy_agreed_at = timezone.now()
            user.verified_grid = grid
            user.is_verified = False
            user.verified_at = None
            user.save()

            # 예전엔 회원가입 직후 바로 login()으로 자동 로그인시켰는데,
            # 프론트의 "회원가입 완료" 팝업 흐름상 회원가입 = 로그인이 아니라
            # "로그인하러 가기"를 눌러 직접 로그인해야 하도록 바꿈.
            return redirect('home')

        return render(request, 'accounts/signup.html', {
            'form': form,
            'grids': Grid.objects.filter(is_legal_dong=True),
        })

    form = SignUpForm()
    return render(request, 'accounts/signup.html', {
        'form': form,
        'grids': Grid.objects.filter(is_legal_dong=True),
    })


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


def _star_fill_width(score):
    """
    reviews/views.py의 동일 헬퍼와 같은 계산식.
    앱 간 private 함수 import를 피하려고 그대로 복제해서 씀.
    """
    score = float(score or 0)
    rounded = round(score * 2) / 2
    filled_count = int(rounded)
    has_half = (rounded - filled_count) != 0

    total_width = filled_count * 11 + filled_count * 4
    if has_half:
        total_width += 5.5
    elif filled_count > 0:
        total_width -= 4
    return total_width


def _safety_grade_label(score):
    """마이페이지 '찜한 동네' 카드의 뱃지 라벨 (별도 스펙 없어서 안심 점수 기준 3단계로 표시)"""
    score = float(score or 0)
    if score >= 70:
        return '안심 구역'
    if score >= 40:
        return '보통 구역'
    return '주의 구역'


@login_required
def profile_view(request):
    """
    원래 목업(mypage.html)은 메뉴 클릭 시 JS가 보이기/숨기기만 하는 SPA
    구조. 이걸 4개 뷰로 나누면 메뉴 전환마다 새로고침되어 UX가 깨지므로,
    이 뷰 하나에서 4개 뷰의 데이터를 모아 한 번에 렌더링하고 프론트는 기존
    mypage.js의 탭 전환(클래스 토글만, 새 요청 없음)을 그대로 사용.
    """
    reviews = list(
        Review.objects.filter(user=request.user).select_related('grid')
    )
    for review in reviews:
        review.star_width = _star_fill_width(review.average_rating)

    questions = Question.objects.filter(user=request.user).select_related('grid').prefetch_related('answers')
    answers = Answer.objects.filter(user=request.user).select_related('question', 'question__grid')

    saved_grids = list(SavedGrid.objects.filter(user=request.user).select_related('grid'))
    for saved in saved_grids:
        saved.grade_label = _safety_grade_label(saved.grid.safety_score)

    context = {
        'reviews': reviews,
        'questions': questions,
        'answers': answers,
        'saved_grids': saved_grids,
    }
    if not request.user.verified_grid:
        context['legal_grids'] = Grid.objects.filter(is_legal_dong=True)

    return render(request, 'accounts/profile.html', context)


@login_required
@require_POST
def saved_grid_toggle(request, grid_id):
    grid = get_object_or_404(Grid, pk=grid_id)

    saved, created = SavedGrid.objects.get_or_create(user=request.user, grid=grid)

    if created:
        is_saved = True
    else:
        saved.delete()
        is_saved = False

    return JsonResponse({'saved': is_saved})

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
def confirm_residence(request):  # GPS 인증
    # 예전엔 requests.post()로 자기 자신의 /grids/verify-location/을
    # 호출했는데, gunicorn worker 1개뿐인 환경에서 그 worker가 자기 응답을
    # 기다리며 막혀 502로 죽는 문제 있었음. check_dong_contains_point를
    # 직접 호출해 네트워크 왕복 자체를 없앰
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

    is_verified, error = check_dong_contains_point(dong, lat, lng)

    if error:
        if error["status"] == 404:
            return JsonResponse({'error': f'"{dong}"은 인증 대상 법정동이 아니에요.'}, status=400)
        return JsonResponse({'error': '위치 인증 처리 중 오류가 발생했어요.'}, status=502)

    if is_verified:
        user.is_verified = True
        user.verified_at = timezone.now()
        user.save()
        return JsonResponse({'verified': True, 'message': f'{dong} 거주 인증 완료!'})

    return JsonResponse({'verified': False, 'message': f'현재 위치가 {dong}과 일치하지 않아요.'})


@login_required
def check_saved_grid(request, grid_id):
    is_saved = SavedGrid.objects.filter(user=request.user, grid_id=grid_id).exists()
    return JsonResponse({'saved': is_saved})