// --- [K] 그래프 차트 렌더링 및 업데이트 ---
let myRadarChart = null;

// 마지막으로 클릭한 동네 정보를 기억해둠.
// 후기 등록/좋아요 처리 후 "지금 보고 있는 사이드바"를 새로고침할 때 필요함.
let currentSidebarState = {
  detailDongName: null,
  detailDongId: null,
  legalDongName: null,
  legalDongId: null,
  // 지금 상세보기로 열려있는 질문의 id를 기억해뒀다가 답변 등록 버튼을
  // 눌렀을 때 어느 질문에 답변을 다는 건지 알 수 있게 함.
  currentQuestionId: null,
};

// Django CSRF 토큰을 쿠키에서 꺼내는 헬퍼 (list.html의 getCookie와 동일한 로직)
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

// 로그인 팝업 열기.
// 우측 사이드바의 로그인 버튼 클릭, 그리고 비로그인 상태에서 찜하기 등
// 로그인이 필요한 동작을 시도했을 때 공통으로 호출.
// (기존 .rightSB-auth-loginBtn 핸들러에 있던 팝업 로드 로직을 그대로 함수로 뺀 것)
function openLoginPopup() {
  const overlay = document.getElementById("loginPopupOverlay");
  const contentBox = document.getElementById("loginPopupContent");
  if (!overlay || !contentBox) {
    console.error("로그인 팝업 요소를 찾을 수 없습니다.");
    return;
  }

  fetch("./login/login.html")
    .then((response) => response.text())
    .then((htmlData) => {
      contentBox.innerHTML = htmlData;
      contentBox.style.width = "518px";
      contentBox.style.height = "689px";
      overlay.classList.remove("popup-hide");

      // HTML 삽입 직후 login.js의 이벤트 연결
      if (typeof initAuthEvents === "function") {
        initAuthEvents();
      }

      // [X] 닫기 버튼 기능 연결
      const closeBtns = contentBox.querySelectorAll(".login-closeBtn img");
      closeBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          overlay.classList.add("popup-hide");
        });
      });
    })
    .catch((err) => console.error("팝업 로드 중 에러 발생:", err));
}

function renderSafetyChart(fields) {
  if (!fields) return;

  // 1. 백엔드 데이터(fields)를 100점 만점 기준으로 변환 (명세서 역방향 공식 포함)
  const chartCctv = Math.min((fields.cctv_count || 0) / 4, 100);
  const chartLight = Math.min((fields.light_count || 0) / 5, 100);
  const chartPolice = Math.min((fields.police_count || 0) * 50, 100);
  const chartBell = Math.min((fields.bell_count || 0) * 10, 100);
  const crimeGradeScore = fields.crime_zone_grade
    ? (11 - parseFloat(fields.crime_zone_grade)) * 10
    : 50;
  const safetyGradeScore = fields.night_safety_grade
    ? (11 - parseFloat(fields.night_safety_grade)) * 10
    : 50;

  const newData = [
    chartCctv,
    chartLight,
    chartPolice,
    chartBell,
    crimeGradeScore,
    safetyGradeScore,
  ];

  // 2. 이미 차트가 존재한다면 새로 그리지 않고 데이터만 갈아끼운 뒤 부드럽게 업데이트!
  if (myRadarChart) {
    myRadarChart.data.datasets[0].data = newData;
    myRadarChart.update();
    return; // 업데이트를 마쳤으니 여기서 함수 종료
  }

  const ctx = document.getElementById("safetyRadarChart");
  if (!ctx) return;

  myRadarChart = new Chart(ctx, {
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
          data: newData,
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
      // 차트 전체 패딩을 주어 글자가 외각 경계선에 잘리는 것을 방지
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

// --- [I] 후기 카드 좋아요 버튼: 이벤트 위임(delegation) 바인딩 ---
// 예전엔 reviews/list.html에서 data-* 값만 뽑아 JS가 카드 HTML을 다시
// 조립했는데, 이건 사실상 JSON API를 HTML로 포장한 것과 다를 게 없다는
// 지적을 받아 구조를 바꿈. 이제 reviews/list.html 자체가
// 사이드바에 실제로 보이는 스타일(class="rightSB-reviewCard" 등) 그대로
// 서버에서 렌더링되고, JS는 그 결과물(#rightSB-reviewCardContainer의 HTML)을
// 그대로 옮겨 붙이기만 함. 카드가 서버 렌더링으로 통째로 갈아끼워지므로
// 카드마다 매번 새로 리스너를 붙이는 대신, 컨테이너에 한 번만 이벤트 위임을
// 걸어두고 클릭이 버블링돼 올라오면 그때 실제 버튼을 찾음
function bindReviewLikeDelegation() {
  const container = document.getElementById("rightSB-reviewCardContainer");
  if (!container || container.dataset.likeBound === "true") return;
  container.dataset.likeBound = "true";

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".rightSB-cardLikeBtn");
    if (!btn) return;
    // 이벤트 버블링 방지 (카드를 클릭했을 때 다른 서브페이지로 튀는 현상 막기)
    e.stopPropagation();

    const reviewId = btn.dataset.reviewId;
    if (!reviewId) return;

    const countSpan = btn.querySelector(".rightSB-likeCount");
    const imgIcon = btn.querySelector(".rightSB-likeImg");

    // 실제 /reviews/<review_id>/like/ 로 POST해서 서버가 돌려주는
    // 진짜 liked/like_count 값으로 갱신함
    fetch(`/reviews/${reviewId}/like/`, {
      method: "POST",
      credentials: "same-origin", // 로그인 세션 쿠키를 같이 보내야 인증됨
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`좋아요 처리 실패 (상태코드 ${res.status})`);
        }
        return res.json(); // {"liked": true/false, "like_count": int}
      })
      .then((data) => {
        btn.setAttribute("data-liked", data.liked ? "true" : "false");
        if (countSpan) countSpan.textContent = data.like_count;
        if (imgIcon) {
          imgIcon.src = data.liked
            ? "./components/rightSideBar/rightSB-images/filledThumbsUp.svg"
            : "./components/rightSideBar/rightSB-images/thumbsUp.svg";
        }

        if (data.liked) {
          // 좋아요 활성화 디자인
          btn.style.borderRadius = "20px";
          btn.style.border = "1px solid var(--Color-Blue900, #1077FF)";
          btn.style.background = "var(--Color-Blue200, #C4ECFE)";
          btn.style.color = "var(--Color-Blue900, #1077FF)";
        } else {
          // 좋아요 해제 디자인 (원래대로)
          btn.style.border = "none";
          btn.style.background = "var(--GrayScale-100, #f0edee)";
          btn.style.color = "var(--GrayScale-800, #5b5658)";
        }
      })
      .catch((err) => {
        console.error("좋아요 처리 중 오류:", err);
        alert("좋아요 처리에 실패했어요. 로그인 상태를 확인해주세요.");
      });
  });
}

