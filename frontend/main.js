const NavSelected = document.querySelectorAll(".navbar-menu");
const NavUnderline = document.querySelector(".navbar-underline");
const pageGroups = document.querySelectorAll(".main-page-group");

function updateUnderline(target) {
  if (!NavUnderline || !target) return;
  NavUnderline.style.width = `${target.offsetWidth}px`;
  NavUnderline.style.transform = `translateX(${target.offsetLeft}px)`;
}

NavSelected.forEach((menu) => {
  menu.addEventListener("click", (e) => {
    const currentMenu = e.target.closest(".navbar-menu");
    if (!currentMenu) return;

    // 1. 네비게이션 스타일 토글
    NavSelected.forEach((m) => m.classList.remove("beBold"));
    currentMenu.classList.add("beBold");

    // 2. 밑줄 이동
    updateUnderline(currentMenu);

    // 3. 페이지 컴포넌트 전환
    const targetPageId = currentMenu.getAttribute("data-target");

    pageGroups.forEach((page) => {
      if (page.id === targetPageId) {
        page.classList.remove("main-page-hide"); // 해당 탭 화면 켜기
      } else {
        page.classList.add("main-page-hide"); // 다른 탭 화면 끄기
      }
    });

    //
    if (targetPageId === "page-safetyMap") {
      const ctx = document.getElementById("safetyRadarChart");
      if (ctx) {
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
          existingChart.resize();
          existingChart.update();
        }
      }
    }
  });
});

// 초기 로드 시 활성화된 메뉴 밑줄 정렬
const activeMenu = document.querySelector(".navbar-menu.beBold");
if (activeMenu) {
  setTimeout(() => updateUnderline(activeMenu), 50);
}

// index.html 하단에서 생성한 카카오맵 객체를 가져오기 위한 안전장치
document.addEventListener("DOMContentLoaded", () => {
  // 브라우저의 Ctrl + 플러스/마이너스/휠 확대 축소를 막고 지도에 바인딩
  window.addEventListener("keydown", function (e) {
    // 카카오맵 객체가 전역이나 어딘가에 생성되어 있는지 확인 (index.html의 map 변수)
    // 만약 index.html에서 var map으로 선언했다면 window.map으로 접근 가능하게 설정을 확인해야 합니다.
    const kakaoMap = window.map || (typeof map !== "undefined" ? map : null);

    // Ctrl 키가 눌린 상태에서 +, -, 0(기본배율 리셋)을 누르는 경우 가로채기
    if (
      e.ctrlKey &&
      (e.key === "=" || e.key === "+" || e.key === "-" || e.key === "0")
    ) {
      e.preventDefault();

      if (!kakaoMap) return; // 지도가 아직 안 켜졌다면 무시

      let currentLevel = kakaoMap.getLevel();

      if (e.key === "=" || e.key === "+") {
        // Ctrl + [+] 누르면 지도 확대 (레벨 낮추기)
        if (currentLevel > 1) {
          kakaoMap.setLevel(currentLevel - 1);
        }
      } else if (e.key === "-") {
        // Ctrl + [-] 누르면 지도 축소 (레벨 높이기)
        if (currentLevel < 14) {
          kakaoMap.setLevel(currentLevel + 1);
        }
      }
    }
  });

  // Ctrl + 마우스 휠 굴려서 브라우저 확대하는 것도 추가로 차단
  window.addEventListener(
    "wheel",
    function (e) {
      if (e.ctrlKey) {
        e.preventDefault(); // Ctrl + 휠로 브라우저 전체가 커지는 현상 차단

        const kakaoMap =
          window.map || (typeof map !== "undefined" ? map : null);
        if (!kakaoMap) return;

        let currentLevel = kakaoMap.getLevel();
        if (e.deltaY < 0) {
          // 휠을 위로 올리면 (확대)
          if (currentLevel > 1) kakaoMap.setLevel(currentLevel - 1);
        } else {
          // 휠을 아래로 내리면 (축소)
          if (currentLevel < 14) kakaoMap.setLevel(currentLevel + 1);
        }
      }
    },
    { passive: false },
  ); // 디폴트 동작 차단을 위해 passive 옵션을 false
});

