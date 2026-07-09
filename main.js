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