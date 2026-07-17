// ==========================================
// 로그인 / 회원가입 팝업 초기화 및 토글 기능
// ==========================================
function initAuthEvents() {
  const authCard = document.getElementById("auth-card");
  const popupContent = document.getElementById("loginPopupContent");

  if (!authCard || !popupContent) return;

  const goToSignupBtn = document.getElementById("go-to-signup");
  const goToLoginBtn = document.querySelectorAll(".go-to-login");

  // 각 섹션들 수집
  const loginSec = authCard.querySelector(".login-section");
  const signupSec = authCard.querySelector(".signup-section");
  const infoSec = authCard.querySelector(".info-section");
  const scoreSec = authCard.querySelector(".scoreInfo-section");
  const successSec = authCard.querySelector(".signUpSuccess-section")

  // 강제 초기화: 로그인 화면만 켜고 나머지(점수 창 포함)는 숨김
  if (loginSec) loginSec.style.display = "block";
  if (signupSec) signupSec.style.display = "none";
  if (infoSec) infoSec.style.display = "none";
  if (scoreSec) scoreSec.style.display = "none";
  if (successSec) successSec.style.display = "none";

  authCard.classList.remove("is-signup");

  // 회원가입하러 가기 클릭 (창 확장)
  if (goToSignupBtn) {
    goToSignupBtn.replaceWith(goToSignupBtn.cloneNode(true)); // 이벤트 중복 등록 방지 안전장치
    document.getElementById("go-to-signup").addEventListener("click", () => {
      authCard.classList.add("is-signup");
      popupContent.style.width = "1142px";
      popupContent.style.height = "743px";

      if (loginSec) loginSec.style.display = "none";
      if (infoSec) infoSec.style.display = "none";
      if (scoreSec) scoreSec.style.display = "none";
      if (signupSec) signupSec.style.display = "block";
      if (successSec) successSec.style.display = "none";
    });
  }

  // 로그인하러 가기 클릭 (창 축소) - 클래스로 여러 개 처리
  const goToLoginBtns = authCard.querySelectorAll(".go-to-login");

  if (goToLoginBtns.length > 0) {
    goToLoginBtns.forEach((btn) => {
      // 1. 이벤트 중복 등록 방지를 위해 엘리먼트 복제 후 교체
      const clonedBtn = btn.cloneNode(true);
      btn.replaceWith(clonedBtn);

      // 2. 복제된 버튼에 클릭 이벤트 연결
      clonedBtn.addEventListener("click", () => {
        authCard.classList.remove("is-signup");
        popupContent.style.width = "518px";
        popupContent.style.height = "689px";

        if (signupSec) signupSec.style.display = "none";
        if (infoSec) infoSec.style.display = "none";
        if (scoreSec) scoreSec.style.display = "none";
        if (loginSec) loginSec.style.display = "block";
        if (successSec) successSec.style.display = "none";
      });
    });
  }

  // 회원가입 창 내 '자세히 보기' 누르면 개인정보 방침 띄우기
  const showInfoBtn = signupSec?.querySelector(".login-personalInfoDetails");
  if (showInfoBtn) {
    showInfoBtn.addEventListener("click", () => {
      if (signupSec) signupSec.style.display = "none";
      if (infoSec) infoSec.style.display = "block";
    });
  }

  // '가입하기' 클릭 시 무조건 성공 창을 띄우면 서버가 실제로 거절해도
  // (닉네임 중복 등) 성공 화면이 떠버림. bindSignupSubmit()이 서버 응답을
  // 확인한 뒤 진짜 성공했을 때만 띄우도록 함.

  // 회원가입 성공 창의 버튼들
  // 회원가입 = 로그인이 아님 (signup_view가 자동 로그인시키지 않음).
  // 로그인 폼을 보여줘서 방금 만든 계정으로 직접 로그인하게 함.
  const continueBtn = successSec?.querySelector(".signup-success-continueBtn");
  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      // is-signup 클래스를 안 지우면 login-section이 display:block이 돼도
      // .login-card.is-signup .login-section{opacity:0} 때문에 안 보임.
      // 다른 버튼(goToLoginBtns)들과 똑같이 지워줘야 함.
      authCard.classList.remove("is-signup");
      popupContent.style.width = "518px";
      popupContent.style.height = "689px";

      if (successSec) successSec.style.display = "none";
      if (signupSec) signupSec.style.display = "none";
      if (infoSec) infoSec.style.display = "none";
      if (scoreSec) scoreSec.style.display = "none";
      if (loginSec) loginSec.style.display = "block";
    });
  }

  const skipBtn = successSec?.querySelector(".signup-success-skipBtn");
  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      document.getElementById("loginPopupOverlay")?.classList.add("popup-hide");
    });
  }

  // 비밀번호 보이기/숨기기 눈 토글
  const seeIcons = authCard.querySelectorAll(".login-seeImg");
  seeIcons.forEach((icon) => {
    icon.addEventListener("click", (e) => {
      const inputBox = e.target.closest(".login-inputBox");
      const passwordInput = inputBox.querySelector("input");

      if (passwordInput.type === "password") {
        passwordInput.type = "text";
      } else {
        passwordInput.type = "password";
      }
    });
  });

  // 비밀번호 글자 수 카운팅
  const password1Input = document.getElementById("signup-password1");
  const pwCountingEl = authCard.querySelector(".login-pwCounting");
  if (password1Input && pwCountingEl) {
    password1Input.addEventListener("input", (e) => {
      pwCountingEl.textContent = e.target.value.length;
    });
  }

  // 비밀번호 확인(재확인) 글자 수 카운팅 - 위 password1과 클래스가 겹치면
  // querySelector가 첫 번째 것만 잡아서 따로 클래스(login-pw2Counting)를 씀
  const password2Input = document.getElementById("signup-password2");
  const pw2CountingEl = authCard.querySelector(".login-pw2Counting");
  if (password2Input && pw2CountingEl) {
    password2Input.addEventListener("input", (e) => {
      pw2CountingEl.textContent = e.target.value.length;
    });
  }

  // ==========================================
  // 성별 개별 선택 기능 (남/여 디자인 분리)
  // ==========================================
  if (signupSec) {
    const genderButtons = signupSec.querySelectorAll(".login-genderBox");
    const genderHiddenInput = document.getElementById("signup-gender");

    genderButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const currentBtn = e.target.closest(".login-genderBox");
        if (!currentBtn) return;

        // 1. 모든 성별 버튼에서 활성화 클래스를 전부 제거
        genderButtons.forEach((otherBtn) => {
          otherBtn.classList.remove("is-selected", "is-female", "is-male");
        });

        // 2. 클릭한 버튼 내부의 글자(여성/남성)를 추출
        const genderText = currentBtn.querySelector("span").textContent.trim();

        // 3. 성별 텍스트에 따라 개별 디자인용 클래스 부여
        if (genderText === "여성") {
          currentBtn.classList.add("is-selected", "is-female");
        } else if (genderText === "남성") {
          currentBtn.classList.add("is-selected", "is-male");
        }

        // 실제 전송값(F/M)은 hidden input에 채워둠
        if (genderHiddenInput) {
          if (genderText === "여성") genderHiddenInput.value = "F";
          else if (genderText === "남성") genderHiddenInput.value = "M";
        }
      });
    });
  }

  // 거주지 자동완성 드롭다운 바인딩 (회원가입 폼 전용)
  bindResidenceAutocomplete();

  // 로그인/회원가입 제출 버튼을 실제 accounts 앱과 연결
  // (팝업이 열릴 때마다 innerHTML이 새로 그려지므로 매번 다시 바인딩해야 함)
  bindLoginSubmit();
  bindSignupSubmit();
}

