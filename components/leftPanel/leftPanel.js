// components/leftPanel/leftPanel.js
document.querySelector('.filter-header .toggle-icon')?.addEventListener('click', () => {
  document.querySelector('.filter-box').classList.toggle('collapsed');
});

document.querySelector('.guide-header .close-icon')?.addEventListener('click', () => {
  document.querySelector('.guide-box').style.display = 'none';
});

// 초기화 버튼 클릭 시
document.querySelector(".reset-btn").addEventListener("click", () => {
  // 모든 필터 체크박스 가져오기
  const checkboxes = document.querySelectorAll(".custom-checkbox input");

  checkboxes.forEach((checkbox) => {
    // CCTV만 체크, 나머지는 해제
    if (checkbox.id === "filter-cctv") {
      checkbox.checked = true;
    } else {
      checkbox.checked = false;
    }
  });
});