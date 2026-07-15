// 가이드 박스 닫기 (✕ 클릭)
document.querySelector(".leftPanel-closeIcon")?.addEventListener("click", () => {
  document.querySelector(".leftPanel-guideBox").style.display = "none";
});

// 초기화 버튼 클릭 시: CCTV만 체크, 나머지는 해제
document.querySelector(".leftPanel-resetBtn").addEventListener("click", () => {
  const checkboxes = document.querySelectorAll(".leftPanel-customCheckbox input");

  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });
});

// =====================================================================
// 🎯 [동 검색 자동완성] 좌측 패널 검색창에 법정동 이름으로 검색 시
// "시/도 구 동" 형태로 후보를 드롭다운에 보여주고, 클릭하면
// 지도 이동 + 우측 사이드바 오픈까지 처리한다.
// (kakaoMap.js의 fetchLegalDongCache / 폴리곤 클릭 로직과 동일한 패턴 재사용)
// =====================================================================
let leftPanelLegalDongList = [];
let leftPanelLegalDongLoaded = false;

async function fetchLeftPanelLegalDongList() {
  if (leftPanelLegalDongLoaded) return leftPanelLegalDongList;

  try {
    const res = await fetch("/grids/?is_legal_dong=true");
    if (!res.ok) return leftPanelLegalDongList;

    const data = await res.json();
    const rawList = Array.isArray(data) ? data : data.grids || [];

    leftPanelLegalDongList = rawList.map((item) => {
      const fields = item.fields ? item.fields : item;
      const gridId = item.pk || item.id;
      return {
        id: gridId,
        dong: fields.dong,
        dong_group: fields.dong_group,
        sido: fields.sido,
        gu: fields.gu,
        latitude: fields.latitude,
        longitude: fields.longitude,
      };
    });
    leftPanelLegalDongLoaded = true;
  } catch (err) {
    console.error("🚨 동 검색용 법정동 목록 로딩 실패:", err);
  }

  return leftPanelLegalDongList;
}

const leftPanelSearchInput = document.querySelector(".leftPanel-searchInput");
const leftPanelSearchResults = document.querySelector(".leftPanel-searchResults");

function renderLeftPanelSearchResults(items, query) {
  if (!leftPanelSearchResults) return;

  leftPanelSearchResults.innerHTML = "";

  if (!query) {
    leftPanelSearchResults.classList.add("leftPanel-hide");
    return;
  }

  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "leftPanel-searchResultEmpty";
    li.textContent = "검색 결과가 없어요.";
    leftPanelSearchResults.appendChild(li);
    leftPanelSearchResults.classList.remove("leftPanel-hide");
    return;
  }

  items.slice(0, 8).forEach((grid) => {
    const li = document.createElement("li");
    li.className = "leftPanel-searchResultItem";

    const locationPrefix = [grid.sido, grid.gu].filter(Boolean).join(" ");
    li.innerHTML = `${locationPrefix ? locationPrefix + " " : ""}<span class="leftPanel-searchResultDong">${grid.dong}</span>`;

    li.addEventListener("click", () => {
      selectLeftPanelSearchResult(grid);
    });

    leftPanelSearchResults.appendChild(li);
  });

  leftPanelSearchResults.classList.remove("leftPanel-hide");
}

function selectLeftPanelSearchResult(grid) {
  if (leftPanelSearchInput) {
    const fullName = [grid.sido, grid.gu, grid.dong].filter(Boolean).join(" ");
    leftPanelSearchInput.value = fullName;
  }
  leftPanelSearchResults?.classList.add("leftPanel-hide");

  // 🎯 [지도 이동] 예전엔 여기서 grid.latitude/longitude(DB 대표 좌표)로 직접
  // 이동시켰는데, 이제는 window.showLegalDongOnMap()이 폴리곤을 그리면서
  // 그 도형의 실제 중심(centroid)으로 이동까지 처리해준다. 그래서 여기서는
  // 더 이상 따로 이동시키지 않는다 (아래 ===== 3. ===== 참고).

  // ===== 2. 우측 사이드바 오픈 =====
  const sidebar = document.querySelector(".rightSB-aside");
  if (sidebar) {
    sidebar.classList.add("open");
  }

  if (window.updateSidebarTitle) {
    // 법정동 검색이므로 detailDongName/legalDongName 모두 같은 동 이름 사용
    window.updateSidebarTitle(grid.dong, grid.dong, grid.id);
  }

  // ===== 3. [1번 스펙] 검색으로 선택된 법정동 폴리곤 + 안심점수 인포윈도우 표시 =====
  if (window.showLegalDongOnMap) {
    window.showLegalDongOnMap(grid.dong);
  }

  // ===== 4. [0번 스펙] leftPanel 검색 결과를 mapOverlay 드롭다운(시/도-구-동)에도 반영 =====
  if (window.syncMapOverlaySelection) {
    window.syncMapOverlaySelection(grid.sido, grid.gu, grid.dong);
  }
}

if (leftPanelSearchInput) {
  leftPanelSearchInput.addEventListener("input", async (e) => {
    const query = e.target.value.trim();

    if (!query) {
      renderLeftPanelSearchResults([], "");
      return;
    }

    const list = await fetchLeftPanelLegalDongList();
    const filtered = list.filter(
      (grid) =>
        (grid.dong || "").includes(query) ||
        (grid.dong_group || "").includes(query),
    );

    renderLeftPanelSearchResults(filtered, query);
  });

  // 검색창/결과 바깥을 클릭하면 드롭다운 닫기
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".leftPanel-searchWrapper")) {
      leftPanelSearchResults?.classList.add("leftPanel-hide");
    }
  });
}