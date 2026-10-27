// Theme and language switches for the project site. The <head> snippet in each
// page applies the saved choice before first paint; this wires the buttons.
(function () {
  const root = document.documentElement;
  const store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Private windows may block storage; the switch still works for this visit.
      }
    },
  };

  // Attributes cannot hold two languages, so images carry data-alt-ko / data-alt-en.
  function applyLanguage(language) {
    root.dataset.lang = language;
    root.lang = language;
    document.title = root.dataset[`title${language === 'en' ? 'En' : 'Ko'}`] || document.title;
    document.querySelectorAll('[data-alt-ko]').forEach((image) => {
      image.alt = language === 'en' ? image.dataset.altEn : image.dataset.altKo;
    });
    document.querySelectorAll('[data-set-lang]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.setLang === language));
    });
  }

  function currentTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyThemeLabel() {
    const button = document.getElementById('themeToggle');
    if (!button) return;
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    const label =
      root.dataset.lang === 'en'
        ? `Switch to ${next} mode`
        : `${next === 'light' ? '밝은' : '어두운'} 화면으로 바꾸기`;
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  document.querySelectorAll('[data-set-lang]').forEach((button) => {
    button.addEventListener('click', () => {
      store.set('lang', button.dataset.setLang);
      applyLanguage(button.dataset.setLang);
      applyThemeLabel();
    });
  });

  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    store.set('theme', next);
    applyThemeLabel();
  });

  applyLanguage(root.dataset.lang || 'ko');
  applyThemeLabel();
})();
