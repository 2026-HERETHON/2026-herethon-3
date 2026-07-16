from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie


@ensure_csrf_cookie
def home_view(request):
    return render(request, 'home.html')


# 예전엔 정적 파일로 그냥 서빙돼 request.user를 못 읽어서 로그인해도
# nav가 항상 "로그인" 버튼이었다. 이제 템플릿으로 렌더링해 로그인 상태를 반영.
def commercial_view(request):
    return render(request, 'commercial.html')
