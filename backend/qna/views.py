# Create your views here.
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect, get_object_or_404
from grids.models import Grid
from .models import Question, Answer
from .forms import QuestionForm, AnswerForm


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

    return render(request, 'qna/detail.html', {
        'question': question,
        'answers': answers,
        'answer_form': answer_form,
    })


@login_required
def answer_create(request, question_id):  # QA-002
    question = get_object_or_404(Question, pk=question_id)

    if request.method == 'POST':
        form = AnswerForm(request.POST)
        if form.is_valid():
            answer = form.save(commit=False)
            answer.user = request.user
            answer.question = question
            answer.save()
    return redirect('qna:detail', question_id=question.id)