// ==========================================
// 거주지 자동완성 /grids/?is_legal_dong=true 를 한 번 받아서
// sido + gu + dong_group + dong 을 합친 문자열로 포함(부분일치) 검색
// 항목을 고르면 그 '법정동'의 grid_id(숫자)를 hidden input(#signup-grid_id)에 저장
// - 실거주지 인증(verified_grid)은 반드시 is_legal_dong=True Grid만 허용되므로
//   애초에 법정동만 받아와서 저장 대상은 항상 법정동
// - 데이터가 21건뿐이라 전체를 한 번 받아 클라이언트에서 필터링
// ==========================================

// 여러 번 팝업을 열어도 네트워크는 한 번만 타도록 모듈 레벨에 캐시
let _residenceGridsCache = null;
let _residenceGridsPromise = null;

function loadLegalDongGrids() {
  if (_residenceGridsCache) return Promise.resolve(_residenceGridsCache);
  if (_residenceGridsPromise) return _residenceGridsPromise;

  _residenceGridsPromise = fetch("/grids/?is_legal_dong=true", {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  })
    .then((res) => {
      if (!res.ok) throw new Error("grids 응답 오류: " + res.status);
      return res.json();
    })
    .then((data) => {
      // 응답 형태: {"grids": [{id, dong, dong_group, sido, gu, is_legal_dong, ...}, ...]}
      const grids = Array.isArray(data?.grids) ? data.grids : [];
      // 검색용 합친 문자열(haystack)을 미리 만들어 둠
      _residenceGridsCache = grids.map((g) => ({
        id: g.id,
        dong: g.dong,
        gu: g.gu,
        sido: g.sido,
        // 사용자가 "서울특별시 노원구 상계동", "노원구 상계동", "상계동" 등
        // 어떤 형태로 쳐도 걸리도록 네 필드를 공백으로 합쳐 소문자화.
        haystack: [g.sido, g.gu, g.dong_group, g.dong]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
        // 드롭다운에 보여줄 라벨 (예: "서울시 노원구 상계동")
        label: [g.sido, g.gu, g.dong].filter(Boolean).join(" "),
      }));
      return _residenceGridsCache;
    })
    .catch((err) => {
      console.error("거주지 목록(grids) 로드 실패:", err);
      _residenceGridsPromise = null; // 실패 시 다음에 재시도 가능하도록
      _residenceGridsCache = null;
      return [];
    });

  return _residenceGridsPromise;
}

