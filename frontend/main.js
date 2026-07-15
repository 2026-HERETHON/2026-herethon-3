import { initKakaoMap } from "./components/kakaoMap/kakaoMap.js";

const NavSelected = document.querySelectorAll(".navbar-menu");
const NavUnderline = document.querySelector(".navbar-underline");
const pageGroups = document.querySelectorAll(".main-page-group");

function updateUnderline(target) {
  if (!NavUnderline || !target) return;
  NavUnderline.style.width = `${target.offsetWidth}px`;
  NavUnderline.style.transform = `translateX(${target.offsetLeft}px)`;
}

// 🎯 [SPA 탭 전환] 클릭했을 때뿐 아니라, 다른 페이지(예: 마이페이지)에서
// "제휴 서비스"를 눌러 /?tab=commercial 로 들어왔을 때도 똑같이 써야 해서
// 탭 전환 로직 자체를 함수로 빼둠 (밑줄 이동 + pageGroups 보이기/숨기기).
function activateTab(currentMenu) {
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

  // 🎯 [버그 수정] 탭을 눌러도 주소창의 ?tab= 값이 안 바뀌어서, 제휴 서비스로
  // 갔다가 안심맵으로 되돌아온 뒤 새로고침하면 다시 제휴 서비스가 떠버렸다.
  // 탭이 바뀔 때마다 현재 보이는 탭에 맞게 주소창도 같이 갱신해준다
  // (history 쌓지 않도록 replaceState만 사용).
  const newUrl = targetPageId === "page-commercial" ? "/?tab=commercial" : "/";
  if (window.location.pathname + window.location.search !== newUrl) {
    history.replaceState(null, "", newUrl);
  }
}

NavSelected.forEach((menu) => {
  menu.addEventListener("click", (e) => {
    const currentMenu = e.target.closest(".navbar-menu");
    if (!currentMenu) return;
    activateTab(currentMenu);
  });
});

// 초기 로드 시 활성화된 메뉴 밑줄 정렬
const activeMenu = document.querySelector(".navbar-menu.beBold");
if (activeMenu) {
  setTimeout(() => updateUnderline(activeMenu), 50);
}

// 🎯 [마이페이지 -> 제휴 서비스 이동] 마이페이지는 완전히 별도 페이지라
// home.html의 탭을 직접 누를 수 없으므로, /?tab=commercial 쿼리로 들어오면
// 도착하자마자 제휴 서비스 탭을 활성화해준다.
const requestedTab = new URLSearchParams(window.location.search).get("tab");
if (requestedTab === "commercial") {
  const commercialMenu = document.querySelector(".navbar-commercial");
  if (commercialMenu) {
    setTimeout(() => activateTab(commercialMenu), 50);
  }
}

// index.html 하단에서 생성한 카카오맵 객체를 가져오기 위한 안전장치
document.addEventListener("DOMContentLoaded", () => {
  initKakaoMap();

  // 브라우저의 Ctrl + 플러스/마이너스/휠 확대 축소를 막고 지도에 바인딩
  window.addEventListener("keydown", function (e) {
    // 카카오맵 객체가 전역이나 어딘가에 생성되어 있는지 확인 (index.html의 map 변수)
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
  // 🎯 로그인 상태(마이페이지/로그아웃 vs 로그인 버튼)는 이제 JS 가짜 토큰이 아니라
  // home.html을 렌더링하는 Django의 request.user.is_authenticated가 그대로 결정해서 내려준다.
  // (진짜 MTV: 서버가 처음 렌더링할 때부터 올바른 상태로 나오므로 JS가 따로 바꿀 필요가 없다)

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
