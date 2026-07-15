// 전역 변수 관리
let map = null;
let customOverlay = null;
let infowindow = null;
let isFirstBoundsSet = false; //최초실행 중앙 맞추기

// 💡 [추가] 법정동 매핑 캐시 테이블 (예: { "상계동": 12 })
let legalDongCache = {};

// [★ 4번 스펙] 안심 점수(0~100)에 따른 색상 매핑 함수
function getColorBySafetyScore(score) {
  if (score >= 90) return "rgb(12, 68, 124)";
  if (score >= 80) return "rgb(24, 95, 165)";
  if (score >= 70) return "rgb(36, 116, 195)";
  if (score >= 64) return "rgb(55, 138, 221)";
  if (score >= 58) return "rgb(98, 163, 226)";
  if (score >= 52) return "rgb(133, 183, 235)";
  if (score >= 46) return "rgb(159, 195, 240)";
  if (score >= 40) return "rgb(185, 212, 223)";
  if (score >= 20) return "rgb(153, 205, 229)";
  return "rgb(218, 223, 225)";
}

// 💡 디버그 로그가 추가된 파서
function geoJsonToKakaoPath(boundaryGeojsonStr) {
  if (!boundaryGeojsonStr) {
    console.warn("⚠️ boundary_geojson 필드가 비어있습니다.");
    return [];
  }

  try {
    let boundary = boundaryGeojsonStr;

    // 원본 타입 확인 (제일 중요한 단서!)
    console.log(
      "🔍 boundary 원본 타입:",
      typeof boundary,
      boundary?.slice ? boundary.slice(0, 80) : boundary,
    );

    if (typeof boundary === "string") {
      boundary = JSON.parse(boundary);
      console.log("🔍 1차 파싱 후 타입:", typeof boundary);
    }
    if (typeof boundary === "string") {
      boundary = JSON.parse(boundary);
      console.log("🔍 2차 파싱 후 타입:", typeof boundary);
    }

    if (!boundary || !boundary.type) {
      console.warn("⚠️ boundary.type이 없습니다. 실제 구조:", boundary);
      return [];
    }

    // Polygon과 MultiPolygon 둘 다 지원
    let ring;
    if (boundary.type === "Polygon") {
      ring = boundary.coordinates?.[0];
    } else if (boundary.type === "MultiPolygon") {
      // MultiPolygon은 한 단계 더 깊이 들어가야 함: coordinates[polygon idx][ring idx]
      ring = boundary.coordinates?.[0]?.[0];
      console.log("ℹ️ MultiPolygon 감지 - 첫 번째 폴리곤만 사용");
    } else {
      console.warn("⚠️ 지원하지 않는 geometry type:", boundary.type);
      return [];
    }

    if (!ring || !Array.isArray(ring) || ring.length === 0) {
      console.warn("⚠️ 유효하지 않은 coordinates 구조입니다:", boundary);
      return [];
    }

    const path = ring.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng));
    console.log(`✅ 좌표 ${path.length}개 파싱 완료`);
    return path;
  } catch (error) {
    console.error(
      "🚨 boundary_geojson 파싱 실패:",
      error,
      "원본 데이터:",
      boundaryGeojsonStr,
    );
    return [];
  }
}

export function initKakaoMap() {
  const container = document.getElementById("map");
  if (!container) {
    console.error("🚨 #map 컨테이너를 찾을 수 없습니다.");
    return;
  }

  if (typeof kakao !== "undefined" && kakao.maps) {
    kakao.maps.load(function () {
      const options = {
        center: new kakao.maps.LatLng(37.5519138, 126.9918511), //서울 중심
        level: 7,
      };

      map = new kakao.maps.Map(container, options);
      window.map = map;

      customOverlay = new kakao.maps.CustomOverlay({});
      infowindow = new kakao.maps.InfoWindow({ removable: true });

      fetchLegalDongCache().then(() => {
        loadBackendGeoJSON();
      });
    });
  } else {
    console.error("🚨 카카오맵 SDK가 로드되지 않았습니다.");
  }
}

