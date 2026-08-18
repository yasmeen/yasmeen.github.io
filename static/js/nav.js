// Mobile hamburger menu.
//
// The nav is a plain menu on desktop. Below the mobile breakpoint it collapses
// behind a toggle button — but only once this script has run, so with JS off
// the menu stays visible as a normal stacked list instead of being unreachable.
(function () {
  var toggle = document.querySelector('.nav-toggle');
  if (!toggle) return;

  var nav = toggle.closest('.nav-column');
  nav.classList.add('js-nav');

  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
})();