// =====================================================================
// 후기 목록 + 영역별 만족도 새로고침
// updateSidebarTitle 최초 진입 시에도 쓰고, 후기 등록 성공 직후에도
// 똑같이 다시 불러서 화면을 최신 상태로 맞추는 데 재사용함
// =====================================================================
function refreshReviewSection(legalDongId, legalDongName) {
  if (!legalDongId) return Promise.resolve();

  const reviewPageUrl = `/reviews/grid/${legalDongId}/`;

  return fetch(reviewPageUrl)
    .then((response) => {
      // 방어 코드: 404 에러 등이 나면 파싱하지 않고 바로 에러를 던짐
      if (!response.ok) {
        throw new Error(`HTTP 에러 발생! 상태코드: ${response.status}`);
      }
      return response.text();
    })
    .then((htmlText) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      // 영역별 만족도 3개 숫자(집계 통계)만 data-*로 읽어서 별점 위젯을 그림
      const summaryEl = doc.getElementById("rating-summary");
      const nightScore = parseFloat(summaryEl?.dataset.night) || 0;
      const convenienceScore = parseFloat(summaryEl?.dataset.amenity) || 0;
      const atmosphereScore = parseFloat(summaryEl?.dataset.mood) || 0;

      // "영역별 만족도" -> "{법정동} 일대 영역별 만족도"
      const satisfactionTitleEl = document.querySelector(
        ".rightSB-satisfactionTitle",
      );
      if (satisfactionTitleEl && legalDongName) {
        satisfactionTitleEl.textContent = `${legalDongName} 일대 영역별 만족도`;
      }

      console.log("list.html에서 받은 진짜 만족도 점수:", {
        nightScore,
        convenienceScore,
        atmosphereScore,
      });
      handleStarRating(nightScore, convenienceScore, atmosphereScore);

      // =====================================================================
      // 후기 카드 목록: 값을 뽑아 JS가 재조립하지 않고,
      // Django가 렌더링한 #rightSB-reviewCardContainer의 HTML을 그대로 옮겨 붙임
      // =====================================================================
      const serverContainer = doc.getElementById("rightSB-reviewCardContainer");
      const localContainer = document.getElementById(
        "rightSB-reviewCardContainer",
      );
      if (localContainer && serverContainer) {
        localContainer.innerHTML = serverContainer.innerHTML;
      }
      bindReviewLikeDelegation();

      const reviewCount = parseInt(serverContainer?.dataset.count, 10) || 0;
      const reviewCountEl = document.querySelector(
        ".rightSB-reviewSelected span",
      );
      if (reviewCountEl) reviewCountEl.textContent = `(${reviewCount})`;

      console.log(`서버가 렌더링한 후기 ${reviewCount}건을 그대로 옮겨 붙임`);
      return reviewCount;
    })
    .catch((err) => {
      console.warn(
        "법정동 데이터가 DB에 없거나 로드되지 않았습니다. 기본 별점(3.5점대)으로 임시 시연합니다.",
        err,
      );
      // DB에 진짜 데이터가 없어서 404가 날 때는 0점으로 비우는 대신,
      // 시연 화면이 자연스럽도록 기본 별점을 세팅해 줌.
      handleStarRating(3.8, 4.2, 4.0);
      const satisfactionTitleEl = document.querySelector(
        ".rightSB-satisfactionTitle",
      );
      if (satisfactionTitleEl && legalDongName) {
        satisfactionTitleEl.textContent = `${legalDongName} 일대 영역별 만족도`;
      }
      // 후기 fetch 자체가 실패한 경우이므로 카드/개수도 빈 상태로 맞춰줌
      const localContainer = document.getElementById(
        "rightSB-reviewCardContainer",
      );
      if (localContainer) {
        localContainer.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; text-align:center; color:#7b7578;">첫 번째 후기를 남겨보세요!</div>`;
      }
      const reviewCountEl = document.querySelector(
        ".rightSB-reviewSelected span",
      );
      if (reviewCountEl) reviewCountEl.textContent = `(0)`;
    });
}

