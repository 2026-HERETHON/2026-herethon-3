/// ==========================================
/// 1. 상단 만족도 별점 표현 구현 (가상 데이터 렌더링, 실수 보정)
/// ==========================================
function handleStarRating() {
  const scoreData = {
    night: 3.5,
    convenience: 4.2,
    atmosphere: 4.8,
  };

  Object.keys(scoreData).forEach((key) => {
    const score = scoreData[key];
    const container = document.querySelector(
      `.rightSB-${key} .rightSB-starRatingContainer`,
    );
    if (!container) return;

    // 1. 빈 별 5개 생성
    let emptyStarsHTML = "";
    for (let i = 0; i < 5; i++) {
      emptyStarsHTML += `<img src="./components/rightSideBar/rightSB-images/emptyStar.svg" alt="빈별" style="width:16px !important; height:16px !important; flex-shrink:0 !important; margin:0 !important; padding:0 !important;" />`;
    }

    // 2. 채워진 별 5개 생성
    let filledStarsHTML = "";
    for (let i = 0; i < 5; i++) {
      filledStarsHTML += `<img src="./components/rightSideBar/rightSB-images/filledStar.svg" alt="채워진별" style="width:16px !important; height:16px !important; flex-shrink:0 !important; margin:0 !important; padding:0 !important;" />`;
    }

    // 3. [★ 핵심] 오차 없는 정밀 픽셀 계산 공식 ★
    const starWidth = 16; // 별 한 개의 너비 (px)
    const gapWidth = 11; // 별 사이 간격 (px)

    const fullStars = Math.floor(score); // 꽉 찬 별의 개수 (예: 4.2점 -> 4개)
    const partialStarRatio = score % 1; // 마지막 소수점 별의 비율 (예: 4.2점 -> 0.2)

    let preciseWidth = 0;

    if (fullStars > 0) {
      // 꽉 찬 별의 너비 + 그 사이의 간격값 더하기
      preciseWidth += fullStars * starWidth + (fullStars - 1) * gapWidth;
    }

    if (partialStarRatio > 0) {
      // 만약 소수점 점수가 있다면, (이전 별과의 간격 11px) + (마지막 별 너비 16px * 비율)을 더해줍니다.
      preciseWidth +=
        (fullStars > 0 ? gapWidth : 0) + partialStarRatio * starWidth;
    }

    container.innerHTML = `
      <div class="rightSB-starRatingDisplay" style="position: relative !important; display: inline-flex !important; width: 124px !important; height: 16px !important; flex-shrink: 0 !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box !important;">
        <div class="rightSB-emptyStars" style="display: flex !important; gap: 11px !important; width: 124px !important; height: 16px !important; position: absolute !important; top: 0 !important; left: 0 !important; z-index: 1 !important; margin: 0 !important; padding: 0 !important;">
          ${emptyStarsHTML}
        </div>
        <div class="rightSB-filledStars" style="display: flex !important; gap: 11px !important; height: 16px !important; position: absolute !important; top: 0 !important; left: 0 !important; z-index: 2 !important; overflow: hidden !important; white-space: nowrap !important; pointer-events: none !important; margin: 0 !important; padding: 0 !important; width: ${preciseWidth}px !important;">
          <div style="display: flex !important; gap: 11px !important; width: 124px !important; height: 16px !important; flex-shrink: 0 !important; margin: 0 !important; padding: 0 !important;">
            ${filledStarsHTML}
          </div>
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
  // --- [A] 엘리먼트 수집 및 버튼 묶음 인덱싱 ---
  const navMenus = document.querySelectorAll(".rightSB-navbar-menu");
  const indicator = document.querySelector(".rightSB-navbar-indicator");
  const tabContents = document.querySelectorAll(".rightSB-tabContent");

  const reviewListSub = document.querySelector(".rightSB-reviewListSubPage");
  const reviewFormSub = document.querySelector(".rightSB-reviewFormSubPage");
  const qnaListSub = document.querySelector(".rightSB-qnaListSubPage");
  const qnaFormSub = document.querySelector(".rightSB-qnaFormSubPage");
  const qnaDetailSub = document.querySelector(".rightSB-qnaDetailSubPage");

  const allBtnGroups = document.querySelectorAll(
    ".rightSB-overlayWrapper > .rightSB-reviewBtn",
  );
  const reviewListBtnGroup = allBtnGroups[0];
  const qnaListBtnGroup = allBtnGroups[1];
  const formSubmitBtnGroup = allBtnGroups[2];

  // ==========================================
  // 로그인 상태 체크 및 탭 제어 기능
  // ==========================================
  function checkAuthAndToggleTabs() {
    // 🔓 실제 연동용: localStorage에 토큰이 있으면 true(로그인), 없으면 false(로그아웃)
    // const isTokenExist = localStorage.getItem("token")

    // 💡 [테스트 스위치] 원하는 상태를 주석 해제해서 확인해봐!
    const isTokenExist = true; // 🔓 로그인 상태 테스트할 때 주석 해제
    // const isTokenExist = false; // 🔒 로그아웃 상태 테스트할 때 주석 해제

    const contentContainer = document.querySelector(".rightSB-overlayWrapper");
    if (!contentContainer) return;

    const existingOverlay = contentContainer.querySelector(
      ".rightSB-auth-overlay",
    );
    if (existingOverlay) existingOverlay.remove();

    if (!isTokenExist) {
      const overlayHTML = `
        <div class="rightSB-auth-overlay">
          <img src="./components/rightSideBar/rightSB-images/lock.svg" alt="잠금" />
          <div class="rightSB-overlayMent">실제 거주 여성들의 솔직한 후기와 Q&A는<br>회원에게만 공개됩니다.</div>
          <div class="rightSB-overlayMentS">로그인하고 더 안전한 동네 정보를 확인해보세요.</div>
          <button class="rightSB-auth-loginBtn">로그인하러 가기</button>
        </div>
      `;
      contentContainer.insertAdjacentHTML("beforeend", overlayHTML);
    }
  }

  // --- [B] 통합 버튼 상태 제어 함수 (로그아웃 반투명 배경 연동본) ---
  function updateBottomButtons() {
    // 다 숨기기 초기화
    reviewListBtnGroup?.classList.add("rightSB-hide");
    qnaListBtnGroup?.classList.add("rightSB-hide");
    formSubmitBtnGroup?.classList.add("rightSB-hide");

    // 🎯 [여기 수정] 만약 로그아웃 블러 마스크가 켜져 있다면?
    // 버튼을 숨기지 말고, 기본 '후기 작성하기 / 이 동네 찜하기' 버튼 1쌍을 뒤에 투명하게 노출해 줍니다!
    const isOverlayOn =
      document.querySelector(".rightSB-auth-overlay") !== null;
    if (isOverlayOn) {
      reviewListBtnGroup?.classList.remove("rightSB-hide"); // 🔓 버튼 1쌍을 켜두어 마스크 뒤에 비치게 만듦!
      return;
    }

    // 아래는 로그인 상태일 때 원래 도는 로직 (그대로 유지)
    const activeTab = document.querySelector(
      ".rightSB-tabContent.rightSB-activeContent",
    );
    if (!activeTab) return;

    if (activeTab.id === "tabContentReview") {
      if (reviewFormSub && !reviewFormSub.classList.contains("rightSB-hide")) {
        formSubmitBtnGroup?.classList.remove("rightSB-hide");
      } else {
        reviewListBtnGroup?.classList.remove("rightSB-hide");
      }
    } else if (activeTab.id === "tabContentQnA") {
      if (qnaFormSub && !qnaFormSub.classList.contains("rightSB-hide")) {
        formSubmitBtnGroup?.classList.remove("rightSB-hide");
      } else {
        qnaListBtnGroup?.classList.remove("rightSB-hide");
      }
    }
  }

  // 데이터 로드 및 초기화 트리거 순서 배치
  handleStarRating();
  checkAuthAndToggleTabs();
  updateBottomButtons();

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
          reviewTab.classList.add("rightSB-activeContent"); // 🎯 오타 완벽 제거 완료!
          reviewFormSub?.classList.add("rightSB-hide");
          reviewListSub?.classList.remove("rightSB-hide");
        }
      } else if (currentMenu.classList.contains("rightSB-QnASelected")) {
        const qnaTab = document.getElementById("tabContentQnA");
        if (qnaTab) {
          qnaTab.classList.add("rightSB-activeContent");
          qnaFormSub?.classList.add("rightSB-hide");
          qnaDetailSub?.classList.add("rightSB-hide");
          qnaListSub?.classList.remove("rightSB-hide");
        }
      }
      updateBottomButtons();
    });
  });

  const activeMenu = document.querySelector(
    ".rightSB-navbar-menu.rightSB-beBold",
  );
  if (activeMenu) {
    setTimeout(() => updateIndicator(activeMenu), 50);
  }

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
    rightSBstar.innerHTML = `<div class="rightSBstar-empty"></div><div class="rightSBstar-fill"></div>`;
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

  // --- [F] 서브페이지 라우팅 및 독립 버튼 유기적 매핑 ---
  reviewListBtnGroup
    ?.querySelector(".go-to-review-form")
    ?.addEventListener("click", () => {
      reviewListSub?.classList.add("rightSB-hide");
      reviewFormSub?.classList.remove("rightSB-hide");
      updateBottomButtons();
    });

  qnaListBtnGroup
    ?.querySelector(".go-to-review-form")
    ?.addEventListener("click", () => {
      qnaListSub?.classList.add("rightSB-hide");
      qnaFormSub?.classList.remove("rightSB-hide");
      updateBottomButtons();
    });

  const backToMainList = () => {
    const isReview = document
      .getElementById("tabContentReview")
      ?.classList.contains("rightSB-activeContent");

    if (isReview) {
      const textarea = reviewFormSub.querySelector(".rightSB-reviewContent");
      if (textarea) textarea.value = "";
      const charSpan = reviewFormSub.querySelector(
        ".rightSB-currentChars > span",
      );
      if (charSpan) charSpan.textContent = "0";

      const agreeCheckbox = reviewFormSub.querySelector("#check-agree");
      if (agreeCheckbox) agreeCheckbox.checked = false;

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

      reviewFormSub?.classList.add("rightSB-hide");
      reviewListSub?.classList.remove("rightSB-hide");
    } else {
      const textarea = qnaFormSub.querySelector(".rightSB-reviewContent");
      if (textarea) textarea.value = "";
      const charSpan = qnaFormSub.querySelector(".rightSB-currentChars > span");
      if (charSpan) charSpan.textContent = "0";

      const agreeCheckbox = qnaFormSub.querySelector("#check-agree2");
      if (agreeCheckbox) agreeCheckbox.checked = false;

      qnaFormSub?.classList.add("rightSB-hide");
      qnaListSub?.classList.remove("rightSB-hide");
    }
    updateBottomButtons();
  };

  reviewFormSub
    ?.querySelector(".rightSB-reviewTitle img")
    ?.addEventListener("click", backToMainList);
  qnaFormSub
    ?.querySelector(".rightSB-reviewTitle img")
    ?.addEventListener("click", backToMainList);
  formSubmitBtnGroup
    ?.querySelector(".rightSB-reviewCancleBtn")
    ?.addEventListener("click", backToMainList);

  // --- [찜하기 기능] ---
  let isWished = false;
  document
    .querySelectorAll(".wish-btn, .rightSB-regionHeartImg")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        isWished = !isWished;

        // 🎯 [수정] 문자열 하나로 묶어서 두 종류의 하트 이미지를 모두 수집!
        const allHeartImgs = document.querySelectorAll(
          ".wish-btn .rightSB-heartImg, .rightSB-regionHeartImg",
        );

        allHeartImgs.forEach((img) => {
          // 💡 찜하기 상태에 따라 이미지 경로 일괄 교체
          img.src = isWished
            ? "./components/rightSideBar/rightSB-images/fullHeart.svg"
            : "./components/rightSideBar/rightSB-images/heart.svg";
        });

        alert(
          isWished
            ? "❤️ 이 동네가 찜 목록에 추가되었습니다."
            : "💔 찜 목록에서 제외되었습니다.",
        );
      });
    });

  // --- [G] 등록하기 처리 ---
  formSubmitBtnGroup
    ?.querySelector(".rightSB-reviewSubmitBtn")
    ?.addEventListener("click", () => {
      const activeTab = document.querySelector(
        ".rightSB-tabContent.rightSB-activeContent",
      );
      if (!activeTab) return;

      if (activeTab.id === "tabContentReview") {
        const ratings = reviewFormSub.querySelectorAll(".rightSB-rating");
        const scores = { night: 0, convenience: 0, atmosphere: 0 };
        ratings.forEach((box) => {
          const type = box.getAttribute("data-type");
          const score = parseFloat(box.getAttribute("data-score")) || 0;
          if (type) scores[type] = score;
        });

        const textarea = reviewFormSub.querySelector(".rightSB-reviewContent");
        const text = textarea.value;
        const agreeCheckbox = reviewFormSub.querySelector("#check-agree");

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
        if (!agreeCheckbox.checked) {
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
      } else if (activeTab.id === "tabContentQnA") {
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

  // --- [H] 스크롤바 바닥 감지 ---
  const scrollWrapper = document.querySelector(".rightSB-tabContentWrapper");
  const reviewContainer = document.querySelector(".rightSB-reviewContainer");

  if (scrollWrapper && reviewContainer) {
    scrollWrapper.addEventListener("scroll", () => {
      const isBottom =
        scrollWrapper.scrollTop + scrollWrapper.clientHeight >=
        scrollWrapper.scrollHeight - 2;
      if (isBottom) reviewContainer.classList.add("rightSB-showBorder");
      else reviewContainer.classList.remove("rightSB-showBorder");
    });
    setTimeout(() => {
      if (scrollWrapper.clientHeight >= scrollWrapper.scrollHeight) {
        reviewContainer.classList.add("rightSB-showBorder");
      }
    }, 100);
  }

  // --- [I] 후기 리스트 동적 렌더링 모듈 ---
  const mockReviewsFromServer = [
    {
      id: 101,
      nickname: "별빛여행자",
      residence: "상계동 거주 중",
      date: "3일 전",
      score: 3.5,
      content:
        "밤에 귀가할 때 가로등이 많아서 안심돼요. 주변에 편의점, 병원도 가까워서 생활하기 편합니다.",
      likes: 12,
    },
    {
      id: 102,
      nickname: "현실자취생",
      residence: "상계동 거주 중",
      date: "1주 전",
      score: 2.0,
      content:
        "역이 가까워 이동하기는 정말 편해요.<br>다만 늦은 밤에는 골목보다는 큰길로 다니는 편입니다.",
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
    {
      id: 104,
      nickname: "따뜻한 봄날",
      residence: "상계동 거주 중",
      date: "1주 전",
      score: 3.9,
      content:
        "조용한 주택가라 좋고, 비상벨 설치도 잘 되어 있어요. 다만 일부 골목은 조금 어두워요.",
      likes: 3,
    },
    {
      id: 104,
      nickname: "따뜻한 봄날",
      residence: "상계동 거주 중",
      date: "1주 전",
      score: 3.9,
      content:
        "조용한 주택가라 좋고, 비상벨 설치도 잘 되어 있어요. 다만 일부 골목은 조금 어두워요.",
      likes: 3,
    },
    {
      id: 104,
      nickname: "따뜻한 봄날",
      residence: "상계동 거주 중",
      date: "1주 전",
      score: 3.9,
      content:
        "조용한 주택가라 좋고, 비상벨 설치도 잘 되어 있어요. 다만 일부 골목은 조금 어두워요.",
      likes: 3,
    },
  ];

  function renderReviews(reviews) {
    const container = document.getElementById("rightSB-reviewCardContainer");
    if (!container) return;
    container.innerHTML = "";

    // 데이터가 하나도 없을 때 예외 처리
    if (reviews.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:#7b7578; padding:4px 0;">첫 번째 후기를 남겨보세요!</div>`;
      return;
    }

    reviews.forEach((review) => {
      let emptyStarsHTML = "";
      let filledStarsHTML = "";
      for (let i = 0; i < 5; i++) {
        emptyStarsHTML += `<img src="./components/rightSideBar/rightSB-images/emptyStar.svg" class="rightSB-cardStarIcon" />`;
        filledStarsHTML += `<img src="./components/rightSideBar/rightSB-images/filledStar.svg" class="rightSB-cardStarIcon" />`;
      }
      const roundedScore = Math.round(review.score * 2) / 2;
      const filledStarsCount = Math.floor(roundedScore);
      const hasHalfStar = roundedScore % 1 !== 0;

      let totalWidth = filledStarsCount * 11 + filledStarsCount * 4;
      if (hasHalfStar) {
        totalWidth += 5.5;
      } else if (filledStarsCount > 0) {
        totalWidth -= 4;
      }

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
            
            <button class="rightSB-cardLikeBtn" data-liked="false" data-base-likes="${review.likes}">
              <img src="./components/rightSideBar/rightSB-images/thumbsUp.svg" class="rightSB-likeImg" style="width:11px; height:10px;" />
              <span class="rightSB-likeCount">${review.likes}</span>
            </button>
          </div>
        </div>
      `;
      container.insertAdjacentHTML("beforeend", cardHTML);
    });
    // 생성된 모든 후기 카드의 좋아요 버튼에 개별 클릭 이벤트 바인딩하기
    const likeButtons = container.querySelectorAll(".rightSB-cardLikeBtn");

    likeButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        // 이벤트 버블링 방지 (카드를 클릭했을 때 다른 서브페이지로 튀는 현상 막기)
        e.stopPropagation();

        const isLiked = btn.getAttribute("data-liked") === "true";
        const baseLikes = parseInt(btn.getAttribute("data-base-likes"), 10);
        const countSpan = btn.querySelector(".rightSB-likeCount");
        const imgIcon = btn.querySelector(".rightSB-likeImg");

        if (!isLiked) {
          // 1. 👍 좋아요 활성화 상태 전환
          btn.setAttribute("data-liked", "true");
          countSpan.textContent = baseLikes + 1; // 숫자 1 올리기
          imgIcon.src =
            "./components/rightSideBar/rightSB-images/filledThumbsUp.svg"; // 채워진 따봉 경로

          // 🎨 디자인 변경
          btn.style.borderRadius = "20px";
          btn.style.border = "1px solid var(--Color-Blue900, #1077FF)";
          btn.style.background = "var(--Color-Blue200, #C4ECFE)";
          btn.style.color = "var(--Color-Blue900, #1077FF)"; // 글자도 세트로 파랗게 조율
        } else {
          // 2. 👎 좋아요 다시 취소 토글 상태 전환
          btn.setAttribute("data-liked", "false");
          countSpan.textContent = baseLikes; // 원래 숫자로 원복
          imgIcon.src = "./components/rightSideBar/rightSB-images/thumbsUp.svg"; // 빈 따봉 경로 원복

          // 🎨 디자인 원래대로 복귀
          btn.style.border = "none";
          btn.style.background = "var(--GrayScale-100, #f0edee)";
          btn.style.color = "var(--GrayScale-800, #5b5658)";
        }
      });
    });
  }
  // 함수 실행시켜서 화면에 카드들 띄우기!
  renderReviews(mockReviewsFromServer);
  // --- [J] Q&A 리스트 렌더링 및 상세페이지 유기적 라우팅 통합 모듈 ---
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

  function renderQnas(qnas) {
    const container = document.getElementById("rightSB-qnaCardContainer");
    if (!container) return;

    //초기화
    container.innerHTML = "";

    // 질문이 없을 때 처리
    if (qnas.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:#7b7578; padding:24px 0;">등록된 질문이 없습니다. 첫 질문을 던져보세요!</div>`;
      return;
    }

    qnas.forEach((qna) => {
      const qnaHTML = `
        <div class="rightSB-qnaCard" data-id="${qna.id}">
          <div class="rightSB-qnaLeft"><div class="rightSB-qnaAvatar">Q</div><span class="rightSB-qnaQuestion">${qna.question}</span></div>
          <div class="rightSB-qnaRight"><span class="rightSB-qnaAnswerText">답변 ${qna.answerCount}</span></div>
        </div>`;
      container.insertAdjacentHTML("beforeend", qnaHTML);
    });

    container.querySelectorAll(".rightSB-qnaCard").forEach((card) => {
      card.addEventListener("click", () => {
        const qnaId = card.getAttribute("data-id");
        document.getElementById("qnaDetailTitle").textContent =
          card.querySelector(".rightSB-qnaQuestion").textContent;

        const ansContainer = document.getElementById("qnaAnswerContainer");
        if (ansContainer) {
          ansContainer.innerHTML = "";
          (mockAnswersFromServer[qnaId] || []).forEach((ans) => {
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
        qnaListSub?.classList.add("rightSB-hide");
        qnaDetailSub?.classList.remove("rightSB-hide");
        updateBottomButtons();
      });
    });
  }
  renderQnas(mockQnasFromServer);

  qnaDetailSub
    ?.querySelector(".rightSB-detailBackBtn")
    ?.addEventListener("click", () => {
      qnaDetailSub?.classList.add("rightSB-hide");
      qnaListSub?.classList.remove("rightSB-hide");
      updateBottomButtons();
    });

  // --- [K] 차트 렌더링 ---
  const mockGraphDataFromServer = {
    cctv: 85,
    streetLight: 70,
    police: 45,
    emergencyBell: 60,
    crimeZone: 75,
    womanSafety: 60,
  };
  function renderSafetyChart(data) {
    const ctx = document.getElementById("safetyRadarChart");
    if (!ctx) return;
    new Chart(ctx, {
      type: "radar",
      data: {
        labels: [
          "CCTV",
          "가로등",
          "파출소",
          "비상벨",
          ["범죄주의", "구간"],
          ["여성 밤길", "안전"],
        ],
        datasets: [
          {
            data: [
              data.cctv,
              data.streetLight,
              data.police,
              data.emergencyBell,
              data.crimeZone,
              data.womanSafety,
            ],
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

  // 사이드바 접기 토글
  document.querySelector(".rightSB-close")?.addEventListener("click", () => {
    document
      .getElementById("rightSideBar-container")
      ?.classList.toggle("sidebar-collapsed");
  });

  // 1. 우측 사이드바 내부의 로그인 실행 버튼 타겟팅 (프로젝트 실제 클래스에 맞게 확인해줘!)
  const openLoginBtn = document.querySelector(".rightSB-auth-loginBtn");

  if (openLoginBtn) {
    openLoginBtn.addEventListener("click", (e) => {
      e.preventDefault(); // 기본 a태그 이동 기능 막기

      const overlay = document.getElementById("loginPopupOverlay");
      const contentBox = document.getElementById("loginPopupContent");

      // 2. 외부 login.html 파일 가져오기
      fetch("./login/login.html")
        .then((response) => response.text())
        .then((htmlData) => {
          // 3. 팝업 상자 안에 소스 삽입
          contentBox.innerHTML = htmlData;

          // 4. 숨겨진 팝업 노출 및 기본 로그인 크기로 초기 설정 보장
          contentBox.style.width = "518px";
          contentBox.style.height = "689px";
          overlay.classList.remove("popup-hide");

          // 5. ⭐️ 중요: HTML이 삽입된 직후에 login.js에 정의된 이벤트들 연결시키기!
          if (typeof initAuthEvents === "function") {
            initAuthEvents();
          }

          // 6. [X] 닫기 버튼 기능 연결
          const closeBtns = contentBox.querySelectorAll(".login-closeBtn img");
          closeBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
              overlay.classList.add("popup-hide");
            });
          });
        })
        .catch((err) => console.error("팝업 로드 중 에러 발생:", err));
    });
  }

  // 7. 어두운 배경 클릭 시 팝업 닫기
  const overlay = document.getElementById("loginPopupOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.add("popup-hide");
      }
    });
  }

  // components/rightSideBar/rightSideBar.js 내부 DOMContentLoaded 안쪽에 추가

  // 🎯 우측 사이드바의 [점수 기준 보기] 버튼 타겟팅
  const openScoreInfoBtn = document.querySelector(
    ".rightSB-safetyScoreContainer button",
  );

  if (openScoreInfoBtn) {
    openScoreInfoBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const overlay = document.getElementById("loginPopupOverlay");
      const contentBox = document.getElementById("loginPopupContent");

      // 1. 외부 login.html 파일 가져오기 (점수 기준 보기가 포함되어 있음!)
      fetch("./login/login.html")
        .then((response) => {
          if (!response.ok) throw new Error("네트워크 응답에 문제가 있습니다.");
          return response.text();
        })
        .then((htmlData) => {
          // 2. 팝업 상자 안에 소스 삽입
          contentBox.innerHTML = htmlData;

          // 3. ⭐️ 점수 기준 보기 전용 규격(518px * 733px) 주입 및 노출
          contentBox.style.width = "518px";
          contentBox.style.height = "733px";
          overlay.classList.remove("popup-hide");

          // 4. ⭐️ 중요: HTML이 삽입된 직후 login.js에 추가할 점수 팝업 초기화 함수 실행!
          if (typeof initScoreInfoEvent === "function") {
            initScoreInfoEvent();
          }

          // 5. [X] 닫기 버튼 기능 결합
          const closeBtns = contentBox.querySelectorAll(".login-closeBtn img");
          closeBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
              overlay.classList.add("popup-hide");
            });
          });
        })
        .catch((err) =>
          console.error("점수 기준 팝업 로드 중 에러 발생:", err),
        );
    });
  }
});
