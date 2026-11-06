import { sb, h, money, safeUrl, digits, getSettings } from './common.js';

const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const oc = (x) => 1 - Math.pow(1 - x, 3);
const ob = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const rnd = (s) => { const x = Math.sin(s * 999.123) * 43758.5453; return x - Math.floor(x); };

/* ---------- Animated hero (live, no video file) ---------- */
function mountScene() {
  const wrap = $('sceneWrap');
  const root = $('scene');
  if (!wrap || !root) return;
  const W = 1280, H = 720, DUR = 8;
  const fit = () => root.style.setProperty('--k', String(wrap.clientWidth / W));
  fit();
  if (window.ResizeObserver) new ResizeObserver(fit).observe(wrap);

  const orbs = [['#2563eb', 520, 0.55, 180, 100], ['#06b6d4', 380, 0.35, 820, 420], ['#7c3aed', 460, 0.4, 420, 520]].map(([c, s, o, x, y], i) => {
    const e = h('div', { class: 's-orb' });
    e.style.width = s + 'px'; e.style.height = s + 'px'; e.style.background = c; e.style.opacity = String(o);
    e.style.left = -s / 2 + 'px'; e.style.top = -s / 2 + 'px';
    $('orbs').append(e);
    return { e, x, y, i };
  });
  const dots = [...Array(40)].map((_, i) => {
    const e = h('div', { class: 's-dot' });
    const s = 2 + rnd(i + 1) * 4;
    e.style.width = s + 'px'; e.style.height = s + 'px';
    $('dots').append(e);
    return { e, x: rnd(i + 11) * W, y0: rnd(i + 23) * H, sp: 20 + rnd(i + 37) * 50, o: 0.12 + rnd(i + 51) * 0.3, ph: rnd(i + 61) * 6.28 };
  });
  const defs = [
    { bg: 'linear-gradient(160deg,#6d28d9,#2563eb)', sun: '#fbbf24', glow: 'rgba(124,58,237,.45)' },
    { bg: 'linear-gradient(160deg,#0ea5e9,#1e3a8a)', sun: '#f472b6', glow: 'rgba(14,165,233,.5)' },
    { bg: 'linear-gradient(160deg,#f97316,#be123c)', sun: '#fde68a', glow: 'rgba(249,115,22,.45)' },
  ];
  const phones = defs.map((d) => {
    const glare = h('div', { class: 's-glare' });
    const screen = h('div', { class: 's-screen' },
      h('div', { class: 's-notch' }), h('div', { class: 's-sun' }),
      h('div', { class: 's-bar b1' }), h('div', { class: 's-bar b2' }),
      h('div', { class: 's-apps' }, [...Array(8)].map(() => h('i'))), glare);
    screen.style.setProperty('--bg', d.bg);
    screen.style.setProperty('--sun', d.sun);
    const e = h('div', { class: 's-phone' }, screen);
    e.style.setProperty('--glow', d.glow);
    $('stage').append(e);
    return { e, glare };
  });
  const chips = ['Samsung', 'Apple', 'Xiaomi', 'Oppo'].map((n) => {
    const e = h('div', { class: 's-pill', text: n });
    $('chips').append(e);
    return e;
  });
  const cta = $('cta'), ring = $('ring'), bubble = $('bubble'), l1 = $('l1'), l2 = $('l2'), fade = $('fade');
  const CX = 340, CY = 365;
  const cfg = [
    { s: 0.2, e: 1.5, x: 0, ry: 0, rz: 0, sc: 1, z: 60, from: { y: 520, ry: -80, rz: 10 } },
    { s: 1.0, e: 2.3, x: -185, ry: 24, rz: -7, sc: 0.86, z: 0, from: { y: 420, ry: 80, rz: -30, x: -40 } },
    { s: 1.2, e: 2.5, x: 185, ry: -24, rz: 7, sc: 0.86, z: 0, from: { y: 420, ry: -80, rz: 30, x: 40 } },
  ];

  function render(t) {
    orbs.forEach((o) => {
      const x = o.x + Math.sin(t * 0.7 + o.i * 2) * 70, y = o.y + Math.cos(t * 0.6 + o.i) * 50;
      o.e.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + (1 + Math.sin(t * 0.9 + o.i) * 0.08) + ')';
    });
    dots.forEach((d) => {
      const y = (((d.y0 - d.sp * t) % H) + H) % H;
      d.e.style.transform = 'translate(' + d.x + 'px,' + y + 'px)';
      d.e.style.opacity = String(d.o * (0.6 + 0.4 * Math.sin(t * 2 + d.ph)));
    });
    phones.forEach((p, i) => {
      const c = cfg[i];
      const a = ob(prog(t, c.s, c.e)), o = oc(prog(t, c.s, c.s + 0.35));
      const settle = prog(t, c.e, c.e + 0.5);
      const bob = Math.sin(t * 1.8 + i * 1.7) * 9 * settle;
      const sway = Math.sin(t * 1.1 + i) * 5 * settle;
      const fx = c.from.x || 0;
      const x = CX - 105 + fx + (c.x - fx) * a;
      const y = CY - 215 + c.from.y * (1 - a) + bob;
      const ry = c.from.ry + (c.ry - c.from.ry) * a + sway;
      const rz = c.from.rz + (c.rz - c.from.rz) * a;
      const lean = io(prog(t, 5.0, 6.2)) * (i === 0 ? -4 : i === 2 ? 4 : 0);
      p.e.style.opacity = String(o);
      p.e.style.zIndex = String(c.z);
      p.e.style.transform = 'translate3d(' + x + 'px,' + y + 'px,' + c.z + 'px) rotateY(' + ry + 'deg) rotateZ(' + (rz + lean) + 'deg) scale(' + c.sc + ')';
      p.glare.style.transform = 'translateX(' + (((t * 0.35 + i * 0.3) % 1.6) - 0.8) * 260 + 'px)';
    });
    [[l1, 1.5], [l2, 1.9]].forEach(([e, s]) => {
      const a = oc(prog(t, s, s + 0.7));
      e.style.opacity = String(a);
      e.style.transform = 'translateY(' + (1 - a) * 46 + 'px)';
      e.style.filter = 'blur(' + (1 - a) * 10 + 'px)';
    });
    chips.forEach((e, i) => {
      const a = ob(prog(t, 2.9 + i * 0.22, 3.5 + i * 0.22));
      e.style.opacity = String(clamp(a * 2));
      e.style.transform = 'scale(' + (0.5 + 0.5 * a) + ')';
    });
    const ca = ob(prog(t, 4.8, 5.5));
    cta.style.opacity = String(clamp(ca * 2));
    const pulse = 1 + Math.sin(Math.max(0, t - 5.5) * 6) * 0.025 * prog(t, 5.5, 5.7);
    cta.style.transform = 'scale(' + (0.6 + 0.4 * ca) * pulse + ')';
    const rp = t > 5.5 ? ((t - 5.5) % 1.1) / 1.1 : 0;
    ring.style.opacity = t > 5.5 ? String((1 - rp) * 0.8) : '0';
    ring.style.left = cta.offsetLeft - rp * 18 + 'px';
    ring.style.top = cta.offsetTop - rp * 18 + 'px';
    ring.style.width = cta.offsetWidth + rp * 36 + 'px';
    ring.style.height = cta.offsetHeight + rp * 36 + 'px';
    const ba = ob(prog(t, 5.9, 6.5));
    bubble.style.opacity = String(clamp(ba * 2) * (1 - prog(t, 7.2, 7.5)));
    bubble.style.transform = 'translate(' + (CX - 95) + 'px,' + (150 + (1 - ba) * 30 - prog(t, 6.5, 7.5) * 20) + 'px) scale(' + (0.6 + 0.4 * ba) + ')';
    fade.style.opacity = String(Math.max(1 - prog(t, 0, 0.35), prog(t, 7.3, 7.95)));
  }

  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) {
    render(6.3);
    return;
  }
  let t = 0, last = performance.now(), visible = true;
  if (window.IntersectionObserver) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; last = performance.now(); }).observe(wrap);
  }
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (visible) { t = (t + dt) % DUR; render(t); }
    requestAnimationFrame(loop);
  };
  render(0);
  requestAnimationFrame(loop);
}