// =====================================================================
// Q&A 카드 클릭(상세 열기) 이벤트 위임 바인딩
// 후기 좋아요 버튼과 동일한 이유로, 카드 마크업 자체는 이제 서버가
// 렌더링하므로 컨테이너에 한 번만 위임 리스너를 걸어둠
// =====================================================================
function bindQnaCardDelegation() {
  const container = document.getElementById("rightSB-qnaCardContainer");
  if (!container || container.dataset.clickBound === "true") return;
  container.dataset.clickBound = "true";

  container.addEventListener("click", (e) => {
    const card = e.target.closest(".rightSB-qnaCard");
    if (!card) return;
    const qnaId = card.getAttribute("data-id");
    openQuestionDetail(qnaId);
  });
}

// 질문 상세 + 답변 목록을 /qna/question/<id>/ 응답에서
function openQuestionDetail(questionId) {
  if (!questionId) return;

  // 답변 등록 버튼이 "지금 어느 질문에 답할지" 알 수 있도록 기억
  currentSidebarState.currentQuestionId = questionId;

  const titleEl = document.getElementById("qnaDetailTitle");
  const ansContainer = document.getElementById("qnaAnswerContainer");
  const ansCountEl = document.getElementById("qnaDetailAnsCount");

  fetch(`/qna/question/${questionId}/?fragment=1`)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`질문 상세 fetch 실패 (상태코드 ${res.status})`);
      }
      return res.text();
    })
    .then((htmlText) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      // 질문 본문은 실제로 렌더링된 요소의 텍스트를 그대로 읽어서 씀
      const questionText =
        doc.getElementById("qna-question-content")?.textContent || "";
      if (titleEl) titleEl.textContent = questionText;

      // 답변 카드 목록: 값을 뽑아 JS가 재조립하지 않고,
      // Django가 렌더링한 #qnaAnswerContainer의 HTML을 그대로 옮겨 붙임
      const serverAnswerContainer = doc.getElementById("qnaAnswerContainer");
      if (ansContainer && serverAnswerContainer) {
        ansContainer.innerHTML = serverAnswerContainer.innerHTML;
      }

      const answerCount =
        parseInt(serverAnswerContainer?.dataset.count, 10) || 0;
      if (ansCountEl) ansCountEl.textContent = `답변 ${answerCount}`;
    })
    .catch((err) => {
      console.error("질문 상세 불러오기 실패:", err);
      if (titleEl) titleEl.textContent = "질문을 불러오지 못했어요.";
      if (ansContainer) ansContainer.innerHTML = "";
    });

  document
    .querySelector(".rightSB-qnaListSubPage")
    ?.classList.add("rightSB-hide");
  document
    .querySelector(".rightSB-qnaFormSubPage")
    ?.classList.add("rightSB-hide");
  document
    .querySelector(".rightSB-qnaDetailSubPage")
    ?.classList.remove("rightSB-hide");
  // DOMContentLoaded 안에서만 정의되는 updateBottomButtons를
  // window.__updateBottomButtons로 노출해뒀으므로 그걸 통해 호출
  window.__updateBottomButtons?.();
}

