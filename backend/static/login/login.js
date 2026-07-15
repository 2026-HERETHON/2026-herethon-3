// login/login.js

function handleLoginSuccess(tokenFromServer) {
  localStorage.setItem("loginToken", tokenFromServer);
  location.href = "/";
}

function handleLogout() {
  localStorage.removeItem("loginToken");
  alert("로그아웃 되었습니다.");
  location.reload();
}

// ==========================================
// 🔓 [1] 로그인 / 회원가입 팝업 초기화 및 토글 기능
// ==========================================
function initAuthEvents() {
  const authCard = document.getElementById("auth-card");
  const popupContent = document.getElementById("loginPopupContent");

  if (!authCard || !popupContent) return;

  const goToSignupBtn = document.getElementById("go-to-signup");
  const goToLoginBtn = document.getElementById("go-to-login");

  // 각 섹션들 수집
  const loginSec = authCard.querySelector(".login-section");
  const signupSec = authCard.querySelector(".signup-section");
  const infoSec = authCard.querySelector(".info-section");
  const scoreSec = authCard.querySelector(".scoreInfo-section");

  // 🎯 강제 초기화: 로그인 화면만 켜고 '점수 창'을 포함한 나머지는 무조건 숨김!
  if (loginSec) loginSec.style.display = "block";
  if (signupSec) signupSec.style.display = "none";
  if (infoSec) infoSec.style.display = "none";
  if (scoreSec) scoreSec.style.display = "none";

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
    });
  }

  // 로그인하러 가기 클릭 (창 축소)
  if (goToLoginBtn) {
    goToLoginBtn.replaceWith(goToLoginBtn.cloneNode(true));
    document.getElementById("go-to-login").addEventListener("click", () => {
      authCard.classList.remove("is-signup");
      popupContent.style.width = "518px";
      popupContent.style.height = "689px";

      if (signupSec) signupSec.style.display = "none";
      if (infoSec) infoSec.style.display = "none";
      if (scoreSec) scoreSec.style.display = "none";
      if (loginSec) loginSec.style.display = "block";
    });
  }

  // 회원가입 창 내 '자세히 보기' 누르면 개인정보 방침 띄우기
  const showInfoBtn = signupSec?.querySelector(".login-personalInfoDetails");
  if (showInfoBtn) {
    showInfoBtn.addEventListener("click", () => {
      if (signupSec) signupSec.style.display = "none"; // 🎯 오타(style.style) 제거 완료!
      if (infoSec) infoSec.style.display = "block";
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
      });
    });
  }
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

  // 🎯 점수 기준창을 켰을 때는 로그인, 회원가입, 개인정보를 확실하게 숨김
  if (loginSec) loginSec.style.display = "none";
  if (signupSec) signupSec.style.display = "none";
  if (infoSec) infoSec.style.display = "none";
  if (scoreSec) scoreSec.style.display = "block";

  authCard.classList.remove("is-signup");
}
