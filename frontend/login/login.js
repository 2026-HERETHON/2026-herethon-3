function handleLoginSuccess(tokenFromServer) {
  localStorage.setItem("loginToken", tokenFromServer);
  location.href = "../index.html";
}

function handleLogout() {
  localStorage.removeItem("loginToken");
  alert("로그아웃 되었습니다.");
  location.reload();
}

function initAuthEvents() {
  const authCard = document.getElementById("auth-card");
  const popupContent = document.getElementById("loginPopupContent");
  
  const goToSignupBtn = document.getElementById("go-to-signup");
  const goToLoginBtn = document.getElementById("go-to-login");

  // 각 섹션들 수집
  const loginSec = authCard.querySelector(".login-section");
  const signupSec = authCard.querySelector(".signup-section");
  const infoSec = authCard.querySelector(".info-section"); // 🎯 개인정보 섹션

  // 1. 초기 상태 세팅 (로그인만 보이고 나머지는 원천 차단)
  if (loginSec) loginSec.style.display = "block";
  if (signupSec) signupSec.style.display = "none";
  if (infoSec) infoSec.style.display = "none";

  // 2. 회원가입하러 가기 클릭 (창 확장)
  if (goToSignupBtn) {
    goToSignupBtn.addEventListener("click", () => {
      authCard.classList.add("is-signup");
      
      popupContent.style.width = "1142px";
      popupContent.style.height = "743px";

      setTimeout(() => {
        if (loginSec) loginSec.style.display = "none";
        if (infoSec) infoSec.style.display = "none";
        if (signupSec) signupSec.style.display = "block"; // 🎯 순수 회원가입만 노출!
      }, 200);
    });
  }

  // 3. 로그인하러 가기 클릭 (창 축소)
  if (goToLoginBtn) {
    goToLoginBtn.addEventListener("click", () => {
      authCard.classList.remove("is-signup");
      
      popupContent.style.width = "518px";
      popupContent.style.height = "689px";

      setTimeout(() => {
        if (signupSec) signupSec.style.display = "none";
        if (infoSec) infoSec.style.display = "none";
        if (loginSec) loginSec.style.display = "block";
      }, 200);
    });
  }

  // 4. [선택 추가] 회원가입 창 내 '자세히 보기' 누르면 개인정보 방침 띄우기
  const showInfoBtn = signupSec?.querySelector(".login-personalInfoDetails");
  if (showInfoBtn) {
    showInfoBtn.addEventListener("click", () => {
      if (signupSec) signupSec.style.display = "none";
      if (infoSec) infoSec.style.display = "block";
    });
  }

  // ==========================================
  // 👁️ 비밀번호 보이기 / 숨기기 토글 기능
  // ==========================================
  
  // 팝업 내부에 있는 모든 비밀번호 눈 모양 이미지(.login-seeImg)를 찾아서 이벤트를 걸어줍니다.
  const seeIcons = authCard.querySelectorAll(".login-seeImg");

  seeIcons.forEach((icon) => {
    icon.addEventListener("click", (e) => {
      // 클릭한 눈 모양 아이콘과 같은 부모 박스 안에 있는 input 창을 타겟팅
      const inputBox = e.target.closest(".login-inputBox");
      const passwordInput = inputBox.querySelector("input");

      if (passwordInput.type === "password") {
        // 1. 비밀번호가 숨겨져 있을 때 -> 보이게 처리
        passwordInput.type = "text";
        // 💡 눈 모양 이미지를 '비밀번호 숨기기(안 보게 하기)' 아이콘으로 변경
        // 만약 안 보이는 눈 모양 이미지(예: no-see.svg)가 따로 있다면 경로를 바꿔줘!
        // 없거나 똑같은 걸 쓴다면 아래 src 변경 줄은 주석 처리해도 돼.
        e.target.src = "./login/login-images/see.svg"; 
        
      } else {
        // 2. 비밀번호가 보이고 있을 때 -> 다시 숨김 처리
        passwordInput.type = "password";
        // 💡 다시 원래 눈 모양 아이콘으로 복원
        e.target.src = "./login/login-images/see.svg"; 
      }
    });
  });

}