function bindResidenceAutocomplete() {
  const input = document.getElementById("signup-residence");
  const hidden = document.getElementById("signup-grid_id");
  const list = document.getElementById("signup-residence-list");
  if (!input || !hidden || !list) return;

  // 팝업이 매번 새로 그려지므로 데이터는 미리(또는 최초 포커스 때) 당겨둠
  let grids = [];
  loadLegalDongGrids().then((data) => {
    grids = data;
  });

  let activeIndex = -1; // 키보드 위/아래 선택용
  let currentMatches = [];

  function closeList() {
    list.style.display = "none";
    list.innerHTML = "";
    activeIndex = -1;
    currentMatches = [];
  }

  function pick(match) {
    input.value = match.label; // 사람이 보는 값
    hidden.value = match.id; // 서버로 보내는 실제 값(법정동 grid_id)
    closeList();
  }

  function render(matches) {
    if (!matches.length) {
      closeList();
      return;
    }
    list.innerHTML = matches
      .map(
        (m, i) =>
          `<li class="residence-autocomplete-item${
            i === activeIndex ? " is-active" : ""
          }" data-idx="${i}">
             <img src="./login/login-images/place.svg" alt="" class="residence-pin" />
             <span>${m.label}</span>
           </li>`,
      )
      .join("");
    list.style.display = "block";
  }

  // 입력할 때마다 필터링. 사용자가 직접 타이핑하면 이전에 고른 grid_id는 무효화됨
  input.addEventListener("input", () => {
    hidden.value = ""; // 확정 선택 전까지는 서버로 보낼 값 없음
    const q = input.value.trim().toLowerCase();
    if (!q) {
      closeList();
      return;
    }
    // 공백으로 나눠서 모든 토큰이 포함된 것만 (AND 매칭) — "노원 상계" 같은 검색 대응
    const tokens = q.split(/\s+/).filter(Boolean);
    currentMatches = grids
      .filter((g) => tokens.every((t) => g.haystack.includes(t)))
      .slice(0, 8); // 너무 길어지지 않게 상위 8개만
    activeIndex = -1;
    render(currentMatches);
  });

  // 마우스 클릭으로 선택
  list.addEventListener("mousedown", (e) => {
    // mousedown을 쓰는 이유: input의 blur보다 먼저 실행돼서 선택이 씹히지 않게 함
    const li = e.target.closest(".residence-autocomplete-item");
    if (!li) return;
    e.preventDefault();
    const idx = Number(li.dataset.idx);
    if (currentMatches[idx]) pick(currentMatches[idx]);
  });

  // 키보드 조작 (↑ ↓ Enter Esc)
  input.addEventListener("keydown", (e) => {
    if (list.style.display === "none") return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentMatches.length - 1);
      render(currentMatches);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      render(currentMatches);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && currentMatches[activeIndex]) {
        e.preventDefault();
        pick(currentMatches[activeIndex]);
      }
    } else if (e.key === "Escape") {
      closeList();
    }
  });

  // 바깥 클릭 / 포커스 아웃 시 닫기
  input.addEventListener("blur", () => {
    // mousedown 처리가 끝난 뒤 닫히도록 살짝 지연
    setTimeout(closeList, 120);
  });
}

