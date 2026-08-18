// Mobile nav. The links sit in the sticky header as a plain row from the `sm`
// breakpoint up; below it they collapse behind a toggle.
//
// Progressive enhancement: the markup ships with the menu open and the toggle
// hidden, and this script inverts that. With JS off the nav stays a stacked
// list of real links rather than a dead button hiding an unreachable menu.
(function () {
  var toggle = document.querySelector('[data-nav-toggle]');
  var menu = document.querySelector('[data-nav-menu]');
  if (!toggle || !menu) return;

  function setOpen(open) {
    menu.classList.toggle('hidden', !open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
  }

  toggle.classList.remove('hidden');
  setOpen(false);

  toggle.addEventListener('click', function () {
    setOpen(menu.classList.contains('hidden'));
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.classList.contains('hidden')) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Collapse when the viewport crosses into the desktop layout, so the panel is
  // never left open behind the inline links.
  window.matchMedia('(min-width: 40rem)').addEventListener('change', function (e) {
    if (e.matches) setOpen(false);
  });
})();
