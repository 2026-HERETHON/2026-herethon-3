// 전역 변수 관리
let map = null;
let customOverlay = null;
let infowindow = null;
let isFirstBoundsSet = false; //최초실행 중앙 맞추기

// 법정동 매핑 캐시 테이블 (예: { "상계동": 12 })
let legalDongCache = {};

// 검색 전에는 폴리곤을 하나도 그리지 않으므로, 실제 폴리곤을 그릴 때 바로
// 쓸 수 있도록 법정동/행정동 원본 데이터(경계 geojson + 안심점수 등)를
// 백그라운드에서 미리 캐싱해둔다.
let legalDongGridCache = {}; // { "상계동": {전체 fields...} } - 법정동(is_legal_dong=true) 전용
let adminDongList = []; // is_legal_dong=false 전체 목록 (dong_group으로 소속 법정동 찾음)

// 지도 위에 현재 그려져 있는 오버레이 상태 관리
let currentLegalDongName = null; // 지금 화면에 활성화돼 있는 법정동 이름
let currentLegalPolygon = null; // 법정동 폴리곤 1개
let currentAdminOverlays = []; // 행정동 폴리곤+이름 라벨 묶음 [{ polygon, labelOverlay, grid }]
let hoverRevertTimer = null; // 행정동 -> 법정동 복귀 디바운스 타이머
let currentHiddenAdminLabel = null; // 인포윈도우 보여주려고 숨겨둔 행정동 이름 라벨(있으면 1개)

// =====================================================================
// 표준 레이캐스팅 point-in-polygon 판정 (행정동 클릭 시 중심 이동 보정용).
// 동네 규모의 좁은 범위라 위경도를 평면 좌표처럼 취급해도 오차가 무시할
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

// 지도를 클릭 좌표(clickLatLng) 쪽으로 옮기되, 그 결과로 마우스 커서 밑의
// 실제 좌표가 법정동 폴리곤을 벗어나면 안 된다. oldCenter -> clickLatLng
// 방향 이동 비율 t(0~1)를 이진 탐색해서, 커서가
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

// 디버그 로그가 추가된 파서
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

// 폴리곤 path(꼭짓점 배열)로 실제 도형 중심(centroid)을 계산.
// DB의 grid.latitude/longitude(폴리곤 모양과 무관할 수 있는 대표 좌표) 대신
// 이 결과를 쓰면 인포윈도우/이름 라벨이 폴리곤 정중앙에 뜬다.
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
// 페이지를 막 로딩하고 바로 검색하면(예: 첫 화면에서 "상계동" 검색), map/
// infowindow 초기화와 캐싱이 아직 안 끝난 상태에서 showLegalDongOnMap()이
// 호출돼 조용히 return 해버렸다. 초기화 + 캐싱이 전부 끝났을 때만
// resolve되는 프라미스를 만들어서 showLegalDongOnMap이 기다리게 한다.
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
            // 시설 집계 원(zIndex 1)보다 항상 위에 뜨도록
            infowindow.setZIndex(100);

            // 기본 폴리곤은 처음에(확대/축소해도) 아예 뜨지 않는다. 검색으로
            // 법정동을 선택했을 때만 showLegalDongOnMap()이 폴리곤을 그리므로,
            // 여기서는 화면에 그리지 않고 원본 데이터만 미리 받아둔다.
            // 두 캐싱이 전부 끝나야 mapReadyPromise가 resolve된다.
            Promise.all([fetchLegalDongCache(), fetchAdminDongList()]).then(() => {
                resolveMapReady();
            });
        });
    } else {
        console.error("🚨 카카오맵 SDK가 로드되지 않았습니다.");
    }
}

// 법정동 목록을 미리 받아와서 { 법정동이름: ID } 맵 + 전체 필드을 캐싱해두는 함수
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
                // 법정동 폴리곤을 그릴 때 바로 쓸 수 있도록 전체 필드를 캐싱
                legalDongGridCache[fields.dong] = { id: gridId, ...fields };
            }
        });
        console.log("🎯 법정동 ID 캐시 테이블 구축 완료:", legalDongCache);
    } catch (err) {
        console.error("🚨 법정동 캐시 로딩 실패:", err);
    }
}

