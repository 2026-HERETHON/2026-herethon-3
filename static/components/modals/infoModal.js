(function () {
  const modal = document.getElementById('infoModal');
  if (!modal) return;

  const titleEl = modal.querySelector('.modal-title');
  const descEl = modal.querySelector('.modal-desc');
  const primaryBtn = modal.querySelector('.modal-btn-primary');
  const secondaryBtn = modal.querySelector('.modal-btn-secondary');

  const close = () => { modal.style.display = 'none'; };
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  secondaryBtn?.addEventListener('click', close);

  // 확인 버튼 하나만 있는 안내용 모달 (후기 작성 완료, 실거주지 인증
  // 필요/완료 안내 등). title/desc에 <span>, <br> 태그를 그대로 쓸 수
  // 있게 innerHTML로 넣음 (예: 강조 단어 색 표시, 줄바꿈)
  window.showInfoModal = ({ title, desc, buttonText } = {}) => {
    if (title != null) titleEl.innerHTML = title;
    if (desc != null) descEl.innerHTML = desc;
    primaryBtn.textContent = buttonText || '확인';
    if (secondaryBtn) secondaryBtn.style.display = 'none';
    // showConfirmModal이 이전에 primaryBtn.onclick을 다른 동작으로
    // 바꿔놨을 수 있으니, 안내 모드에서는 항상 닫기만 하도록 초기화
    primaryBtn.onclick = close;
    modal.style.display = 'flex';
  };

  // 취소/확인(또는 삭제) 두 버튼짜리 확인 모달. 브라우저 기본 confirm()
  // 대신 써서 나머지 팝업들이랑 디자인을 통일함. onConfirm은 확인 버튼을
  // 눌렀을 때만 실행되고, 취소/닫기(X)/바깥 클릭은 그냥 닫기만 함
  window.showConfirmModal = ({ title, desc, confirmText, cancelText, onConfirm } = {}) => {
    if (title != null) titleEl.innerHTML = title;
    if (desc != null) descEl.innerHTML = desc;
    primaryBtn.textContent = confirmText || '확인';
    if (secondaryBtn) {
      secondaryBtn.textContent = cancelText || '취소';
      secondaryBtn.style.display = '';
    }
    primaryBtn.onclick = () => {
      close();
      onConfirm?.();
    };
    modal.style.display = 'flex';
  };

  // rightSideBar.js가 기존에 이 이름으로 후기 등록 완료 후 호출하고 있어서
  // 그대로 유지 - showInfoModal을 호출하는 얇은 래퍼로 바꿔둠
  window.showPostCompleteModal = () => {
    window.showInfoModal({
      title: '후기 작성이 <span>완료</span>되었습니다!',
      desc: '소중한 후기가 다른 사용자에게<br>큰 도움이 됩니다.',
    });
  };
})();
