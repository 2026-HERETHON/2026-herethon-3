// accounts/static/accounts/mypage.js
//
// 🎯 [진짜 MTV] 예전 static 목업의 mypage.js는 상계동/신림동 데이터를 하드코딩해서
// 차트 2개만 그렸는데, 이제는 서버(accounts/profile.html)가 실제 찜한 동네 카드를
// 전부 렌더링하고 각 카드의 canvas에 data-* 속성으로 실제 grid 수치만 실어서 내려준다.
// (마크업 자체는 서버가 렌더링 — 차트 좌표값 같은 순수 집계 수치만 JS가 읽어서
//  Chart.js에 넘기는 건 카드 마크업을 재조립하는 것과는 다른, 정당한 프론트 연산임)

// ==========================================
// [1] 좌측 메뉴 탭 전환 (기존 로직 그대로 유지 — 서버가 이미 모든 탭의
//     실제 콘텐츠를 한 번에 렌더링해두었으므로 그냥 보이기/숨기기만 하면 됨)
// ==========================================
const menuItems = document.querySelectorAll(".myPage-menuItem");
const contents = document.querySelectorAll(".myPage-content");

menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    const target = item.dataset.menu;

    menuItems.forEach((m) => m.classList.remove("active"));
    item.classList.add("active");

    contents.forEach((content) => {
      if (content.dataset.menu === target) {
        content.classList.remove("myPage-hide");
      } else {
        content.classList.add("myPage-hide");
      }
    });
  });
});

// ==========================================
// [2] 찜한 동네 레이더 차트 — 실제 grid 수치를 data-* 속성에서 읽어옴
// ==========================================
function renderSavedChart(canvas) {
  if (!canvas) return;

  const fields = {
    cctv_count: parseFloat(canvas.dataset.cctvCount) || 0,
    light_count: parseFloat(canvas.dataset.lightCount) || 0,
    bell_count: parseFloat(canvas.dataset.bellCount) || 0,
    police_count: parseFloat(canvas.dataset.policeCount) || 0,
    crime_zone_grade: parseFloat(canvas.dataset.crimeZoneGrade) || 0,
    night_safety_grade: parseFloat(canvas.dataset.nightSafetyGrade) || 0,
  };

  new Chart(canvas, {
    type: "radar",
    data: {
      labels: [
        "CCTV", "가로등", "파출소", "비상벨",
        ["범죄주의", "구간"], ["여성 밤길", "안전"],
      ],
      datasets: [{
        data: toChartData(fields),
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

// count 데이터를 100점 만점 차트 값으로 변환 (BE 공식 — 메인 지도/mypage 동일하게 유지)
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

document.querySelectorAll(".myPage-savedChartBox canvas").forEach(renderSavedChart);

// ==========================================
// [3] 실거주지 인증 — GPS 인증 / 실거주지 설정
// (accounts/profile_residence.html에 있던 로직을 그대로 옮겨옴 — 같은 화면 안의
//  다른 탭일 뿐이라 API 호출 대상 URL도 동일하게 유지)
// ==========================================
function getCookie(name) {
  let value = null;
  document.cookie.split(";").forEach((c) => {
    const [k, v] = c.trim().split("=");
    if (k === name) value = v;
  });
  return value;
}

document.getElementById("verify-residence-btn")?.addEventListener("click", (e) => {
  const btn = e.currentTarget;
  const resultEl = document.getElementById("verify-result");
  if (!navigator.geolocation) {
    if (resultEl) resultEl.textContent = "이 브라우저에서는 위치 확인을 지원하지 않아요.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const res = await fetch(btn.dataset.confirmUrl, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        });
        const data = await res.json();
        if (resultEl) resultEl.textContent = data.message || data.error || "";
        if (data.verified) {
          // 인증 완료 상태를 반영하려면 최신 데이터로 다시 렌더링해야 하므로 새로고침
          location.reload();
        }
      } catch (err) {
        console.error("🚨 실거주지 인증 중 오류:", err);
        if (resultEl) resultEl.textContent = "인증 처리 중 오류가 발생했어요.";
      }
    },
    () => {
      if (resultEl) resultEl.textContent = "위치 권한을 허용해주세요.";
    },
  );
});

document.getElementById("set-residence-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const gridId = form.grid_id.value;
  if (!gridId) return;

  try {
    const res = await fetch(form.dataset.setUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: { "X-CSRFToken": getCookie("csrftoken") },
      body: new URLSearchParams({ grid_id: gridId }),
    });
    const data = await res.json();
    if (data.success) location.reload();
  } catch (err) {
    console.error("🚨 실거주지 설정 중 오류:", err);
  }
});