// 세부 행정동 전체 목록을 미리 받아와서 캐싱해두는 함수.
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
// 검색이 바뀌거나 화면을 초기화할 때 기존에 그려둔 법정동/행정동 폴리곤과
// 라벨, 인포윈도우를 전부 지운다.
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
    // 동 선택이 해제됐으니 시설 필터 표시도 전체 기준으로 다시 그림
    renderFacilities();
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
// 행정동 폴리곤 아웃 -> 법정동 폴리곤 + 법정동 안심점수로 복귀
// =====================================================================
function revertToLegalDongView(legalDongName) {
    clearAdminOverlays();

    const grid = legalDongGridCache[legalDongName];
    if (!grid || !currentLegalPolygon) return;

    currentLegalPolygon.setMap(map);
    const path = geoJsonToKakaoPath(grid.boundary ?? grid.boundary_geojson);
    openLegalDongInfoWindow(grid, path);
}

// path를 넘기면 폴리곤 도형의 실제 중심(centroid)에, path가 없거나 계산 실패 시엔
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
// 검색으로 법정동이 선택됐을 때 호출된다.
// (leftPanel.js 검색 결과 클릭 / mapOverlay.js 드롭다운 선택에서 호출)
// 법정동 폴리곤 + 법정동 안심점수 인포윈도우만 그리고, 그 폴리곤에
// hover-in/out 이벤트를 걸어서 2-1/2-2 스펙을 준비한다.
// =====================================================================
window.showLegalDongOnMap = async function (legalDongName) {
    // map/infowindow 초기화 + 법정동·행정동 캐싱이 끝날 때까지 기다린다.
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

    // 법정동이 바뀌었으니 시설 필터 표시도 새 동네 기준으로 다시 그림
    renderFacilities();

    // 검색 시 화면 중심은 폴리곤 실제 중심: DB의 grid.latitude/longitude가
    // 아니라 방금 그린 폴리곤 도형의 centroid로 지도 중심을 이동시킨다.
    // (leftPanel.js/mapOverlay.js는 자체적으로 이동시키지 않고 여기서만 처리)
    const centroid =
        getPolygonCentroid(path) ??
        (grid.latitude != null && grid.longitude != null
            ? new kakao.maps.LatLng(grid.latitude, grid.longitude)
            : null);

    if (centroid) {
        const currentLevel = map.getLevel();
        if (currentLevel > 6) {
            // setLevel의 anchor 옵션은 "줌하는 동안 화면상 그 지점을 고정"하는
            // 용도라, 목표 지점이 현재 화면에서 한참 벗어나 있으면 계산이 꼬여서
            // 줌 후 정중앙에 안 오는 경우가 있었다. anchor 대신 center를 먼저
            // 확정시키고 레벨만 애니메이션으로 줄이도록 순서를 바꿨다.
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

    // 법정동 폴리곤 인(hover-in) -> 행정동 분류로 전환
    kakao.maps.event.addListener(currentLegalPolygon, "mouseover", function () {
        cancelHoverRevert();
        showAdminDongGroup(legalDongName);
    });

    // 법정동 폴리곤 아웃(hover-out) -> 다시 법정동 뷰로 복귀
    kakao.maps.event.addListener(currentLegalPolygon, "mouseout", function () {
        scheduleHoverRevert(legalDongName);
    });
};

// =====================================================================
// 법정동 폴리곤에 마우스가 올라갔을 때, 그 법정동(dong_group)에 속한
// 행정동들만 걸러서 폴리곤 + 이름 라벨을 그린다.
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

        // 폴리곤 구역 안에 행정동 이름 표시 (도형 실제 중심에, 계산 실패 시 DB 좌표로 폴백)
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
// 행정동 폴리곤 클릭 -> 행정동 안심점수 인포윈도우 + 폴리곤 구역 내 이름
// 라벨 삭제 + 우측 사이드바(행정동 점수/그래프, 영역별 만족도·후기·QnA는
// 법정동 기준) 갱신
// =====================================================================
function openAdminDongDetail(grid, legalDongName, latLng, labelOverlay) {
    // 예전엔 클릭한 행정동의 라벨만 지우고, 그 전에 다른 행정동을 클릭해서
    // 숨겨뒀던 라벨은 복원을 안 해줘서 계속 사라진 채로 남아있었다
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

    // 클릭한 좌표로 지도 중심을 그대로 옮기면, 마우스는 화면상 같은 픽셀에
    // 있는데 그 밑 지도만 이동해서 커서가 가리키는 실제 좌표가 법정동 폴리곤
    // 밖으로 밀려날 수 있었다(가만히 있어도 mouseout 발생). 완전히 안 옮기는
    // 대신, 커서 밑 좌표가 법정동 폴리곤 안에 머무르는 한도까지만 이동시킨다.
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
    // 행정동(detailDongName) + 그 부모 법정동(legalDongName) 둘 다 전달.
    // updateSidebarTitle 쪽에서 detailDongName !== legalDongName이면
    // "행정동 안심점수/그래프"로 판단해서 행정동 기준으로 조회한다.
    // (영역별 만족도/후기/QnA는 legalDongId 기준 그대로 유지)
    // ====================================================
    const legalDongId = legalDongCache[legalDongName] || grid.id;

    if (window.updateSidebarTitle) {
        window.updateSidebarTitle(grid.dong, legalDongName, legalDongId);
    }

    // 하단 "지도 정보 보기" 박스(CCTV/가로등/파출소/비상벨 개수)를
    // 클릭한 행정동 기준 개수로 갱신한다. grid에는 이미 이 행정동의
    // cctv_count/light_count/police_count/bell_count가 들어있다.
    if (window.updateMapOverlayInfoBoxForAdminDong) {
        window.updateMapOverlayInfoBoxForAdminDong(grid);
    }
}

// =====================================================================
// CCTV/가로등/파출소/비상벨 시설 표시 (자체 집계 방식)
//
// 성능 배경: 시설 데이터가 가로등 1만+, CCTV 3천+ 지점이라
// MarkerClusterer(마커 전체 생성 후 라이브러리가 묶는 방식)로는
// 2개 이상 켰을 때 지도 조작마다 렉이 걸림. 그래서:
//   - 데이터는 타입별로 1회만 fetch해서 배열로 캐싱 (마커 객체 안 만듦)
//   - 지도 이동/줌이 끝날 때(idle)마다 "화면에 보이는 것만" 다시 그림
//   - 축소 상태(level >= CLUSTER_MIN_LEVEL): 화면을 격자로 나눠
//     칸별 개수를 집계한 숫자 원(CustomOverlay)만 표시
//   - 확대 상태(level < CLUSTER_MIN_LEVEL): 화면 범위 안의 지점만
//     골라 아이콘 마커 생성 (전체의 극히 일부)
// 1만 개 배열 순회는 수 ms라, 화면에 실제로 그리는 개체 수만 적으면
// 타입 4개를 전부 켜도 밀리지 않는다.
// =====================================================================

// 이 레벨 이상(축소)이면 격자 집계 숫자 원, 미만(확대)이면 개별 아이콘
const CLUSTER_MIN_LEVEL = 4;

// 확대 상태에서 화면 안 지점이 이보다 많으면 아이콘 대신 집계로 폴백 (안전장치)
const MAX_VISIBLE_MARKERS = 800;

// 축소 상태에서 화면을 나눌 격자 크기(픽셀 기준, 대략)
const GRID_PX = 90;

// 타입별 상태
const facilityData = { cctv: null, light: null, police: null, bell: null }; // fetch 캐시
const facilityLoading = { cctv: false, light: false, police: false, bell: false };
const facilityActive = { cctv: false, light: false, police: false, bell: false }; // 체크 여부
const facilityOverlays = { cctv: [], light: [], police: [], bell: [] }; // 화면에 그려진 마커/오버레이

// 타입별 마커 아이콘 (필터 UI와 동일한 이미지 재활용)
const FACILITY_ICONS = {
    cctv: "./components/kakaoMap/marker-images/cctv-marker.png",
    light: "./components/kakaoMap/marker-images/streetlight-marker.png",
    police: "./components/kakaoMap/marker-images/police-marker.png",
    bell: "./components/kakaoMap/marker-images/alarm-marker.png",

};

// 타입별 집계 원 색상 (여러 필터 동시 표시 구분용)
const FACILITY_COLORS = {
    cctv: "rgba(59, 110, 231, 0.88)",   // 파랑
    light: "rgba(245, 166, 35, 0.88)",  // 주황
    police: "rgba(29, 164, 47, 0.88)",  // 초록
    bell: "rgba(231, 76, 60, 0.88)",    // 빨강
};

// 여러 타입을 동시에 켰을 때 집계 원이 정확히 겹치지 않게 살짝 밀어줄 오프셋(px)
const FACILITY_PIXEL_OFFSET = {
    cctv: [0, 0],
    light: [14, 10],
    police: [-14, 10],
    bell: [0, -16],
};

// 타입별 마커 이미지는 1회만 생성해서 재사용
const facilityMarkerImages = {};
function getFacilityMarkerImage(type) {
    if (!facilityMarkerImages[type]) {
        facilityMarkerImages[type] = new kakao.maps.MarkerImage(
            FACILITY_ICONS[type],
            new kakao.maps.Size(40, 40),
        );
    }
    return facilityMarkerImages[type];
}

// 시설 좌표를 최초 1회만 fetch해서 캐싱
async function loadFacilityData(type) {
    if (facilityData[type] || facilityLoading[type]) return;
    facilityLoading[type] = true;
    try {
        const res = await fetch(`/grids/facilities/?type=${type}`);
        if (!res.ok) {
            console.warn(`⚠️ 시설(${type}) 좌표 조회 실패 status=${res.status}`);
            return;
        }
        const data = await res.json();
        // 좌표 없는 지점은 캐싱 단계에서 걸러 매 렌더마다 검사하지 않게 한다
        facilityData[type] = (data.facilities || []).filter(
            (f) => f.latitude != null && f.longitude != null,
        );
        console.log(`🎯 시설(${type}) 데이터 ${facilityData[type].length}개 지점 캐싱`);
    } catch (err) {
        console.error(`🚨 시설(${type}) 데이터 로드 실패:`, err);
    } finally {
        facilityLoading[type] = false;
    }
}

// 해당 타입이 화면에 그려놓은 것들 제거
function clearFacilityOverlays(type) {
    facilityOverlays[type].forEach((o) => o.setMap(null));
    facilityOverlays[type] = [];
}

// =====================================================================
// 시설 API(/grids/facilities/)는 지역 파라미터가 없어 항상 전 지역 시설을
// 내려준다. 법정동이 선택돼 있으면 그 폴리곤 안의 지점만 클라이언트에서
// 걸러 보여준다. 1만 개 × 폴리곤 판정은 무겁기 때문에 동 이름별로 캐싱.
// =====================================================================
const facilityDongCache = {}; // { "light|신림동": [지점...] }

// isPointInPolygonPath와 같은 레이캐스팅인데, LatLng 객체를 1만 개씩
// 만들지 않도록 숫자 좌표를 바로 받는 버전
function isRawPointInPath(lng, lat, path) {
    let inside = false;
    for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
        const xi = path[i].getLng();
        const yi = path[i].getLat();
        const xj = path[j].getLng();
        const yj = path[j].getLat();
        const intersect =
            yi > lat !== yj > lat &&
            lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

// 현재 선택된 법정동 기준으로 걸러진 지점 배열을 반환
// 검색으로 법정동을 선택하기 전에는 아무것도 표시하지 않는다
function getScopedFacilityData(type) {
    const all = facilityData[type];
    if (!all) return null;
    if (!currentLegalDongName || !currentLegalPolygon) return [];

    const cacheKey = `${type}|${currentLegalDongName}`;
    if (facilityDongCache[cacheKey]) return facilityDongCache[cacheKey];

    const path = currentLegalPolygon.getPath();
    // 폴리곤 바운딩박스로 1차 컷 → 통과한 것만 정밀 판정 (성능)
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    path.forEach((p) => {
        minLat = Math.min(minLat, p.getLat());
        maxLat = Math.max(maxLat, p.getLat());
        minLng = Math.min(minLng, p.getLng());
        maxLng = Math.max(maxLng, p.getLng());
    });

    const scoped = all.filter(
        (f) =>
            f.latitude >= minLat &&
            f.latitude <= maxLat &&
            f.longitude >= minLng &&
            f.longitude <= maxLng &&
            isRawPointInPath(f.longitude, f.latitude, path),
    );
    facilityDongCache[cacheKey] = scoped;
    console.log(`🎯 시설(${type}) ${currentLegalDongName} 범위 ${scoped.length}개 지점`);
    return scoped;
}

// 집계 숫자 원 CustomOverlay 생성 (클릭하면 그 지점으로 확대)
function createCountOverlay(type, position, count) {
    // 개수에 따라 원 크기 3단계
    const size = count >= 300 ? 54 : count >= 50 ? 44 : 36;
    const [ox, oy] = FACILITY_PIXEL_OFFSET[type];

    const el = document.createElement("div");
    el.style.cssText = [
        `width:${size}px`,
        `height:${size}px`,
        `line-height:${size}px`,
        `background:${FACILITY_COLORS[type]}`,
        "color:#fff",
        "border-radius:50%",
        "text-align:center",
        "font-weight:600",
        `font-size:${size >= 50 ? 14 : 12}px`,
        "box-shadow:0 2px 6px rgba(0,0,0,0.25)",
        "cursor:pointer",
        `transform:translate(${ox}px, ${oy}px)`,
    ].join(";");
    el.textContent = count;
    el.addEventListener("click", (e) => {
        // 원 클릭이 밑의 폴리곤 클릭까지 전달되지 않게 차단
        e.stopPropagation();
        // setLevel의 anchor 옵션은 계산이 꼬여 지도가 엉뚱한 곳으로 튀는
        // 문제가 있다(위쪽 showLegalDongOnMap 주석 참고). center를 먼저
        // 확정하고 나서 줌을 바꾼다.
        map.setCenter(position);
        map.setLevel(map.getLevel() - 2, { animate: { duration: 350 } });
    });

    const overlay = new kakao.maps.CustomOverlay({
        position,
        content: el,
        yAnchor: 0.5,
        xAnchor: 0.5,
        zIndex: 1, // 안심점수 인포윈도우(높은 zIndex)에 가려지지 않도록 낮게 유지
    });
    overlay.setMap(map);
    return overlay;
}

// =====================================================================
// 안전 정보 필터 - 히트맵: 여성밤길치안안전 / 범죄주의구간
//
// 시설 4개와 달리 API가 아니라 "정적 PNG + bounds(meta json)" 방식이다.
// 카카오맵에는 이미지를 좌표 범위에 고정하는 기능이 없어서,
// AbstractOverlay를 상속한 커스텀 그라운드 오버레이로 직접 구현한다.
// (줌/이동 시 draw()가 자동 호출되어 이미지 크기/위치를 다시 계산)
//
// 표시 규칙: 법정동이 선택돼 있고, 그 동의 히트맵 파일이 meta에 있을 때만
// 표시한다. (동 미선택 시 아무것도 안 뜸 — 시설 필터와 동일한 스펙)
// =====================================================================

// PNG/meta 파일 위치 (페이지 URL 기준 상대경로). 파일을 옮기면 여기만 수정.
const HEATMAP_DATA_PATH = "./overlay-data/";
const HEATMAP_META_FILE = "heatmap_overlay_meta.json";

// 체크박스 data-filter-type 값 == meta json 키 접미사
const HEATMAP_TYPES = new Set(["night_safety", "crime_zone"]);

let heatmapMeta = null; // meta json 캐시
let heatmapMetaLoading = null; // 중복 fetch 방지용 프라미스
const heatmapActive = { night_safety: false, crime_zone: false }; // 체크 여부
const heatmapShown = { night_safety: null, crime_zone: null }; // { key, overlay }

// meta json을 최초 1회만 로드
function loadHeatmapMeta() {
    if (heatmapMeta) return Promise.resolve(heatmapMeta);
    if (heatmapMetaLoading) return heatmapMetaLoading;
    heatmapMetaLoading = fetch(HEATMAP_DATA_PATH + HEATMAP_META_FILE)
        .then((res) => {
            if (!res.ok) throw new Error(`status=${res.status}`);
            return res.json();
        })
        .then((json) => {
            heatmapMeta = json;
            console.log(`🎯 히트맵 meta 로드 완료 (${Object.keys(json).length}건)`);
            return json;
        })
        .catch((err) => {
            console.error(
                `🚨 히트맵 meta 로드 실패. ${HEATMAP_DATA_PATH}${HEATMAP_META_FILE} 경로에 파일이 있는지 확인하세요.`,
                err,
            );
            heatmapMetaLoading = null; // 실패 시 다음에 재시도 가능하게
            return null;
        });
    return heatmapMetaLoading;
}

// 이미지를 경위도 bounds에 고정하는 그라운드 오버레이 (카카오 공식 패턴)
// kakao.maps.load 이후에만 AbstractOverlay가 존재하므로 생성자를 지연 정의한다.
let GroundOverlayCtor = null;
function getGroundOverlayCtor() {
    if (GroundOverlayCtor) return GroundOverlayCtor;

    function GroundOverlay(bounds, imgSrc) {
        // bounds: { min_lon, min_lat, max_lon, max_lat }
        this.sw = new kakao.maps.LatLng(bounds.min_lat, bounds.min_lon);
        this.ne = new kakao.maps.LatLng(bounds.max_lat, bounds.max_lon);

        const img = document.createElement("img");
        img.src = imgSrc;
        img.style.position = "absolute";
        img.style.opacity = "0.65";
        img.style.pointerEvents = "none"; // 밑의 폴리곤 클릭/호버를 막지 않게
        this.node = img;
    }
    GroundOverlay.prototype = new kakao.maps.AbstractOverlay();

    GroundOverlay.prototype.onAdd = function () {
        this.getPanels().overlayLayer.appendChild(this.node);
    };

    // 지도 이동/줌 때마다 자동 호출: bounds의 픽셀 좌표를 다시 계산해 이미지에 반영
    GroundOverlay.prototype.draw = function () {
        const projection = this.getProjection();
        const swPoint = projection.pointFromCoords(this.sw);
        const nePoint = projection.pointFromCoords(this.ne);

        this.node.style.left = `${swPoint.x}px`;
        this.node.style.top = `${nePoint.y}px`;
        this.node.style.width = `${nePoint.x - swPoint.x}px`;
        this.node.style.height = `${swPoint.y - nePoint.y}px`;
    };

    GroundOverlay.prototype.onRemove = function () {
        if (this.node.parentNode) this.node.parentNode.removeChild(this.node);
    };

    GroundOverlayCtor = GroundOverlay;
    return GroundOverlayCtor;
}

// 현재 상태(체크 여부 + 선택된 동)에 맞게 히트맵 표시를 갱신한다.
// 원하는 상태와 이미 떠 있는 것이 같으면 아무것도 안 하므로(idempotent)
// idle 등에서 반복 호출해도 부담 없다.
function renderHeatmaps() {
    if (!map) return;

    HEATMAP_TYPES.forEach((type) => {
        // 이 타입이 지금 떠 있어야 하는 meta 키 계산 (조건 미충족이면 null)
        let desiredKey = null;
        if (heatmapActive[type] && heatmapMeta && currentLegalDongName) {
            const key = `${currentLegalDongName}_${type}`;
            if (heatmapMeta[key]) desiredKey = key;
        }

        const shown = heatmapShown[type];
        if (shown?.key === desiredKey) return; // 이미 원하는 상태

        // 지금 떠 있는 게 있으면 제거
        if (shown) {
            shown.overlay.setMap(null);
            heatmapShown[type] = null;
        }
        if (!desiredKey) return;

        // 새로 표시
        const entry = heatmapMeta[desiredKey];
        const Ctor = getGroundOverlayCtor();
        const overlay = new Ctor(entry.bounds, HEATMAP_DATA_PATH + entry.file);
        overlay.setMap(map);
        heatmapShown[type] = { key: desiredKey, overlay };
        console.log(`🎯 히트맵 표시: ${desiredKey}`);
    });
}

// 히트맵 체크박스 토글 처리
async function toggleHeatmapFilter(type, checked) {
    heatmapActive[type] = checked;
    if (checked) {
        await mapReadyPromise;
        await loadHeatmapMeta();
        if (!heatmapActive[type]) return; // 로딩 중 해제됨
    }
    renderHeatmaps();
}

// 현재 화면 범위/줌 기준으로, 켜져 있는 타입들을 다시 그린다
function renderFacilities() {
    if (!map) return; // 지도 초기화 전 호출 방어
    renderHeatmaps(); // 동 선택/해제 훅을 공유 — 원하는 상태와 같으면 no-op
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const level = map.getLevel();
    const aggregated = level >= CLUSTER_MIN_LEVEL;

    Object.keys(facilityActive).forEach((type) => {
        clearFacilityOverlays(type);
        if (!facilityActive[type]) return;
        // 선택된 법정동이 있으면 그 폴리곤 안의 지점만 대상
        const scoped = getScopedFacilityData(type);
        if (!scoped) return;

        // 1) 화면 범위 안의 지점만 추림 (1만 개여도 단순 비교라 수 ms)
        const visible = scoped.filter(
            (f) =>
                f.latitude >= sw.getLat() &&
                f.latitude <= ne.getLat() &&
                f.longitude >= sw.getLng() &&
                f.longitude <= ne.getLng(),
        );

        // 2-a) 축소 상태(또는 지점이 너무 많으면): 격자 집계 → 숫자 원
        if (aggregated || visible.length > MAX_VISIBLE_MARKERS) {
            // 격자 칸 크기: 화면 픽셀 기준으로 구하되 "1유효숫자"로 스냅해서
            // 같은 줌 레벨에서는 항상 동일한 값이 되게 한다. 칸의 기준점은
            // 화면 좌하단이 아니라 세계 좌표 원점(경도/위도 0)에 고정한다.
            // → 지도를 아무리 끌어도 격자가 따라 움직이지 않아 원 위치가 고정됨.
            const container = document.getElementById("map");
            const snap = (v) => {
                const mag = Math.pow(10, Math.floor(Math.log10(v)));
                return Math.round(v / mag) * mag;
            };
            const cellLng = snap(
                ((ne.getLng() - sw.getLng()) / container.clientWidth) * GRID_PX,
            );
            const cellLat = snap(
                ((ne.getLat() - sw.getLat()) / container.clientHeight) * GRID_PX,
            );

            // 칸별로 개수/좌표합 집계 (원은 칸 내 지점들의 평균 위치에 표시)
            const bins = new Map();
            visible.forEach((f) => {
                const cx = Math.floor(f.longitude / cellLng);
                const cy = Math.floor(f.latitude / cellLat);
                const key = `${cx},${cy}`;
                let bin = bins.get(key);
                if (!bin) {
                    bin = { count: 0, latSum: 0, lngSum: 0 };
                    bins.set(key, bin);
                }
                const c = f.count || 1;
                bin.count += c;
                bin.latSum += f.latitude * c;
                bin.lngSum += f.longitude * c;
            });

            bins.forEach((bin) => {
                const pos = new kakao.maps.LatLng(
                    bin.latSum / bin.count,
                    bin.lngSum / bin.count,
                );
                facilityOverlays[type].push(createCountOverlay(type, pos, bin.count));
            });
            return;
        }

        // 2-b) 확대 상태: 화면 안 지점만 아이콘 마커로
        const image = getFacilityMarkerImage(type);
        visible.forEach((f) => {
            const m = new kakao.maps.Marker({
                map: map,
                position: new kakao.maps.LatLng(f.latitude, f.longitude),
                image,
                title: f.count > 1 ? `${f.count}개` : "",
            });
            facilityOverlays[type].push(m);
        });
    });
}

// 체크박스 토글 처리
async function toggleFacilityFilter(type, checked) {
    facilityActive[type] = checked;
    if (checked) {
        await mapReadyPromise;
        await loadFacilityData(type);
        // 로딩 중에 해제됐으면 그리지 않음
        if (!facilityActive[type]) return;
    }
    renderFacilities();
}

// 필터 체크박스 + 지도 idle 이벤트 연결
function initFacilityFilter() {
    const checkboxes = document.querySelectorAll("input[data-filter-type]");
    if (checkboxes.length === 0) {
        console.warn(
            "⚠️ data-filter-type 체크박스를 찾지 못했습니다. home.html 반영 여부를 확인하세요.",
        );
        return;
    }

    checkboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", (e) => {
            const type = e.target.dataset.filterType;
            if (HEATMAP_TYPES.has(type)) {
                toggleHeatmapFilter(type, e.target.checked);
            } else {
                toggleFacilityFilter(type, e.target.checked);
            }
        });
    });

    // "초기화" 버튼: 시설 필터 4개 해제 + 표시 전부 제거
    const resetBtn = document.querySelector(".leftPanel-resetBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            checkboxes.forEach((checkbox) => {
                checkbox.checked = false;
                const type = checkbox.dataset.filterType;
                if (HEATMAP_TYPES.has(type)) {
                    heatmapActive[type] = false;
                } else {
                    facilityActive[type] = false;
                }
            });
            Object.keys(facilityOverlays).forEach(clearFacilityOverlays);
            renderHeatmaps();
        });
    }

    // 지도 이동/줌이 끝날 때마다 화면 범위 기준으로 다시 그림
    mapReadyPromise.then(() => {
        kakao.maps.event.addListener(map, "idle", renderFacilities);
    });

    console.log(`🎯 안전 정보 필터 ${checkboxes.length}개 연결 완료 (자체 집계 방식)`);
}

// 모듈 로드 시점(= DOM 파싱 완료 후)에 바로 연결
initFacilityFilter();