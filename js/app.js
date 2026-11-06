import { sb, h, money, safeUrl, digits, getSettings, toast, field, closeBtn, backdropClose } from './common.js';

const $ = (id) => document.getElementById(id);
const MAX_QTY = 10;
const NL = String.fromCharCode(10);
let products = [];
let S = {};
let cart = loadCart();
const filters = { q: '', brand: '', cond: '' };

function loadCart() {
  try {
    return new Map(JSON.parse(localStorage.getItem('ps_cart') || '[]'));
  } catch (e) {
    return new Map();
  }
}
function saveCart() {
  try {
    localStorage.setItem('ps_cart', JSON.stringify([...cart]));
  } catch (e) {}
}
const byId = (id) => products.find((p) => p.id === id);
const cur = () => S.currency || '';
const waLink = (text) => 'https://wa.me/' + digits(S.whatsapp_number) + '?text=' + encodeURIComponent(text);

function imageEl(p, cls) {
  const url = p.image_url ? safeUrl(p.image_url) : '';
  if (url) return h('img', { class: cls, src: url, alt: p.brand + ' ' + p.name, loading: 'lazy', decoding: 'async' });
  return h('div', { class: cls + ' ph', 'aria-hidden': 'true' }, (p.brand || '?').slice(0, 1).toUpperCase());
}

function stockLabel(p) {
  if (p.stock <= 0) return 'نفد المخزون';
  if (p.stock <= 3) return 'متبقي ' + p.stock + ' فقط';
  return 'متوفر';
}

function priceRow(p) {
  return h('div', { class: 'price-row' },
    h('strong', { class: 'price', text: money(p.price, cur()) }),
    p.old_price && p.old_price > p.price ? h('s', { class: 'old', text: money(p.old_price, cur()) }) : null);
}

function filtered() {
  const q = filters.q.trim().toLowerCase();
  return products.filter((p) =>
    (!filters.brand || p.brand === filters.brand) &&
    (!filters.cond || p.condition === filters.cond) &&
    (!q || (p.brand + ' ' + p.name).toLowerCase().includes(q)));
}

function renderBrands() {
  const brands = [...new Set(products.map((p) => p.brand))].sort();
  const mk = (label, val) => h('button', {
    class: 'chip' + (filters.brand === val ? ' on' : ''), type: 'button', text: label,
    onclick: () => { filters.brand = val; renderBrands(); renderGrid(); },
  });
  $('brandChips').replaceChildren(mk('الكل', ''), ...brands.map((b) => mk(b, b)));
}

function renderGrid() {
  const list = filtered();
  const grid = $('grid');
  if (!list.length) {
    grid.replaceChildren(h('p', { class: 'msg', text: products.length ? 'لا توجد نتائج مطابقة.' : 'لا توجد منتجات حاليًا.' }));
    return;
  }
  grid.replaceChildren(...list.map(card));
}

function card(p) {
  const out = p.stock <= 0;
  const off = p.old_price && p.old_price > p.price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
  return h('article', { class: 'card' },
    h('button', { class: 'card-img', type: 'button', 'aria-label': 'تفاصيل ' + p.name, onclick: () => openProduct(p.id) },
      imageEl(p, 'pimg'),
      off ? h('span', { class: 'badge', text: '-' + off + '%' }) : null,
      p.condition === 'used' ? h('span', { class: 'badge used', text: 'مستعمل' }) : null),
    h('div', { class: 'card-body' },
      h('small', { class: 'brand-tag', text: p.brand }),
      h('h3', { text: p.name }),
      priceRow(p),
      h('small', { class: out ? 'stock out' : 'stock', text: stockLabel(p) }),
      h('div', { class: 'actions' },
        h('button', { class: 'btn ghost', type: 'button', text: 'التفاصيل', onclick: () => openProduct(p.id) }),
        h('button', { class: 'btn primary', type: 'button', disabled: out, text: out ? 'نفد' : 'أضف للسلة',
          onclick: () => { addToCart(p.id, 1); toast('تمت الإضافة إلى السلة'); } }))));
}

function addToCart(id, qty) {
  const p = byId(id);
  if (!p || p.stock <= 0) return;
  cart.set(id, Math.min((cart.get(id) || 0) + qty, p.stock, MAX_QTY));
  saveCart();
  renderCartCount();
}
function setQty(id, q) {
  const p = byId(id);
  if (!p || q <= 0) cart.delete(id);
  else cart.set(id, Math.min(q, p.stock, MAX_QTY));
  saveCart();
  renderCartCount();
  if ($('cartDlg').open) renderCart();
}
function renderCartCount() {
  let n = 0;
  cart.forEach((q) => { n += q; });
  $('cartCount').textContent = String(n);
}
const cartRows = () => [...cart].map(([id, qty]) => ({ p: byId(id), qty })).filter((r) => r.p);