// =====================================================================
// Q&A 답변 작성 - 사이드바 입력창 /qna/question/<id>/answer/ 실제 POST
// =====================================================================
function bindAnswerSubmit() {
  const btn = document.querySelector(".rightSB-answerSubmitBtn");
  const input = document.querySelector(".rightSB-answerInput");
  if (!btn || !input || btn.dataset.clickBound === "true") return;
  btn.dataset.clickBound = "true";

  const submitAnswer = () => {
    const questionId = currentSidebarState.currentQuestionId;
    const content = input.value.trim();
    if (!questionId || !content) return;

    btn.disabled = true;

    fetch(`/qna/question/${questionId}/answer/`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: new URLSearchParams({ answer_content: content }),
    })
      .then((res) => {
        // answer_create는 @login_required라서, 로그인 세션이 없으면
        // qna:detail이 아니라 로그인 페이지로 리다이렉트됨
        if (res.url.includes("/accounts/login/")) {
          alert("로그인이 필요해요. 다시 로그인해주세요.");
          return;
        }
        // accounts.decorators.verified_residence_required가 실거주지 인증이
        // 안 됐거나 인증한 동네와 이 질문의 동네가 다르면 403으로 내려줌
        if (res.status === 403) {
          alert(
            "실거주지 인증이 필요해요. 마이페이지에서 실거주지 인증을 해주세요.",
          );
          return;
        }
        if (!res.ok) {
          alert("답변 등록 중 오류가 발생했어요.");
          return;
        }
        input.value = "";
        // 방금 등록한 답변까지 반영된 최신 상세를 다시 그림
        openQuestionDetail(questionId);
        alert("답변이 등록되었습니다.");
      })
      .catch((err) => {
        console.error("답변 등록 중 오류:", err);
        alert("답변 등록 중 오류가 발생했어요.");
      })
      .finally(() => {
        btn.disabled = false;
      });
  };

  btn.addEventListener("click", submitAnswer);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitAnswer();
  });
}

// =====================================================================
// Q&A 검색창 - 질문 제목
// =====================================================================
function bindQnaSearch() {
  const wrapper = document.querySelector(".rightSB-qnaSearchWrapper");
  const input = wrapper?.querySelector("input");
  const btn = wrapper?.querySelector(".rightSB-qnaSearchBtn");
  if (!input || input.dataset.searchBound === "true") return;
  input.dataset.searchBound = "true";

  const applyQnaSearch = () => {
    const keyword = input.value.trim().toLowerCase();
    const container = document.getElementById("rightSB-qnaCardContainer");
    if (!container) return;

    const cards = container.querySelectorAll(".rightSB-qnaCard");
    let visibleCount = 0;

    cards.forEach((card) => {
      const titleText =
        card.querySelector(".rightSB-qnaQuestion")?.textContent || "";
      const isMatch = !keyword || titleText.toLowerCase().includes(keyword);
      card.style.display = isMatch ? "" : "none";
      if (isMatch) visibleCount += 1;
    });

    // 검색어가 있는데 매칭되는 카드가 하나도 없으면 안내 문구 표시
    let emptyNotice = container.querySelector(".rightSB-qnaSearchEmpty");
    if (keyword && visibleCount === 0 && cards.length > 0) {
      if (!emptyNotice) {
        emptyNotice = document.createElement("div");
        emptyNotice.className = "rightSB-qnaSearchEmpty";
        emptyNotice.style.cssText =
          "text-align:center; color:#7b7578; padding:24px 0;";
        emptyNotice.textContent = "검색 결과가 없습니다.";
        container.appendChild(emptyNotice);
      }
    } else if (emptyNotice) {
      emptyNotice.remove();
    }
  };

  input.addEventListener("input", applyQnaSearch);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyQnaSearch();
    }
  });
  btn?.addEventListener("click", (e) => {
    e.preventDefault();
    applyQnaSearch();
  });
}

