// 전역 변수 관리
let map = null;
let customOverlay = null;
let infowindow = null;
let isFirstBoundsSet = false; //최초실행 중앙 맞추기

// 💡 법정동 매핑 캐시 테이블 (예: { "상계동": 12 })
let legalDongCache = {};

// 🎯 [스펙 변경] 검색 전에는 폴리곤을 하나도 그리지 않으므로, 실제 폴리곤을 그릴 때
// 바로 쓸 수 있도록 법정동/행정동 원본 데이터(경계 geojson + 안심점수 등)를
// 백그라운드에서 미리 캐싱해둔다.
let legalDongGridCache = {}; // { "상계동": {전체 fields...} } - 법정동(is_legal_dong=true) 전용
let adminDongList = []; // is_legal_dong=false 전체 목록 (dong_group으로 소속 법정동 찾음)

// 🎯 지도 위에 현재 그려져 있는 오버레이 상태 관리
let currentLegalDongName = null; // 지금 화면에 활성화돼 있는 법정동 이름
let currentLegalPolygon = null; // 법정동 폴리곤 1개
let currentAdminOverlays = []; // 행정동 폴리곤+이름 라벨 묶음 [{ polygon, labelOverlay, grid }]
let hoverRevertTimer = null; // 행정동 -> 법정동 복귀 디바운스 타이머

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

// 🎯 폴리곤 path(꼭짓점 배열)로 실제 도형 중심(centroid)을 계산.
// DB의 grid.latitude/longitude(대표 좌표, 폴리곤 모양과는 무관할 수 있음) 대신
// 이 함수의 결과를 쓰면 인포윈도우/이름 라벨이 폴리곤 도형 정중앙에 뜬다.
function getPolygonCentroid(path) {
    if (!path || path.length === 0) return null;

    // 꼭짓점이 1~2개뿐이면 넓이 공식이 무의미하니 단순 평균으로 대체
    if (path.length < 3) {
        const avgLat = path.reduce((sum, p) => sum + p.getLat(), 0) / path.length;
        const avgLng = path.reduce((sum, p) => sum + p.getLng(), 0) / path.length;
        return new kakao.maps.LatLng(avgLat, avgLng);
    }

    let twiceArea = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < path.length; i++) {
        const p0 = path[i];
        const p1 = path[(i + 1) % path.length]; // 마지막 점 다음은 첫 점으로 순환

        const x0 = p0.getLng();
        const y0 = p0.getLat();
        const x1 = p1.getLng();
        const y1 = p1.getLat();

        const cross = x0 * y1 - x1 * y0;
        twiceArea += cross;
        cx += (x0 + x1) * cross;
        cy += (y0 + y1) * cross;
    }

    if (twiceArea === 0) {
        // 면적이 0으로 계산되는 축퇴 도형(일직선 등) 방어 코드 -> 단순 평균으로 대체
        const avgLat = path.reduce((sum, p) => sum + p.getLat(), 0) / path.length;
        const avgLng = path.reduce((sum, p) => sum + p.getLng(), 0) / path.length;
        return new kakao.maps.LatLng(avgLat, avgLng);
    }

    const area = twiceArea / 2;
    const centroidLng = cx / (6 * area);
    const centroidLat = cy / (6 * area);

    return new kakao.maps.LatLng(centroidLat, centroidLng);
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
                center: new kakao.maps.LatLng(37.54057898213189, 126.93283364051676), //서울 중심
                level: 8,
            };

            map = new kakao.maps.Map(container, options);
            window.map = map;

            customOverlay = new kakao.maps.CustomOverlay({});
            infowindow = new kakao.maps.InfoWindow({ removable: true });

            // 🎯 [1번 스펙] 기본 폴리곤은 처음에(그리고 확대/축소해도) 아예 뜨지 않는다.
            // 검색(leftPanel 검색창 / mapOverlay 드롭다운)으로 법정동을 선택했을 때만
            // window.showLegalDongOnMap()이 폴리곤을 그린다. 그래서 여기서는 폴리곤을
            // 화면에 그리지 않고, 나중에 바로 쓸 수 있도록 원본 데이터만 미리 받아둔다.
            fetchLegalDongCache();
            fetchAdminDongList();
        });
    } else {
        console.error("🚨 카카오맵 SDK가 로드되지 않았습니다.");
    }
}

// 💡 법정동 목록을 미리 받아와서 { 법정동이름: ID } 맵 + 전체 필드(경계/안심점수 등)를 캐싱해두는 함수
async function fetchLegalDongCache() {
    try {
        const res = await fetch(
            "/grids/?is_legal_dong=true",
        );
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.grids;

        list.forEach((item) => {
            const fields = item.fields ? item.fields : item;
            const gridId = item.pk || item.id;
            if (fields.dong_group && gridId) {
                legalDongCache[fields.dong_group] = gridId; // 예: "상계동" -> 12번 PK 매핑
            }
            if (fields.dong) {
                // 🎯 법정동 폴리곤을 그릴 때 바로 쓸 수 있도록 전체 필드(경계/안심점수/좌표)를 캐싱
                legalDongGridCache[fields.dong] = { id: gridId, ...fields };
            }
        });
        console.log("🎯 법정동 ID 캐시 테이블 구축 완료:", legalDongCache);
    } catch (err) {
        console.error("🚨 법정동 캐시 로딩 실패:", err);
    }
}

