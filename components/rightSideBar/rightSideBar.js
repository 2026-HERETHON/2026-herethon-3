/// 별점 표현 구현

function handleStarRating() {
  const scoreData = {
    night: 3.5,
    convenience: 4.0,
    atmosphere: 4.1,
  }; //가상 데이터입니다

  Object.keys(scoreData).forEach((key) => {
    const score = scoreData[key];

    const container = document.querySelector(
      `.rightSB-${key} .rightSB-starRatingContainer`,
    );
    if (!container) return;

    // 1. 빈 별 5개 생성
    let emptyStarsHTML = "";
    for (let i = 0; i < 5; i++) {
      emptyStarsHTML += `<img src="./rightSB-images/emptyStar.svg" alt="빈별" style="width:16px !important; height:16px !important; flex-shrink:0 !important; margin:0 !important; padding:0 !important;" />`;
    }

    // 2. 채워진 별 5개
    let filledStarsHTML = "";
    for (let i = 0; i < 5; i++) {
      filledStarsHTML += `<img src="./rightSB-images/filledStar.svg" alt="채워진별" style="width:16px !important; height:16px !important; flex-shrink:0 !important; margin:0 !important; padding:0 !important;" />`;
    }

    /* 3. 정확한 픽셀 계산 (4.2점일 때 87.2px)
    const filledStarsCount = Math.floor(score);
    const gapCount = score > 0 ? filledStarsCount : 0;
    let totalWidth = score * 16 + gapCount * 11;
    if (score > 0 && score === filledStarsCount) {
      totalWidth = score * 16 + (gapCount - 1) * 11;
    } */

    // 3. 0.5 단위로 절사(내림) 계산
    // 원래 점수에 2를 곱하고 내림(floor)한 뒤 다시 2로 나누면 0.5 단위로 딱 떨어집니다.

    const roundedScore = Math.floor(score * 2) / 2;

    // 3-1. 0.5 단위 전용 초간단 너비 계산
    // 0.5점당 별 반 개(8px) + 간격(5.5px)을 더해주는 직관적인 방식입니다.
    const filledStarsCount = Math.floor(roundedScore); // 꽉 찬 별 개수
    const hasHalfStar = roundedScore % 1 !== 0; // .5점으로 끝나는지 여부

    // (꽉 찬 별 개수 * 16px) + (걸쳐있는 간격 개수 * 11px) + (반 별이 있다면 8px + 마지막 간격 보정 5.5px)
    let totalWidth = filledStarsCount * 16 + filledStarsCount * 11;
    if (hasHalfStar) {
      totalWidth += 8 + 5.5;
    } else if (filledStarsCount > 0) {
      totalWidth -= 11; // 딱 떨어지는 정수일 때 마지막 gap 제외
    }

    // 4. HTML 주입 및 스타일 강제 고정
    container.innerHTML = `
      <div class="rightSB-starRatingDisplay" style="position: relative !important; display: inline-flex !important; width: 124px !important; height: 16px !important; flex-shrink: 0 !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box !important;">
        <div class="rightSB-emptyStars" style="display: flex !important; gap: 11px !important; width: 124px !important; height: 16px !important; position: absolute !important; top: 0 !important; left: 0 !important; z-index: 1 !important; margin: 0 !important; padding: 0 !important;">
          ${emptyStarsHTML}
        </div>
        <div class="rightSB-filledStars" style="display: flex !important; gap: 11px !important; height: 16px !important; position: absolute !important; top: 0 !important; left: 0 !important; z-index: 2 !important; overflow: hidden !important; white-space: nowrap !important; pointer-events: none !important; margin: 0 !important; padding: 0 !important;
          min-width: auto !important; 
          width: ${totalWidth}px !important;">
          ${filledStarsHTML}
        </div>
      </div>

      <div class="rightSB-starRatingScore">
        <span class="rightSB-ratingScore">${score.toFixed(1)}</span>
        <span class="rightSB-RatingFullScore">/ 5.0</span>
      </div>
    `;
  });
}

document.addEventListener("DOMContentLoaded", handleStarRating);


/// 후기 작성 nav 바 이동