// 💡 [추가] 법정동 리스트를 미리 받아와서 { 법정동이름: ID } 맵을 캐싱해두는 함수
async function fetchLegalDongCache() {
  try {
    const res = await fetch("/grids/?is_legal_dong=true");
    if (!res.ok) return;
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.grids;

    list.forEach((item) => {
      const fields = item.fields ? item.fields : item;
      const gridId = item.pk || item.id;
      if (fields.dong_group && gridId) {
        legalDongCache[fields.dong_group] = gridId; // 예: "상계동" -> 12번 PK 매핑
      }
    });
    console.log("🎯 법정동 ID 캐시 테이블 구축 완료:", legalDongCache);
  } catch (err) {
    console.error("🚨 법정동 캐시 로딩 실패:", err);
  }
}

function loadBackendGeoJSON() {
  const geojsonPath = "/grids/?is_legal_dong=false";

  fetch(geojsonPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`GeoJSON 로드 실패 (상태 코드: ${response.status})`);
      }
      return response.json();
    })
    .then((responseData) => {
      // 실제 API 응답은 배열이 아니라 { grids: [...] } 형태로 감싸져 있음
      const gridList = Array.isArray(responseData)
        ? responseData
        : responseData.grids;

      console.log("🔍 API 응답 원본 (첫번째 항목):", gridList?.[0]);
      console.log(
        "🔍 전체 개수:",
        Array.isArray(gridList) ? gridList.length : "배열 아님!",
      );

      if (Array.isArray(gridList) && gridList.length > 0) {
        renderGridData(gridList);
        console.log(`안심 점수 맵 실시간 연동 완료 (${gridList.length}개 동)`);
      } else {
        console.warn(
          "⚠️ gridList가 배열이 아니거나 비어있습니다:",
          responseData,
        );
      }
    })
    .catch((error) => {
      console.error("🚨 GeoJSON 렌더링 에러가 발생했습니다:", error);
    });
}

// kakaoMap.js 내부의 renderGridData 함수 하단 부분을 찾아서 아래처럼 교체해 줍니다.

function renderGridData(gridList) {
  const bounds = new kakao.maps.LatLngBounds();
  let hasValidPath = false;
  let successCount = 0;
  let failCount = 0;

  gridList.forEach((gridData, idx) => {
    const fields = gridData.fields ? gridData.fields : gridData;

    if (!fields) {
      console.warn(`⚠️ [${idx}] fields가 없습니다:`, gridData);
      return;
    }

    if (idx === 0) {
      console.log("🔍 첫 번째 항목의 실제 필드 키들:", Object.keys(fields));
    }

    const areaName = fields.dong || "알 수 없는 지역";
    const safetyScore =
      fields.safety_score !== undefined ? parseFloat(fields.safety_score) : 50;

    const path = geoJsonToKakaoPath(fields.boundary ?? fields.boundary_geojson);
    if (path.length === 0) {
      failCount++;
      console.warn(`⚠️ [${idx}] ${areaName}: 경로 파싱 실패 (path 길이 0)`);
      return;
    }

    successCount++;
    hasValidPath = true;
    path.forEach((latlng) => bounds.extend(latlng));

    displayArea({
      name: areaName,
      score: safetyScore,
      path: path,
      raw: gridData,
    });
  });

  console.log(`📊 렌더링 결과: 성공 ${successCount}개 / 실패 ${failCount}개`);

  // 💡 [★완벽 대수정] 최초 실행 시 딱 한 번만 중앙을 맞추도록 방어막을 씌웁니다!
  if (hasValidPath && map && !isFirstBoundsSet) {
    map.setBounds(bounds);
    isFirstBoundsSet = true; // 🌟 실행 완료 시 스위치를 True로 켜서 다음부터는 실행을 막습니다.
    console.log("✅ 최초 1회 전체 화면 영역(Bounds) 설정 완료!");
  }
}

