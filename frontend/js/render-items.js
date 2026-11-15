'use strict';
/* Nontonin — render daftar judul: kartu, filter, pencarian, pengurutan. */
import { $, esc, stars, progressOf, tierRank } from './utils.js';
import { state } from './state.js';

export function coverImg(it, cls) {
  return it.coverUrl ? `<img class="${cls || ''}" src="${esc(it.coverUrl)}" alt="Cover ${esc(it.title)}">` : `<div style="height:220px;background:#222;display:flex;align-items:center;justify-content:center;color:#777">Tanpa cover</div>`;
}

export function filteredItems() {
  const q = $('#f-search').value.trim().toLowerCase();
  const cat = $('#f-category').value, st = $('#f-status').value, sort = $('#f-sort').value;
  let list = state.items.filter(it =>
    (!cat || it.category === cat) && (!st || it.status === st) &&
    (!q || (it.title + ' ' + (it.genre || '') + ' ' + (it.author || '')).toLowerCase().includes(q)));
  if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
  else if (sort === 'progress') list.sort((a, b) => progressOf(b).pct - progressOf(a).pct);
  else if (sort === 'rating') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (sort === 'tier') list.sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
  else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list;
}

export function renderGrid() {
  const list = filteredItems();
  $('#count').textContent = `(${list.length})`;
  $('#empty').hidden = state.items.length > 0;
  $('#grid').innerHTML = list.map(it => {
    const p = progressOf(it);
    return `<article class="item-card" data-open="${it.id}">
      ${coverImg(it)}
      <div class="body"><h3>${esc(it.title)}</h3>
      <div><span class="badge">${esc(it.category)}</span><span class="badge">${esc(it.status)}</span>${it.tier ? `<span class="badge tier-badge">Tier ${it.tier}</span>` : ''}${it.favorite ? '<span class="badge">⭐</span>' : ''}</div>
      <div class="muted">${esc(it.genre || '')} ${it.year ? '• ' + it.year : ''}</div>
      <div class="progress"><i style="width:${p.pct}%"></i></div>
      <div class="muted">${p.done}/${p.total || '—'} • ${p.pct}% • ${stars(it.rating)}</div>
      <div class="row" style="margin-top:8px"><button class="btn secondary" data-edit="${it.id}">Edit</button></div>
      </div></article>`;
  }).join('');
}
