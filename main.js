const NavSelected = document.querySelectorAll(".navbar-menu");
const NavUnderline = document.querySelector(".navbar-underline");

function updateUnderline(target) {
  NavUnderline.style.width = `${target.offsetWidth}px`;
  NavUnderline.style.transform = `translateX(${target.offsetLeft}px)`;
}

NavSelected.forEach((menu) => {
  menu.addEventListener("click", (e) => {
    NavSelected.forEach((m) => m.classList.remove("beBold"));
    e.target.classList.add("beBold");
    updateUnderline(e.target);
  });
});

const activeMenu = document.querySelector(".navbar-menu.active");
if (activeMenu) {
  setTimeout(() => updateUnderline(activeMenu), 50);
}