/* ---------- Data-driven sections ---------- */
function openDetails(p) {
  const s = $('search'), c = $('condSel');
  const all = [...document.querySelectorAll('#brandChips .chip')].find((b) => b.textContent === 'الكل');
  if (all) all.click();
  c.value = '';
  c.dispatchEvent(new Event('change'));
  s.value = p.name;
  s.dispatchEvent(new Event('input'));
  const card = [...document.querySelectorAll('#grid .card')].find((a) => {
    const t = a.querySelector('h3');
    return t && t.textContent === p.name;
  });
  if (card) card.querySelector('.card-img').click();
  s.value = '';
  s.dispatchEvent(new Event('input'));
}

function filterBrand(b) {
  const chip = [...document.querySelectorAll('#brandChips .chip')].find((x) => x.textContent === b);
  if (chip) chip.click();
  $('products').scrollIntoView({ behavior: 'smooth' });
}

function visual(p) {
  const url = p.image_url ? safeUrl(p.image_url) : '';
  if (url) return h('img', { class: 'nimg', src: url, alt: p.brand + ' ' + p.name, loading: 'lazy', decoding: 'async' });
  return h('span', { class: 'bigletter', 'aria-hidden': 'true', text: (p.brand || '?').slice(0, 1).toUpperCase() });
}