function openProduct(id) {
  const p = byId(id);
  if (!p) return;
  const dlg = $('productDlg');
  const out = p.stock <= 0;
  const max = Math.max(1, Math.min(p.stock, MAX_QTY));
  let qty = 1;
  const qtyOut = h('span', { class: 'qty-n', text: '1' });
  const step = (d) => { qty = Math.min(max, Math.max(1, qty + d)); qtyOut.textContent = String(qty); };
  const specs = Object.entries(p.specs || {});
  dlg.replaceChildren(
    closeBtn(dlg),
    h('div', { class: 'pd' },
      imageEl(p, 'pd-img'),
      h('div', { class: 'pd-info' },
        h('small', { class: 'brand-tag', text: p.brand + (p.condition === 'used' ? ' · مستعمل' : '') }),
        h('h2', { text: p.name }),
        priceRow(p),
        p.description ? h('p', { class: 'desc', text: p.description }) : null,
        specs.length ? h('table', { class: 'specs' }, h('tbody', {}, specs.map(([k, v]) => h('tr', {}, h('th', { text: k }), h('td', { text: String(v) }))))) : null,
        h('small', { class: out ? 'stock out' : 'stock', text: stockLabel(p) }),
        out ? null : h('div', { class: 'buy' },
          h('div', { class: 'qty' },
            h('button', { type: 'button', 'aria-label': 'إنقاص', text: '−', onclick: () => step(-1) }),
            qtyOut,
            h('button', { type: 'button', 'aria-label': 'زيادة', text: '+', onclick: () => step(1) })),
          h('button', { class: 'btn wa', type: 'button', text: 'اطلب عبر واتساب',
            onclick: () => { addToCart(id, qty); dlg.close(); openCheckout(); } }),
          h('button', { class: 'btn ghost', type: 'button', text: 'أضف للسلة',
            onclick: () => { addToCart(id, qty); toast('تمت الإضافة إلى السلة'); dlg.close(); } })))));
  dlg.showModal();
}

function openCart() {
  renderCart();
  $('cartDlg').showModal();
}
function renderCart() {
  const dlg = $('cartDlg');
  const rows = cartRows();
  const total = rows.reduce((s, r) => s + r.p.price * r.qty, 0);
  dlg.replaceChildren(
    closeBtn(dlg),
    h('h2', { text: 'سلة الطلب' }),
    rows.length
      ? h('div', { class: 'cart-list' }, rows.map(({ p, qty }) => h('div', { class: 'cart-row' },
          imageEl(p, 'cart-img'),
          h('div', { class: 'cart-info' }, h('b', { text: p.brand + ' ' + p.name }), h('small', { text: money(p.price, cur()) })),
          h('div', { class: 'qty' },
            h('button', { type: 'button', 'aria-label': 'إنقاص', text: '−', onclick: () => setQty(p.id, qty - 1) }),
            h('span', { class: 'qty-n', text: String(qty) }),
            h('button', { type: 'button', 'aria-label': 'زيادة', text: '+', onclick: () => setQty(p.id, qty + 1) })),
          h('button', { class: 'rm', type: 'button', 'aria-label': 'حذف', text: '🗑', onclick: () => setQty(p.id, 0) }))))
      : h('p', { class: 'msg', text: 'السلة فارغة.' }),
    rows.length ? h('div', { class: 'cart-foot' },
      h('div', { class: 'total' }, h('span', { text: 'المجموع' }), h('strong', { text: money(total, cur()) })),
      h('button', { class: 'btn wa big', type: 'button', text: 'إتمام الطلب عبر واتساب', onclick: () => { dlg.close(); openCheckout(); } })) : null);
}

function friendly(msg) {
  if (/too_many_orders/.test(msg)) return 'عدد الطلبات من هذا الرقم كبير، حاول لاحقًا أو تواصل معنا عبر واتساب.';
  if (/unavailable/.test(msg)) return 'بعض المنتجات لم تعد متوفرة بالكمية المطلوبة. تم تحديث القائمة، راجع السلة.';
  if (/invalid_items/.test(msg)) return 'السلة غير صالحة.';
  return 'تعذّر إرسال الطلب، تحقق من البيانات وحاول مجددًا.';
}

async function reloadProducts() {
  const { data } = await sb.from('products').select('*').eq('is_active', true)
    .order('is_featured', { ascending: false }).order('created_at', { ascending: false });
  products = data || products;
  for (const id of [...cart.keys()]) if (!byId(id)) cart.delete(id);
  saveCart();
  renderCartCount();
  renderBrands();
  renderGrid();
}

