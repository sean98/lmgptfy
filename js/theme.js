/**
 * Detects the visitor's OS/browser color-scheme preference so both the
 * creator page and the animated preview can match it live (including if the
 * user flips their system theme while the tab is open).
 */
(function (global) {
  const mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function current() {
    return mql && mql.matches ? 'dark' : 'light';
  }

  function watch(callback) {
    callback(current());
    if (!mql) return;
    const handler = (e) => callback(e.matches ? 'dark' : 'light');
    if (mql.addEventListener) mql.addEventListener('change', handler);
    else if (mql.addListener) mql.addListener(handler);
  }

  global.LMATFY_THEME = { current, watch };
})(window);
