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
  window.addEventListener('keydown', function (e) {
    // 카카오맵 객체가 전역이나 어딘가에 생성되어 있는지 확인 (index.html의 map 변수)
    // 만약 index.html에서 var map으로 선언했다면 window.map으로 접근 가능하게 설정을 확인해야 합니다.
    const kakaoMap = window.map || (typeof map !== 'undefined' ? map : null);

    // Ctrl 키가 눌린 상태에서 +, -, 0(기본배율 리셋)을 누르는 경우 가로채기
    if (e.ctrlKey && (e.key === '=' || e.key === '+' || e.key === '-' || e.key === '0')) {
      e.preventDefault(); 

      if (!kakaoMap) return; // 지도가 아직 안 켜졌다면 무시

      let currentLevel = kakaoMap.getLevel();

      if (e.key === '=' || e.key === '+') {
        // Ctrl + [+] 누르면 지도 확대 (레벨 낮추기)
        if (currentLevel > 1) {
          kakaoMap.setLevel(currentLevel - 1);
        }
      } else if (e.key === '-') {
        // Ctrl + [-] 누르면 지도 축소 (레벨 높이기)
        if (currentLevel < 14) {
          kakaoMap.setLevel(currentLevel + 1);
        }
      }
    }
  });

  // Ctrl + 마우스 휠 굴려서 브라우저 확대하는 것도 추가로 차단
  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey) {
      e.preventDefault(); // Ctrl + 휠로 브라우저 전체가 커지는 현상 차단
      
      const kakaoMap = window.map || (typeof map !== 'undefined' ? map : null);
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
  }, { passive: false }); // 디폴트 동작 차단을 위해 passive 옵션을 false
});