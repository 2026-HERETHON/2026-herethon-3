(function () {
  const modal = document.getElementById('postCompleteModal');
  if (!modal) return;

  const close = () => { modal.style.display = 'none'; };
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.querySelector('.modal-btn-primary').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // 다른 스크립트(rightSideBar.js)에서 호출할 수 있게 전역으로 공개
  window.showPostCompleteModal = () => { modal.style.display = 'flex'; };
})();