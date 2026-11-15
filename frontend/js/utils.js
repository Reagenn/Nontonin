'use strict';
/* Nontonin — helper kecil frontend: DOM, escape, format. */

export const $ = s => document.querySelector(s);

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function stars(r) { return '★'.repeat(r || 0) + '☆'.repeat(Math.max(0, 5 - (r || 0))); }

export function progressOf(it) {
  const total = Number(it.totalUnits) || 0;
  const done = (it.checked || []).length;
  return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
}

export function tierRank(t) { return { S: 0, A: 1, B: 2, C: 3, D: 4 }[t] ?? 99; }

export function showModal(id) { document.getElementById(id).hidden = false; }
export function hideModal(id) { document.getElementById(id).hidden = true; }
