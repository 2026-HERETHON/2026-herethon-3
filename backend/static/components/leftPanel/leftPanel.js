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
    const res = await fetch("http://127.0.0.1:8000/grids/?is_legal_dong=true");
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

  // ===== 1. 지도 이동 =====
  // (kakaoMap.js 폴리곤 클릭 시 줌/이동 로직과 동일하게 맞춤)
  const kakaoMap = window.map;
  if (
    kakaoMap &&
    typeof kakao !== "undefined" &&
    grid.latitude != null &&
    grid.longitude != null
  ) {
    const targetLatLng = new kakao.maps.LatLng(grid.latitude, grid.longitude);
    const currentLevel = kakaoMap.getLevel();

    if (currentLevel > 6) {
      kakaoMap.setLevel(6, {
        animate: { duration: 350 },
        anchor: targetLatLng,
      });
      setTimeout(() => kakaoMap.panTo(targetLatLng), 350);
    } else {
      const bounds = kakaoMap.getBounds();
      if (bounds.contain(targetLatLng)) {
        kakaoMap.panTo(targetLatLng);
      } else {
        kakaoMap.setCenter(targetLatLng);
      }
    }
  }

  // ===== 2. 우측 사이드바 오픈 =====
  const sidebar = document.querySelector(".rightSB-aside");
  if (sidebar) {
    sidebar.classList.add("open");
  }

  if (window.updateSidebarTitle) {
    // 법정동 검색이므로 detailDongName/legalDongName 모두 같은 동 이름 사용
    window.updateSidebarTitle(grid.dong, grid.dong, grid.id);
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