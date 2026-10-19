(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const motion = hasGsap && !reduceMotion;
  if (motion) root.classList.add('motion');

  /* ─────────────────────────────────────────────
     Заглушки: если файл из data-img существует в папке img/,
     он подставится автоматически. Иначе — сетка с подписью.
     ───────────────────────────────────────────── */
  // телефон / планшет без мыши: лёгкие картинки, без тяжёлых эффектов
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const small = matchMedia('(max-width: 760px)').matches;
  if (isTouch) root.classList.add('touch');

  const loadPh = (el) => {
    const full = el.dataset.img;
    const apply = (src) => { el.style.backgroundImage = `url("${src}")`; el.classList.add('is-loaded'); };
    const img = new Image();
    if (small) {
      // лёгкая версия из img/m/ (есть для крупных картинок), иначе — полная
      const m = full.replace(/^img\/([^/]+)\.\w+$/, 'img/m/$1.jpg');
      img.onload = () => apply(m);
      img.onerror = () => { const f = new Image(); f.onload = () => apply(full); f.src = full; };
      img.src = m;
    } else {
      img.onload = () => apply(full);
      img.src = full;
    }
  };
  const phs = [...document.querySelectorAll('[data-img]')];
  phs.forEach((el) => {
    const label = document.createElement('span');
    label.className = 'ph__label';
    label.innerHTML = `${el.dataset.label || ''}<small>${el.dataset.img}</small>`;
    el.appendChild(label);
  });
  // грузим, только когда до картинки ~полтора экрана; превью в списке проектов — только с мышью
  const io = 'IntersectionObserver' in window && new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); loadPh(en.target); } });
  }, { rootMargin: '150% 0px' });
  phs.forEach((el) => {
    if (el.closest('.index__preview')) { if (canHover) setTimeout(() => loadPh(el), 2500); return; }
    if (io) io.observe(el); else loadPh(el);
  });

  /* ─────────────────────────────────────────────
     Без анимаций: показываем всё в финальном виде
     ───────────────────────────────────────────── */
  /* ─────────────────────────────────────────────
     Лайтбокс: клик по картинке — открыть на весь экран,
     ещё клик — натуральный размер, ←/→ — соседние, Esc — закрыть
     ───────────────────────────────────────────── */
  (() => {
    const SEL = '.fig img, .gallery img, .pair__imgs img, .sheet img, .hero-img img, .modules .ph, .gallery .ph, .split__img, .card--img';
    const srcOf = (el) => (el.tagName === 'IMG' ? el.src : el.classList.contains('is-loaded') ? el.dataset.img : null);
    const capOf = (el) => {
      const f = el.closest('figure');
      const c = f && f.querySelector('figcaption');
      return (c && c.textContent.trim()) || el.alt || el.dataset.label || '';
    };
    const box = document.createElement('div');
    box.className = 'lb';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.hidden = true;
    box.innerHTML = '<div class="lb__stage"><img class="lb__img" alt=""></div>'
      + '<button class="lb__btn lb__close" aria-label="Закрыть">✕</button>'
      + '<button class="lb__btn lb__prev" aria-label="Предыдущая">‹</button>'
      + '<button class="lb__btn lb__next" aria-label="Следующая">›</button>'
      + '<p class="lb__cap"></p>';
    document.body.appendChild(box);
    const stage = box.querySelector('.lb__stage');
    const img = box.querySelector('.lb__img');
    const cap = box.querySelector('.lb__cap');
    let list = [], idx = 0;

    const show = (i) => {
      idx = (i + list.length) % list.length;
      const el = list[idx];
      box.classList.remove('is-zoomed');
      img.src = srcOf(el);
      img.alt = capOf(el);
      cap.textContent = capOf(el);
    };
    const open = (el) => {
      list = [...document.querySelectorAll(SEL)].filter(srcOf);
      box.hidden = false;
      root.classList.add('lb-open');
      if (window.__lenis) window.__lenis.stop();
      show(Math.max(0, list.indexOf(el)));
      box.querySelector('.lb__close').focus({ preventScroll: true });
    };
    const close = () => {
      box.hidden = true;
      root.classList.remove('lb-open');
      img.removeAttribute('src');
      if (window.__lenis) window.__lenis.start();
    };

    document.addEventListener('click', (e) => {
      const el = e.target.closest(SEL);
      if (!el || box.contains(el) || !srcOf(el)) return;
      e.preventDefault();
      open(el);
    });
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      const zoom = !box.classList.contains('is-zoomed');
      // точка, по которой кликнули, — в долях картинки
      const r = img.getBoundingClientRect();
      // реальная область картинки внутри object-fit: contain
      const k = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
      const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
      const ix = r.left + (r.width - iw) / 2, iy = r.top + (r.height - ih) / 2;
      const fx = Math.min(1, Math.max(0, (e.clientX - ix) / iw)), fy = Math.min(1, Math.max(0, (e.clientY - iy) / ih));
      if (zoom) img.style.setProperty('--zw', Math.round(Math.max(img.naturalWidth, iw * 2)) + 'px');
      box.classList.toggle('is-zoomed', zoom);
      if (zoom) {
        stage.scrollLeft = fx * stage.scrollWidth - stage.clientWidth / 2;
        stage.scrollTop = fy * stage.scrollHeight - stage.clientHeight / 2;
      }
    });
    stage.addEventListener('click', (e) => { if (e.target === stage) close(); });
    box.querySelector('.lb__close').addEventListener('click', close);
    box.querySelector('.lb__prev').addEventListener('click', () => show(idx - 1));
    box.querySelector('.lb__next').addEventListener('click', () => show(idx + 1));
    document.addEventListener('keydown', (e) => {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
    });
  })();

  if (!motion) return;

  gsap.registerPlugin(ScrollTrigger);
  // на телефоне не пересчитываем всё при скрытии адресной строки — иначе экран «дёргается»
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* Плавный скролл */
  let lenis = null;
  if (window.Lenis && !isTouch) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : document.querySelector(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else if (target === 0) window.scrollTo({ top: 0, behavior: 'smooth' });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* Навигация прячется при скролле вниз.
     Переключаем только после заметного сдвига (40px) — иначе на телефоне при появлении
     адресной строки позиция «дрожит», меню с blur'ом прячется/показывается каждый кадр и скролл лагает */
  const nav = document.getElementById('nav');
  let anchorY = 0, hidden = false;
  ScrollTrigger.create({
    onUpdate: (self) => {
      const y = self.scroll();
      if (y <= 300) { anchorY = y; if (hidden) nav.classList.toggle('is-hidden', hidden = false); return; }
      const d = y - anchorY;
      if (hidden ? d > 0 : d < 0) { anchorY = y; return; }   // продолжаем в ту же сторону — сдвигаем опору
      if (Math.abs(d) < 40) return;
      nav.classList.toggle('is-hidden', hidden = !hidden);
      anchorY = y;
    },
  });

  /* ── 1. Обложка: буквы поднимаются, окно раскрывается ── */
  const title = document.querySelector('.cover__title');
  title.innerHTML = [...title.textContent].map((c) => `<span class="chw"><span class="ch">${c}</span></span>`).join('');
  gsap.from('.cover__title .ch', { yPercent: 135, duration: 1.3, ease: 'expo.out', stagger: 0.045, delay: 0.15 });
  gsap.from('.cover__media', { scale: 0.85, opacity: 0, duration: 1.6, ease: 'expo.out', delay: 0.35 });
  gsap.from('.cover__meta span, .nav > *', { y: -20, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.06, delay: 0.5 });

  gsap.timeline({
    scrollTrigger: { trigger: '#cover', start: 'top top+=10', end: '+=140%', pin: true, scrub: 0.7, invalidateOnRefresh: true },
  })
    .fromTo('.cover__media',
      { clipPath: () => (innerWidth < 760 ? 'inset(28% 8% 34% 8% round 22px)' : 'inset(26% 30% 30% 30% round 28px)') },
      { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut' }, 0)
    .to('.cover__title', { yPercent: 60, opacity: 0, ease: 'power1.in' }, 0)
    .to('.cover__meta, .cover__hint', { opacity: 0, duration: 0.3 }, 0)
    .to('.cover__caption', { opacity: 1, duration: 0.35 }, 0.6)
    .from('.cover__caption > *', { y: 40, stagger: 0.08, duration: 0.35 }, 0.6);

  /* ── 2. Обо мне: слова проявляются из серого в чёрный ── */
  const wordsEl = document.querySelector('.js-words');   // блок «Привет» может быть убран
  if (wordsEl) {
  const words = splitWords(wordsEl);
  gsap.set(words, { color: getVar('--ghost') });
  const aboutTl = gsap.timeline({
    scrollTrigger: { trigger: '#about', start: 'top top+=10', end: '+=160%', pin: true, scrub: 0.5 },
  });
  aboutTl.to(words, {
    color: (i, el) => (el.classList.contains('w--tail') ? getVar('--tail') : getVar('--ink')),
    stagger: 0.1, ease: 'none',
  })
    .fromTo('.about__img--a', { y: 80, rotate: -2 }, { y: -40, rotate: -10, ease: 'none', duration: aboutTl.duration() }, 0)
    .fromTo('.about__img--b', { y: -40 }, { y: 60, ease: 'none', duration: aboutTl.duration() }, 0);
  }

  function splitWords(el) {
    const nodes = [];
    [...el.childNodes].forEach((n) => {
      const tail = n.nodeType === 1;
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { nodes.push(document.createTextNode(part.includes(' ') ? ' ' : ' ')); return; }
        const s = document.createElement('span');
        s.className = 'w' + (tail ? ' w--tail' : '');
        s.textContent = part;
        nodes.push(s);
      });
    });
    el.textContent = '';
    nodes.forEach((n) => el.appendChild(n));
    return el.querySelectorAll('.w');
  }
  function getVar(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }

  /* ── Появление элементов ── */
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: (els) => gsap.fromTo(els,
      { y: 60, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 1.2, ease: 'expo.out', stagger: 0.08, overwrite: true }),
  });
  gsap.set('[data-reveal]', { opacity: 0 });

  /* ── Счётчики ── */
  document.querySelectorAll('[data-count]').forEach((el) => {
    const to = parseFloat(el.dataset.count);
    const dec = +(el.dataset.dec || 0);
    const obj = { v: 0 };
    const fmt = (v) => v.toFixed(dec).replace('.', ',');
    el.textContent = fmt(0);
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(obj, { v: to, duration: 2, ease: 'expo.out', onUpdate: () => { el.textContent = fmt(obj.v); } }),
    });
  });

  /* ── Индекс: превью за курсором ── */
  const preview = document.querySelector('.index__preview');
  if (canHover && preview) {
    const items = preview.children;
    const xTo = gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'expo.out' });
    const yTo = gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'expo.out' });
    const list = document.querySelector('.index__list');
    window.addEventListener('mousemove', (e) => { xTo(e.clientX + 24); yTo(e.clientY - 110); });
    list.querySelectorAll('a').forEach((a) => {
      a.addEventListener('mouseenter', () => {
        [...items].forEach((it, k) => it.classList.toggle('is-active', k === +a.dataset.preview));
        preview.classList.add('is-on');
      });
    });
    list.addEventListener('mouseleave', () => preview.classList.remove('is-on'));
  }

  /* ── Главы: огромная цифра и заголовок (одна анимация — без конфликтов) ── */
  document.querySelectorAll('.chapter').forEach((ch) => {
    gsap.timeline({ scrollTrigger: { trigger: ch, start: 'top 85%', end: 'top 25%', scrub: 1 } })
      .fromTo(ch.querySelector('.chapter__num'), { y: 120, opacity: 0 }, { y: 0, opacity: 1, ease: 'none' }, 0)
      .fromTo(ch.querySelectorAll('.line > span'), { yPercent: 110 }, { yPercent: 0, stagger: 0.12, ease: 'power2.out' }, 0.15)
      .fromTo(ch.querySelectorAll('.chapter__note, .pill'), { opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.35);
  });

  /* ── Обо мне: имя ── */
  gsap.fromTo('.cv__name .line > span', { yPercent: 110 }, {
    yPercent: 0, stagger: 0.12, duration: 1.2, ease: 'expo.out',
    scrollTrigger: { trigger: '.cv', start: 'top 75%', once: true },
  });

  /* ── Контакты: заголовок ── */
  gsap.fromTo('.contact__title .line > span', { yPercent: 110 }, {
    yPercent: 0, stagger: 0.12, ease: 'power3.out',
    scrollTrigger: { trigger: '.contact', start: 'top 80%', end: 'top 20%', scrub: 0.8 },
  });

  /* ── Главные картинки проектов: лёгкий въезд, в конце — полное изображение ── */
  if (!isTouch) document.querySelectorAll('.hero-img').forEach((f) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: f, start: 'top 95%', end: 'top 35%', scrub: 0.6 } });
    tl.fromTo(f, { clipPath: 'inset(4% 3% 4% 3% round 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', ease: 'none' }, 0)
      .fromTo(f.querySelector('img'), { scale: 1.06 }, { scale: 1, ease: 'none' }, 0);
  });

  /* Закреплённые панели не должны быть шире экрана */
  const fitPinned = () => document.querySelectorAll('.pin-spacer > .panel').forEach((el) => {
    el.style.maxWidth = `calc(${document.documentElement.clientWidth}px - var(--gap) * 2)`;
  });
  ScrollTrigger.addEventListener('refresh', fitPinned);
  fitPinned();

  /* Пересчёт после загрузки шрифтов/картинок */
  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
