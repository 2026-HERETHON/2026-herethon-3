// ===== 데모 지역 데이터 =====
// 실제 연동되는 경로:
//   서울특별시 > 노원구 > 상계동
//   서울특별시 > 관악구 > 신림동
// 나머지 시/도는 목록엔 보이지만 하위 데이터는 비어있음(데모)
const regionData = {
  서울특별시: {
    노원구: ["상계동"],
    관악구: ["신림동"],
  },
  부산광역시: {},
  대구광역시: {},
  인천광역시: {},
  광주광역시: {},
  대전광역시: {},
  울산광역시: {},
  세종특별자치시: {},
  경기도: {},
  충청북도: {},
  충청남도: {},
  전라남도: {},
  경상북도: {},
  경상남도: {},
  제주특별자치도: {},
  강원특별자치도: {},
  전북특별자치도: {},
};

// 현재 선택된 값
const selected = {
  sido: "서울특별시",
  gu: "노원구",
  dong: "상계동",
};

// 각 드롭다운 요소 가져오기
const dropdowns = {
  sido: document.querySelector('.mapOverlay-dropdown[data-level="sido"]'),
  gu: document.querySelector('.mapOverlay-dropdown[data-level="gu"]'),
  dong: document.querySelector('.mapOverlay-dropdown[data-level="dong"]'),
};

// 특정 레벨(sido/gu/dong)의 목록을 채우는 함수
function renderList(level) {
  const dropdown = dropdowns[level];
  const ul = dropdown.querySelector(".mapOverlay-dropdownList");
  const textEl = dropdown.querySelector(".mapOverlay-dropdownText");

  // 이 레벨에서 보여줄 항목 목록 구하기
  let items = [];
  if (level === "sido") {
    items = Object.keys(regionData);
  } else if (level === "gu") {
    const guObj = regionData[selected.sido] || {};
    items = Object.keys(guObj);
  } else if (level === "dong") {
    const guObj = regionData[selected.sido] || {};
    items = guObj[selected.gu] || [];
  }

  // 선택된 값 텍스트 갱신
  textEl.textContent = selected[level] || "";

  // 목록(li) 새로 그리기
  // 목록(li) 새로 그리기
  ul.innerHTML = "";

  // 데이터가 없으면 "-" 표시
  if (items.length === 0) {
    textEl.textContent = "-";           // 닫힌 상태도 "-"로
    const li = document.createElement("li");
    li.className = "mapOverlay-dropdownItem";
    li.innerHTML = `<span>-</span>`;
    ul.appendChild(li);
    return;
  }

  items.forEach((name) => {
    const li = document.createElement("li");
    li.className = "mapOverlay-dropdownItem";
    if (name === selected[level]) {
      li.classList.add("selected");
    }

    li.innerHTML = `
      <img src="./mapOverlay-images/check-dropdown.png" class="mapOverlay-checkIcon" />
      <span>${name}</span>
    `;

    li.addEventListener("click", (e) => {
      e.stopPropagation();
      selectItem(level, name);
    });

    ul.appendChild(li);
  });
}

// 항목 선택 처리
function selectItem(level, name) {
  selected[level] = name;

  if (level === "sido") {
    // 시/도 바뀌면 → 구/동 초기화 (그 시/도의 첫 구, 첫 동으로)
    const guObj = regionData[name] || {};
    const guKeys = Object.keys(guObj);
    selected.gu = guKeys[0] || "";
    const dongArr = selected.gu ? guObj[selected.gu] : [];
    selected.dong = dongArr[0] || "";

    renderList("sido");
    renderList("gu");
    renderList("dong");
  } else if (level === "gu") {
    // 구 바뀌면 → 동 초기화
    const guObj = regionData[selected.sido] || {};
    const dongArr = guObj[name] || [];
    selected.dong = dongArr[0] || "";

    renderList("gu");
    renderList("dong");
  } else {
    // 동 선택
    renderList("dong");
  }

  closeAll();

  // (나중에 지도 연동) 선택된 지역으로 지도 이동 등을 여기서 처리
  // console.log(selected.sido, selected.gu, selected.dong);
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

// 초기 렌더링
renderList("sido");
renderList("gu");
renderList("dong");