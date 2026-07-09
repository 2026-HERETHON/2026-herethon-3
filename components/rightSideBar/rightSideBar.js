/// ==========================================
/// 1. 상단 만족도 별점 표현 구현 (가상 데이터 렌더링)
/// ==========================================
function handleStarRating() {
  const scoreData = {
    night: 3.5,
    convenience: 4.0,
    atmosphere: 4.1,
  };

  Object.keys(scoreData).forEach((key) => {
    const score = scoreData[key];
    const container = document.querySelector(
      `.rightSB-${key} .rightSB-starRatingContainer`,
    );
    if (!container) return;

    let emptyStarsHTML = "";
    for (let i = 0; i < 5; i++) {
      emptyStarsHTML += `<img src="./components/rightSideBar/rightSB-images/emptyStar.svg" alt="빈별" style="width:16px !important; height:16px !important; flex-shrink:0 !important; margin:0 !important; padding:0 !important;" />`;
    }

    let filledStarsHTML = "";
    for (let i = 0; i < 5; i++) {
      filledStarsHTML += `<img src="./components/rightSideBar/rightSB-images/filledStar.svg" alt="채워진별" style="width:16px !important; height:16px !important; flex-shrink:0 !important; margin:0 !important; padding:0 !important;" />`;
    }

    const roundedScore = Math.floor(score * 2) / 2;
    const filledStarsCount = Math.floor(roundedScore);
    const hasHalfStar = roundedScore % 1 !== 0;

    let totalWidth = filledStarsCount * 16 + filledStarsCount * 11;
    if (hasHalfStar) {
      totalWidth += 8 + 5.5;
    } else if (filledStarsCount > 0) {
      totalWidth -= 11;
    }

    container.innerHTML = `
      <div class="rightSB-starRatingDisplay" style="position: relative !important; display: inline-flex !important; width: 124px !important; height: 16px !important; flex-shrink: 0 !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box !important;">
        <div class="rightSB-emptyStars" style="display: flex !important; gap: 11px !important; width: 124px !important; height: 16px !important; position: absolute !important; top: 0 !important; left: 0 !important; z-index: 1 !important; margin: 0 !important; padding: 0 !important;">
          ${emptyStarsHTML}
        </div>
        <div class="rightSB-filledStars" style="display: flex !important; gap: 11px !important; height: 16px !important; position: absolute !important; top: 0 !important; left: 0 !important; z-index: 2 !important; overflow: hidden !important; white-space: nowrap !important; pointer-events: none !important; margin: 0 !important; padding: 0 !important; width: ${totalWidth}px !important;">
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

/// ==========================================
/// 2. 동적 드롭다운/입력 폼 컴포넌트 초기화 및 독립 버튼 스위칭 제어
/// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // 최초 실행 점수 로드
  handleStarRating();

  // --- [A] 엘리먼트 수집 및 버튼 묶음 인덱싱 ---
  const navMenus = document.querySelectorAll(".rightSB-navbar-menu");
  const indicator = document.querySelector(".rightSB-navbar-indicator");
  const tabContents = document.querySelectorAll(".rightSB-tabContent");

  const reviewListSub = document.querySelector(".rightSB-reviewListSubPage");
  const reviewFormSub = document.querySelector(".rightSB-reviewFormSubPage");
  const qnaListSub = document.querySelector(".rightSB-qnaListSubPage");
  const qnaFormSub = document.querySelector(".rightSB-qnaFormSubPage");

  // HTML 하단에 순서대로 배치된 버튼 박스 3개 정밀 수집
  const allBtnGroups = document.querySelectorAll(
    ".rightSB-content > .rightSB-reviewBtn",
  );
  const reviewListBtnGroup = allBtnGroups[0]; // 후기 목록용 (후기 작성하기 / 찜하기)
  const qnaListBtnGroup = allBtnGroups[1]; // Q&A 목록용 (질문 남기기 / 찜하기)
  const formSubmitBtnGroup = allBtnGroups[2]; // 공통 폼 등록용 (등록하기 / 취소)

  // --- [B] 통합 버튼 상태 제어 함수 (수정본) ---
  function updateBottomButtons() {
    // 1. 모든 버튼 일단 숨김
    reviewListBtnGroup?.classList.add("rightSB-hide");
    qnaListBtnGroup?.classList.add("rightSB-hide");
    formSubmitBtnGroup?.classList.add("rightSB-hide");

    // 2. 현재 활성화된 메인 탭 확인
    const activeTab = document.querySelector(
      ".rightSB-tabContent.rightSB-activeContent",
    );
    if (!activeTab) return;

    if (activeTab.id === "tabContentReview") {
      // 실거주 후기 탭일 때
      if (reviewFormSub && !reviewFormSub.classList.contains("rightSB-hide")) {
        formSubmitBtnGroup?.classList.remove("rightSB-hide"); // 폼 작성 중일 때만 등록/취소 버튼
      } else {
        reviewListBtnGroup?.classList.remove("rightSB-hide"); // 목록 상태
      }
    } else if (activeTab.id === "tabContentQnA") {
      // Q&A 탭일 때
      if (qnaFormSub && !qnaFormSub.classList.contains("rightSB-hide")) {
        formSubmitBtnGroup?.classList.remove("rightSB-hide"); // 질문 작성 폼일 때만 등록/취소 버튼
      }
      // 💡 [여기 수정] 목록 상태이거나 '상세 보기 페이지' 상태일 때 둘 다 질문 남기기/찜하기 버튼 유지!
      else {
        qnaListBtnGroup?.classList.remove("rightSB-hide");
      }
    }
  }

  // --- [C] 상단 메인 내비게이션 바 이동 및 탭 콘텐츠 매핑 ---
  function updateIndicator(target) {
    if (!indicator || !target) return;
    indicator.style.transform = `translateX(${target.offsetLeft}px)`;
  }

  navMenus.forEach((menu) => {
    menu.addEventListener("click", (e) => {
      const currentMenu = e.target.closest(".rightSB-navbar-menu");
      if (!currentMenu) return;

      navMenus.forEach((m) => m.classList.remove("rightSB-beBold"));
      currentMenu.classList.add("rightSB-beBold");
      updateIndicator(currentMenu);

      tabContents.forEach((content) =>
        content.classList.remove("rightSB-activeContent"),
      );

      if (currentMenu.classList.contains("rightSB-reviewSelected")) {
        const reviewTab = document.getElementById("tabContentReview");
        if (reviewTab) {
          reviewTab.classList.add("rightSB-activeContent");
          // 탭 변경 시 서브페이지 목록으로 강제 롤백
          reviewFormSub?.classList.add("rightSB-hide");
          reviewListSub?.classList.remove("rightSB-hide");
        }
      } else if (currentMenu.classList.contains("rightSB-QnASelected")) {
        const qnaTab = document.getElementById("tabContentQnA");
        if (qnaTab) {
          qnaTab.classList.add("rightSB-activeContent");
          // 탭 변경 시 서브페이지 목록으로 강제 롤백
          qnaFormSub?.classList.add("rightSB-hide");
          qnaListSub?.classList.remove("rightSB-hide");
        }
      }
      // 탭 전환 후 버튼 업데이트 트리거
      updateBottomButtons();
    });
  });

  // 초기 로드 시 밑줄 및 버튼 세팅
  const activeMenu = document.querySelector(
    ".rightSB-navbar-menu.rightSB-beBold",
  );
  if (activeMenu) {
    setTimeout(() => updateIndicator(activeMenu), 50);
  }
  updateBottomButtons(); // 최초 버튼 셋 렌더링

  // --- [D] 다중 textarea 글자수 실시간 제한 규칙 ---
  const reviewContainers = document.querySelectorAll(
    ".rightSB-reviewContentContainer",
  );
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

  // --- [E] 사용자 직접 만족도 별점 호버/클릭 입력 구현 모듈 ---
  const RATING_COUNT = 5;
  const ratingContainers = document.querySelectorAll(".rightSB-rating");

  const createStarElement = () => {
    const rightSBstar = document.createElement("div");
    rightSBstar.className = "rightSBstar";
    rightSBstar.innerHTML = `
      <div class="rightSBstar-empty"></div>
      <div class="rightSBstar-fill"></div>
    `;
    return rightSBstar;
  };

  const getClipPathPercent = (starIndex, value) => {
    if (starIndex <= value) return 0;
    if (starIndex - value === 0.5) return 50;
    return 100;
  };

  ratingContainers.forEach((ratingBox) => {
    let currentRating = 0;
    let hoveredRating = 0;

    for (let i = 0; i < RATING_COUNT; i++) {
      ratingBox.appendChild(createStarElement());
    }

    const updateStars = (value) => {
      const stars = ratingBox.children;
      for (let i = 0; i < RATING_COUNT; i++) {
        if (!stars[i]) continue;
        const fillTarget = stars[i].querySelector(".rightSBstar-fill");
        if (fillTarget) {
          const fillPercentage = getClipPathPercent(i + 1, value);
          fillTarget.style.clipPath = `inset(0 ${fillPercentage}% 0 0)`;
        }
        if (i + 1 <= value) {
          stars[i].classList.add("filled");
        } else {
          stars[i].classList.remove("filled");
        }
      }
    };

    ratingBox.addEventListener("mousemove", (e) => {
      const rect = ratingBox.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      const value = Math.ceil((x / width) * RATING_COUNT * 2) / 2;
      hoveredRating = Math.min(Math.max(value, 0.5), RATING_COUNT);
      updateStars(hoveredRating);
    });

    ratingBox.addEventListener("mouseleave", () => {
      hoveredRating = 0;
      updateStars(currentRating);
    });

    ratingBox.addEventListener("click", () => {
      if (hoveredRating === 0) return;
      currentRating = hoveredRating;
      updateStars(currentRating);
      ratingBox.setAttribute("data-score", currentRating);
    });

    updateStars(currentRating);
  });

  // --- [F] 1,2,3,4 서브페이지 라우팅 및 독립 버튼 유기적 매핑 ---

  // [1페이지 -> 2페이지 이동] (후기 작성하기 클릭)
  reviewListBtnGroup
    ?.querySelector(".go-to-review-form")
    ?.addEventListener("click", () => {
      reviewListSub?.classList.add("rightSB-hide");
      reviewFormSub?.classList.remove("rightSB-hide");
      updateBottomButtons();
    });

  // [3페이지 -> 4페이지 이동] (질문 남기기 클릭)
  qnaListBtnGroup
    ?.querySelector(".go-to-review-form")
    ?.addEventListener("click", () => {
      qnaListSub?.classList.add("rightSB-hide");
      qnaFormSub?.classList.remove("rightSB-hide");
      updateBottomButtons();
    });

  // [공통 복귀 로직 함수]
  const backToMainList = () => {
    const activeTab = document
      .getElementById("tabContentReview")
      ?.classList.contains("rightSB-activeContent")
      ? document.getElementById("tabContentReview")
      : document.getElementById("tabContentQnA");

    if (!activeTab) return;

    if (activeTab.id === "tabContentReview") {
      // 1. 후기 텍스트 영역 비우기 및 글자수(0/500) 리셋
      const textarea = reviewFormSub.querySelector(".rightSB-reviewContent");
      if (textarea) textarea.value = "";
      const charSpan = reviewFormSub.querySelector(
        ".rightSB-currentChars > span",
      );
      if (charSpan) charSpan.textContent = "0";

      // 2. 후기 체크박스 동의 해제
      const agreeCheckbox = reviewFormSub.querySelector("#check-agree");
      if (agreeCheckbox) agreeCheckbox.checked = false;

      // 3. 후기 만족도 별점(0점) 및 채워진 그래픽 초기화
      const ratings = reviewFormSub.querySelectorAll(".rightSB-rating");
      ratings.forEach((box) => {
        box.setAttribute("data-score", "0");
        const stars = box.children;
        for (let i = 0; i < stars.length; i++) {
          stars[i].classList.remove("filled");
          const fillTarget = stars[i].querySelector(".rightSBstar-fill");
          if (fillTarget) fillTarget.style.clipPath = "inset(0 100% 0 0)";
        }
      });

      // 4. 화면 전환
      reviewFormSub?.classList.add("rightSB-hide");
      reviewListSub?.classList.remove("rightSB-hide");
    } else if (activeTab.id === "tabContentQnA") {
      // 1. Q&A 텍스트 영역 비우기 및 글자수 리셋
      const textarea = qnaFormSub.querySelector(".rightSB-reviewContent");
      if (textarea) textarea.value = "";
      const charSpan = qnaFormSub.querySelector(".rightSB-currentChars > span");
      if (charSpan) charSpan.textContent = "0";

      // 2. Q&A 체크박스 동의 해제
      const agreeCheckbox = qnaFormSub.querySelector("#check-agree2");
      if (agreeCheckbox) agreeCheckbox.checked = false;

      // 3. 화면 전환
      qnaFormSub?.classList.add("rightSB-hide");
      qnaListSub?.classList.remove("rightSB-hide");
    }

    // 아래 버튼 묶음 스위칭 함수 호출
    updateBottomButtons();
  };
  // 상단 화살표(<) 이미지 클릭 시 목록 복귀
  reviewFormSub
    ?.querySelector(".rightSB-reviewTitle img")
    ?.addEventListener("click", backToMainList);
  qnaFormSub
    ?.querySelector(".rightSB-reviewTitle img")
    ?.addEventListener("click", backToMainList);

  // 3번째 버튼 그룹 내 [취소] 버튼 클릭 시 목록 복귀
  formSubmitBtnGroup
    ?.querySelector(".rightSB-reviewCancleBtn")
    ?.addEventListener("click", backToMainList);

  // --- [💡 수정] 1, 2번째 버튼 그룹 내 [이 동네 찜하기] 토글 및 이미지 변경 처리 ---

  // 찜하기 상태를 기억할 변수 (false: 찜 안함, true: 찜함)
  let isWished = false;

  document.querySelectorAll(".wish-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      // 1. 상태 뒤집기 (토글)
      isWished = !isWished;

      // 2. 화면에 있는 모든 찜하기 버튼의 하트 이미지 수집
      const allHeartImgs = document.querySelectorAll(
        ".wish-btn .rightSB-heartImg",
      );

      // 3. 상태에 따라 이미지 경로 및 알림창 분기 처리
      allHeartImgs.forEach((img) => {
        if (isWished) {
          img.src = "./components/rightSideBar/rightSB-images/fullHeart.svg"; // 채워진 하트 경로
        } else {
          img.src = "./components/rightSideBar/rightSB-images/heart.svg"; // 원래 빈 하트 경로
        }
      });

      // 4. 피드백 알림창
      if (isWished) {
        alert("❤️ 이 동네가 찜 목록에 추가되었습니다.");
      } else {
        alert("💔 찜 목록에서 제외되었습니다.");
      }
    });
  });

  // --- [G] 3번째 버튼 그룹 내 [등록하기] 공통 버튼 라우팅 처리 ---
  formSubmitBtnGroup
    ?.querySelector(".rightSB-reviewSubmitBtn")
    ?.addEventListener("click", () => {
      const activeTab = document.querySelector(
        ".rightSB-tabContent.rightSB-activeContent",
      );
      if (!activeTab) return;

      // [CASE 1: 후기 작성 등록 전송 및 밸리데이션]
      if (activeTab.id === "tabContentReview") {
        const ratings = reviewFormSub.querySelectorAll(".rightSB-rating");
        const scores = { night: 0, convenience: 0, atmosphere: 0 };
        ratings.forEach((box) => {
          const type = box.getAttribute("data-type");
          const score = parseFloat(box.getAttribute("data-score")) || 0;
          if (type) scores[type] = score;
        });

        const textarea = reviewFormSub.querySelector(".rightSB-reviewContent"); // 💡 리셋을 위해 엘리먼트로 수집
        const text = textarea.value;
        const agreeCheckbox = reviewFormSub.querySelector("#check-agree"); // 💡 리셋을 위해 엘리먼트로 수집
        const isAgreed = agreeCheckbox.checked;

        if (
          scores.night === 0 ||
          scores.convenience === 0 ||
          scores.atmosphere === 0
        ) {
          alert("모든 항목의 만족도 별점을 선택해주세요.");
          return;
        }
        if (!text.trim()) {
          alert("자세한 후기를 작성해주세요!");
          return;
        }
        if (!isAgreed) {
          alert("개인정보 수집 및 이용에 동의하셔야 등록이 가능합니다.");
          return;
        }

        console.log("📦 [실거주 후기 데이터 백엔드 발송]:", {
          rating: scores,
          content: text,
          isAgreed,
        });
        alert("후기가 성공적으로 등록되었습니다!");

        // 💡 [실거주 후기 폼 초기화 코드 추가]
        // 1. 텍스트 영역 비우기 및 글자수 표기(0/500) 리셋
        textarea.value = "";
        const charSpan = reviewFormSub.querySelector(
          ".rightSB-currentChars > span",
        );
        if (charSpan) charSpan.textContent = "0";

        // 2. 체크박스 동의 해제
        agreeCheckbox.checked = false;

        // 3. 만족도 별점(0점) 및 채워진 그래픽 초기화
        ratings.forEach((box) => {
          box.setAttribute("data-score", "0");
          // 생성해 둔 별 자식 요소들의 clipPath 마스크를 다시 100%로 가려버림
          const stars = box.children;
          for (let i = 0; i < stars.length; i++) {
            stars[i].classList.remove("filled");
            const fillTarget = stars[i].querySelector(".rightSBstar-fill");
            if (fillTarget) fillTarget.style.clipPath = "inset(0 100% 0 0)";
          }
        });

        backToMainList();
      }
      // [CASE 2: Q&A 질문 등록 전송 및 밸리데이션]
      else if (activeTab.id === "tabContentQnA") {
        const textarea = qnaFormSub.querySelector(".rightSB-reviewContent"); // 💡 리셋을 위해 엘리먼트로 수집
        const text = textarea.value;
        const agreeCheckbox = qnaFormSub.querySelector("#check-agree2"); // 💡 리셋을 위해 엘리먼트로 수집
        const isAgreed = agreeCheckbox.checked;

        if (!text.trim()) {
          alert("궁금한 내용을 입력해주세요.");
          return;
        }
        if (!isAgreed) {
          alert("개인정보 수집 및 이용에 동의하셔야 질문 등록이 가능합니다.");
          return;
        }

        console.log("📦 [Q&A 질문 데이터 백엔드 발송]:", {
          content: text,
          isAgreed,
        });
        alert("질문이 성공적으로 등록되었습니다!");

        // [Q&A 폼 초기화 코드 추가]
        // 1. 텍스트 영역 비우기 및 글자수 표기 리셋
        textarea.value = "";
        const charSpan = qnaFormSub.querySelector(
          ".rightSB-currentChars > span",
        );
        if (charSpan) charSpan.textContent = "0";

        // 2. 체크박스 동의 해제
        agreeCheckbox.checked = false;

        backToMainList();
      }
    });

  // --- [H] 스크롤바 바닥 감지 및 동적 바텀 보더 토글 기능 ---
  const scrollWrapper = document.querySelector(".rightSB-tabContentWrapper");
  const reviewContainer = document.querySelector(".rightSB-reviewContainer");

  if (scrollWrapper && reviewContainer) {
    scrollWrapper.addEventListener("scroll", () => {
      // scrollTop(내려온 길이) + clientHeight(보이는 창 높이)가
      // scrollHeight(내부 내용물 전체 높이)와 같아지면 바닥에 닿은 것입니다.
      // 소수점 오차 방지를 위해 -2px 버퍼를 둡니다.
      const isBottom =
        scrollWrapper.scrollTop + scrollWrapper.clientHeight >=
        scrollWrapper.scrollHeight - 2;

      if (isBottom) {
        // 끝까지 스크롤 다 내렸을 때 하단 보더 켜기!
        reviewContainer.classList.add("rightSB-showBorder");
      } else {
        // 조금이라도 위로 올라가면 다시 하단 보더 감추기!
        reviewContainer.classList.remove("rightSB-showBorder");
      }
    });

    // 만 내용물이 너무 적어서 처음부터 스크롤바가 안 생기는 경우를 대비해 최초 1회 체크
    setTimeout(() => {
      if (scrollWrapper.clientHeight >= scrollWrapper.scrollHeight) {
        reviewContainer.classList.add("rightSB-showBorder");
      }
    }, 100);
  }

  // --- [I] 백엔드 연동용 후기 리스트 동적 렌더링 모듈 ---

  // 1. 임시 백엔드 데이터 (나중에 fetch나 axios로 받아올 데이터 배열)
  const mockReviewsFromServer = [
    {
      id: 101,
      nickname: "별빛여행자",
      residence: "상계동 거주 중",
      date: "3일 전",
      score: 2.5,
      content:
        "밤에 귀가할 때 가로등이 많아서 안심돼요. 주변에 편의점, 병원도 가까워서 생활하기 편합니다.",
      likes: 12,
    },
    {
      id: 102,
      nickname: "따뜻한 봄날",
      residence: "상계동 거주 중",
      date: "1주 전",
      score: 4.0,
      content:
        "조용한 주택가라 좋고, 비상벨 설치도 잘 되어 있어요. 다만 일부 골목은 조금 어두워요.",
      likes: 3,
    },
    {
      id: 103,
      nickname: "따뜻한 봄날",
      residence: "상계동 거주 중",
      date: "1주 전",
      score: 3.9,
      content:
        "조용한 주택가라 좋고, 비상벨 설치도 잘 되어 있어요. 다만 일부 골목은 조금 어두워요.",
      likes: 3,
    },
  ];

  // 2. 데이터를 받아와서 화면에 뿌려주는 함수
  function renderReviews(reviews) {
    const container = document.getElementById("rightSB-reviewCardContainer");
    if (!container) return;

    // 기존에 더미로 들어있던 내용 청소
    container.innerHTML = "";

    // 데이터가 하나도 없을 때 예외 처리
    if (reviews.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:#7b7578; padding:4px 0;">첫 번째 후기를 남겨보세요!</div>`;
      return;
    }

    // 3. 루프를 돌며 동적 템플릿 생성
    reviews.forEach((review) => {
      // 💡 별 5개 이미지 세트 가공 (상단 만족도 방식과 동일하게 인라인 스타일 간섭 제거)
      let emptyStarsHTML = "";
      let filledStarsHTML = "";
      for (let i = 0; i < 5; i++) {
        emptyStarsHTML += `<img src="./components/rightSideBar/rightSB-images/emptyStar.svg" alt="빈별" class="rightSB-cardStarIcon" />`;
        filledStarsHTML += `<img src="./components/rightSideBar/rightSB-images/filledStar.svg" alt="채워진별" class="rightSB-cardStarIcon" />`;
      }

      // 💡 반 개 단위(0.5단위)로 점수 정렬
      const roundedScore = Math.round(review.score * 2) / 2;
      const filledStarsCount = Math.floor(roundedScore);
      const hasHalfStar = roundedScore % 1 !== 0;

      // 💡 [초정밀 수정] 별 내부 공백과 스케일 오차를 반영한 픽셀 매칭
      let totalWidth = filledStarsCount * 11 + filledStarsCount * 4;

      if (hasHalfStar) {
        totalWidth += 5.5;
      } else if (filledStarsCount > 0) {
        totalWidth -= 4; // 맨 마지막 별 뒤의 여분 간격 제거
      }

      // 리액트의 return <div>...</div> 과 같은 컴포넌트 양식 만들기
      const cardHTML = `
        <div class="rightSB-reviewCard" data-id="${review.id}">
          <div class="rightSB-cardUserLine">
            <div class="rightSB-cardUserInfo">
              <div class="rightSB-cardAvatar"></div>
              <div>
                <span class="rightSB-cardNickname">${review.nickname}</span>
                <span class="rightSB-cardPeriod">${review.residence}</span>
              </div>
            </div>
            <span class="rightSB-cardDate">${review.date}</span>
          </div>

          <div class="rightSB-reviewTextWrapper">
            <div>
              <div class="rightSB-cardRatingLine">
                
                <div class="rightSB-cardStarsDisplay">
                  <div class="rightSB-cardEmptyStars">
                    ${emptyStarsHTML}
                  </div>
                  <div class="rightSB-cardFilledStars" style="width: ${totalWidth}px;">
                    ${filledStarsHTML}
                  </div>
                </div>

                <span class="rightSB-cardScore">${review.score.toFixed(1)}</span>
              </div>
              <div class="rightSB-cardText">${review.content}</div>
            </div>
            <button class="rightSB-cardLikeBtn">
              <img src="./components/rightSideBar/rightSB-images/thumbsUp.svg" style="width:11px; height:10px;" />
              <span>${review.likes}</span>
            </button>
          </div>
        </div>
      `;

      // 부모 컨테이너에 차곡차곡 누적 추가하기
      container.insertAdjacentHTML("beforeend", cardHTML);
    });
  }
  // 함수 실행시켜서 화면에 카드들 띄우기!
  renderReviews(mockReviewsFromServer);

  // ==========================================
  // --- [J] 백源 연동용 Q&A 리스트 동적 렌더링 모듈 ---
  // ==========================================

  // 1. 임시 Q&A 데이터 (나중에 서버에서 가져올 배열)
  const mockQnasFromServer = [
    { id: 201, question: "밤에 혼자 걸어다녀도 괜찮을까요?", answerCount: 2 },
    { id: 202, question: "주차는 편리한가요?", answerCount: 2 },
    { id: 203, question: "버스나 지하철 접근성은 어떤가요?", answerCount: 1 },
    { id: 204, question: "주변에 편의점이나 마트는 많나요?", answerCount: 2 },
    {
      id: 205,
      question:
        "이 동네의 가장 큰 장단점은 무엇인가요?이 동네의 가장 큰 장단점은 무엇인가요?이 동네의 가장 큰 장단점은 무엇인가요?이 동네의 가장 큰 장단점은 무엇인가요?이 동네의 가장 큰 장단점은 무엇인가요?",
      answerCount: 3,
    },
    { id: 206, question: "밤에 혼자 걸어다녀도 괜찮을까요?", answerCount: 2 },
    { id: 207, question: "주차는 편리한가요?", answerCount: 2 },
    { id: 208, question: "버스나 지하철 접근성은 어떤가요?", answerCount: 1 },
    { id: 209, question: "주변에 편의점이나 마트는 많나요?", answerCount: 2 },
    {
      id: 210,
      question: "이 동네의 가장 큰 장단점은 무엇인가요?",
      answerCount: 3,
    },
  ];

  // 2. Q&A 데이터를 화면에 뿌려주는 함수
  function renderQnas(qnas) {
    const container = document.getElementById("rightSB-qnaCardContainer");
    if (!container) return;

    // 초기화
    container.innerHTML = "";

    // 질문이 없을 때 처리
    if (qnas.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:#7b7578; padding:24px 0;">등록된 질문이 없습니다. 첫 질문을 던져보세요!</div>`;
      return;
    }

    // 3. 루프를 돌며 동적 카드 템플릿 주입
    qnas.forEach((qna) => {
      const qnaHTML = `
        <div class="rightSB-qnaCard" data-id="${qna.id}">
          <div class="rightSB-qnaLeft">
            <div class="rightSB-qnaAvatar">Q</div>
            <span class="rightSB-qnaQuestion">${qna.question}</span>
          </div>
          <div class="rightSB-qnaRight">
            <span class="rightSB-qnaAnswerText">답변 ${qna.answerCount}</span>
            <img src="./components/rightSideBar/rightSB-images/details.svg" class="rightSB-qnaArrow" alt="이동" />
          </div>
        </div>
      `;
      container.insertAdjacentHTML("beforeend", qnaHTML);
    });
  }

  // 💡 DOMContentLoaded 블록 내부에서 안전하게 실행되도록 구성
  renderQnas(mockQnasFromServer);

  // --- [K] 백엔드 데이터 연동 5각형 레이더 차트 모듈 ---

  // 1. 임시 백엔드 데이터 (0에서 100 사이의 점수라고 가정)
  const mockGraphDataFromServer = {
    cctv: 85,
    streetLight: 70,
    police: 45,
    emergencyBell: 60,
    crimeZone: 75, // 범죄주의 구간 (안전할수록 점수가 높거나 기획에 맞게 설정)
  };

  // 2. 차트를 생성하는 함수
  function renderSafetyChart(data) {
    const ctx = document.getElementById("safetyRadarChart");
    if (!ctx) return;

    // 이미 생성된 차트가 있다면 파괴하고 새로 그리기 (데이터 업데이트 대응)
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
      existingChart.destroy();
    }

    // 3. Chart.js 객체 생성
    new Chart(ctx, {
      type: "radar", //  레이더(오각형) 타입 지정
      data: {
        labels: ["CCTV", "가로등", "파출소", "비상벨", ["범죄주의", "구간"]], // 축 이름
        datasets: [
          {
            data: [
              data.cctv,
              data.streetLight,
              data.police,
              data.emergencyBell,
              data.crimeZone,
            ],

            // 🎨 디자인 커스텀 (보내주신 이미지와 유사한 블루 톤 설정)
            backgroundColor: "rgba(23, 137, 255, 0.55)", // 내부 채우기 색상
            borderColor: "#1077ff", // 선 색상
            borderWidth: 1.5,
            pointBackgroundColor: "#1077ff", // 꼭짓점 점 색상
            pointRadius: 1, // 점 크기
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false }, // 상단 범례(Label) 숨김
        },
        // 💡 차트 전체 패딩을 주어 글자가 외각 경계선에 잘리는 것을 원천 방지
        layout: {
          padding: 0,
        },
        scales: {
          r: {
            min: 0, // 최솟값
            max: 100, // 최댓값
            ticks: { display: false, stepSize: 25 }, // 내부 숫자 그리드 텍스트 숨김

            backgroundColor: "#F0EDEE",
            startAngle: 0,

            grid: {
              color: "#D9D2D4", // 오각형 테두리 선 색상
            },
            angleLines: {
              color: "#D9D2D4", // 중심에서 뻗어나가는 선 색상
            },
            pointLabels: {
              // 축 글자(CCTV, 가로등 등) 스타일 지정
              font: {
                family: "Pretendard",
                size: 12,
                weight: "600",
                style: "normal",
              },
              color: "#7B7578",
              lineHeight: 1.5,
              letterSpacing: -0.24,
              textAlign: "left",
            },
          },
        },
        maintainAspectRatio: false, // 부모 박스 크기에 맞춰 꽉 차게 조절
      },
    });
  }

  // 최초 실행!
  renderSafetyChart(mockGraphDataFromServer);

  // --- [L] Q&A 질문 상세 보기 및 화면 전환 모듈 ---

  // 1. 임시 백엔드 데이터 (상세 질문에 딸린 답변 목록 샘플)
  const mockAnswersFromServer = {
    201: [
      {
        nickname: "별빛여행자",
        residence: "상계동 거주 중",
        date: "3일 전",
        content: "네, 큰 길 위주로 다니시면 괜찮아요. 가로등도 많아요!",
      },
      {
        nickname: "산책러",
        residence: "상계동 거주 중",
        date: "3일 전",
        content:
          "저도 밤에 자주 다니는데 위험한 느낌은 없었어요. 늦은 시간에도 사람이 많이 다녀서 괜찮아요.",
      },
      {
        nickname: "산책러",
        residence: "상계동 거주 중",
        date: "3일 전",
        content:
          "저도 밤에 자주 다니는데 위험한 느낌은 없었어요. 늦은 시간에도 사람이 많이 다녀서 괜찮아요.",
      },
      {
        nickname: "산책러",
        residence: "상계동 거주 중",
        date: "3일 전",
        content:
          "저도 밤에 자주 다니는데 위험한 느낌은 없었어요. 늦은 시간에도 사람이 많이 다녀서 괜찮아요.",
      },
      {
        nickname: "산책러",
        residence: "상계동 거주 중",
        date: "3일 전",
        content:
          "저도 밤에 자주 다니는데 위험한 느낌은 없었어요. 늦은 시간에도 사람이 많이 다녀서 괜찮아요.",
      },
    ],
  };

  const qnaDetailSub = document.querySelector(".rightSB-qnaDetailSubPage");

  // 2. 기존 renderQnas 함수 보완 (질문 카드에 클릭 이벤트 리스너 추가하기)
  function renderQnas(qnas) {
    const container = document.getElementById("rightSB-qnaCardContainer");
    if (!container) return;

    container.innerHTML = "";

    if (qnas.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:#7b7578; padding:24px 0;">등록된 질문이 없습니다.</div>`;
      return;
    }

    qnas.forEach((qna) => {
      // 가상 데이터 매칭용 mock 추가 정보 처리
      const user = qna.user || "별빛여행자";
      const date = qna.date || "3일 전";
      const views = qna.views || 213;

      const qnaHTML = `
        <div class="rightSB-qnaCard" data-id="${qna.id}" data-user="${user}" data-date="${date}" data-views="${views}">
          <div class="rightSB-qnaLeft">
            <div class="rightSB-qnaAvatar">Q</div>
            <span class="rightSB-qnaQuestion">${qna.question}</span>
          </div>
          <div class="rightSB-qnaRight">
            <span class="rightSB-qnaAnswerText">답변 ${qna.answerCount}</span>
            <img src="./components/rightSideBar/rightSB-images/details.svg" class="rightSB-qnaArrow" alt="이동" />
          </div>
        </div>
      `;
      container.insertAdjacentHTML("beforeend", qnaHTML);
    });

    // 카드 클릭 시 상세 페이지로 이동 이벤트 바인딩
    container.querySelectorAll(".rightSB-qnaCard").forEach((card) => {
      card.addEventListener("click", () => {
        const qnaId = card.getAttribute("data-id");
        const questionText = card.querySelector(
          ".rightSB-qnaQuestion",
        ).textContent;
        const answerCountText = card.querySelector(
          ".rightSB-qnaAnswerText",
        ).textContent;
        const user = card.getAttribute("data-user");
        const date = card.getAttribute("data-date");
        const views = card.getAttribute("data-views");

        // 상세 정보 주입
        document.getElementById("qnaDetailTitle").textContent = questionText;
        document.getElementById("qnaDetailAnsCount").textContent =
          answerCountText;
        document.getElementById("qnaDetailUser").textContent = user;
        document.getElementById("qnaDetailDate").textContent = date;
        document.getElementById("qnaDetailViews").textContent = views;

        // 답변 목록 그리기
        renderAnswers(qnaId);

        // 화면 전환 및 하단 버튼 숨김 제어 (상세창 노출 시 메인 하단 버튼들은 숨김)
        qnaListSub?.classList.add("rightSB-hide");
        qnaDetailSub?.classList.remove("rightSB-hide");

        updateBottomButtons();
      });
    });
  }

  // 3. 답변을 동적으로 렌더링하는 함수
  function renderAnswers(qnaId) {
    const ansContainer = document.getElementById("qnaAnswerContainer");
    if (!ansContainer) return;

    ansContainer.innerHTML = "";
    const answers = mockAnswersFromServer[qnaId] || [];

    answers.forEach((ans) => {
      const ansHTML = `
        <div class="rightSB-answerCard">
          <div class="rightSB-ansUserLine">
            <div class="rightSB-ansUserInfo">
              <div class="rightSB-ansAvatar"></div>
              <div>
                <span class="rightSB-ansNickname">${ans.nickname}</span>
                <span class="rightSB-ansPeriod">${ans.residence}</span>
              </div>
            </div>
            <span class="rightSB-ansDate">${ans.date}</span>
          </div>
          <div class="rightSB-ansText">${ans.content}</div>
        </div>
      `;
      ansContainer.insertAdjacentHTML("beforeend", ansHTML);
    });
  }

  // 4. 상세 보기 페이지에서 다시 리스트 목록으로 [뒤로가기] 처리
  qnaDetailSub
    ?.querySelector(".rightSB-detailBackBtn")
    ?.addEventListener("click", () => {
      qnaDetailSub?.classList.add("rightSB-hide");
      qnaListSub?.classList.remove("rightSB-hide");
      updateBottomButtons(); // 하단 버튼 레이아웃 원복
    });

    
  // 메인페이지에서 사이드바 닫는 기능
  const toggleBtn = document.querySelector(".rightSB-close");
  const sidebarWrapper = document.getElementById("rightSideBar-container");

  if (toggleBtn && sidebarWrapper) {
    toggleBtn.addEventListener("click", () => {
      // 버튼을 누를 때마다 클래스를 켜고 끕니다
      sidebarWrapper.classList.toggle("sidebar-collapsed");
    });
  }
}); // 👈 DOMContentLoaded 이벤트가 완전히 끝나는 중괄호입니다. 파일의 맨 마지막 줄이 됩니다.
