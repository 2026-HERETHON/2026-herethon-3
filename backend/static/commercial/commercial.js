document.addEventListener("DOMContentLoaded", () => {
  const menuItems = document.querySelectorAll(".menu-item");

  menuItems.forEach((item) => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-target");

      // 🔙 "안심맵" 클릭 시 메인 페이지(home)로 이동
      if (target === "safetyMap") {
        window.location.href = "/";
        return;
      }

      // 그 외(제휴 서비스)는 현재 페이지이므로 활성 스타일만 갱신
      menuItems.forEach((m) => m.classList.remove("active"));
      item.classList.add("active");
    });
  });

  // 상세보기 버튼 (추후 상세 페이지/모달 연결용 자리)
  const detailBtns = document.querySelectorAll(".btn-detail");
  detailBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const service = btn.getAttribute("data-service");
      console.log(`[제휴 서비스] '${service}' 상세보기 클릭됨`);
      // TODO: 실제 상세 페이지/모달 연결 예정
    });
  });
});

// 네비바: 안심맵 클릭 시 메인으로 이동 + 밑줄 위치 잡기
document.addEventListener("DOMContentLoaded", () => {
  const safetyMenu = document.querySelector(".navbar-safetyMap");
  if (safetyMenu) {
    safetyMenu.addEventListener("click", () => {
      window.location.href = "/";
    });
  }

  // 활성 메뉴(제휴 서비스)에 밑줄 정렬
  const underline = document.querySelector(".navbar-underline");
  const activeMenu = document.querySelector(".navbar-menu.beBold");
  if (underline && activeMenu) {
    setTimeout(() => {
      underline.style.width = `${activeMenu.offsetWidth}px`;
      underline.style.transform = `translateX(${activeMenu.offsetLeft}px)`;
    }, 50);
  }
});