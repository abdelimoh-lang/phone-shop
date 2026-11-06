import { sb, h, money, safeUrl, getSettings, toast, field, closeBtn, backdropClose } from './common.js';

const app = document.getElementById('app');
const dlg = document.getElementById('prodDlg');
backdropClose(dlg);
const STATUS = { new: 'جديد', confirmed: 'مؤكد', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغى' };
const SETTING_FIELDS = [
  ['store_name', 'اسم المتجر', ''],
  ['tagline', 'الشعار / وصف قصير', ''],
  ['whatsapp_number', 'رقم واتساب', 'مع رمز الدولة، أرقام فقط (بدون + أو 00)'],
  ['currency', 'العملة', ''],
  ['address', 'عنوان المحل', ''],
  ['opening_hours', 'ساعات العمل', ''],
];
let currency = '';

async function start() {
  const { data: sess } = await sb.auth.getSession();
  if (!sess.session) return showLogin();
  const { data: adm } = await sb.from('admin_users').select('id').maybeSingle();
  if (!adm) {
    await sb.auth.signOut();
    return showLogin('هذا الحساب ليس لديه صلاحية الإدارة.');
  }
  const s = await getSettings();
  currency = s.currency || '';
  showPanel();
}

function showLogin(msg) {
  const err = h('p', { class: 'err', role: 'alert', text: msg || '' });
  const btn = h('button', { class: 'btn primary big', type: 'submit', text: 'تسجيل الدخول' });
  const form = h('form', { class: 'login form' },
    h('h1', { text: 'لوحة التحكم' }),
    field('البريد الإلكتروني', h('input', { name: 'email', type: 'email', required: true, autocomplete: 'username' })),
    field('كلمة المرور', h('input', { name: 'password', type: 'password', required: true, autocomplete: 'current-password' })),
    err, btn);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    btn.disabled = true;
    const fd = new FormData(form);
    const { error } = await sb.auth.signInWithPassword({ email: String(fd.get('email')), password: String(fd.get('password')) });
    btn.disabled = false;
    if (error) { err.textContent = 'بيانات الدخول غير صحيحة.'; return; }
    start();
  });
  app.replaceChildren(form);
}

function showPanel() {
  const content = h('div', { class: 'tab-content' });
  const tabs = [['products', 'المنتجات', tabProducts], ['orders', 'الطلبات', tabOrders], ['settings', 'الإعدادات', tabSettings]];
  const nav = h('nav', { class: 'tabs' });
  const select = (key) => {
    nav.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === key));
    content.replaceChildren(h('p', { class: 'msg', text: 'جارٍ التحميل…' }));
    tabs.find((t) => t[0] === key)[2](content);
  };
  tabs.forEach(([k, label]) => nav.append(h('button', { class: 'tab', type: 'button', 'data-k': k, text: label, onclick: () => select(k) })));
  app.replaceChildren(
    h('header', { class: 'adm-head' },
      h('h1', { text: 'لوحة التحكم' }),
      h('div', {},
        h('a', { class: 'btn ghost sm', href: '/', text: 'عرض المتجر' }),
        h('button', { class: 'btn ghost sm', type: 'button', text: 'خروج', onclick: async () => { await sb.auth.signOut(); showLogin(); } }))),
    nav, content);
  select('products');
}

function thumb(p) {
  const url = p.image_url ? safeUrl(p.image_url) : '';
  return url ? h('img', { class: 'thumb', src: url, alt: '' }) : h('div', { class: 'thumb ph' }, (p.brand || '?').slice(0, 1).toUpperCase());
}

