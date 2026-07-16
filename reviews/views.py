from django.shortcuts import render

# Create your views here.
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from grids.models import Grid  # 앱 이름 확인 필요
from .models import Review, ReviewLike
from .forms import ReviewForm
from django.db.models import Avg
from accounts.models import SavedGrid


def _star_fill_width(score):
    """
    🎯 [진짜 MTV용] 별점 위젯의 '채워진 별' 영역 너비(px)를 서버에서 미리 계산.
    예전엔 이 계산을 프론트 JS가 review.score(숫자)만 받아서 직접 했었는데,
    이제는 카드 마크업 자체를 서버가 렌더링하므로 너비도 서버가 계산해서 내려준다.
    (프론트 rightSideBar.js의 기존 계산식과 동일하게 맞춤)
    """
    score = float(score or 0)
    rounded = round(score * 2) / 2  # 0.5 단위로 반올림
    filled_count = int(rounded)  # floor
    has_half = (rounded - filled_count) != 0

    total_width = filled_count * 11 + filled_count * 4
    if has_half:
        total_width += 5.5
    elif filled_count > 0:
        total_width -= 4
    return total_width


def review_list(request, grid_id):  # REV-001, REV-004
    grid = get_object_or_404(Grid, pk=grid_id, is_legal_dong=True)
    sort = request.GET.get('sort', 'latest')  # latest(최신순) / likes(공감순)

    reviews = grid.reviews.all()
    if sort == 'likes':
        reviews = reviews.order_by('-like_count', '-created_at')
    else:
        reviews = reviews.order_by('-created_at')

    is_empty = not reviews.exists()  # 후기 없음 예외처리 (queryset 상태에서 먼저 계산)

    liked_review_ids = []
    if request.user.is_authenticated:
        liked_review_ids = ReviewLike.objects.filter(
            user=request.user, review__in=reviews
        ).values_list('review_id', flat=True)

    # 영역별 만족도 평균 집계 (아직 queryset일 때 aggregate)
    rating_summary = reviews.aggregate(
        rating_night=Avg('rating_night'),
        rating_amenity=Avg('rating_amenity'),
        rating_mood=Avg('rating_mood'),
    )
    rating_summary = {
        key: round(value, 1) if value is not None else 0
        for key, value in rating_summary.items()
    }

    is_saved = False
    if request.user.is_authenticated:
        liked_review_ids = ReviewLike.objects.filter(
            user=request.user, review__in=reviews
        ).values_list('review_id', flat=True)
        is_saved = SavedGrid.objects.filter(user=request.user, grid=grid).exists()

    # 🎯 [진짜 MTV용] 각 후기 카드에 별점 위젯 너비를 미리 계산해서 붙여둠
    # (템플릿에서 바로 style="width: {{ review.star_width }}px" 로 사용)
    # -> 리스트로 굳혀서 인스턴스에 속성을 얹어야 하므로 aggregate/exists 이후에 실행
    reviews = list(reviews)
    for review in reviews:
        review.star_width = _star_fill_width(review.average_rating)

    context = {
        'grid': grid,
        'reviews': reviews,
        'sort': sort,
        'liked_review_ids': set(liked_review_ids),
        'is_empty': is_empty,
        'rating_summary': rating_summary,
        'is_saved': is_saved,
    }
    return render(request, 'reviews/list.html', context)


@login_required
def review_create(request, grid_id):  # REV-002
    grid = get_object_or_404(Grid, pk=grid_id, is_legal_dong=True)

    if request.method == 'POST':
        form = ReviewForm(request.POST)
        if form.is_valid():
            review = form.save(commit=False)
            review.user = request.user
            review.grid = grid
            review.save()
            return redirect('reviews:list', grid_id=grid.id)
        return render(request, 'reviews/create.html', {'grid': grid, 'form': form})

    form = ReviewForm()
    return render(request, 'reviews/create.html', {'grid': grid, 'form': form})


@login_required
@require_POST
def review_like_toggle(request, review_id):  # REV-003
    review = get_object_or_404(Review, pk=review_id)

    like, created = ReviewLike.objects.get_or_create(user=request.user, review=review)

    if created:
        review.like_count += 1
        liked = True
    else:
        like.delete()
        review.like_count = max(0, review.like_count - 1)
        liked = False

    review.save(update_fields=['like_count'])

    return JsonResponse({'liked': liked, 'like_count': review.like_count})
