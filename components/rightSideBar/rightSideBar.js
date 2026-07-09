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
      emptyStarsHTML += `<img src="./rightSB-images/emptyStar.svg" alt="빈별" style="width:16px !important; height:16px !important; flex-shrink:0 !important; margin:0 !important; padding:0 !important;" />`;
    }

    let filledStarsHTML = "";
    for (let i = 0; i < 5; i++) {
      filledStarsHTML += `<img src="./rightSB-images/filledStar.svg" alt="채워진별" style="width:16px !important; height:16px !important; flex-shrink:0 !important; margin:0 !important; padding:0 !important;" />`;
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

  // --- [B] 통합 버튼 상태 제어 함수 (핵심 기능) ---
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
        formSubmitBtnGroup?.classList.remove("rightSB-hide"); // 2페이지 폼 작성 중
      } else {
        reviewListBtnGroup?.classList.remove("rightSB-hide"); // 1페이지 목록 상태
      }
    } else if (activeTab.id === "tabContentQnA") {
      // Q&A 탭일 때
      if (qnaFormSub && !qnaFormSub.classList.contains("rightSB-hide")) {
        formSubmitBtnGroup?.classList.remove("rightSB-hide"); // 4페이지 폼 작성 중
      } else {
        qnaListBtnGroup?.classList.remove("rightSB-hide"); // 3페이지 목록 상태
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
    const activeTab = document.querySelector(
      ".rightSB-tabContent.rightSB-activeContent",
    );
    if (activeTab.id === "tabContentReview") {
      reviewFormSub?.classList.add("rightSB-hide");
      reviewListSub?.classList.remove("rightSB-hide");
    } else {
      qnaFormSub?.classList.add("rightSB-hide");
      qnaListSub?.classList.remove("rightSB-hide");
    }
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

  // 1, 2번째 버튼 그룹 내 [이 동네 찜하기] 공통 처리
  document.querySelectorAll(".wish-btn").forEach((btn) => {
    btn.addEventListener("click", () =>
      alert("❤️ 이 동네가 찜 목록에 추가되었습니다!"),
    );
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

        const text = reviewFormSub.querySelector(
          ".rightSB-reviewContent",
        ).value;
        const isAgreed = reviewFormSub.querySelector("#check-agree").checked;

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
        backToMainList();
      }
      // [CASE 2: Q&A 질문 등록 전송 및 밸리데이션]
      else if (activeTab.id === "tabContentQnA") {
        const text = qnaFormSub.querySelector(".rightSB-reviewContent").value;
        const isAgreed = qnaFormSub.querySelector("#check-agree2").checked;

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
});
