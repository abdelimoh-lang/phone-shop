import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Safe DOM builder: text is always inserted as text (never as HTML) -> no XSS.
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const money = (n, cur) => (Number(n).toLocaleString('en-US') + ' ' + (cur || '')).trim();
export const digits = (s) => String(s || '').replace(/[^0-9]/g, '');
export function safeUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' ? x.href : '';
  } catch (e) {
    return '';
  }
}

export async function getSettings() {
  const { data } = await sb.from('store_settings').select('key,value');
  return Object.fromEntries((data || []).map((r) => [r.key, r.value]));
}

export function toast(msg) {
  const t = h('div', { class: 'toast', role: 'status', text: msg });
  document.body.append(t);
  setTimeout(() => t.remove(), 2200);
}

export const field = (label, input, hint) =>
  h('label', { class: 'field' }, h('span', { text: label }), input, hint ? h('small', { text: hint }) : null);

export const closeBtn = (dlg) =>
  h('button', { class: 'x', type: 'button', 'aria-label': 'إغلاق', onclick: () => dlg.close(), text: '✕' });

export function backdropClose(dlg) {
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
}