// Q&A 목록 새로고침
function refreshQnaSection(legalDongId) {
  if (!legalDongId) return Promise.resolve();

  const qnaPageUrl = `/qna/grid/${legalDongId}/`;

  return fetch(qnaPageUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP 에러 발생! 상태코드: ${response.status}`);
      }
      return response.text();
    })
    .then((htmlText) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      // =====================================================================
      // Q&A 카드 목록: 값을 뽑아 JS가 재조립하지 않고,
      // Django가 렌더링한 #rightSB-qnaCardContainer의 HTML을 그대로 옮겨 붙임
      // =====================================================================
      const serverContainer = doc.getElementById("rightSB-qnaCardContainer");
      const localContainer = document.getElementById(
        "rightSB-qnaCardContainer",
      );
      if (localContainer && serverContainer) {
        localContainer.innerHTML = serverContainer.innerHTML;
      }
      bindQnaCardDelegation();

      const qnaCount = parseInt(serverContainer?.dataset.count, 10) || 0;
      const qnaCountEl = document.querySelector(".rightSB-QnASelected span");
      if (qnaCountEl) qnaCountEl.textContent = `(${qnaCount})`;

      console.log(`서버가 렌더링한 Q&A ${qnaCount}건을 그대로 옮겨 붙임`);
      return qnaCount;
    })
    .catch((err) => {
      console.warn("Q&A 데이터를 불러오지 못했습니다.", err);
      const localContainer = document.getElementById(
        "rightSB-qnaCardContainer",
      );
      if (localContainer) {
        localContainer.innerHTML = `<div style="text-align:center; color:#7b7578; padding:24px 0;">등록된 질문이 없습니다. 첫 질문을 던져보세요!</div>`;
      }
      const qnaCountEl = document.querySelector(".rightSB-QnASelected span");
      if (qnaCountEl) qnaCountEl.textContent = `(0)`;
    });
}

window.updateSidebarTitle = function (
  detailDongName,
  legalDongName,
  legalDongId,
  detailDongId,
) {
  if (!detailDongName) return;

  // 후기 등록/좋아요 처리 후 새로고침할 때 참조할 수 있도록 저장
  currentSidebarState = {
    detailDongName,
    legalDongName,
    legalDongId,
    detailDongId,
  };

  const targetGridId = detailDongId || legalDongId;

  if (targetGridId) {
    fetch(`/accounts/grid/${targetGridId}/check-saved/`, {
      credentials: "same-origin",
    })
      .then((res) => (res.ok ? res.json() : { saved: false }))
      .then((data) => {
        const allHeartImgs = document.querySelectorAll(
          ".wish-btn .rightSB-heartImg, .rightSB-regionHeartImg",
        );
        allHeartImgs.forEach((img) => {
          img.src = data.saved
            ? "./components/rightSideBar/rightSB-images/fullHeart.svg"
            : "./components/rightSideBar/rightSB-images/heart.svg";
        });
      });
  }

  // ====================================================
  // 사이드바 상단 안심점수/그래프
  // ====================================================
  const isAdminDongDetail =
    detailDongId !== undefined && detailDongId !== legalDongId;
  const detailUrl = isAdminDongDetail
    ? `/grids/${encodeURIComponent(detailDongName)}/?is_legal_dong=false`
    : `/grids/${encodeURIComponent(legalDongName)}/?is_legal_dong=true`;

  fetch(detailUrl)
    .then((res) => {
      if (!res.ok) throw new Error("상세 정보 fetch 실패");
      return res.json();
    })
    .then((responseData) => {
      const fields = responseData.fields ? responseData.fields : responseData;

      // ====================================================
      // 제목 및 안심 점수 텍스트 갱신
      // ====================================================
      const regionTextEl = document.querySelector(".rightSB-regionText");
      if (regionTextEl) {
        regionTextEl.textContent = isAdminDongDetail
          ? detailDongName
          : `${legalDongName} 일대`;
      }

      const scoreNumberEl = document.querySelector(".rightSB-score"); // 안심점수
      if (scoreNumberEl && fields.safety_score !== undefined) {
        scoreNumberEl.textContent = parseFloat(fields.safety_score).toFixed(1);
      }

      // ====================================================
      // 2. 차트 그리기 함수 호출
      // ====================================================
      renderSafetyChart(fields);

      // ====================================================
      // 영역별 만족도(별점) + 후기 카드 리스트 업데이트
      // ====================================================
      // (refreshReviewSection이 rating_summary 파싱 + 후기 카드 파싱을 함께 처리함)
      refreshReviewSection(legalDongId, legalDongName);

      // ====================================================
      // Q&A 목록 새로고침
      // ====================================================
      refreshQnaSection(legalDongId);
      // =====================================================================
      // 후기 보기 및 후기 작성 페이지 링크 동적 바인딩.
      // =====================================================================
      // 후기 목록 보기/이동 /reviews/grid/12/
      const reviewGoBtn =
        document.querySelector(".rightSB-reviewGoBtn") ||
        document.querySelector(".go-to-review-list");
      if (reviewGoBtn && legalDongId) {
        reviewGoBtn.setAttribute("href", `/reviews/grid/${legalDongId}/`);
      }

      // "후기 작성하기" 버튼  /reviews/grid/12/create/
      const reviewWriteBtn =
        document.querySelector(".rightSB-reviewWriteBtn") ||
        document.querySelector(".go-to-review-create");
      if (reviewWriteBtn && legalDongId) {
        reviewWriteBtn.setAttribute(
          "href",
          `/reviews/grid/${legalDongId}/create/`,
        );
      }

      // ====================================================
      // 사이드바 애니메이션 열기
      // ====================================================
      const sidebar = document.getElementById("rightSideBar-container");
      if (sidebar) {
        sidebar.classList.remove("sidebar-collapsed");
      }
    })
    .catch((err) => {
      console.error("API 통신 에러:", err);
      // 에러 시에도 동작은 하도록 방어 코드
      const regionTextEl = document.querySelector(".rightSB-regionText");
      if (regionTextEl) {
        regionTextEl.textContent = isAdminDongDetail
          ? detailDongName
          : `${legalDongName} 일대`;
      }

      const sidebar = document.getElementById("rightSideBar-container");
      if (sidebar) sidebar.classList.remove("sidebar-collapsed");
    });
};

/// ==========================================
/// 상단 만족도 별점 표현
/// ==========================================
function handleStarRating(nightScore, convenienceScore, atmosphereScore) {
  const scoreData = {
    night: parseFloat(nightScore) || 0,
    convenience: parseFloat(convenienceScore) || 0,
    atmosphere: parseFloat(atmosphereScore) || 0,
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

    // 픽셀 계산
    const starWidth = 16; // 별 한 개의 너비 (px)
    const gapWidth = 11; // 별 사이 간격 (px)

    const fullStars = Math.floor(score); // 꽉 찬 별의 개수
    const partialStarRatio = score % 1; // 마지막 소수점 별의 비율

    let preciseWidth = 0;

    if (fullStars > 0) {
      // 꽉 찬 별의 너비 + 그 사이의 간격값
      preciseWidth += fullStars * starWidth + (fullStars - 1) * gapWidth;
    }

    if (partialStarRatio > 0) {
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
/// 동적 드롭다운/입력 폼 컴포넌트 초기화 및 독립 버튼 스위칭 제어
/// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // --- 엘리먼트 수집 및 버튼 묶음 인덱싱 ---
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
    const isTokenExist = document.body.dataset.authenticated === "true";

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

  // --- 통합 버튼 상태 제어 함수 (로그아웃 반투명 배경 연동본) ---
  function updateBottomButtons() {
    // 다 숨기기 초기화
    reviewListBtnGroup?.classList.add("rightSB-hide");
    qnaListBtnGroup?.classList.add("rightSB-hide");
    formSubmitBtnGroup?.classList.add("rightSB-hide");

    // 로그아웃 블러 마스크 : 버튼 1쌍 뒤에 노출
    const isOverlayOn =
      document.querySelector(".rightSB-auth-overlay") !== null;
    if (isOverlayOn) {
      reviewListBtnGroup?.classList.remove("rightSB-hide");
      return;
    }

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

  window.__updateBottomButtons = updateBottomButtons;

  // 데이터 로드 및 초기화 트리거 순서 배치
  handleStarRating();
  checkAuthAndToggleTabs();
  updateBottomButtons();
  bindAnswerSubmit();
  bindQnaSearch();

  // --- 상단 메인 내비게이션 바 이동 및 탭 콘텐츠 매핑 ---
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

  // --- 다중 textarea 글자수 실시간 제한 ---
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

  // --- 사용자 직접 만족도 별점 호버/클릭 입력 구현 모듈 ---
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

  // --- 서브페이지 라우팅 및 독립 버튼 유기적 매핑 ---
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
      qnaDetailSub?.classList.add("rightSB-hide");
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

      qnaFormSub?.classList.add("rightSB-hide");
      qnaDetailSub?.classList.add("rightSB-hide");
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

  // --- 찜하기 기능 ---
  // /accounts/grid/<id>/save/ 에 POST해서 저장
  document
    .querySelectorAll(".wish-btn, .rightSB-regionHeartImg")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetGridId =
          currentSidebarState.detailDongId || currentSidebarState.legalDongId;
        if (!targetGridId) return;

        fetch(`/accounts/grid/${targetGridId}/save/`, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
          },
        })
          .then((res) => {
            if (res.url.includes("/accounts/login/")) {
              // 비로그인 상태: 서버가 로그인 페이지로 redirect
              // alert 대신 로그인 팝업
              openLoginPopup();
              return null;
            }
            return res.json();
          })
          .then((data) => {
            if (!data) return;
            const isWished = data.saved;

            // 문자열 하나로 묶어서 두 종류의 하트 이미지를 모두 수집
            const allHeartImgs = document.querySelectorAll(
              ".wish-btn .rightSB-heartImg, .rightSB-regionHeartImg",
            );

            allHeartImgs.forEach((img) => {
              // 찜하기 상태에 따라 이미지 경로 일괄 교체
              img.src = isWished
                ? "./components/rightSideBar/rightSB-images/fullHeart.svg"
                : "./components/rightSideBar/rightSB-images/heart.svg";
            });

            alert(
              isWished
                ? "❤️ 이 동네가 찜 목록에 추가되었습니다."
                : "💔 찜 목록에서 제외되었습니다.",
            );
          })
          .catch((err) => {
            console.error("찜하기 처리 중 오류:", err);
          });
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

        // /reviews/grid/<legalDongId>/create/ 로 POST
        const legalDongId = currentSidebarState.legalDongId;
        if (!legalDongId) {
          alert("먼저 지도를 클릭해서 동네를 선택해주세요.");
          return;
        }

        const submitBtn = formSubmitBtnGroup.querySelector(
          ".rightSB-reviewSubmitBtn",
        );
        if (submitBtn) submitBtn.disabled = true; // 중복 클릭 방지

        const body = new URLSearchParams({
          review_content: text,
          // ReviewForm의 rating_night/rating_amenity/rating_mood와 매핑
          // (rightSB-rating의 data-type: night/convenience/atmosphere)
          rating_night: scores.night.toFixed(1),
          rating_amenity: scores.convenience.toFixed(1),
          rating_mood: scores.atmosphere.toFixed(1),
        });

        fetch(`/reviews/grid/${legalDongId}/create/`, {
          method: "POST",
          credentials: "same-origin", // 로그인 세션 쿠키 포함해서 보내야 인증됨
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CSRFToken": getCookie("csrftoken"),
          },
          body,
        })
          .then((res) => {
            // accounts.decorators.verified_residence_required가 실거주지
            // 인증이 안 됐거나 인증한 동네랑 grid가 다르면 403 호출
            if (res.status === 403) {
              throw new Error(
                "실거주지 인증이 필요해요. 마이페이지에서 실거주지 인증을 해주세요.",
              );
            }
            // 성공하면 서버가 reviews:list로 redirect하고, fetch가 그걸 따라가서
            // 최종 res.url이 .../create/ 없이 끝남. 폼 검증 실패 시엔 redirect 없이
            // 같은 create 페이지(에러 포함)를 그대로 200으로 돌려줌
            const succeeded = res.ok && !res.url.includes("/create/");
            if (!succeeded) {
              throw new Error("입력값을 다시 확인해주세요 (등록 실패)");
            }
          })
          .then(() => {
            alert("후기가 성공적으로 등록되었습니다!");
            // 후기 폼 초기화
            // 1. 텍스트 영역 비우기 및 글자수 표기(0/500) 리셋
            textarea.value = "";
            const charSpan = reviewFormSub.querySelector(
              ".rightSB-currentChars > span",
            );
            if (charSpan) charSpan.textContent = "0";

            // 2. 만족도 별점(0점) 및 채워진 그래픽 초기화
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

            // 4. 방금 등록한 후기가 바로 리스트/만족도에 반영되도록 새로고침
            refreshReviewSection(
              legalDongId,
              currentSidebarState.legalDongName,
            );
          })
          .catch((err) => {
            console.error("후기 등록 실패:", err);
            alert(
              err.message ||
                "후기 등록에 실패했어요. 로그인 상태와 입력값을 확인해주세요.",
            );
          })
          .finally(() => {
            if (submitBtn) submitBtn.disabled = false;
          });
      } else if (activeTab.id === "tabContentQnA") {
        const textarea = qnaFormSub.querySelector(".rightSB-reviewContent"); // 리셋을 위해 엘리먼트로 수집
        const text = textarea.value;

        if (!text.trim()) {
          alert("궁금한 내용을 입력해주세요.");
          return;
        }

        // /qna/grid/<legalDongId>/create/ 로 POST
        const legalDongId = currentSidebarState.legalDongId;
        if (!legalDongId) {
          alert("먼저 지도를 클릭해서 동네를 선택해주세요.");
          return;
        }

        const submitBtn = formSubmitBtnGroup.querySelector(
          ".rightSB-reviewSubmitBtn",
        );
        if (submitBtn) submitBtn.disabled = true;

        const body = new URLSearchParams({
          question_content: text,
        });

        fetch(`/qna/grid/${legalDongId}/create/`, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CSRFToken": getCookie("csrftoken"),
          },
          body,
        })
          .then((res) => {
            const succeeded = res.ok && !res.url.includes("/create/");
            if (!succeeded) {
              throw new Error("입력값을 다시 확인해주세요 (등록 실패)");
            }
          })
          .then(() => {
            alert("질문이 성공적으로 등록되었습니다!");

            // Q&A 폼 초기화 코드
            // 1. 텍스트 영역 비우기 및 글자수 표기 리셋
            textarea.value = "";
            const charSpan = qnaFormSub.querySelector(
              ".rightSB-currentChars > span",
            );
            if (charSpan) charSpan.textContent = "0";

            backToMainList();

            // 2. 방금 등록한 질문이 바로 목록/개수에 반영되도록 새로고침
            refreshQnaSection(legalDongId);
          })
          .catch((err) => {
            console.error("질문 등록 실패:", err);
            alert(
              "질문 등록에 실패했어요. 로그인 상태와 입력값을 확인해주세요.",
            );
          })
          .finally(() => {
            if (submitBtn) submitBtn.disabled = false;
          });
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

  // --- [I]/[J] 후기·Q&A 새로고침/바인딩 함수는 파일 상단(top-level)으로 이동됨 ---
  // 클릭 전 초기 상태는 빈 상태로 시작하고, 지도를 클릭하면
  // window.updateSidebarTitle -> refreshReviewSection / refreshQnaSection이
  // 실제 데이터로 채워줌

  qnaDetailSub
    ?.querySelector(".rightSB-detailBackBtn")
    ?.addEventListener("click", () => {
      qnaDetailSub?.classList.add("rightSB-hide");
      qnaFormSub?.classList.add("rightSB-hide");
      qnaListSub?.classList.remove("rightSB-hide");
      updateBottomButtons();
    });

  // 사이드바 접기 토글
  document.querySelector(".rightSB-close")?.addEventListener("click", () => {
    document
      .getElementById("rightSideBar-container")
      ?.classList.toggle("sidebar-collapsed");
  });

  // =====================================================================
  // .rightSB-aside의 "open" 클래스와 #rightSideBar-container의 "sidebar-collapsed"
  // 클래스는 여러 곳에서 그 호출부를 전부 찾아 고치는 대신 MutationObserver로 두
  // 요소의 class 변화를 감지해 이 한 곳에서만 GPS 버튼 위치를 다시 계산함
  // =====================================================================

  //GPS 버튼 기능 구현

  const locBtn = document.querySelector(".mapOverlay-locationBtn");
  console.log("현재위치 버튼 찾음?:", locBtn); // null이면 셀렉터가 틀린 것

  locBtn?.addEventListener("click", () => {
    console.log("버튼 클릭됨!");

    if (!navigator.geolocation) {
      alert("이 브라우저에서는 위치 기능을 사용할 수 없어요.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const map = window.map; // kakaoMap.js에서 window.map으로 노출됨
        if (!map) {
          console.error("지도 인스턴스를 아직 찾을 수 없습니다.");
          alert("지도가 아직 준비되지 않았어요. 잠시 후 다시 시도해주세요.");
          return;
        }

        const moveLatLng = new kakao.maps.LatLng(lat, lng);
        map.panTo(moveLatLng);

        // 현재 위치 마커 표시
        new kakao.maps.Marker({
          position: moveLatLng,
          map: map,
        });
      },
      (err) => {
        console.error("위치 정보를 가져오지 못했습니다:", err);
        alert("위치 정보를 가져오지 못했어요. 위치 권한을 확인해주세요.");
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      },
    );
  });

  // =====================================================================
  (function initGpsButtonSync() {
    const gpsBtn = document.querySelector(".mapOverlay-locationBtn");
    const aside = document.querySelector(".rightSB-aside");
    const container = document.getElementById("rightSideBar-container");
    if (!gpsBtn || !aside || !container) return;

    const syncGpsButtonPosition = () => {
      const isOpen = aside.classList.contains("open");
      const isCollapsed = container.classList.contains("sidebar-collapsed");

      if (!isOpen) {
        // 패널이 한 번도 안 열린 상태 -> 기본 위치(오른쪽 상단 고정) 유지
        gpsBtn.classList.remove("rightSB-gpsShifted", "rightSB-gpsCollapsed");
      } else if (isCollapsed) {
        // 패널이 열려있지만 접힌 상태 -> 그만큼만 이동
        gpsBtn.classList.add("rightSB-gpsCollapsed");
        gpsBtn.classList.remove("rightSB-gpsShifted");
      } else {
        // 패널이 완전히 펼쳐진 상태 -> 패널 왼쪽에 딱 붙게 이동
        gpsBtn.classList.add("rightSB-gpsShifted");
        gpsBtn.classList.remove("rightSB-gpsCollapsed");
      }
    };

    const observer = new MutationObserver(syncGpsButtonPosition);
    observer.observe(aside, { attributes: true, attributeFilter: ["class"] });
    observer.observe(container, {
      attributes: true,
      attributeFilter: ["class"],
    });

    syncGpsButtonPosition(); // 초기 상태 반영
  })();

  // 우측 사이드바 내부의 로그인 실행 버튼 타겟팅 (프로젝트 실제 클래스에 맞게 확인해줘!)
  const openLoginBtn = document.querySelector(".rightSB-auth-loginBtn");

  if (openLoginBtn) {
    openLoginBtn.addEventListener("click", (e) => {
      e.preventDefault(); // 기본 a태그 이동 기능 막기
      openLoginPopup(); // 공용 함수로 팝업 열기
    });
  }

  // 어두운 배경 클릭 시 팝업 닫기
  const overlay = document.getElementById("loginPopupOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.add("popup-hide");
      }
    });
  }

  // 우측 사이드바의 점수 기준 보기 버튼 타겟팅
  const openScoreInfoBtn = document.querySelector(
    ".rightSB-safetyScoreContainer button",
  );

  if (openScoreInfoBtn) {
    openScoreInfoBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const overlay = document.getElementById("loginPopupOverlay");
      const contentBox = document.getElementById("loginPopupContent");

      // 외부 login.html 파일 가져오기 (점수 기준 보기 포함)
      fetch("./login/login.html")
        .then((response) => {
          if (!response.ok) throw new Error("네트워크 응답에 문제가 있습니다.");
          return response.text();
        })
        .then((htmlData) => {
          // 팝업 상자 안에 소스 삽입
          contentBox.innerHTML = htmlData;

          // 점수 기준 보기 전용 규격 주입 및 노출
          contentBox.style.width = "518px";
          contentBox.style.height = "733px";
          overlay.classList.remove("popup-hide");

          // HTML이 삽입된 직후 login.js에 추가할 점수 팝업 초기화 함수 실행!
          if (typeof initScoreInfoEvent === "function") {
            initScoreInfoEvent();
          }

          // 닫기 버튼
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