document.addEventListener("DOMContentLoaded", () => {
  // 1. 로그인 상태에 따른 네비게이션 바 변경 함수 정의
  function renderNavbar() {
    // 🔓 실제 연동용: localStorage에 토큰이 있으면 true(로그인), 없으면 false(로그아웃)
    // const isTokenExist = localStorage.getItem("token")

    // 💡 [테스트 스위치] 원하는 상태를 주석 해제해서 확인해봐!
    // const token = true; // 🔓 로그인 상태 테스트할 때 주석 해제
    const token = false; // 🔒 로그아웃 상태 테스트할 때 주석 해제

    const navbarContainer = document.getElementById("navbar-container");

    // 오른쪽 로그인 버튼 영역 찾아오기 (a 태그)
    const loginLink = navbarContainer.querySelector(".navbar-ahref");
    if (!loginLink) return;

    if (token) {
      // 🔓 로그인된 상태: [마이페이지]와 [로그아웃] 버튼으로 변경
      loginLink.outerHTML = `
        <div class="navbar-userMenu" style="display: flex; align-items: center; gap: 20px; padding-right: 60px;">
          <a href="./mypage/mypage.html" class="navbar-ahref" style="text-decoration: none; color: inherit; margin-right:37px;">
          <div style="display:flex; gap: 9px; align-items:center;">
          <img src="./main-images/account.svg" alt="마이페이지"/>
          <span class="navbar-mypage" style="cursor: pointer;">마이페이지</span>
          </div>
          </a>
          <div class="navbar-logout" id="nav-logout-btn" style="cursor: pointer;">로그아웃</div>
        </div>
      `;

      // 로그아웃 버튼 기능 바인딩
      document
        .getElementById("nav-logout-btn")
        .addEventListener("click", () => {
          if (confirm("로그아웃 하시겠습니까?")) {
            localStorage.removeItem("loginToken"); // 토큰 삭제
            alert("로그아웃 되었습니다.");
            location.reload(); // 페이지 새로고침해서 nav 다시 그리기
          }
        });
    } else {
      // 🔒 비로그인 상태: 원래 디자인 유지 (혹시 로그아웃 후 대비용)
      // index.html에 기본으로 적혀있기 때문에 처음 로드될 때는 처리가 필요 없지만,
      // 명시적으로 코드를 관리하고 싶다면 여기에 기본 HTML 구조를 넣어줘도 좋아!
    }
  }

  // 2. 페이지 로드 시 상단 바 상태 바로 반영하기
  renderNavbar();

 // main.js 파일 맨 최하단 (renderNavbar 실행 코드 바로 아랫부분)을 아래 코드로 덮어씌우기

  // 2. 페이지 로드 시 상단 바 상태 바로 반영하기
  renderNavbar();

  // 🎯 메인페이지 네비바 로그인 버튼 팝업 바인딩
  const mainNavLoginBtn = document.getElementById("main-nav-login-btn");

  if (mainNavLoginBtn) {
    mainNavLoginBtn.addEventListener("click", (e) => {
      e.preventDefault(); // 주소창 페이지 이동 완전 차단

      const overlay = document.getElementById("loginPopupOverlay");
      const contentBox = document.getElementById("loginPopupContent");

      // 외부 login.html 조립용 데이터 통신 fetch
      fetch("./login/login.html")
        .then((response) => {
          if (!response.ok) throw new Error("네트워크 응답에 문제가 있습니다.");
          return response.text();
        })
        .then((htmlData) => {
          // 팝업 상자 내부 알맹이 꽂아넣기
          contentBox.innerHTML = htmlData;

          // 초기 로그인 창 디폴트 규격 세팅 및 숨김 제거
          contentBox.style.width = "518px";
          contentBox.style.height = "689px";
          overlay.classList.remove("popup-hide");

          // ⭐️ login.js 파일에 등록된 초기 은닉 및 토글 전환 스크립트(initAuthEvents) 활성화!
          if (typeof initAuthEvents === "function") {
            initAuthEvents();
          } else {
            console.error("🚨 login.js의 initAuthEvents 함수를 로드하지 못했습니다.");
          }

          // [X] 모달 내부 닫기 버튼 기능 결합
          const closeBtns = contentBox.querySelectorAll(".login-closeBtn img");
          closeBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
              overlay.classList.add("popup-hide");
            });
          });
        })
        .catch((err) =>
          console.error("🚨 메인 내비바 팝업 로드 중 에러 발생:", err)
        );
    });
  }
}); // DOMContentLoaded의 마지막 닫는 괄호