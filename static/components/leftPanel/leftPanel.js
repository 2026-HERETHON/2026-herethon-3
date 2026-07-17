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
// 동 검색 자동완성: 좌측 패널 검색창에 법정동 이름으로 검색 시
// "시/도 구 동" 형태로 후보를 드롭다운에 보여주고, 클릭하면
// 지도 이동 + 우측 사이드바 오픈까지 처리함
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
    console.error("동 검색용 법정동 목록 로딩 실패:", err);
  }

  return leftPanelLegalDongList;
}

const leftPanelSearchInput = document.querySelector(".leftPanel-searchInput");
const leftPanelSearchResults = document.querySelector(".leftPanel-searchResults");

// 회원가입 폼의 거주지 자동완성(login.js의 bindResidenceAutocomplete)과 같은
// 방식으로 화살표 키 탐색을 지원하려면, 지금 렌더된 후보 목록과 그중
// 몇 번째가 선택돼 있는지를 input의 keydown 핸들러에서도 봐야 해서
// renderLeftPanelSearchResults 호출 쪽과 공유하는 상태로 뺌
let leftPanelCurrentMatches = [];
let leftPanelActiveIndex = -1;

function renderLeftPanelSearchResults(items, query) {
  if (!leftPanelSearchResults) return;

  leftPanelSearchResults.innerHTML = "";
  // 실제로 <li>가 그려지는 건 최대 8개(items.slice(0,8))뿐이라, 키보드
  // 탐색용 인덱스도 그 잘린 목록 기준으로 맞춰야 화면에 없는 항목을
  // 가리키는 어긋남이 없음
  leftPanelCurrentMatches = items.slice(0, 8);

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

  items.slice(0, 8).forEach((grid, i) => {
    const li = document.createElement("li");
    li.className = "leftPanel-searchResultItem";
    if (i === leftPanelActiveIndex) li.classList.add("is-active");

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

  // 예전엔 여기서 grid.latitude/longitude로 직접 이동시켰는데, 이제는
  // window.showLegalDongOnMap()이 폴리곤 중심(centroid)으로 이동까지
  // 처리해줌

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
    leftPanelActiveIndex = -1; // 새로 타이핑하면 이전 선택 위치는 무효화

    if (!query) {
      renderLeftPanelSearchResults([], "");
      return;
    }

    const list = await fetchLeftPanelLegalDongList();
    // login.js의 bindResidenceAutocomplete()와 동일한 방식:
    // sido/gu/dong_group/dong을 합친 haystack + 공백 토큰 AND 매칭
    const q = query.toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);

    const filtered = list.filter((grid) => {
      const haystack = [grid.sido, grid.gu, grid.dong_group, grid.dong]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });

    renderLeftPanelSearchResults(filtered, query);
  });

  // 화살표 위/아래로 후보 탐색, Enter로 선택, Esc로 닫기
  // (login.js의 bindResidenceAutocomplete 키보드 조작과 동일한 패턴 -
  // 그쪽은 자체 목록 상태를 가진 별도 함수라 그대로 재사용은 못 하고
  // leftPanel 쪽 상태(leftPanelCurrentMatches/leftPanelActiveIndex)로
  // 똑같이 구현함)
  leftPanelSearchInput.addEventListener("keydown", (e) => {
    if (leftPanelSearchResults?.classList.contains("leftPanel-hide")) return;
    if (!leftPanelCurrentMatches.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      leftPanelActiveIndex = Math.min(
        leftPanelActiveIndex + 1,
        leftPanelCurrentMatches.length - 1,
      );
      renderLeftPanelSearchResults(leftPanelCurrentMatches, leftPanelSearchInput.value.trim());
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      leftPanelActiveIndex = Math.max(leftPanelActiveIndex - 1, 0);
      renderLeftPanelSearchResults(leftPanelCurrentMatches, leftPanelSearchInput.value.trim());
    } else if (e.key === "Enter") {
      if (leftPanelActiveIndex >= 0 && leftPanelCurrentMatches[leftPanelActiveIndex]) {
        e.preventDefault();
        selectLeftPanelSearchResult(leftPanelCurrentMatches[leftPanelActiveIndex]);
      }
    } else if (e.key === "Escape") {
      renderLeftPanelSearchResults([], "");
    }
  });

  // 검색창/결과 바깥을 클릭하면 드롭다운 닫기
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".leftPanel-searchWrapper")) {
      leftPanelSearchResults?.classList.add("leftPanel-hide");
    }
  });
}