from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie


@ensure_csrf_cookie
def home_view(request):
    return render(request, 'home.html')


# 🎯 [진짜 MTV] 예전엔 /static/commercial/commercial.html로 그냥 서빙되는 정적 파일이라
# request.user를 전혀 못 읽어서, 로그인해도 nav가 항상 "로그인" 버튼으로 보였다.
# 이제 실제 Django 템플릿으로 렌더링해서 홈 화면과 동일하게 진짜 로그인 상태를 보여준다.
def commercial_view(request):
    return render(request, 'commercial.html')
