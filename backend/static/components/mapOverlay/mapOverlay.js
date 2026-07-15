// ===== 지역 데이터 (실제 API 연동) =====
// 시/도 목록은 대한민국 17개 시/도 고정 목록이고, 그 아래 구/동은
// backend grids API(/grids/districts/, /grids/?is_legal_dong=true)에서
// 실제 데이터를 받아와 채운다. 아직 데이터가 없는 시/도·구는 목록엔 보이되
// 하위 항목은 "-"로 표시된다.
const SIDO_LIST = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "충청북도",
  "충청남도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
  "강원특별자치도",
  "전북특별자치도",
];

// { 시도: { 구: [동, ...] } }
const regionData = {};
SIDO_LIST.forEach((sido) => {
  regionData[sido] = {};
});

// 동 이름 -> 실제 Grid 데이터(안심점수/시설 개수/좌표/id) 조회용
const dongLookup = {};

// 구 이름 -> 데이터 보유 여부(District.has_data). 구 목록에서 "준비중" 표시용
const guHasData = {};

// 동 이름 -> 데이터 보유 여부. 동 목록에서 "준비중" 표시용
const dongHasData = {};

// 법정동 참고 목록 (아직 안심 데이터는 없지만, 실제 존재하는 법정동이라
// 미리 보여주고 "(준비중)"으로 표시해두는 목록. 데이터가 채워지면 자동으로
// dongHasData가 true가 되면서 "(준비중)" 표시가 사라진다.)
const LEGAL_DONG_REFERENCE = {
  노원구: ["상계동", "중계동", "하계동", "월계동", "공릉동"],
  관악구: ["신림동", "봉천동", "남현동"],
};

// 현재 선택된 값 (초기 상태는 셋 다 미선택 = "-")
const selected = {
  sido: "",
  gu: "",
  dong: "",
};

// 각 드롭다운 요소 가져오기
const dropdowns = {
  sido: document.querySelector('.mapOverlay-dropdown[data-level="sido"]'),
  gu: document.querySelector('.mapOverlay-dropdown[data-level="gu"]'),
  dong: document.querySelector('.mapOverlay-dropdown[data-level="dong"]'),
};

// ===== 실제 데이터 로딩 =====
async function loadMapOverlayRegionData() {
  // 1) 서울 25개 구 참고 목록 (District 모델 - has_data와 무관하게 전체 25개 노출)
  try {
    const res = await fetch("/grids/districts/");
    if (res.ok) {
      const data = await res.json();
      (data.districts || []).forEach((d) => {
        guHasData[d.name] = !!d.has_data;
        if (!regionData["서울특별시"][d.name]) {
          regionData["서울특별시"][d.name] = [];
        }
      });
    }
  } catch (err) {
    console.error("🚨 구 목록(districts) 로딩 실패:", err);
  }

  // 2) 실제 법정동 목록 + 상세 데이터(안심점수, 시설 개수, 좌표)
  try {
    const res = await fetch("/grids/?is_legal_dong=true");
    if (res.ok) {
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : data.grids || [];

      rawList.forEach((item) => {
        const fields = item.fields ? item.fields : item;
        const gridId = item.pk || item.id;
        const grid = { id: gridId, ...fields };

        if (!grid.sido || !grid.gu || !grid.dong) return;

        if (!regionData[grid.sido]) regionData[grid.sido] = {};
        if (!regionData[grid.sido][grid.gu]) regionData[grid.sido][grid.gu] = [];
        if (!regionData[grid.sido][grid.gu].includes(grid.dong)) {
          regionData[grid.sido][grid.gu].push(grid.dong);
        }

        dongLookup[grid.dong] = grid;
        dongHasData[grid.dong] = true;
      });
    }
  } catch (err) {
    console.error("🚨 법정동 목록(grids) 로딩 실패:", err);
  }

  // 3) 아직 데이터는 없지만 실제 존재하는 법정동을 참고 목록으로 추가 ("(준비중)" 표시용)
  Object.entries(LEGAL_DONG_REFERENCE).forEach(([gu, dongs]) => {
    if (!regionData["서울특별시"][gu]) regionData["서울특별시"][gu] = [];
    dongs.forEach((dong) => {
      if (!regionData["서울특별시"][gu].includes(dong)) {
        regionData["서울특별시"][gu].push(dong);
      }
    });
  });
}

