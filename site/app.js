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

  // Patch notes: the version list stays in view and marks the version being read.
  // The sticky header and bar heights go to the CSS so anchors land below them.
  function setupNotesToc() {
    const toc = document.getElementById('notesToc');
    if (!toc) return;
    const header = document.querySelector('.site-header');
    const list = toc.querySelector('ol');
    const links = [...toc.querySelectorAll('a[href^="#"]')];
    const sections = links.map((link) => document.getElementById(link.hash.slice(1)));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let current = -1;
    // A version picked from the list stays marked until the page stops scrolling,
    // even when it is too near the bottom to reach the top.
    let picked = false;
    let settle = 0;
    let frame = 0;

    function measure() {
      root.style.setProperty('--header-h', `${header ? header.offsetHeight : 0}px`);
      root.style.setProperty('--toc-h', `${toc.offsetHeight}px`);
    }

    function mark(index) {
      if (index === current || !links[index]) return;
      current = index;
      links.forEach((link, i) => {
        if (i === index) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
      // On narrow screens the list is a sideways bar; keep the marked version in it.
      if (list.scrollWidth > list.clientWidth) {
        const item = links[index].parentElement;
        list.scrollTo({
          left: item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2,
          behavior: reduced.matches ? 'auto' : 'smooth',
        });
      }
    }

    // The version whose card has crossed the top third of the window.
    function follow() {
      const line = window.innerHeight * 0.3;
      let index = 0;
      sections.forEach((section, i) => {
        if (section && section.getBoundingClientRect().top <= line) index = i;
      });
      const bottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      mark(bottom ? sections.length - 1 : index);
    }

    function pick(index) {
      picked = true;
      mark(index);
      clearTimeout(settle);
      settle = setTimeout(() => (picked = false), 200);
    }

    links.forEach((link, i) => link.addEventListener('click', () => pick(i)));
    window.addEventListener(
      'scroll',
      () => {
        if (picked) {
          clearTimeout(settle);
          settle = setTimeout(() => (picked = false), 200);
        } else if (!frame) {
          frame = requestAnimationFrame(() => {
            frame = 0;
            follow();
          });
        }
      },
      { passive: true }
    );
    window.addEventListener('hashchange', () => {
      const index = links.findIndex((link) => link.hash === location.hash);
      if (index >= 0) pick(index);
    });
    new ResizeObserver(measure).observe(document.body);
    window.addEventListener('resize', follow);

    measure();
    const start = links.findIndex((link) => link.hash === location.hash);
    if (start >= 0) {
      // The browser jumped before the heights were known; land below the bars.
      sections[start].scrollIntoView();
      pick(start);
    } else {
      follow();
    }
  }

  applyLanguage(root.dataset.lang || 'ko');
  applyThemeLabel();
  setupNotesToc();
})();
