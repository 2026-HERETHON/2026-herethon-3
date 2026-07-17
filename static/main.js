import { initKakaoMap } from "./components/kakaoMap/kakaoMap.js";

const NavSelected = document.querySelectorAll(".navbar-menu");
const NavUnderline = document.querySelector(".navbar-underline");
const pageGroups = document.querySelectorAll(".main-page-group");

function updateUnderline(target) {
  if (!NavUnderline || !target) return;
  NavUnderline.style.width = `${target.offsetWidth}px`;
  NavUnderline.style.transform = `translateX(${target.offsetLeft}px)`;
}

// SPA 탭 전환: 클릭했을 때뿐 아니라 마이페이지에서 /?tab=commercial로
// 들어왔을 때도 써야 해서 함수로 빼둠 (밑줄 이동 + pageGroups 토글).
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

  // 탭을 눌러도 주소창의 ?tab= 값이 안 바뀌어서, 제휴 서비스로 갔다가
  // 안심맵으로 돌아온 뒤 새로고침하면 다시 제휴 서비스가 떠버렸음
  // 탭이 바뀔 때마다 주소창도 갱신 (history 안 쌓게 replaceState만 사용).
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

// 로고 클릭 -> 안심맵 이동: 어떤 탭을 보고 있든 로고를 누르면 항상 안심맵
// 탭으로 돌아가야 함. activateTab을 재사용해 navbar-safetyMap을 직접
// 클릭한 것과 동일하게 동작
const logoImg = document.querySelector(".navbar-logoImg");
if (logoImg) {
  logoImg.addEventListener("click", () => {
    const safetyMapMenu = document.querySelector(".navbar-safetyMap");
    if (safetyMapMenu) activateTab(safetyMapMenu);
  });
}

// 초기 로드 시 활성화된 메뉴 밑줄 정렬
const activeMenu = document.querySelector(".navbar-menu.beBold");
if (activeMenu) {
  setTimeout(() => updateUnderline(activeMenu), 50);
}

// 마이페이지는 별도 페이지라 home.html의 탭을 직접 누를 수 없으므로,
// /?tab=commercial 쿼리로 들어오면 도착하자마자 제휴 서비스 탭을 활성화함
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
  // 로그인 상태는 이제 JS 가짜 토큰이 아니라 Django의
  // request.user.is_authenticated가 결정해서 내려줌

  // 메인페이지 네비바 로그인 버튼 팝업 바인딩
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

          // login.js에 등록된 초기 은닉 및 토글 전환 스크립트(initAuthEvents) 활성화
          if (typeof initAuthEvents === "function") {
            initAuthEvents();
          } else {
            console.error(
              "login.js의 initAuthEvents 함수를 로드하지 못했습니다.",
            );
          }

          // [X] 모달 내부 닫기 버튼 기능 결합
          const closeBtns = contentBox.querySelectorAll(".login-closeBtnImg");
          closeBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
              overlay.classList.add("popup-hide");
            });
          });

          // 모달 내부 뒤로가기 버튼 기능
          const backBtn = contentBox.querySelector(".login-backBtnImg");
          if (backBtn) {
            backBtn.addEventListener("click", () => {
              const authCard = document.getElementById("auth-card");
              if (!authCard) return;

              const signupSec = authCard.querySelector(".signup-section");
              const infoSec = authCard.querySelector(".info-section");

              // 1. 개인정보 방침은 숨기고, 회원가입 화면을 다시 켭니다.
              if (infoSec) infoSec.style.display = "none";
              if (signupSec) signupSec.style.display = "block";

              // 2. 팝업 규격을 회원가입 창 크기로 다시 복원합니다.
              contentBox.style.width = "1142px";
              contentBox.style.height = "743px";
            });
          }
        })
        .catch((err) =>
          console.error("메인 내비바 팝업 로드 중 에러 발생:", err),
        );
    });
  }
}); // DOMContentLoaded의 마지막 닫는 괄호

// 로그인 성공 시 login.js가 호출하는 함수. 예전엔 로그인 성공 후
// location.reload()로 nav를 로그인 상태로 갱신했는데, 그러면 안심맵에서
// 보고 있던 폴리곤/사이드바가 전부 날아가서 처음부터 다시 찾아야 했음.
// 세션 쿠키는 로그인 응답의 Set-Cookie로 이미 반영돼 있으므로, 새로고침
// 없이 nav의 "로그인" 버튼 부분만 마이페이지/로그아웃 링크로 바꿔치기함.
window.applyLoggedInNav = function () {
  document.body.dataset.authenticated = "true";

  const loginBtn = document.getElementById("main-nav-login-btn");
  if (!loginBtn) return; // 이미 로그인 상태로 렌더링돼 있던 경우

  const profileUrl = document.body.dataset.profileUrl || "/accounts/profile/";
  const logoutUrl = document.body.dataset.logoutUrl || "/accounts/logout/";

  loginBtn.outerHTML = `
    <div class="navbar-userMenu" style="display: flex; align-items: center; gap: 20px; padding-right: 60px;">
      <a href="${profileUrl}" class="navbar-ahref" style="text-decoration: none; color: inherit; margin-right:37px;">
        <div style="display:flex; gap: 9px; align-items:center;">
          <img src="main-images/account.svg" alt="마이페이지" />
          <span class="navbar-mypage" style="cursor: pointer;">마이페이지</span>
        </div>
      </a>
      <a href="${logoutUrl}" class="navbar-logout" style="cursor: pointer; text-decoration: none; color: inherit;">로그아웃</a>
    </div>
  `;
};