// 💡 [추가] 세부 행정동 전체 목록을 미리 받아와서 캐싱해두는 함수.
// 법정동 폴리곤에 마우스를 올렸을 때(hover-in) dong_group이 일치하는
// 행정동들만 골라서 바로 그릴 수 있도록 미리 준비해둔다.
async function fetchAdminDongList() {
    try {
        const res = await fetch("/grids/?is_legal_dong=false");
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.grids;

        adminDongList = list.map((item) => {
            const fields = item.fields ? item.fields : item;
            const gridId = item.pk || item.id;
            return { id: gridId, ...fields };
        });
        console.log(`🎯 행정동 전체 목록 캐싱 완료 (${adminDongList.length}개)`);
    } catch (err) {
        console.error("🚨 행정동 목록 캐싱 실패:", err);
    }
}

// =====================================================================
// 🎯 [지도 오버레이 정리] 검색이 바뀌거나 화면을 초기화할 때 기존에 그려둔
// 법정동/행정동 폴리곤과 라벨, 인포윈도우를 전부 지운다.
// =====================================================================
function clearAdminOverlays() {
    currentAdminOverlays.forEach(({ polygon, labelOverlay }) => {
        polygon.setMap(null);
        labelOverlay.setMap(null);
    });
    currentAdminOverlays = [];
}

function clearAllMapOverlays() {
    cancelHoverRevert();
    if (currentLegalPolygon) {
        currentLegalPolygon.setMap(null);
        currentLegalPolygon = null;
    }
    clearAdminOverlays();
    if (infowindow) infowindow.close();
    currentLegalDongName = null;
}

function cancelHoverRevert() {
    if (hoverRevertTimer) {
        clearTimeout(hoverRevertTimer);
        hoverRevertTimer = null;
    }
}

// 행정동 폴리곤에서 마우스가 완전히 빠져나갔을 때(인접한 다른 행정동 폴리곤으로
// 옮겨간 게 아니라 진짜로 영역 밖으로 나갔을 때만) 법정동 뷰로 되돌리기 위해
// 약간의 지연을 두고 되돌린다. 다른 행정동 폴리곤에 바로 마우스가 올라가면
// mouseover 핸들러가 cancelHoverRevert()를 호출해서 이 되돌리기를 취소시킨다.
function scheduleHoverRevert(legalDongName) {
    cancelHoverRevert();
    hoverRevertTimer = setTimeout(() => {
        revertToLegalDongView(legalDongName);
    }, 150);
}

// =====================================================================
// 🎯 [2-2번 스펙] 행정동 폴리곤 아웃 -> 법정동 폴리곤 + 법정동 안심점수로 복귀
// =====================================================================
function revertToLegalDongView(legalDongName) {
    clearAdminOverlays();

    const grid = legalDongGridCache[legalDongName];
    if (!grid || !currentLegalPolygon) return;

    currentLegalPolygon.setMap(map);
    const path = geoJsonToKakaoPath(grid.boundary ?? grid.boundary_geojson);
    openLegalDongInfoWindow(grid, path);
}

// 🎯 path를 넘기면 폴리곤 도형의 실제 중심(centroid)에, path가 없거나 계산 실패 시엔
// grid.latitude/longitude(DB 대표 좌표)로 폴백해서 인포윈도우를 띄운다.
function openLegalDongInfoWindow(grid, path) {
    const centroid = getPolygonCentroid(path);
    const position =
        centroid ??
        (grid.latitude != null && grid.longitude != null
            ? new kakao.maps.LatLng(grid.latitude, grid.longitude)
            : null);
    if (!position) return;

    const content = `
      <div class="kakaoMap-pointerContainer">
        <div style="margin-left:16px;">
            <div class="kakaoMap-pointerRegion">${grid.dong}</div>
            <div class="kakaoMap-pointerScoreTitle">안심점수</div>
            <div style="display:flex; align-items:flex-end;">
                <div class="kakaoMap-pointerScore">${grid.safety_score}</div>
                <span>/100</span>
            </div>
        </div>
      </div>
    `;

    infowindow.setContent(content);
    infowindow.setPosition(position);
    infowindow.open(map);
}

// =====================================================================
// 🎯 [1번 스펙] 검색으로 법정동이 선택됐을 때 호출된다.
// (leftPanel.js 검색 결과 클릭 / mapOverlay.js 드롭다운 선택에서 호출)
// 법정동 폴리곤 + 법정동 안심점수 인포윈도우만 그리고, 그 폴리곤에
// hover-in/out 이벤트를 걸어서 2-1/2-2 스펙을 준비한다.
// =====================================================================
window.showLegalDongOnMap = function (legalDongName) {
    clearAllMapOverlays();

    const grid = legalDongGridCache[legalDongName];
    if (!grid) {
        console.warn(`⚠️ 법정동 캐시에서 "${legalDongName}"을(를) 찾지 못했습니다.`);
        return;
    }

    const path = geoJsonToKakaoPath(grid.boundary ?? grid.boundary_geojson);
    if (path.length === 0) return;

    currentLegalDongName = legalDongName;

    currentLegalPolygon = new kakao.maps.Polygon({
        map: ma