function displayArea(area) {
  const polygon = new kakao.maps.Polygon({
    map: map,
    path: area.path,
    strokeWeight: 2,
    strokeColor: "#0C447C",
    strokeOpacity: 0.6,
    fillColor: getColorBySafetyScore(area.score),
    fillOpacity: 0.45,
  });

  kakao.maps.event.addListener(polygon, "mouseover", function (mouseEvent) {
    polygon.setOptions({ fillOpacity: 0.7 });
    /*customOverlay.setContent(`
      <div style="padding:5px 10px; background:#fff; border:2px solid ${getColorBySafetyScore(area.score)}; font-weight:bold; border-radius:4px; font-size:12px; box-shadow: 0px 2px 4px rgba(0,0,0,0.15);">
        ${area.name} (${area.score}점)
      </div>
    `);
    customOverlay.setPosition(mouseEvent.latLng);
    customOverlay.setMap(map);*/ //호버 시 나오는 글씨
  });

  kakao.maps.event.addListener(polygon, "mousemove", function (mouseEvent) {
    customOverlay.setPosition(mouseEvent.latLng);
  });

  kakao.maps.event.addListener(polygon, "mouseout", function () {
    polygon.setOptions({ fillOpacity: 0.45 });
    customOverlay.setMap(null);
  });

  kakao.maps.event.addListener(polygon, "click", function (mouseEvent) {
    customOverlay.setMap(null);

    const content = `
      <div class="kakaoMap-pointerContainer">
        <div style="margin-left:16px;">
            <div class="kakaoMap-pointerRegion">${area.name}</div>
            <div class="kakaoMap-pointerScoreTitle">안심점수</div>
            <div style="display:flex; align-items:flex-end;">
                <div class="kakaoMap-pointerScore">${area.score}</div>
                <span>/100</span>
            </div>
        </div>
      </div>
    `;

    infowindow.setContent(content);
    infowindow.setPosition(mouseEvent.latLng);
    infowindow.open(map);

    //인포 클릭시 지도 중심/레벨 이동
    const currentLevel = map.getLevel();
    const targetLatLng = mouseEvent.latLng;

    if (currentLevel > 6) {
      // 💡 [★핵심 치트키] 6레벨보다 클 때(멀리 처다보고 있을 때)
      // 레벨 변경과 중심 좌표 이동을 '동시'에 부드러운 애니메이션으로 처리하도록 명령합니다.
      map.setLevel(6, {
        animate: {
          duration: 350, // 0.35초 동안 레벨6 조절과 중심 이동을 부드럽게 엮음
        },
        anchor: targetLatLng, // 클릭한 위치를 축으로 삼아 줌인 처리
      });

      // 중심축이 미세하게 엇나가는 것을 방지하기 위해 줌인이 끝나는 타이밍에 좌표를 완전히 고정합니다.
      setTimeout(() => {
        map.panTo(targetLatLng);
      }, 350);
    } else {
      // 💡 이미 6레벨 이하로 들어와 있을 때는 줌 레벨을 건드리지 않고 클릭한 곳으로 스르륵 부드럽게 이동
      const bounds = map.getBounds();
      if (bounds.contain(targetLatLng)) {
        map.panTo(targetLatLng);
      } else {
        map.setCenter(targetLatLng);
      }
    }

    // ==========================================
    // 💡 [사이드바 열기 트리거]
    // 프로젝트 HTML에 선언된 사이드바의 ID나 클래스를 선택합니다.
    // (여기서는 예시로 id="sidebar"를 타격합니다. 본인 구조에 맞게 ID를 맞춰주세요!)
    // ==========================================
    const sidebar = document.querySelector(".rightSB-aside");
    if (sidebar) {
      sidebar.classList.add("open"); // open 클래스를 추가하여 사이드바를 노출시킵니다!
    }

    // ====================================================
    // 클릭한 행정동의 부모 '법정동 이름' (fields.dong_group)을 전달
    // ====================================================
    const fields = area.raw
      ? area.raw.fields
        ? area.raw.fields
        : area.raw
      : area;
    const detailDongName = area.name;
    const legalDongName = fields.dong_group || area.name; // 백업용으로 기본 이름 사용
    const legalDongId =
      legalDongCache[legalDongName] || area.raw.id || area.raw.pk;

    if (window.updateSidebarTitle) {
      // 💡 3가지 인자를 들고 사이드바 함수를 호출합니다!
      window.updateSidebarTitle(detailDongName, legalDongName, legalDongId);
    }
  });
}
