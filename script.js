const toggleBtn = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');
if (toggleBtn && nav) {
  toggleBtn.addEventListener('click', () => nav.classList.toggle('open'));
}