async function tabProducts(box) {
  const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false });
  if (error) { box.replaceChildren(h('p', { class: 'err', text: 'تعذّر تحميل المنتجات.' })); return; }
  const refresh = () => tabProducts(box);
  const del = async (p) => {
    if (!confirm('حذف هذا المنتج نهائيًا؟')) return;
    const r = await sb.from('products').delete().eq('id', p.id);
    if (r.error) toast('تعذّر الحذف'); else { toast('تم الحذف'); refresh(); }
  };
  box.replaceChildren(
    h('div', { class: 'toolbar' }, h('button', { class: 'btn primary', type: 'button', text: '+ إضافة منتج', onclick: () => productForm(null, refresh) })),
    data.length
      ? h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
          h('thead', {}, h('tr', {}, ['', 'المنتج', 'السعر', 'المخزون', 'الحالة', ''].map((t) => h('th', { text: t })))),
          h('tbody', {}, data.map((p) => h('tr', {},
            h('td', {}, thumb(p)),
            h('td', {}, h('b', { text: p.name }), h('br'), h('small', { text: p.brand })),
            h('td', { text: money(p.price, currency) }),
            h('td', { text: String(p.stock) }),
            h('td', {}, h('span', { class: p.is_active ? 'pill ok' : 'pill off', text: p.is_active ? 'ظاهر' : 'مخفي' })),
            h('td', { class: 'row-actions' },
              h('button', { class: 'btn ghost sm', type: 'button', text: 'تعديل', onclick: () => productForm(p, refresh) }),
              h('button', { class: 'btn danger sm', type: 'button', text: 'حذف', onclick: () => del(p) })))))))
      : h('p', { class: 'msg', text: 'لا توجد منتجات.' }));
}

function makeSlug(brand, name) {
  const base = (brand + '-' + name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (base.length >= 2 ? base.slice(0, 60) : 'p') + '-' + Math.random().toString(36).slice(2, 7);
}
function parseSpecs(text) {
  const out = {};
  String(text || '').split(String.fromCharCode(10)).forEach((line) => {
    const i = line.search(/[:：]/);
    if (i > 0) {
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim();
      if (k && v) out[k] = v;
    }
  });
  return out;
}

function productForm(p, done) {
  const err = h('p', { class: 'err', role: 'alert' });
  const save = h('button', { class: 'btn primary', type: 'submit', text: 'حفظ' });
  const specsText = p ? Object.entries(p.specs || {}).map(([k, v]) => k + ': ' + v).join(String.fromCharCode(10)) : '';
  const cond = h('select', { name: 'condition' },
    h('option', { value: 'new', selected: !p || p.condition === 'new', text: 'جديد' }),
    h('option', { value: 'used', selected: !!p && p.condition === 'used', text: 'مستعمل' }));
  const form = h('form', { class: 'form' },
    h('h2', { text: p ? 'تعديل المنتج' : 'منتج جديد' }),
    h('div', { class: 'two' },
      field('الماركة', h('input', { name: 'brand', required: true, maxlength: 60, value: p ? p.brand : '' })),
      field('اسم الهاتف', h('input', { name: 'name', required: true, maxlength: 160, value: p ? p.name : '' }))),
    h('div', { class: 'two' },
      field('السعر', h('input', { name: 'price', type: 'number', min: 0, step: '0.01', required: true, value: p ? p.price : '' })),
      field('السعر القديم (اختياري)', h('input', { name: 'old_price', type: 'number', min: 0, step: '0.01', value: p && p.old_price ? p.old_price : '' }))),
    h('div', { class: 'two' },
      field('الكمية في المخزون', h('input', { name: 'stock', type: 'number', min: 0, step: 1, required: true, value: p ? p.stock : 0 })),
      field('الحالة', cond)),
    field('الوصف', h('textarea', { name: 'description', rows: 3, maxlength: 4000 }, p && p.description ? p.description : '')),
    field('المواصفات', h('textarea', { name: 'specs', rows: 4 }, specsText), 'سطر لكل مواصفة بالشكل: الذاكرة: 8GB / 256GB'),
    field('صورة المنتج (JPG / PNG / WebP، حتى 5MB)', h('input', { name: 'image', type: 'file', accept: 'image/jpeg,image/png,image/webp' }), p && p.image_url ? 'توجد صورة حالية، اختر ملفًا فقط لاستبدالها.' : ''),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'is_active', checked: p ? p.is_active : true }), h('span', { text: 'ظاهر في المتجر' })),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'is_featured', checked: p ? p.is_featured : false }), h('span', { text: 'منتج مميز (يظهر أولًا)' })),
    err,
    h('div', { class: 'actions' }, save, h('button', { class: 'btn ghost', type: 'button', text: 'إلغاء', onclick: () => dlg.close() })));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    save.disabled = true;
    const fail = (m) => { err.textContent = m; save.disabled = false; };
    const fd = new FormData(form);
    let image_url = p ? p.image_url : null;
    const file = fd.get('image');
    if (file && file.size) {
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
      if (!ext) return fail('نوع الصورة غير مسموح.');
      if (file.size > 5 * 1024 * 1024) return fail('الصورة أكبر من 5MB.');
      const path = crypto.randomUUID() + '.' + ext;
      const up = await sb.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) return fail('تعذّر رفع الصورة.');
      image_url = sb.storage.from('product-images').getPublicUrl(path).data.publicUrl;
    }
    const price = Number(fd.get('price'));
    const oldRaw = String(fd.get('old_price') || '').trim();
    const stock = parseInt(String(fd.get('stock')), 10);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) return fail('تحقق من السعر والمخزون.');
    const row = {
      brand: String(fd.get('brand')).trim(),
      name: String(fd.get('name')).trim(),
      price,
      old_price: oldRaw ? Number(oldRaw) : null,
      stock,
      condition: String(fd.get('condition')),
      description: String(fd.get('description') || '').trim() || null,
      specs: parseSpecs(fd.get('specs')),
      image_url,
      is_active: form.elements.is_active.checked,
      is_featured: form.elements.is_featured.checked,
    };
    let res;
    if (p) res = await sb.from('products').update(row).eq('id', p.id);
    else res = await sb.from('products').insert(Object.assign({ slug: makeSlug(row.brand, row.name) }, row));
    if (res.error) return fail('تعذّر الحفظ: ' + res.error.message);
    dlg.close();
    toast('تم الحفظ');
    done();
  });
  dlg.replaceChildren(closeBtn(dlg), form);
  dlg.showModal();
}

