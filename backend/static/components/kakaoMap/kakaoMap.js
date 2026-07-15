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
let currentHiddenAdminLabel = null; // 인포윈도우 보여주려고 숨겨둔 행정동 이름 라벨(있으면 1개)

// =====================================================================
// 🎯 [행정동 클릭 시 중심 이동 보정] 표준 레이캐스팅 point-in-polygon 판정.
// 동네 규모의 좁은 범위라 위경도를 그냥 평면 좌표처럼 취급해도 오차가 무시할
// 수준이라 이렇게 간단히 구현해도 충분하다.
// =====================================================================
function isPointInPolygonPath(point, path) {
    const x = point.getLng();
    const y = point.getLat();
    let inside = false;

    for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
        const xi = path[i].getLng();
        const yi = path[i].getLat();
        const xj = path[j].getLng();
        const yj = path[j].getLat();

        const intersect =
            yi > y !== yj > y &&
            x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }

    return inside;
}

// 🎯 지도를 클릭 좌표(clickLatLng) 쪽으로 옮기고 싶지만, 그 결과로 마우스 커서
// 밑의 실제 좌표(= clickLatLng + 이동한 만큼)가 법정동 폴리곤을 벗어나면 안 된다.
// oldCenter -> clickLatLng 방향으로 이동 비율 t(0~1)를 이진 탐색해서, 커서가
// 폴리곤 안에 머무르는 한도 내에서 최대한 클릭 좌표 쪽으로 이동할 목표 지점을 구한다.
function getClampedPanTarget(oldCenter, clickLatLng, legalPolygonPath) {
    if (!legalPolygonPath || legalPolygonPath.length === 0) return clickLatLng;

    const dLat = clickLatLng.getLat() - oldCenter.getLat();
    const dLng = clickLatLng.getLng() - oldCenter.getLng();

    // t만큼 이동했을 때, 마우스 커서 밑에 오게 되는 실제 좌표
    // (커서는 화면상 고정, 지도만 (target - oldCenter)만큼 움직이므로
    //  커서 밑 좌표는 clickLatLng + t*(clickLatLng - oldCenter)가 된다)
    const cursorGeoAtT = (t) =>
        new kakao.maps.LatLng(
            clickLatLng.getLat() + t * dLat,
            clickLatLng.getLng() + t * dLng,
        );

    // t=1(클릭 좌표로 완전히 이동)이 이미 안전하면 그대로 이동
    if (isPointInPolygonPath(cursorGeoAtT(1), legalPolygonPath)) {
        return clickLatLng;
    }

    // 이진 탐색: t=0(항상 안전 - 커서 밑 좌표가 clickLatLng 그 자체)부터
    // t=1(위험) 사이에서, 커서가 폴리곤 안에 머무르는 최대 t를 찾는다.
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        if (isPointInPolygonPath(cursorGeoAtT(mid), legalPolygonPath)) {
            lo = mid;
        } else {
            hi = mid;
        }
    }

    return new kakao.maps.LatLng(
        oldCenter.getLat() + lo * dLat,
        oldCenter.getLng() + lo * dLng,
    );
}

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

