// Mobile hamburger menu.
//
// The nav is a plain menu on desktop. Below the mobile breakpoint it collapses
// behind a toggle button — but only once this script has run, so with JS off
// the menu stays visible as a normal stacked list instead of being unreachable.
(function () {
  var toggle = document.querySelector('.nav-toggle');
  if (!toggle) return;

  var nav = toggle.closest('.nav-column');
  var grid = nav.closest('.grid');

  nav.classList.add('js-nav');
  if (grid) grid.classList.add('has-js-nav');

  function setOpen(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  toggle.addEventListener('click', function () {
    setOpen(!nav.classList.contains('open'));
  });

  // The panel floats over the page, so let a tap anywhere else dismiss it.
  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target)) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      setOpen(false);
      toggle.focus();
    }
  });
})();
