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
fun