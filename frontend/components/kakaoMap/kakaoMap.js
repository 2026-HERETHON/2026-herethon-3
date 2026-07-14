// 외부에서 호출할 수 있도록 export를 붙여줍니다.
export function initKakaoMap() {
  const container = document.getElementById("map");
  if (!container) return;

  // kakao.maps가 정상적으로 로드되었는지 최종 확인하는 안전장치
  if (typeof kakao !== "undefined" && kakao.maps) {
    const options = {
      center: new kakao.maps.LatLng(37.6542, 127.0568), // 노원역 부근
      level: 3,
    };

    // 지도 생성
    const map = new kakao.maps.Map(container, options);

    // ★ 전역 변수 등록: 다른 일반 JS 파일이나 브라우저 콘솔에서 map 객체에 접근할 수 있도록 설정
    window.map = map;
  }

  rednderDefaultMarkers();
}


function rednderDefaultMarkers() {

}