// =====================================================================
// 노트북 화면 대응 - 좌/우 사이드바를 실제 창 높이에 맞춰 실시간으로 축소.
// 예전엔 "화면 높이 950px 이하면 무조건 zoom 0.8824"라는 고정 배율을
// 미디어 쿼리로 박아놨는데, 이건 딱 그 특정 높이(약 900px)에만 맞는
// 값이라 그보다 더 작은 화면(예: 800px대 노트북)에서는 여전히 사이드바
// 내용이 잘려 보이는 문제가 있었음.
//
// 그래서 고정 배율 대신 매번 실제 window.innerHeight를 읽어서 zoom을
// 계산하도록 바꿈. 기준 높이(DESIGN_HEIGHT=1020)는 기존 CSS에 있던
// "900 / 1020" 배율에서 그대로 가져온 값 - 상단 네비바(60px)를 뺀
// 나머지 영역이 1020px일 때를 "줄이지 않아도 되는 기준"으로 봄.
//
// nav 자체도 이제 같은 zoom으로 줄어들기 때문에("nav도 비율대로 줄어야
// 함" 요청 반영), nav가 실제로 차지하는 높이는 60px이 아니라 60*zoom임.
// 이전엔 availableHeight 계산에 NAV_HEIGHT를 고정 60으로 빼서, nav가
// 줄어든 만큼(60 - 60*zoom) 빈 틈이 아래에 남아 사이드바가 화면 끝까지
// 안 닿는 문제가 있었음.
//
// 그래서 "nav(60) + 사이드바 기준높이(1020) = 전체 기준높이(1080)"를
// 기준으로 zoom부터 먼저 구하고, 그 zoom으로 줄어든 실제 nav 높이를
// 뺀 나머지를 사이드바 사용가능높이로 씀 (연립방정식을 풀면 화면이
// 작을 때 선언 height가 정확히 1020으로 수렴해서 이전과 동일하게
// 동작하고, nav까지 포함해 딱 맞게 채워짐).
//
// 계산식: zoom = min(1, 창높이 / (60 + 1020))
//        사용가능높이 = 창높이 - 60 * zoom
//        선언 height = 사용가능높이 / zoom  (화면이 작을 땐 항상 1020)
// =====================================================================
const NAV_HEIGHT = 60;
const SIDEBAR_DESIGN_HEIGHT = 1020;

function applyResponsiveZoom() {
  const zoom = Math.min(
    1,
    window.innerHeight / (NAV_HEIGHT + SIDEBAR_DESIGN_HEIGHT),
  );
  const availableHeight = window.innerHeight - NAV_HEIGHT * zoom;
  const declaredHeight = availableHeight / zoom;

  // nav, mapOverlay(드롭다운/정보박스/GPS버튼)처럼 JS가 직접 querySelector로
  // 잡지 않는(또는 동적으로 다시 그려질 수 있는) 요소들은 CSS 쪽에서
  // calc(px * var(--ui-zoom))로 스스로 오프셋/크기를 계산하게 함.
  // 이렇게 하면 요소가 나중에 다시 렌더링돼도 별도 JS 재적용 없이
  // 항상 최신 비율을 반영함.
  document.documentElement.style.setProperty("--ui-zoom", zoom);

  [".leftPanel-wrapper", ".rightSB-wholeContainer"].forEach((selector) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.style.zoom = zoom;
    el.style.height = `${declaredHeight}px`;
  });

  // 우측 패널 폭이 zoom에 따라 바뀌므로, GPS 버튼 오프셋도 다시 맞춤
  window.__syncGpsButtonPosition?.();

  // nav도 줄어들면서 밑줄 위치/폭이 바뀌므로 다시 정렬
  const currentMenu = document.querySelector(".navbar-menu.beBold");
  if (currentMenu) updateUnderline(currentMenu);
}

document.addEventListener("DOMContentLoaded", applyResponsiveZoom);

let zoomResizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(zoomResizeTimer);
  zoomResizeTimer = setTimeout(applyResponsiveZoom, 150);
});