// =====================================================================
// 🎯 [버그 수정] 페이지를 막 로딩하고 바로 검색하면(예: 첫 화면에서 "상계동" 검색),
// map/infowindow 초기화와 legalDongGridCache/adminDongList 캐싱이 아직 안 끝난
// 상태에서 window.showLegalDongOnMap()이 호출돼 조용히(console.warn만 찍고)
// 아무 일도 안 하고 return 해버렸다. -> map 초기화 + 캐싱이 전부 끝났을 때만
// resolve되는 프라미스를 만들어서, showLegalDongOnMap이 그걸 기다리게 한다.
// =====================================================================
let resolveMapReady;
const mapReadyPromise = new Promise((resolve) => {
    resolveMapReady = resolve;
});

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
            // 두 캐싱이 전부 끝나야 mapReadyPromise가 resolve되어 검색이 안전해진다.
            Promise.all([fetchLegalDongCache(), fetchAdminDongList()]).then(() => {
                resolveMapReady();
            });
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
        labelOverlay?.setMap(null);
    });
    currentAdminOverlays = [];
    // 폴리곤/라벨을 통째로 지우는 거라, 숨겨뒀던 라벨을 따로 복원할 필요도 없어짐
    currentHiddenAdminLabel = null;
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
window.showLegalDongOnMap = async function (legalDongName) {
    // 🎯 map/infowindow 초기화 + 법정동·행정동 캐싱이 끝날 때까지 기다린다.
    // (페이지 로딩 직후 바로 검색해도 안전하게 동작하도록)
    await mapReadyPromise;

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
        map: map,
        path: path,
        strokeWeight: 2,
        strokeColor: "#0C447C",
        strokeOpacity: 0.6,
        fillColor: getColorBySafetyScore(grid.safety_score),
        fillOpacity: 0.45,
    });

    // 🎯 [검색 시 화면 중심 = 폴리곤 실제 중심] DB에 박제된 grid.latitude/longitude가
    // 아니라, 방금 그린 폴리곤 도형의 centroid로 지도 중심을 이동시킨다.
    // (leftPanel.js/mapOverlay.js는 더 이상 자체적으로 이동시키지 않고 여기서만 처리)
    const centroid =
        getPolygonCentroid(path) ??
        (grid.latitude != null && grid.longitude != null
            ? new kakao.maps.LatLng(grid.latitude, grid.longitude)
            : null);

    if (centroid) {
        const currentLevel = map.getLevel();
        if (currentLevel > 6) {
            // 🎯 [버그 수정] setLevel의 anchor 옵션은 "줌하는 동안 화면상 그 지점을
            // 고정시키는" 용도라, 초기 화면(레벨 8, 서울 중심)처럼 목표 지점이
            // 현재 화면에서 한참 벗어나 있을 때는 계산이 꼬여서 줌 후 panTo가 무시되고
            // 정중앙에 안 오는 경우가 있었다. anchor에 기대는 대신 center를 먼저
            // 확정시켜놓고 나서 레벨만 애니메이션으로 줄이도록 순서를 바꿨다.
            map.setCenter(centroid);
            map.setLevel(6, { animate: { duration: 350 } });
        } else {
            const bounds = map.getBounds();
            if (bounds.contain(centroid)) {
                map.panTo(centroid);
            } else {
                map.setCenter(centroid);
            }
        }
    }

    openLegalDongInfoWindow(grid, path);

    // 🎯 [2-1번 스펙] 법정동 폴리곤 인(hover-in) -> 행정동 분류로 전환
    kakao.maps.event.addListener(currentLegalPolygon, "mouseover", function () {
        cancelHoverRevert();
        showAdminDongGroup(legalDongName);
    });

    // 🎯 [2-2번 스펙] 법정동 폴리곤 아웃(hover-out) -> 다시 법정동 뷰로 복귀
    kakao.maps.event.addListener(currentLegalPolygon, "mouseout", function () {
        scheduleHoverRevert(legalDongName);
    });
};

// =====================================================================
// 🎯 [2-1번 스펙] 법정동 폴리곤에 마우스가 올라갔을 때, 그 법정동(dong_group)에
// 속한 행정동들만 걸러서 폴리곤 + 이름 라벨을 그린다.
// =====================================================================
function showAdminDongGroup(legalDongName) {
    if (currentAdminOverlays.length > 0) return; // 이미 표시 중이면 중복 실행 방지

    if (infowindow) infowindow.close();
    if (currentLegalPolygon) currentLegalPolygon.setMap(null);

    const matches = adminDongList.filter(
        (grid) => grid.dong_group === legalDongName,
    );

    matches.forEach((grid) => {
        const path = geoJsonToKakaoPath(grid.boundary ?? grid.boundary_geojson);
        if (path.length === 0) return;

        const polygon = new kakao.maps.Polygon({
            map: map,
            path: path,
            strokeWeight: 2,
            strokeColor: "#0C447C",
            strokeOpacity: 0.6,
            fillColor: getColorBySafetyScore(grid.safety_score),
            fillOpacity: 0.45,
        });

        // 🎯 폴리곤 구역 안에 행정동 이름 표시 (폴리곤 도형의 실제 중심에, 계산 실패 시 DB 좌표로 폴백)
        let labelOverlay = null;
        const labelPosition =
            getPolygonCentroid(path) ??
            (grid.latitude != null && grid.longitude != null
                ? new kakao.maps.LatLng(grid.latitude, grid.longitude)
                : null);
        if (labelPosition) {
            labelOverlay = new kakao.maps.CustomOverlay({
                map: map,
                position: labelPosition,
                content: `<div class="kakaoMap-adminDongLabel">${grid.dong}</div>`,
                yAnchor: 0.5,
            });
        }

        kakao.maps.event.addListener(polygon, "mouseover", function () {
            cancelHoverRevert();
            polygon.setOptions({ fillOpacity: 0.7 });
        });

        kakao.maps.event.addListener(polygon, "mouseout", function () {
            polygon.setOptions({ fillOpacity: 0.45 });
            // 법정동 영역을 완전히 벗어났을 때만(인접 행정동으로 옮겨간 게 아니라면)
            // 법정동 뷰로 되돌아가도록 디바운스를 건다.
            scheduleHoverRevert(legalDongName);
        });

        kakao.maps.event.addListener(polygon, "click", function (mouseEvent) {
            cancelHoverRevert();
            openAdminDongDetail(grid, legalDongName, mouseEvent.latLng, labelOverlay);
        });

        currentAdminOverlays.push({ polygon, labelOverlay, grid });
    });
}

