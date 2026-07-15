// 가이드 박스 닫기 (✕ 클릭)
document.querySelector(".leftPanel-closeIcon")?.addEventListener("click", () => {
  document.querySelector(".leftPanel-guideBox").style.display = "none";
});

// 초기화 버튼 클릭 시: CCTV만 체크, 나머지는 해제
document.querySelector(".leftPanel-resetBtn").addEventListener("click", () => {
  const checkboxes = document.querySelectorAll(".leftPanel-customCheckbox input");

  checkboxes.forEach((checkbox) => {
    if (checkbox.id === "leftPanel-filter-cctv") {
      checkbox.checked = true;
    } else {
      checkbox.checked = false;
    }
  });
});