async function tabOrders(box) {
  const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) { box.replaceChildren(h('p', { class: 'err', text: 'تعذّر تحميل الطلبات.' })); return; }
  box.replaceChildren(data.length ? h('div', { class: 'orders' }, data.map(orderCard)) : h('p', { class: 'msg', text: 'لا توجد طلبات بعد.' }));
}

function orderCard(o) {
  const sel = h('select', { class: 'status s-' + o.status }, Object.entries(STATUS).map(([k, v]) => h('option', { value: k, selected: o.status === k, text: v })));
  sel.addEventListener('change', async () => {
    const r = await sb.from('orders').update({ status: sel.value }).eq('id', o.id);
    if (r.error) { toast('تعذّر التحديث'); sel.value = o.status; return; }
    o.status = sel.value;
    sel.className = 'status s-' + o.status;
    toast('تم تحديث الحالة');
  });
  return h('article', { class: 'order' },
    h('div', { class: 'o-head' },
      h('b', { text: o.order_number }),
      h('small', { text: new Date(o.created_at).toLocaleString('ar-u-nu-latn') }),
      sel),
    h('div', { class: 'o-body' },
      h('p', {}, h('b', { text: o.customer_name }), ' · ', h('a', { href: 'tel:' + String(o.phone).replace(/[^0-9+]/g, ''), text: o.phone })),
      h('p', { class: 'muted', text: [o.wilaya, o.address].filter(Boolean).join(' — ') }),
      h('ul', {}, (o.items || []).map((i) => h('li', { text: i.name + ' × ' + i.qty + ' — ' + money(i.price * i.qty, currency) }))),
      o.notes ? h('p', { class: 'muted', text: 'ملاحظات: ' + o.notes }) : null,
      h('p', {}, 'المجموع: ', h('b', { text: money(o.total, currency) }))));
}

async function tabSettings(box) {
  const s = await getSettings();
  const err = h('p', { class: 'err', role: 'alert' });
  const btn = h('button', { class: 'btn primary', type: 'submit', text: 'حفظ الإعدادات' });
  const form = h('form', { class: 'form narrow' },
    SETTING_FIELDS.map(([k, label, hint]) => field(label, h('input', { name: k, maxlength: 200, value: s[k] || '' }), hint)),
    err, btn);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    btn.disabled = true;
    const fd = new FormData(form);
    const rows = SETTING_FIELDS.map(([k]) => {
      let v = String(fd.get(k) || '').trim();
      if (k === 'whatsapp_number') v = v.replace(/[^0-9]/g, '');
      return { key: k, value: v };
    });
    const r = await sb.from('store_settings').upsert(rows, { onConflict: 'key' });
    btn.disabled = false;
    if (r.error) { err.textContent = 'تعذّر الحفظ.'; return; }
    currency = rows.find((x) => x.key === 'currency').value;
    toast('تم حفظ الإعدادات');
  });
  box.replaceChildren(form);
}

start();