document.addEventListener("DOMContentLoaded", () => {
  const navMenus = document.querySelectorAll(".rightSB-navbar-menu");
  const indicator = document.querySelector(".rightSB-navbar-indicator");
  const tabContents = document.querySelectorAll(".rightSB-tabContent");

  function updateIndicator(target) {
    if (!indicator || !target) return;
    indicator.style.transform = `translateX(${target.offsetLeft}px)`;
  }

  navMenus.forEach((menu) => {
    menu.addEventListener("click", (e) => {
      const currentMenu = e.target.closest(".rightSB-navbar-menu");
      if (!currentMenu) return;

      // 1. 기존 활성화 클래스(beBold) 제거 후 현재 메뉴에 부여
      navMenus.forEach((m) => m.classList.remove("rightSB-beBold"));
      currentMenu.classList.add("rightSB-beBold");

      // 2. 밑줄 슬라이딩 이동
      updateIndicator(currentMenu);

      // 3. 클릭한 탭에 따라 콘텐츠 스위칭하기
      tabContents.forEach((content) =>
        content.classList.remove("rightSB-activeContent"),
      );

      if (currentMenu.classList.contains("rightSB-reviewSelected")) {
        const reviewTab = document.getElementById("tabContentReview");
        if (reviewTab) reviewTab.classList.add("rightSB-activeContent");
      } else if (currentMenu.classList.contains("rightSB-QnASelected")) {
        const qnaTab = document.getElementById("tabContentQnA");
        if (qnaTab) qnaTab.classList.add("rightSB-activeContent");
      }
    });
  });

  // 초기 로드 시 밑줄 세팅
  const activeMenu = document.querySelector(
    ".rightSB-navbar-menu.rightSB-beBold",
  );
  if (activeMenu) {
    setTimeout(() => updateIndicator(activeMenu), 50);
  }
});

//리뷰 textarea 글자수 제한
document.addEventListener("DOMContentLoaded", () => {
  const reviewContainers = document.querySelectorAll(".rightSB-reviewContentContainer");

  reviewContainers.forEach((container) => {
    const textarea = container.querySelector(".rightSB-reviewContent");
    const charSpan = container.querySelector(".rightSB-currentChars > span");

    if (textarea && charSpan) {
      textarea.addEventListener("input", (e) => {
        const currentLength = e.target.value.length;

        if (currentLength > 500) {
          e.target.value = e.target.value.substring(0, 500);
          return;
        }

        charSpan.textContent = currentLength;
      });
    }
  });
});

////// 별점 구현
const RATING_COUNT = 5;
const ratingContainers = document.querySelectorAll('.rightSB-rating');

// 1. 별 요소 생성 함수
const createStarElement = () => {
  const rightSBstar = document.createElement('div');
  rightSBstar.className = 'rightSBstar';

  const rightSBstarEmpty = document.createElement('div');
  rightSBstarEmpty.className = 'rightSBstar-empty';
  rightSBstar.appendChild(rightSBstarEmpty);

  const rightSBstarFill = document.createElement('div');
  rightSBstarFill.className = 'rightSBstar-fill';
  rightSBstar.appendChild(rightSBstarFill);

  return rightSBstar;
};

// 2. 깎아낼 inset 퍼센트 계산 함수
const getClipPathPercent = (starIndex, value) => {
  if (starIndex <= value) return 0; // 다 채움
  if (starIndex - value === 0.5) return 50; // 반만 채움
  return 100; // 안 채움
};