// =====================================================================
// 🎯 [2-1번 스펙] 행정동 폴리곤 클릭 -> 행정동 안심점수 인포윈도우 +
// 폴리곤 구역 내 이름 라벨 삭제 + 우측 사이드바(행정동 점수/그래프, 단
// 영역별 만족도·후기·QnA는 법정동 기준) 갱신
// =====================================================================
function openAdminDongDetail(grid, legalDongName, latLng, labelOverlay) {
    // 🎯 [버그 수정] 예전엔 클릭한 행정동의 라벨만 지우고, 그 전에 다른 행정동을
    // 클릭해서 숨겨뒀던 라벨은 복원을 안 해줘서 계속 사라진 채로 남아있었다
    // (예: 삼성동 클릭 -> 이름 삭제, 대학동 클릭 -> 삼성동 이름이 안 돌아옴).
    // 새 라벨을 숨기기 전에, 이전에 숨겨뒀던 라벨이 있으면 먼저 복원한다.
    if (currentHiddenAdminLabel && currentHiddenAdminLabel !== labelOverlay) {
        currentHiddenAdminLabel.setMap(map);
    }

    // 클릭한 행정동의 이름 라벨은 지운다 (스펙: "폴리곤 구역 내 행정동 이름은 삭제")
    if (labelOverlay) labelOverlay.setMap(null);
    currentHiddenAdminLabel = labelOverlay || null;

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
    infowindow.setPosition(latLng);
    infowindow.open(map);

    // 🎯 [버그 수정] 클릭한 좌표로 지도 중심을 그대로 옮기면, 마우스는 화면상 같은
    // 픽셀에 그대로 있는데 그 밑의 지도만 이동해버려서 마우스 커서가 가리키는 실제
    // 좌표가 법정동 폴리곤 밖으로 밀려날 수 있었다(그래서 가만히 있어도 mouseout이
    // 발생해 행정동 인포윈도우가 바로 사라짐). 완전히 안 옮기는 대신, 커서 밑 좌표가
    // 법정동 폴리곤 안에 머무르는 한도까지만 클릭 좌표 쪽으로 이동시킨다.
    const currentLevel = map.getLevel();
    const targetLatLng = latLng;

    if (currentLevel > 6) {
        // (showLegalDongOnMap과 동일한 이유로 anchor 대신 center를 먼저 확정)
        map.setCenter(targetLatLng);
        map.setLevel(6, { animate: { duration: 350 } });
    } else {
        const legalPolygonPath = currentLegalPolygon
            ? currentLegalPolygon.getPath()
            : null;
        const clampedTarget = getClampedPanTarget(
            map.getCenter(),
            targetLatLng,
            legalPolygonPath,
        );
        map.panTo(clampedTarget);
    }

    const sidebar = document.querySelector(".rightSB-aside");
    if (sidebar) {
        sidebar.classList.add("open");
    }

    // ====================================================
    // 🎯 행정동(detailDongName) + 그 부모 법정동(legalDongName) 둘 다 전달.
    // updateSidebarTitle 쪽에서 detailDongName !== legalDongName이면
    // "행정동 안심점수/그래프"로 판단해서 행정동 기준으로 조회한다.
    // (영역별 만족도/후기/QnA는 legalDongId 기준 그대로 유지)
    // ====================================================
    const legalDongId = legalDongCache[legalDongName] || grid.id;

    if (window.updateSidebarTitle) {
        window.updateSidebarTitle(grid.dong, legalDongName, legalDongId);
    }
}
