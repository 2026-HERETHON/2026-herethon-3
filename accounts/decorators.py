from functools import wraps
from django.contrib.auth.decorators import login_required
from django.shortcuts import render


def verified_residence_required(get_grid):
    """
    실거주지 인증(is_verified=True, 6개월 이내) + 인증받은 동네와 이 요청의
    grid가 일치하는지까지 확인하는 데코레이터.

    get_grid: (request, *args, **kwargs) -> Grid 를 반환하는 함수.
              뷰마다 grid를 알아내는 방식이 달라서 (review는 grid_id,
              qna의 answer_create는 question_id를 통해 grid를 구함)
              바깥에서 주입받는 방식으로 만듦.
    """
    def decorator(view_func):
        @wraps(view_func)
        @login_required
        def wrapper(request, *args, **kwargs):
            grid = get_grid(request, *args, **kwargs)
            user = request.user

            # has_valid_verification이 is_verified + 6개월 유효기간까지 확인함
            # (User.has_valid_verification 참고)
            same_area = (
                user.has_valid_verification
                and user.verified_grid
                and user.verified_grid.dong_group == grid.dong_group
            )

            if not same_area:
                return render(request, 'accounts/verification_required.html', status=403)

            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator