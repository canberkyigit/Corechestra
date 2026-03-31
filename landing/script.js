// ── Navbar scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 36);
}, { passive: true });

// ── Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
const ro = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
}, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });
revealEls.forEach(el => ro.observe(el));

// ── Progress bar animation on scroll into view
function animateBar(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        setTimeout(() => { el.style.width = target; }, 200);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  obs.observe(el.parentElement);
}
// progress bars removed (replaced with real screenshots)

// ── Modal
function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('form-wrap').style.display = 'block';
  document.getElementById('success-wrap').style.display = 'none';
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
function overlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}
function submitForm() {
  const email = document.getElementById('inp-email').value.trim();
  const confirmEl = document.getElementById('confirm-email');
  if (confirmEl) confirmEl.textContent = email || 'you';
  document.getElementById('form-wrap').style.display = 'none';
  document.getElementById('success-wrap').style.display = 'block';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Gallery tabs
const GALLERY_DATA = {
  board:     { src: 'assets/ss-board.png',     url: 'app.corechestra.io / board',     alt: 'Sprint Board' },
  dashboard: { src: 'assets/ss-dashboard.png', url: 'app.corechestra.io / dashboard', alt: 'Dashboard' },
  reports:   { src: 'assets/ss-reports.png',   url: 'app.corechestra.io / reports',   alt: 'Reports' },
  hr:        { src: 'assets/ss-hr.png',        url: 'app.corechestra.io / hr',        alt: 'Human Resources' },
  docs:      { src: 'assets/ss-docs.png',      url: 'app.corechestra.io / docs',      alt: 'Documentation' },
  releases:  { src: 'assets/ss-releases.png',  url: 'app.corechestra.io / releases',  alt: 'Releases' },
  calendar:  { src: 'assets/ss-calendar.png',  url: 'app.corechestra.io / calendar',  alt: 'Calendar' },
};
function showTab(key) {
  const data = GALLERY_DATA[key];
  if (!data) return;
  const img = document.getElementById('gallery-img');
  const url = document.getElementById('gallery-url');
  img.style.opacity = '0';
  setTimeout(() => {
    img.src = data.src;
    img.alt = data.alt;
    url.textContent = data.url;
    img.style.opacity = '1';
  }, 150);
  document.querySelectorAll('.gallery-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${key}'`));
  });
}

// ── Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    const t = document.querySelector(href);
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});