const shortText = (s) => {
  const t = String(s || '').trim();
  return t.length > 70 ? t.slice(0, 68) + '…' : t;
};

async function loadData() {
  const [S, res] = await Promise.all([
    getSettings(),
    sb.from('products').select('*').eq('is_active', true)
      .order('is_featured', { ascending: false }).order('created_at', { ascending: false }),
  ]);
  const products = res.data || [];
  const cur = S.currency || '';
  const wa = (text) => 'https://wa.me/' + digits(S.whatsapp_number) + '?text=' + encodeURIComponent(text);
  const waHello = wa('مرحبًا، أريد الاستفسار عن هاتف');
  ['cta', 'heroWa', 'fWa', 'aboutWa'].forEach((id) => {
    const el = $(id);
    if (el) { el.href = waHello; el.target = '_blank'; el.rel = 'noopener noreferrer'; }
  });
  const yr = $('fYear'); if (yr) yr.textContent = String(new Date().getFullYear());
  const fn = $('fName2'); if (fn) fn.textContent = S.store_name || 'متجر الهواتف';

  // What's new
  const picks = [...products.filter((p) => p.is_featured), ...products.filter((p) => !p.is_featured)].slice(0, 4);
  $('newGrid').replaceChildren(...picks.map((p, i) => h('button', { class: 'ncard', type: 'button', onclick: () => openDetails(p) },
    h('div', { class: 'ni g' + (i % 4) }, visual(p)),
    h('div', { class: 'nb' },
      h('small', { class: 'brand-tag', text: p.brand + (p.condition === 'used' ? ' · مستعمل' : '') }),
      h('h3', { text: p.name }),
      h('p', { text: shortText(p.description) }),
      h('strong', { class: 'price', text: money(p.price, cur) }),
      h('span', { class: 'go', text: 'اعرف المزيد ‹' })))));

  // Brands
  const counts = {};
  products.forEach((p) => { counts[p.brand] = (counts[p.brand] || 0) + 1; });
  const brands = Object.keys(counts).sort();
  $('brandTiles').replaceChildren(...brands.map((b) => h('button', { class: 'btile', type: 'button', onclick: () => filterBrand(b) },
    h('b', { text: b }), h('small', { text: counts[b] + ' هاتف' }))));
  $('fBrands').replaceChildren(...brands.map((b) => h('li', {}, h('a', { href: '#products', text: b, onclick: (e) => { e.preventDefault(); filterBrand(b); } }))));

  // Offers
  const offers = products.filter((p) => p.old_price && p.old_price > p.price)
    .map((p) => ({ p, pct: Math.round((1 - p.price / p.old_price) * 100) }))
    .sort((a, b) => b.pct - a.pct).slice(0, 6);
  if (offers.length) {
    $('offers').hidden = false;
    $('offersList').replaceChildren(...offers.map(({ p, pct }) => h('li', {},
      h('a', { href: '#products', onclick: (e) => { e.preventDefault(); openDetails(p); } },
        h('span', { class: 'pct', text: '-' + pct + '%' }),
        h('span', { class: 'ot' }, h('b', { text: p.brand + ' ' + p.name }), h('small', { text: 'بدل ' + money(p.old_price, cur) + ' — الآن ' + money(p.price, cur) })),
        h('span', { class: 'go', text: '‹' })))));
  }
}

mountScene();
loadData().catch(() => {});
