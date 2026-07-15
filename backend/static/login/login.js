// login/login.js

// ==========================================
// 🔓 [1] 로그인 / 회원가입 팝업 초기화 및 토글 기능
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

  // 🎯 강제 초기화: 로그인 화면만 켜고 '점수 창'을 포함한 나머지는 무조건 숨김!
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

  // 🎯 [수정] '가입하기' 클릭 시 무조건 성공 창을 띄우면, 서버가 실제로 거절해도
  // (닉네임 중복 등) 성공 화면이 떠버린다. 그래서 여기서 미리 띄우지 않고,
  // bindSignupSubmit()이 서버 응답을 확인한 뒤 진짜 성공했을 때만 띄우도록 옮김.

  // 회원가입 성공 창의 버튼들
  // 🎯 [수정] 회원가입 = 로그인이 아니다 (accounts/views.py의 signup_view가
  // 더 이상 자동 로그인을 시키지 않음). 그래서 여기서 새로고침하지 않고,
  // 로그인 폼을 보여줘서 방금 만든 계정으로 직접 로그인하게 한다.
  const continueBtn = successSec?.querySelector(".signup-success-continueBtn");
  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      // 🎯 [버그 수정] is-signup 클래스를 안 지워서, login-section이 display:block이
      // 돼도 .login-card.is-signup .login-section{opacity:0} 규칙 때문에 안 보이고
      // 빈 화면만 떴었다. "회원가입하러 가기" 버튼을 누를 때 붙는 클래스라서,
      // 로그인 폼으로 돌아가는 다른 버튼(goToLoginBtns)들과 똑같이 지워줘야 한다.
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

  // ==========================================
  // 👫 [🎯 제자리 이동] 성별 개별 선택 기능 (남/여 디자인 분리)
  // ==========================================
  if (signupSec) {
    const genderButtons = signupSec.querySelectorAll(".login-genderBox");
    const genderHiddenInput = document.getElementById("signup-gender");

    genderButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const currentBtn = e.target.closest(".login-genderBox");
        if (!currentBtn) return;

        // 💡 1. 모든 성별 버튼에서 활성화 클래스를 전부 제거
        genderButtons.forEach((otherBtn) => {
          otherBtn.classList.remove("is-selected", "is-female", "is-male");
        });

        // 💡 2. 클릭한 버튼 내부의 글자(여성/남성)를 추출
        const genderText = currentBtn.querySelector("span").textContent.trim();

        // 💡 3. 성별 텍스트에 따라 개별 디자인용 클래스 부여!
        if (genderText === "여성") {
          currentBtn.classList.add("is-selected", "is-female");
        } else if (genderText === "남성") {
          currentBtn.classList.add("is-selected", "is-male");
        }

        // 🎯 [진짜 연동용] 실제 전송값(F/M)은 hidden input에 채워둔다.
        if (genderHiddenInput) {
          if (genderText === "여성") genderHiddenInput.value = "F";
          else if (genderText === "남성") genderHiddenInput.value = "M";
        }
      });
    });
  }

  // 🎯 [진짜 연동용] 로그인/회원가입 제출 버튼을 실제 accounts 앱과 연결한다.
  // (팝업이 열릴 때마다 innerHTML이 통째로 새로 그려지므로 매번 다시 바인딩해야 함)
  bindLoginSubmit();
  bindSignupSubmit();
}

// ==========================================
// 📊 [2] 점수 기준 보기 팝업 초기화 기능
// ==========================================
function initScoreInfoEvent() {
  const authCard = document.getElementById("auth-card");
  if (!authCard) return;

  const loginSec = authCard.querySelector(".login-section");
  const signupSec = authCard.querySelector(".signup-section");
  const infoSec = authCard.querySelector(".info-section");
  const scoreSec = authCard.querySelector(".scoreInfo-section");
  const successSec = authCard.querySelector(".signUpSuccess-section");

  // 🎯 점수 기준창을 켰을 때는 로그인, 회원가입, 개인정보를 확실하게 숨김
  if (loginSec) loginSec.style.display = "none";
  if (signupSec) signupSec.style.display = "none";
  if (infoSec) infoSec.style.display = "none";
  if (scoreSec) scoreSec.style.display = "block";
  if (successSec) successSec.style.display = "none";

  authCard.classList.remove("is-signup");
}

// ==========================================
// 🔐 [3] 실제 로그인 / 회원가입 연동 (Django accounts 앱)
// /accounts/login/, /accounts/signup/ 으로 POST해서 실제 세션 쿠키로 로그인한다.
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

// Django가 폼 에러와 함께 같은 페이지를 다시 렌더링(200)했을 때, 에러 텍스트를 뽑아온다.
// (JSON이 아니라 실제 렌더링된 Django Template 응답에서 에러 문구만 읽어오는 것)
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
        // 🎯 로그인 성공: Django가 302로 홈(or ?next=)으로 리다이렉트하고, fetch가
        // 그 리다이렉트를 그대로 따라가므로 최종 res.url이 /accounts/login/이 아니게 된다.
        // 실패: 같은 로그인 폼을 에러와 함께 200으로 재렌더링.
        if (res.redirected || !res.url.includes("/accounts/login/")) {
          window.location.reload(); // 세션 쿠키가 잡혔으니 새로고침해서 nav도 실제 상태로 갱신
          return null;
        }
        return res.text();
      })
      .then((htmlText) => {
        if (htmlText == null) return; // 이미 리로드 처리됨
        showAuthError("login-error", extractDjangoFormError(htmlText));
      })
      .catch((err) => {
        console.error("🚨 로그인 처리 중 오류:", err);
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

    // 🎯 [단순화] 이메일/비밀번호 확인 입력칸은 뺐음 — 서버(SignUpForm)도
    // 이메일은 선택값으로, password2는 password1을 그대로 복사해서 처리함.
    const nickname = document.getElementById("signup-nickname")?.value.trim();
    const username = document.getElementById("signup-username")?.value.trim();
    const password1 = document.getElementById("signup-password1")?.value;
    const gender = document.getElementById("signup-gender")?.value;
    const agreePrivacy = document.getElementById("check-agree")?.checked;

    if (!nickname || !username || !password1) {
      showAuthError("signup-error", "필수 항목을 모두 입력해주세요.");
      return;
    }
    if (!gender) {
      showAuthError("signup-error", "성별을 선택해주세요.");
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
        username,
        password1,
        gender,
        agree_privacy: "on",
      }),
    })
      .then((res) => {
        if (res.redirected || !res.url.includes("/accounts/signup/")) {
          // 🎯 [진짜 성공 시에만] 서버가 회원가입을 마쳤을 때만 여기로 온다
          // (자동 로그인은 하지 않음). 예전엔 여기서 바로 새로고침했는데,
          // 이제 "회원가입 완료" 팝업(signUpSuccess-section)을 먼저 보여주고,
          // "로그인하러 가기"를 눌러야 로그인 폼에서 직접 로그인하게 한다.
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
        console.error("🚨 회원가입 처리 중 오류:", err);
        showAuthError("signup-error", "회원가입 처리 중 오류가 발생했어요.");
      });
  });
}
