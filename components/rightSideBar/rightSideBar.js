/// 별점 JS

function handleStarRating() {
  const scoreData = {
    night: 4.2,
    convenience: 4.0,
    atmosphere: 4.1,
  }; //가상 데이터

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

//// 후기 작성 nav 바 이동

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
      // 모든 콘텐츠 영역을 한 번 숨긴 후
      tabContents.forEach((content) =>
        content.classList.remove("rightSB-activeContent"),
      );

      // ★ [수정] HTML에 적어두신 ID명(tabContentReview, tabContentQnA)과 정확하게 일치시켰습니다!
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