// 3. 개별 별점 박스마다 이벤트와 별 생성 바인딩
ratingContainers.forEach((ratingBox) => {
  let currentRating = 0;   // 이 박스의 고정 별점
  let hoveredRating = 0;   // 이 박스의 호버 중인 별점

  // 별 5개 동적 배치
  for (let i = 0; i < RATING_COUNT; i++) {
    ratingBox.appendChild(createStarElement());
  }

  // 별점 상태를 화면에 그려주는 내부 함수
  const updateStars = (value) => {
    const stars = ratingBox.children; // 현재 박스의 자식들(직계 자식)
    for (let i = 0; i < RATING_COUNT; i++) {
      if (!stars[i]) continue;
      
      const fillTarget = stars[i].querySelector('.rightSBstar-fill');
      if (fillTarget) {
        const fillPercentage = getClipPathPercent(i + 1, value);
        fillTarget.style.clipPath = `inset(0 ${fillPercentage}% 0 0)`;
      }

      // scale 효과용 클래스 토글 (filled 기준 보정)
      if (i + 1 <= value) {
        stars[i].classList.add('filled');
      } else {
        stars[i].classList.remove('filled');
      }
    }
  };

  // 마우스 무브 이벤트 핸들러
  const handleMouseMove = (e) => {
    const rect = ratingBox.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    // 0.5 단위 올림 계산
    const value = Math.ceil((x / width) * RATING_COUNT * 2) / 2;
    hoveredRating = Math.min(Math.max(value, 0.5), RATING_COUNT);

    updateStars(hoveredRating);
  };

  // 마우스 클릭 시 별점 고정
  const fixRating = () => {
    if (hoveredRating === 0) return;
    currentRating = hoveredRating;
    updateStars(currentRating);

    ratingBox.setAttribute('data-score', currentRating); // 부모 박스 속성으로 점수 기록
  };

  // 마우스가 떠날 때 기존 점수로 리셋
  const resetRating = () => {
    hoveredRating = 0;
    updateStars(currentRating);
  };

  // 각 컨테이너 박스에 이벤트를 개별 부여
  ratingBox.addEventListener('mousemove', handleMouseMove);
  ratingBox.addEventListener('mouseleave', resetRating);
  ratingBox.addEventListener('click', fixRating);

  // 최초 초기화
  updateStars(currentRating);
});


////// 등록하기 버튼 눌렀을 때 데이터 객체로 묶음
document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.querySelector('.rightSB-reviewSubmitBtn');

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      // 현재 화면에 보여지고 있는 활성화된 탭 콘텐츠 박스를 가져옴
      const activeTab = document.querySelector('.rightSB-tabContent.rightSB-activeContent');
      
      if (!activeTab) return;

      // ----------------------------------------------------
      // CASE 1: [실거주 후기] 탭이 열려있을 때의 전송 로직
      // ----------------------------------------------------
      if (activeTab.id === 'tabContentReview') {
        const ratings = activeTab.querySelectorAll('.rightSB-rating');
        const scores = { night: 0, convenience: 0, atmosphere: 0 };

        ratings.forEach((box) => {
          const type = box.getAttribute('data-type');
          const score = parseFloat(box.getAttribute('data-score')) || 0;
          if (type) scores[type] = score;
        });

        const reviewTextarea = activeTab.querySelector('.rightSB-reviewContent');
        const reviewText = reviewTextarea ? reviewTextarea.value : '';
        
        const agreeCheckbox = activeTab.querySelector('#check-agree');
        const isAgreed = agreeCheckbox ? agreeCheckbox.checked : false;

        // 필수 검증 (Validation)
        if (scores.night === 0 || scores.convenience === 0 || scores.atmosphere === 0) {
          alert('모든 항목의 만족도 별점을 선택해주세요.');
          return;
        }
        if (!reviewText.trim()) {
          alert('자세한 후기를 작성해주세요!');
          return;
        }
        if (!isAgreed) {
          alert('개인정보 수집 및 이용에 동의하셔야 등록이 가능합니다.');
          return;
        }

        // 후기 탭 최종 데이터 패키징
        const finalReviewData = {
          type: 'review',
          rating: scores,
          content: reviewText,
          isAgreed: isAgreed
        };

        console.log('📦 [실거주 후기] 서버로 전송할 데이터:', finalReviewData);
      } 
      
      // ----------------------------------------------------
      // CASE 2: [Q&A 질문 남기기] 탭이 열려있을 때의 전송 로직
      // ----------------------------------------------------
      else if (activeTab.id === 'tabContentQnA') {
        const qnaTextarea = activeTab.querySelector('.rightSB-reviewContent');
        const qnaText = qnaTextarea ? qnaTextarea.value : '';
        
        const agreeCheckboxQnA = activeTab.querySelector('#check-agree2');
        const isAgreedQnA = agreeCheckboxQnA ? agreeCheckboxQnA.checked : false;

        if (!qnaText.trim()) {
          alert('궁금한 내용을 입력해주세요.');
          return;
        }
        if (!isAgreedQnA) {
          alert('개인정보 수집 및 이용에 동의하셔야 질문 등록이 가능합니다.');
          return;
        }

        // Q&A 탭 최종 데이터 패키징
        const finalQnaData = {
          type: 'qna',
          content: qnaText,
          isAgreed: isAgreedQnA
        };

        console.log('📦 [Q&A 질문남기기] 서버로 전송할 데이터:', finalQnaData);
      }
    });
  }
});

