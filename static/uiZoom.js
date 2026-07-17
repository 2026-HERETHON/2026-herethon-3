// 마이페이지(profile.html)도 home.html(안심맵 SPA)과 똑같은 비율로
// nav가 줄어들게 하기 위한 공용 스크립트.
//
// main.js에도 거의 같은 계산식(applyResponsiveZoom)이 있지만, main.js는
// ES 모듈이고 안심맵 SPA 전용 로직(카카오맵 초기화, 로그인 팝업, 좌/우
// 사이드바 강제 리사이즈, 탭 전환 등)이 잔뜩 딸려 있어서 그대로 마이페이지에
// 불러오면 존재하지 않는 요소를 찾다가 불필요한 부작용/에러가 생길 수 있음.
// 그래서 "--ui-zoom 변수 계산" 부분만 똑같이 떼어내 여기 따로 둠.
// (main.css의 #navbar-container는 이미 zoom: var(--ui-zoom, 1)로
// 스타일링돼 있어서, 이 변수만 똑같이 채워주면 nav는 home.html과 동일한
// 비율로 알아서 줄어듦)
//
// 계산식은 main.js의 NAV_HEIGHT/SIDEBAR_DESIGN_HEIGHT와 반드시 동일하게
// 맞춰야 두 페이지를 오갈 때 nav 크기가 안 튐:
//   zoom = min(1, 창높이 / (nav높이(60) + 기준높이(1020)))
(function () {
  const NAV_HEIGHT = 60;
  const SIDEBAR_DESIGN_HEIGHT = 1020;

  function applyUiZoom() {
    const zoom = Math.min(
      1,
      window.innerHeight / (NAV_HEIGHT + SIDEBAR_DESIGN_HEIGHT),
    );
    document.documentElement.style.setProperty("--ui-zoom", zoom);
  }

  document.addEventListener("DOMContentLoaded", applyUiZoom);

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyUiZoom, 150);
  });
})();
