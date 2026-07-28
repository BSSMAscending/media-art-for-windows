function createHeartOverlay() {
  const el = document.createElement('div');
  el.className = 'heart-overlay';
  document.body.appendChild(el);

  let hideTimer = null;
  let active = false;

  function show() {
    if (active) return;
    active = true;
    window.clearTimeout(hideTimer);
    el.innerHTML = '';

    const banner = document.createElement('div');
    banner.className = 'heart-banner';
    el.appendChild(banner);

    requestAnimationFrame(() => el.classList.add('heart-overlay--visible'));

    const text = '♥  부산수학문화관';
    let i = 0;
    const iv = window.setInterval(() => {
      banner.textContent += text[i++];
      if (i >= text.length) window.clearInterval(iv);
    }, 85);

    hideTimer = window.setTimeout(() => {
      el.classList.remove('heart-overlay--visible');
      el.classList.add('heart-overlay--fading');
      window.setTimeout(() => {
        el.classList.remove('heart-overlay--fading');
        el.innerHTML = '';
        active = false;
      }, 800);
    }, 4000);
  }

  function hide() {
    window.clearTimeout(hideTimer);
    el.classList.remove('heart-overlay--visible', 'heart-overlay--fading');
    el.innerHTML = '';
    active = false;
  }

  return { show, hide };
}

module.exports = { createHeartOverlay };
