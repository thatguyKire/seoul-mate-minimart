// Sets the theme before the page paints (FR-66): the visitor's saved choice, otherwise the
// system setting. A file rather than an inline script, so the Content Security Policy needs
// no inline scripts (NFR-SEC-11). src/features/theme/theme.ts keeps it current afterwards.
(function () {
  var saved = null;
  try {
    saved = window.localStorage.getItem('seoul-mate.theme');
  } catch {
    // Storage blocked, for example in private browsing: follow the system setting.
  }
  var dark =
    saved === 'dark' ||
    (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
})();
