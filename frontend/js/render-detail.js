'use strict';
/* Nontonin — panel detail: info judul, tombol huruf Tier, checklist. */
import { $, esc, stars, progressOf, showModal } from './utils.js';
import { api } from './api.js';
import { state } from './state.js';
import { render, loadActivityOnly } from './render.js';

export function openDetail(id) {
  const it = state.items.find(x => x.id === id); if (!it) return;
  const p = progressOf(it);
  const total = p.total;
  const checklist = total ? Array.from({ length: total }, (_, i) => i + 1).map(n =>
    `<button type="button" class="${(it.checked || []).includes(n) ? 'done' : ''}" data-toggle="${it.id}:${n}">${n}</button>`).join('')
    : '<p class="muted">Isi Total Episode/Bab dulu lewat Edit untuk menampilkan checklist.</p>';
  $('#detail-body').innerHTML = `
    <div class="row" style="align-items:flex-start">
      ${it.coverUrl ? `<img class="detail-cover" src="${esc(it.coverUrl)}" alt="Cover ${esc(it.title)}">` : ''}
      <div><h2 style="margin-top:0">${esc(it.title)}</h2>
      <p><span class="badge">${esc(it.category)}</span><span class="badge">${esc(it.status)}</span>${it.tier ? `<span class="badge tier-badge">Tier ${it.tier}</span>` : ''}</p>
      <p class="muted">${esc(it.genre || '')} ${it.year ? '• ' + it.year : ''} ${it.author ? '• ' + esc(it.author) : ''}</p>
      <p>${stars(it.rating)} ${it.favorite ? '⭐ Favorit' : ''}</p>
      <p>Progress: <b>${p.done}/${p.total || '—'} (${p.pct}%)</b> — Sudah sampai ke-${it.currentProgress || 0}</p>
      ${it.targetDate ? `<p class="muted">Target selesai: ${esc(it.targetDate)}</p>` : ''}
      ${it.link ? `<p><a href="${esc(it.link)}" target="_blank" rel="noopener">🔗 Tempat nonton / baca</a></p>` : ''}
      ${it.notes ? `<p>${esc(it.notes)}</p>` : ''}</div>
    </div>
    <h3>Tier / Rank</h3>
    <div class="tier-btns">${['S', 'A', 'B', 'C', 'D'].map(t => `<button type="button" class="${it.tier === t ? 'active' : ''}" data-tier="${it.id}:${t}">${t}</button>`).join('')}</div>
    <p class="muted">Ketuk huruf untuk memberi Tier; ketuk lagi untuk melepas.</p>
    <h3>Checklist Episode / Bab</h3>
    <div class="checklist">${checklist}</div>
    <div class="row"><button class="btn primary" data-edit="${it.id}">Edit</button></div>`;
  showModal('detail-modal');
}

export async function toggleUnit(id, unit) {
  const r = await api('/api/items/' + id + '/toggle', { method: 'POST', body: JSON.stringify({ unit }) });
  const idx = state.items.findIndex(x => x.id === id);
  if (idx >= 0) state.items[idx] = r.item;
  await loadActivityOnly(); render(); openDetail(id);
}

export async function setTier(id, tier) {
  const it = state.items.find(x => x.id === id); if (!it) return;
  const next = it.tier === tier ? null : tier;
  const r = await api('/api/items/' + id, { method: 'PUT', body: JSON.stringify({ tier: next }) });
  const idx = state.items.findIndex(x => x.id === id);
  if (idx >= 0) state.items[idx] = r.item;
  render(); openDetail(id);
}
