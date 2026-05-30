// Artificer · theme handling (persisted in localStorage, shared across pages)
(function () {
  var KEY = 'artificer.theme';
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  if (stored === 'light' || stored === 'dark') {
    document.documentElement.setAttribute('data-theme', stored);
  }

  function apply(next) {
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      var label = b.querySelector('[data-theme-label]');
      if (label) label.textContent = next === 'light' ? 'Light' : 'Dark';
    });
  }

  function bind() {
    var initial = document.documentElement.getAttribute('data-theme') ||
                  (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      if (b.dataset.themeBound === '1') return;
      b.dataset.themeBound = '1';
      var label = b.querySelector('[data-theme-label]');
      if (label) label.textContent = initial === 'light' ? 'Light' : 'Dark';
      b.addEventListener('click', function () {
        var cur = document.documentElement.getAttribute('data-theme') ||
                  (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
        apply(cur === 'light' ? 'dark' : 'light');
      });
    });
  }

  // Runs whether the script lands before or after DOMContentLoaded.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
