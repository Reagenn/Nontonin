'use strict';
/* Nontonin — render dashboard: statistik, Tier List, Lanjutkan, grafik. */
import { $, esc, progressOf } from './utils.js';
import { state } from './state.js';

export function renderStats() {
  const total = state.items.length;
  const done = state.items.reduce((n, it) => n + (it.checked || []).length, 0);
  const rated = state.items.filter(it => (it.rating || 0) > 0);
  const avg = rated.length ? (rated.reduce((n, it) => n + it.rating, 0) / rated.length).toFixed(1) : '—';
  const finished = state.items.filter(it => it.status === 'Selesai').length;
  $('#stats').innerHTML =
    `<div class="stat"><b>${total}</b><span>Total Judul</span></div>` +
    `<div class="stat"><b>${done}</b><span>Episode / Bab Selesai</span></div>` +
    `<div class="stat"><b>${avg}</b><span>Rating Rata-rata</span></div>` +
    `<div class="stat"><b>${finished}</b><span>Selesai</span></div>`;
}

export function renderTierList() {
  const box = $('#tier-list');
  const tiers = ['S', 'A', 'B', 'C', 'D'];
  box.innerHTML = tiers.map(t => {
    const list = state.items.filter(it => it.tier === t);
    if (!list.length) return `<div class="tier-row"><b class="tier-letter">${t}</b><span class="muted">— kosong —</span></div>`;
    return `<div class="tier-row"><b class="tier-letter">${t}</b>` + list.map(it =>
      it.coverUrl ? `<img src="${esc(it.coverUrl)}" alt="${esc(it.title)}" title="${esc(it.title)}" data-open="${it.id}">` : `<span class="badge" data-open="${it.id}">${esc(it.title)}</span>`
    ).join('') + `</div>`;
  }).join('');
}

export function renderContinue() {
  const list = state.items.filter(it => it.status === 'Berlangsung');
  $('#continue-list').innerHTML = list.length ? list.map(it => {
    const p = progressOf(it);
    return `<div class="row" style="justify-content:space-between;padding:8px 0;border-bottom:1px solid #2a2f3a">
      <span><b>${esc(it.title)}</b> <span class="muted">${esc(it.category)} • ${p.done}/${p.total || '—'} (${p.pct}%)</span></span>
      <span><button class="btn secondary" data-open="${it.id}">Detail</button> <button class="btn" data-edit="${it.id}">Edit</button></span></div>`;
  }).join('') : '<p class="muted">Belum ada yang sedang berjalan.</p>';
}

export function renderChart() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    days.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
  }
  const counts = days.map(d => state.activity.filter(a => a.date === d).length);
  const max = Math.max(1, ...counts);
  $('#chart').innerHTML = '<div class="chart-wrap" style="display:flex;align-items:flex-end;gap:8px;height:110px;width:100%">' +
    days.map((d, i) => `<div class="bar" style="height:${Math.max(4, counts[i] / max * 90)}px" title="${d}: ${counts[i]} aktivitas"><span>${d.slice(5)}</span></div>`).join('') + '</div>';
}