// 특정 레벨(sido/gu/dong)의 목록을 채우는 함수
function renderList(level) {
  const dropdown = dropdowns[level];
  const ul = dropdown.querySelector(".mapOverlay-dropdownList");
  const textEl = dropdown.querySelector(".mapOverlay-dropdownText");

  // 이 레벨에서 보여줄 항목 목록 구하기 (상위 단계가 아직 선택 안 됐으면 목록 없음)
  // emptyMessage: 고를 항목이 하나도 없을 때 안내 문구 (상황별로 다르게)
  let items = [];
  let emptyMessage = "선택할 수 있는 항목이 없어요.";

  if (level === "sido") {
    items = Object.keys(regionData);
    emptyMessage = "시/도 목록을 불러오지 못했어요.";
  } else if (level === "gu") {
    if (!selected.sido) {
      emptyMessage = "시/도를 먼저 선택해주세요.";
    } else {
      const guObj = regionData[selected.sido] || {};
      items = Object.keys(guObj);
      emptyMessage = "아직 등록된 구가 없어요.";
    }
  } else if (level === "dong") {
    if (!selected.sido || !selected.gu) {
      emptyMessage = "구를 먼저 선택해주세요.";
    } else {
      const guObj = regionData[selected.sido] || {};
      items = guObj[selected.gu] || [];
      emptyMessage = "아직 등록된 동네가 없어요.";
    }
  }

  // 선택된 값 텍스트 갱신 (아직 선택 안 했으면 "-")
  textEl.textContent = selected[level] || "-";

  // 목록(li) 새로 그리기
  ul.innerHTML = "";

  // 고를 수 있는 항목이 없으면 상황에 맞는 안내 문구 한 줄만 표시
  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "mapOverlay-dropdownItem mapOverlay-dropdownItem--message";
    li.innerHTML = `<span>${emptyMessage}</span>`;
    ul.appendChild(li);
    return;
  }

  items.forEach((name) => {
    const li = document.createElement("li");
    li.className = "mapOverlay-dropdownItem";
    if (name === selected[level]) {
      li.classList.add("selected");
    }

    // 시/도·구/동 목록에서 아직 안심 데이터가 없는 곳은 흐리게 + "(준비중)" 표시
    // (시/도는 서울특별시만 실제 데이터가 있음)
    const isEmpty =
      (level === "sido" && name !== "서울특별시") ||
      (level === "gu" && guHasData[name] === false) ||
      (level === "dong" && !dongHasData[name]);
    if (isEmpty) {
      li.classList.add("mapOverlay-dropdownItem--empty");
    }

    li.innerHTML = `
      <img src="./components/mapOverlay/mapOverlay-images/check-dropdown.png" class="mapOverlay-checkIcon" />
      <span>${name}</span>${isEmpty ? ' <span class="mapOverlay-dropdownBadge">(준비중)</span>' : ""}
    `;

    li.addEventListener("click", (e) => {
      e.stopPropagation();
      selectItem(level, name);
    });

    ul.appendChild(li);
  });
}

// 선택된 동 좌표로 지도 이동 + 우측 사이드바 오픈
// (kakaoMap.js 폴리곤 클릭 / leftPanel.js 검색 결과 클릭과 동일한 패턴 재사용)
function moveMapToSelectedDong() {
  const grid = dongLookup[selected.dong];
  if (!grid) return;

  // 🎯 [지도 이동] 예전엔 여기서 grid.latitude/longitude(DB 대표 좌표)로 직접
  // 이동시켰는데, 이제는 window.showLegalDongOnMap()이 폴리곤을 그리면서
  // 그 도형의 실제 중심(centroid)으로 이동까지 처리해준다. 그래서 여기서는
  // 더 이상 따로 이동시키지 않는다 (아래 showLegalDongOnMap 호출 참고).

  const sidebar = document.querySelector(".rightSB-aside");
  if (sidebar) sidebar.classList.add("open");

  if (window.updateSidebarTitle) {
    window.updateSidebarTitle(grid.dong, grid.dong, grid.id);
  }

  // 🎯 [1번 스펙] 드롭다운으로 선택된 법정동도 검색과 동일하게 취급해서
  // 폴리곤 + 법정동 안심점수 인포윈도우를 지도 위에 표시한다.
  if (window.showLegalDongOnMap) {
    window.showLegalDongOnMap(grid.dong);
  }
}

