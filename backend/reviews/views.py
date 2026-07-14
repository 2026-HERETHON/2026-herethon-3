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

def review_list(request, grid_id):  # REV-001, REV-004
    grid = get_object_or_404(Grid, pk=grid_id, is_legal_dong=True)
    sort = request.GET.get('sort', 'latest')  # latest(최신순) / likes(공감순)

    reviews = grid.reviews.all()
    if sort == 'likes':
        reviews = reviews.order_by('-like_count', '-created_at')
    else:
        reviews = reviews.order_by('-created_at')

    liked_review_ids = []
    if request.user.is_authenticated:
        liked_review_ids = ReviewLike.objects.filter(
            user=request.user, review__in=reviews
        ).values_list('review_id', flat=True)

    # 영역별 만족도 평균 집계
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

    context = {
        'grid': grid,
        'reviews': reviews,
        'sort': sort,
        'liked_review_ids': set(liked_review_ids),
        'is_empty': not reviews.exists(),  # 후기 없음 예외처리
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