# Create your views here.
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect, get_object_or_404
from grids.models import Grid
from .models import Question, Answer
from .forms import QuestionForm, AnswerForm
from accounts.decorators import verified_residence_required
from django.http import JsonResponse
from django.core.exceptions import PermissionDenied
from django.urls import reverse

def question_list(request, grid_id):  # 질문 목록 (Q&A 탭)
    grid = get_object_or_404(Grid, pk=grid_id)
    questions = grid.questions.all()
    return render(request, 'qna/list.html', {
        'grid': grid,
        'questions': questions,
        'is_empty': not questions.exists(),
    })


@login_required
def question_create(request, grid_id):  # QA-001
    grid = get_object_or_404(Grid, pk=grid_id)

    if request.method == 'POST':
        form = QuestionForm(request.POST)
        if form.is_valid():
            question = form.save(commit=False)
            question.user = request.user
            question.grid = grid
            question.save()
            return redirect('qna:list', grid_id=grid.id)
        return render(request, 'qna/create.html', {'grid': grid, 'form': form})

    form = QuestionForm()
    return render(request, 'qna/create.html', {'grid': grid, 'form': form})


def question_detail(request, question_id):  # 질문 상세 (답변/댓글 다 보임)
    question = get_object_or_404(Question, pk=question_id)
    answers = question.answers.all()

    answer_form = AnswerForm()
    is_fragment = request.GET.get('fragment') == '1'
    
    return render(request, 'qna/detail.html', {
        'question': question,
        'answers': answers,
        'answer_form': answer_form,
        'is_fragment': is_fragment,
    })

def _get_answer_grid(request, question_id):
    question = get_object_or_404(Question, pk=question_id)
    return question.grid

@login_required
@verified_residence_required(_get_answer_grid)
def answer_create(request, question_id):  # QA-002
    question = get_object_or_404(Question, pk=question_id)

    user = request.user
    if not user.is_verified or not user.verified_grid or user.verified_grid.dong_group != question.grid.dong_group:
        return JsonResponse({
            'success': False,
            'error': '실거주지로 인증한 동네의 질문에만 답변할 수 있어요.'
        }, status=403)

    if request.method == 'POST':
        form = AnswerForm(request.POST)
        if form.is_valid():
            answer = form.save(commit=False)
            answer.user = request.user
            answer.question = question
            answer.save()
            return JsonResponse({'success': True})
        return JsonResponse({'success': False, 'error': '답변 내용을 확인해주세요.'}, status=400)

    return JsonResponse({'success': False, 'error': '잘못된 요청이에요.'}, status=405)
@login_required
def question_edit(request, question_id):
    question = get_object_or_404(Question, pk=question_id)
    if question.user_id != request.user.id:
        raise PermissionDenied("본인이 작성한 질문만 수정할 수 있어요.")

    if request.method == 'POST':
        form = QuestionForm(request.POST, instance=question)
        if form.is_valid():
            form.save()
    return redirect('qna:detail', question_id=question.id)


@login_required
def question_delete(request, question_id):
    question = get_object_or_404(Question, pk=question_id)
    if question.user_id != request.user.id:
        raise PermissionDenied("본인이 작성한 질문만 삭제할 수 있어요.")

    if request.method == 'POST':
        question.delete()
        return redirect(f"{reverse('accounts:profile')}?tab=myposts")
    return redirect('qna:detail', question_id=question.id)

@login_required
def answer_edit(request, answer_id):
    answer = get_object_or_404(Answer, pk=answer_id)
    if answer.user_id != request.user.id:
        raise PermissionDenied("본인이 작성한 답변만 수정할 수 있어요.")

    if request.method == 'POST':
        form = AnswerForm(request.POST, instance=answer)
        if form.is_valid():
            form.save()
    return redirect('qna:detail', question_id=answer.question_id)


@login_required
def answer_delete(request, answer_id):
    answer = get_object_or_404(Answer, pk=answer_id)
    if answer.user_id != request.user.id:
        raise PermissionDenied("본인이 작성한 답변만 삭제할 수 있어요.")

    if request.method == 'POST':
        answer.delete()
        return redirect(f"{reverse('accounts:profile')}?tab=myposts")
    return redirect('qna:detail', question_id=answer.question_id)