// ==========================================
// 점수 기준 보기 팝업 초기화 기능
// ==========================================
function initScoreInfoEvent() {
  const authCard = document.getElementById("auth-card");
  if (!authCard) return;

  const loginSec = authCard.querySelector(".login-section");
  const signupSec = authCard.querySelector(".signup-section");
  const infoSec = authCard.querySelector(".info-section");
  const scoreSec = authCard.querySelector(".scoreInfo-section");
  const successSec = authCard.querySelector(".signUpSuccess-section");

  // 점수 기준창을 켰을 때는 로그인, 회원가입, 개인정보를 숨김
  if (loginSec) loginSec.style.display = "none";
  if (signupSec) signupSec.style.display = "none";
  if (infoSec) infoSec.style.display = "none";
  if (scoreSec) scoreSec.style.display = "block";
  if (successSec) successSec.style.display = "none";

  authCard.classList.remove("is-signup");
}

// ==========================================
// 실제 로그인 / 회원가입 연동
// /accounts/login/, /accounts/signup/ 으로 POST해서 실제 세션 쿠키로 로그인
// ==========================================
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

function showAuthError(elId, message) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = message;
  el.style.display = "block";
}

function hideAuthError(elId) {
  const el = document.getElementById(elId);
  if (el) el.style.display = "none";
}

// Django가 폼 에러와 함께 같은 페이지를 다시 렌더링(200)했을 때, 에러 텍스트
function extractDjangoFormError(htmlText) {
  const doc = new DOMParser().parseFromString(htmlText, "text/html");
  const errorEls = doc.querySelectorAll(
    ".errorlist li, p[style*='color:red']",
  );
  if (errorEls.length > 0) {
    return Array.from(errorEls)
      .map((el) => el.textContent)
      .join(" / ");
  }
  return "입력하신 정보를 다시 확인해주세요.";
}

function bindLoginSubmit() {
  const btn = document.querySelector(".login-loginBtn");
  if (!btn) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    hideAuthError("login-error");

    const username = document.getElementById("login-username")?.value.trim();
    const password = document.getElementById("login-password")?.value;

    if (!username || !password) {
      showAuthError("login-error", "아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    fetch("/accounts/login/", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: new URLSearchParams({ username, password }),
    })
      .then((res) => {
        // 로그인 성공: Django가 302로 홈으로 리다이렉트
        // 실패: 같은 로그인 폼을 에러와 함께 200으로 재렌더링
        if (res.redirected || !res.url.includes("/accounts/login/")) {
          // 예전엔 여기서 새로고침을 해서 nav 로그인 상태를 갱신했는데,
          // 그러면 안심맵에서 검색/클릭해서 보고 있던 폴리곤과 사이드바가
          // 전부 날아가서 처음부터 다시 찾아야 했음. 세션 쿠키는 이 응답의
          // Set-Cookie로 이미 반영됐으므로 새로고침 자체가 필요 없고,
          // nav/사이드바 잠금 오버레이만 로그인 상태로 다시 계산해주면 됨.
          document
            .getElementById("loginPopupOverlay")
            ?.classList.add("popup-hide");
          window.applyLoggedInNav?.();
          window.__checkAuthAndToggleTabs?.();
          window.__updateBottomButtons?.();

          // 지금 열려있는 동네가 있으면(예: 행정동 폴리곤 클릭해서 사이드바가
          // 뜬 상태) 후기/QnA/찜 여부를 로그인된 세션 기준으로 다시 채워줌.
          // 지도 위 폴리곤 자체는 건드리지 않으므로 그대로 유지됨.
          const state = window.getCurrentSidebarState?.();
          if (
            state?.legalDongId &&
            typeof window.updateSidebarTitle === "function"
          ) {
            window.updateSidebarTitle(
              state.detailDongName || state.legalDongName,
              state.legalDongName,
              state.legalDongId,
              state.detailDongId,
            );
          }
          return null;
        }
        return res.text();
      })
      .then((htmlText) => {
        if (htmlText == null) return; // 이미 로그인 상태 갱신 처리됨
        showAuthError("login-error", extractDjangoFormError(htmlText));
      })
      .catch((err) => {
        console.error("로그인 처리 중 오류:", err);
        showAuthError("login-error", "로그인 처리 중 오류가 발생했어요.");
      });
  });
}

