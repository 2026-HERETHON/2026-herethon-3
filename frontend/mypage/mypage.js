const menuItems = document.querySelectorAll(".myPage-menuItem");
const contents = document.querySelectorAll(".myPage-content");

menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    const target = item.dataset.menu;

    // 메뉴 활성화 표시 전환
    menuItems.forEach((m) => m.classList.remove("active"));
    item.classList.add("active");

    // 내용 전환
    contents.forEach((content) => {
      if (content.dataset.menu === target) {
        content.classList.remove("myPage-hide");
      } else {
        content.classList.add("myPage-hide");
      }
    });
  });
});

// ===== 찜한 동네 레이더 차트 =====
// ===== 찜한 동네 레이더 차트 =====
function renderSavedChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  new Chart(ctx, {
    type: "radar",
    data: {
      labels: [
        "CCTV", "가로등", "파출소", "비상벨",
        ["범죄주의", "구간"], ["여성 밤길", "안전"],
      ],
      datasets: [{
        data: data,
        backgroundColor: "rgba(23, 137, 255, 0.55)",
        borderColor: "#1077ff",
        borderWidth: 1.5,
        pointBackgroundColor: "#1077ff",
        pointRadius: 1,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      layout: { padding: 0 },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { display: false, stepSize: 25 },
          backgroundColor: "#F0EDEE",
          startAngle: 0,
          grid: { color: "#D9D2D4" },
          angleLines: { color: "#D9D2D4" },
          pointLabels: {
            font: { family: "Pretendard", size: 12, weight: "600" },
            color: "#7B7578",
            lineHeight: 1.5,
          },
        },
      },
      maintainAspectRatio: false,
    },
  });
}

// count 데이터를 100점 만점 차트 값으로 변환 (BE 공식)
function toChartData(fields) {
  const cctv = Math.min((fields.cctv_count || 0) / 4, 100);
  const light = Math.min((fields.light_count || 0) / 5, 100);
  const police = Math.min((fields.police_count || 0) * 50, 100);
  const bell = Math.min((fields.bell_count || 0) * 10, 100);
  const crime = fields.crime_zone_grade
    ? (11 - parseFloat(fields.crime_zone_grade)) * 10 : 50;
  const night = fields.night_safety_grade
    ? (11 - parseFloat(fields.night_safety_grade)) * 10 : 50;
  return [cctv, light, police, bell, crime, night];
}

// 상계동 실제 데이터 (BE 문서 기준)
const sanggyeData = {
  cctv_count: 1761,
  light_count: 2776,
  bell_count: 28,
  police_count: 4,
  // crime/night 등급은 문서에 없어서 기본값 50 처리
};

// 신림동 임시 데이터 (실제 count 없어서 임시, 나중에 API로 교체)
const sillimData = {
  cctv_count: 1200,
  light_count: 2000,
  bell_count: 20,
  police_count: 3,
};

renderSavedChart("savedChart-sanggye", toChartData(sanggyeData));
renderSavedChart("savedChart-sillim", toChartData(sillimData));