from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from accounts.models import SavedGrid
from reviews.models import Review, ReviewLike
from qna.models import Question, Answer


class Command(BaseCommand):
    """
    개발 중에 만든 더미 데이터(회원가입 계정, 후기, 질문, 답변, 찜한 동네)를
    한 번에 지우는 명령어.

    Grid/District/Facility 등 실제 지도/안전 데이터는 절대 건드리지 않는다.
    관리자 계정(is_superuser=True)도 로그인 유지를 위해 기본적으로는 지우지 않는다.

    사용법:
        python manage.py reset_dummy_data          # 삭제 전 확인 프롬프트 표시
        python manage.py reset_dummy_data --yes     # 확인 없이 바로 삭제
        python manage.py reset_dummy_data --keep-users  # 유저 계정은 남기고 글/댓글만 삭제
    """

    help = "개발용 더미 데이터(유저 계정, 후기, 질문, 답변, 찜한 동네)를 초기화합니다."

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes", action="store_true", help="확인 프롬프트 없이 바로 삭제합니다."
        )
        parser.add_argument(
            "--keep-users",
            action="store_true",
            help="회원 계정은 남기고, 후기/질문/답변/찜한 동네만 지웁니다.",
        )

    def handle(self, *args, **options):
        User = get_user_model()

        review_count = Review.objects.count()
        review_like_count = ReviewLike.objects.count()
        question_count = Question.objects.count()
        answer_count = Answer.objects.count()
        saved_count = SavedGrid.objects.count()
        user_qs = User.objects.filter(is_superuser=False)
        user_count = user_qs.count()

        self.stdout.write("삭제 대상:")
        self.stdout.write(f"  - 후기(Review): {review_count}개")
        self.stdout.write(f"  - 후기 좋아요(ReviewLike): {review_like_count}개")
        self.stdout.write(f"  - 질문(Question): {question_count}개")
        self.stdout.write(f"  - 답변(Answer): {answer_count}개")
        self.stdout.write(f"  - 찜한 동네(SavedGrid): {saved_count}개")
        if not options["keep_users"]:
            self.stdout.write(f"  - 일반 회원 계정(User, 관리자 제외): {user_count}개")
        else:
            self.stdout.write("  - 회원 계정은 --keep-users 옵션으로 유지됩니다.")

        if not options["yes"]:
            confirm = input("정말 삭제할까요? (y/N): ").strip().lower()
            if confirm != "y":
                self.stdout.write(self.style.WARNING("취소했습니다."))
                return

        # 참조 관계상 자식(좋아요/답변)부터 지우고 부모(후기/질문)를 지운다.
        ReviewLike.objects.all().delete()
        Review.objects.all().delete()
        Answer.objects.all().delete()
        Question.objects.all().delete()
        SavedGrid.objects.all().delete()

        if not options["keep_users"]:
            # 유저를 지우면 그 유저가 쓴 Review/Question/Answer도 CASCADE로 같이 지워지지만,
            # 위에서 이미 다 지웠으므로 순서 상관없이 안전하다.
            user_qs.delete()

        self.stdout.write(self.style.SUCCESS("더미 데이터를 초기화했습니다."))
