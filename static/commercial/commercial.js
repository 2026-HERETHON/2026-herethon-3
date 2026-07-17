document.addEventListener("DOMContentLoaded", () => {
  const menuItems = document.querySelectorAll(".menu-item");

  menuItems.forEach((item) => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-target");

      // "안심맵" 클릭 시 메인 페이지(home)로 이동
      if (target === "safetyMap") {
        window.location.href = "/";
        return;
      }

      // 그 외(제휴 서비스)는 현재 페이지이므로 활성 스타일만 갱신
      menuItems.forEach((m) => m.classList.remove("active"));
      item.classList.add("active");

      // "제휴 문의"는 아직 실제로 연결된 페이지/폼이 없어서, 눌러도
      // 아무 일도 안 일어나는 것처럼 보이던 걸 안내 모달로 알려줌
      if (target === "inquiry") {
        window.showInfoModal?.({
          title: "서비스 <span>준비</span> 중입니다.",
          desc: "제휴 문의 기능을 준비하고 있어요.<br>조금만 기다려주세요!",
        });
      }
    });
  });

  // 상세보기 버튼: 실제 상세 페이지/모달이 아직 없어서 준비 중 안내로 대체
  const detailBtns = document.querySelectorAll(".btn-detail");
  detailBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const service = btn.getAttribute("data-service");
      console.log(`[제휴 서비스] '${service}' 상세보기 클릭됨`);
      window.showInfoModal?.({
        title: "서비스 <span>준비</span> 중입니다.",
        desc: "상세 페이지를 준비하고 있어요.<br>조금만 기다려주세요!",
      });
    });
  });
});

// 예전엔 이 페이지가 독립된 static 파일이라 main.js가 안 실행돼서 상단
// 내비바 클릭 이동/밑줄 정렬을 여기서 직접 처리해야 했음. 이제는 home.html
// 안의 탭 중 하나라서 main.js가 항상 같이 로드되어 있고,
// 그쪽의 nav 클릭/밑줄 로직을 그대로 재사용하면 되므로 중복 코드를 제거함.
// (그대로 남겨뒀다면 안심맵 클릭 시 여기서 또 새로고침 이동을 시켜서
// 다른 탭처럼 부드럽게 전환되지 않고 화면이 뚝 끊기는 문제가 생겼을 것)