function openCheckout() {
  const rows = cartRows();
  if (!rows.length) { toast('السلة فارغة'); return; }
  const dlg = $('checkoutDlg');
  const total = rows.reduce((s, r) => s + r.p.price * r.qty, 0);
  const err = h('p', { class: 'err', role: 'alert' });
  const btn = h('button', { class: 'btn wa big', type: 'submit', text: 'تأكيد الطلب' });
  const form = h('form', { class: 'form' },
    field('الاسم الكامل', h('input', { name: 'name', required: true, minlength: 2, maxlength: 100, autocomplete: 'name' })),
    field('رقم الهاتف', h('input', { name: 'phone', type: 'tel', required: true, inputmode: 'tel', pattern: '[0-9+ ]{8,20}', maxlength: 20, autocomplete: 'tel' }), 'أرقام فقط'),
    field('المدينة / الولاية', h('input', { name: 'city', required: true, maxlength: 60 })),
    field('العنوان (اختياري)', h('input', { name: 'address', maxlength: 300, autocomplete: 'street-address' })),
    field('ملاحظات (اختياري)', h('textarea', { name: 'notes', rows: 2, maxlength: 500 })),
    h('input', { name: 'website', class: 'hp', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' }),
    h('div', { class: 'summary' },
      h('ul', {}, rows.map(({ p, qty }) => h('li', {}, h('span', { text: p.brand + ' ' + p.name + ' × ' + qty }), h('span', { text: money(p.price * qty, cur()) })))),
      h('div', { class: 'total' }, h('span', { text: 'المجموع' }), h('strong', { text: money(total, cur()) }))),
    err, btn);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const fd = new FormData(form);
    if (fd.get('website')) { cart.clear(); saveCart(); renderCartCount(); dlg.close(); return; }
    btn.disabled = true;
    btn.textContent = 'جارٍ إرسال الطلب…';
    const name = String(fd.get('name')).trim();
    const phone = String(fd.get('phone')).trim();
    const city = String(fd.get('city')).trim();
    const address = String(fd.get('address') || '').trim();
    const notes = String(fd.get('notes') || '').trim();
    const { data, error } = await sb.rpc('place_order', {
      p_name: name, p_phone: phone, p_wilaya: city, p_address: address, p_notes: notes,
      p_items: rows.map(({ p, qty }) => ({ product_id: p.id, qty })),
    });
    if (error || !data) {
      err.textContent = friendly(error ? error.message : '');
      btn.disabled = false;
      btn.textContent = 'تأكيد الطلب';
      if (error && /unavailable/.test(error.message)) await reloadProducts();
      return;
    }
    const o = Array.isArray(data) ? data[0] : data;
    const lines = ['مرحبًا، أريد تأكيد طلبي رقم ' + o.out_order_number, '', 'الاسم: ' + name, 'الهاتف: ' + phone, 'المدينة: ' + city];
    if (address) lines.push('العنوان: ' + address);
    lines.push('', 'المنتجات:');
    rows.forEach(({ p, qty }) => lines.push('• ' + p.brand + ' ' + p.name + ' × ' + qty + ' — ' + money(p.price * qty, cur())));
    lines.push('', 'المجموع: ' + money(o.out_total, cur()));
    if (notes) lines.push('', 'ملاحظات: ' + notes);
    cart.clear();
    saveCart();
    renderCartCount();
    dlg.close();
    openDone(o.out_order_number, lines.join(NL));
  });
  dlg.replaceChildren(closeBtn(dlg), h('h2', { text: 'بيانات الطلب' }), form);
  dlg.showModal();
}

function openDone(orderNo, text) {
  const dlg = $('doneDlg');
  dlg.replaceChildren(closeBtn(dlg),
    h('div', { class: 'done' },
      h('div', { class: 'tick', text: '✅' }),
      h('h2', { text: 'تم تسجيل طلبك' }),
      h('p', { text: 'رقم الطلب: ' + orderNo }),
      h('p', { class: 'muted', text: 'اضغط الزر التالي لإرسال تفاصيل الطلب إلى المحل عبر واتساب وتأكيده.' }),
      h('a', { class: 'btn wa big', href: waLink(text), target: '_blank', rel: 'noopener noreferrer', text: 'إرسال الطلب عبر واتساب' })));
  dlg.showModal();
}

function applySettings() {
  const name = S.store_name || 'متجر الهواتف';
  document.title = name + (S.tagline ? ' | ' + S.tagline : '');
  $('storeName').textContent = name;
  $('heroTitle').textContent = name;
  $('heroTag').textContent = S.tagline || '';
  $('fName').textContent = name;
  $('fAddr').textContent = S.address ? '📍 ' + S.address : '';
  $('fHours').textContent = S.opening_hours ? '🕒 ' + S.opening_hours : '';
  $('waFloat').href = waLink('مرحبًا، أريد الاستفسار عن هاتف');
}

async function init() {
  ['productDlg', 'cartDlg', 'checkoutDlg', 'doneDlg'].forEach((id) => backdropClose($(id)));
  $('cartBtn').addEventListener('click', openCart);
  $('search').addEventListener('input', (e) => { filters.q = e.target.value; renderGrid(); });
  $('condSel').addEventListener('change', (e) => { filters.cond = e.target.value; renderGrid(); });
  S = await getSettings();
  applySettings();
  const { data, error } = await sb.from('products').select('*').eq('is_active', true)
    .order('is_featured', { ascending: false }).order('created_at', { ascending: false });
  if (error) {
    $('grid').replaceChildren(h('p', { class: 'msg', text: 'تعذّر تحميل المنتجات، حاول لاحقًا.' }));
    return;
  }
  products = data || [];
  for (const id of [...cart.keys()]) if (!byId(id)) cart.delete(id);
  saveCart();
  renderCartCount();
  renderBrands();
  renderGrid();
}
init();