// =====================================================================
// 🎯 [0번 스펙] leftPanel.js의 검색창에서 검색 결과를 선택했을 때, 이 드롭다운
// (시/도-구-동)도 같은 지역으로 동기화되도록 외부에서 호출할 수 있는 함수.
// =====================================================================
window.syncMapOverlaySelection = function (sido, gu, dong) {
  selected.sido = sido || "";
  selected.gu = gu || "";
  selected.dong = dong || "";

  renderList("sido");
  renderList("gu");
  renderList("dong");
  updateInfoBox();
};

// 항목 선택 처리
function selectItem(level, name) {
  selected[level] = name;

  if (level === "sido") {
    // 시/도 바뀌면 → 구/동은 선택 안 한 "-" 상태로 초기화
    selected.gu = "";
    selected.dong = "";

    renderList("sido");
    renderList("gu");
    renderList("dong");
  } else if (level === "gu") {
    // 구 바뀌면 → 동은 선택 안 한 "-" 상태로 초기화
    selected.dong = "";

    renderList("gu");
    renderList("dong");
  } else {
    // 동 선택
    renderList("dong");
  }

  closeAll();

  updateInfoBox();

  // 동까지 실제로 선택됐을 때만 지도 이동 + 사이드바 오픈
  moveMapToSelectedDong();
}

// 드롭다운 열기/닫기
function toggleDropdown(level) {
  const ul = dropdowns[level].querySelector(".mapOverlay-dropdownList");
  const isHidden = ul.classList.contains("mapOverlay-hide");
  closeAll(); // 다른 건 닫고
  if (isHidden) {
    ul.classList.remove("mapOverlay-hide");
  }
}

// 모든 드롭다운 닫기
function closeAll() {
  Object.values(dropdowns).forEach((d) => {
    d.querySelector(".mapOverlay-dropdownList").classList.add("mapOverlay-hide");
  });
}

// 각 드롭다운의 "닫힌 부분(선택 영역)" 클릭 시 열기/닫기
Object.keys(dropdowns).forEach((level) => {
  const selectedArea = dropdowns[level].querySelector(
    ".mapOverlay-dropdownSelected"
  );
  selectedArea.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown(level);
  });
});

// 바깥 아무 곳이나 클릭하면 전부 닫기
document.addEventListener("click", () => {
  closeAll();
});

// 하단 정보 박스 접기/펼치기
const infoHeader = document.querySelector(".mapOverlay-infoHeader");
const infoList = document.querySelector(".mapOverlay-infoList");
const infoToggle = document.querySelector(".mapOverlay-infoToggle");

infoHeader.addEventListener("click", () => {
  infoList.classList.toggle("mapOverlay-hide");     // 항목들 숨김/보임
  infoToggle.classList.toggle("mapOverlay-flipped"); // 화살표 방향 전환
});

// 하단 정보 박스의 개수를 현재 선택된 동의 실제 데이터(Grid)로 갱신
function updateInfoBox() {
  const grid = dongLookup[selected.dong];

  const countMap = grid
    ? {
        cctv: grid.cctv_count,
        streetlight: grid.light_count,
        police: grid.police_count,
        alarm: grid.bell_count,
      }
    : {};

  document.querySelectorAll(".mapOverlay-infoCount").forEach((el) => {
    const type = el.dataset.type; // cctv / streetlight / police / alarm
    const value = countMap[type];

    if (value === undefined || value === null) {
      el.textContent = "-";
      return;
    }
    el.textContent = type === "police" ? `${value}곳` : `${value}개`;
  });
}

// ===== 초기 렌더링: 데이터 로딩과 무관하게 즉시 "-" 상태로 표시 =====
renderList("sido");
renderList("gu");
renderList("dong");
updateInfoBox();

// ===== 실제 데이터 로딩 (구/동 실제 목록 채우기) =====
(async function initMapOverlay() {
  await loadMapOverlayRegionData();

  // 로딩 완료 후, 사용자가 이미 시/도·구를 선택해둔 상태라면 최신 데이터로 다시 그려줌
  renderList("gu");
  renderList("dong");
})();