function bindSignupSubmit() {
  const btn = document.querySelector(".login-signupBtn");
  if (!btn) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    hideAuthError("signup-error");

    // 아이디 입력칸을 이메일로 교체함. User 모델은 username(고유)과
    // email(고유)이 별도 컬럼이라 SignUpForm이 둘 다 필수로 요구하지만,
    // 실제 로그인은 EmailBackend가 email 컬럼으로만 조회하므로(accounts/backends.py
    // 참고) username에는 화면에 노출 안 하고 이메일 값을 그대로 채워 넣음
    const nickname = document.getElementById("signup-nickname")?.value.trim();
    const email = document.getElementById("signup-email")?.value.trim();
    const password1 = document.getElementById("signup-password1")?.value;
    const password2 = document.getElementById("signup-password2")?.value;
    const gender = document.getElementById("signup-gender")?.value;
    // 거주지: 드롭다운에서 확정 선택했을 때만 값이 채워지는 법정동 grid_id
    const gridId = document.getElementById("signup-grid_id")?.value;
    const agreePrivacy = document.getElementById("check-agree")?.checked;

    if (!nickname || !email || !password1 || !password2) {
      showAuthError("signup-error", "필수 항목을 모두 입력해주세요.");
      return;
    }
    if (password1 !== password2) {
      showAuthError("signup-error", "비밀번호가 일치하지 않아요. 다시 확인해주세요.");
      return;
    }
    if (!gender) {
      showAuthError("signup-error", "성별을 선택해주세요.");
      return;
    }
    // SignUpForm의 grid_id가 required=True라서, 목록에서 고르지 않으면 서버가 거부
    // 직접 타이핑만 하고 드롭다운을 안 고르면 hidden 값이 비어 있으므로 여기서 막음
    if (!gridId) {
      showAuthError("signup-error", "거주지를 목록에서 선택해주세요.");
      return;
    }
    if (!agreePrivacy) {
      showAuthError(
        "signup-error",
        "개인정보 수집·이용에 동의해야 회원가입이 가능해요.",
      );
      return;
    }

    fetch("/accounts/signup/", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: new URLSearchParams({
        nickname,
        email,
        // SignUpForm이 username도 필수로 요구해서, 화면엔 없는 값이지만
        // 이메일을 그대로 재사용해서 채움 (위 주석 참고)
        username: email,
        password1,
        password2,
        gender,
        grid_id: gridId,
        agree_privacy: "on",
      }),
    })
      .then((res) => {
        if (res.redirected || !res.url.includes("/accounts/signup/")) {
          const authCard = document.getElementById("auth-card");
          const popupContent = document.getElementById("loginPopupContent");
          const signupSec = authCard?.querySelector(".signup-section");
          const successSec = authCard?.querySelector(".signUpSuccess-section");

          if (signupSec) signupSec.style.display = "none";
          if (successSec) successSec.style.display = "block";
          if (popupContent) {
            popupContent.style.width = "518px";
            popupContent.style.height = "689px";
          }
          return null;
        }
        return res.text();
      })
      .then((htmlText) => {
        if (htmlText == null) return;
        showAuthError("signup-error", extractDjangoFormError(htmlText));
      })
      .catch((err) => {
        console.error("회원가입 처리 중 오류:", err);
        showAuthError("signup-error", "회원가입 처리 중 오류가 발생했어요.");
      });
  });
}


