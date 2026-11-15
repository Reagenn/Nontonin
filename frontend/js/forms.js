'use strict';
/* Nontonin — form Tambah/Edit: pencarian cover + tile kandidat,
 * tempel link, upload, simpan, dan hapus dua langkah. */
import { $, esc, showModal, hideModal } from './utils.js';
import { api } from './api.js';
import { state, applyCandidate } from './state.js';
import { render, loadActivityOnly } from './render.js';

export function updateCoverHint() {
  const cat = $('#in-category').value;
  const hints = {
    Anime: 'Sumber: Kitsu, Shikimori, TVMaze, Cinemeta, Wikipedia EN & ID.',
    Film: 'Sumber: Cinemeta (poster IMDb), Wikipedia EN & ID.',
    Drama: 'Sumber: TVMaze, Cinemeta, Wikipedia EN & ID.',
    Novel: 'Sumber: Open Library, Gutendex, Wikipedia EN & ID, TVMaze (adaptasi).',
    Wattpad: 'Sumber: Open Library, Gutendex, Wikipedia EN & ID, TVMaze (adaptasi). Wattpad tidak punya API pencarian resmi yang berfungsi, jadi dilayani lewat sumber buku & adaptasi.',
  };
  $('#cover-hint').textContent = hints[cat] || '';
}

export function openForm(item) {
  state.editingId = item ? item.id : null;
  state.autoFilled = null; state.coverUrl = item ? item.coverUrl : ''; state.coverSource = item ? item.coverSource : '';
  $('#form-title').textContent = item ? 'Edit Judul' : 'Tambah Judul';
  $('#btn-save').textContent = item ? 'Simpan Perubahan' : 'Simpan Judul';
  $('#delete-section').hidden = !item;
  $('#delete-confirm').hidden = true;
  $('#form-error').hidden = true;
  $('#cover-results').innerHTML = ''; $('#in-search').value = '';
  $('#cover-preview').hidden = true; $('#cover-preview-text').textContent = '';
  const f = id => document.getElementById(id);
  f('in-title').value = item ? item.title : '';
  f('in-category').value = item ? item.category : 'Anime';
  f('in-genre').value = item ? item.genre || '' : '';
  f('in-author').value = item ? item.author || '' : '';
  f('in-year').value = item && item.year ? item.year : '';
  f('in-total').value = item && item.totalUnits !== null && item.totalUnits !== undefined ? item.totalUnits : '';
  f('in-progress').value = item ? item.currentProgress || 0 : 0;
  f('in-target').value = item ? item.targetDate || '' : '';
  f('in-link').value = item ? item.link || '' : '';
  f('in-status').value = item ? item.status : 'Berlangsung';
  f('in-tier').value = item && item.tier ? item.tier : '';
  f('in-rating').value = item ? item.rating || 0 : 0;
  f('in-favorite').checked = item ? !!item.favorite : false;
  f('in-notes').value = item ? item.notes || '' : '';
  if (state.coverUrl) { const p = $('#cover-preview'); p.src = state.coverUrl; p.hidden = false; }
  updateCoverHint();
  showModal('form-modal');
}

export function currentFormValues() {
  return {
    title: $('#in-title').value.trim(),
    genre: $('#in-genre').value.trim(),
    year: $('#in-year').value === '' ? null : Number($('#in-year').value),
    totalUnits: $('#in-total').value === '' ? null : Number($('#in-total').value),
    author: $('#in-author').value.trim(),
  };
}

export function countLabel(c) {
  if (c.totalUnits === null || c.totalUnits === undefined) return 'jumlah tidak tersedia';
  if (c.source === 'Cinemeta' && c.totalUnits === 1) return '1 film';
  return c.totalUnits + ' episode';
}

export async function searchCover() {
  const q = $('#in-search').value.trim();
  if (!q) return;
  const btn = $('#btn-search-cover'); btn.disabled = true; btn.textContent = 'Mencari…';
  try {
    const res = await api('/api/search-cover?q=' + encodeURIComponent(q) + '&category=' + encodeURIComponent($('#in-category').value));
    const list = res.candidates || [];
    $('#cover-results').innerHTML = list.length ? list.map((c, i) =>
      `<button type="button" class="cover-cand" data-cand="${i}">
        <img src="${esc(c.imageUrl)}" alt="${esc(c.title)}" loading="lazy">
        <span class="meta"><b>${esc(c.title)}</b><br><span class="src">${esc(c.source)}</span> • ${esc(countLabel(c))}${c.year ? ' • ' + c.year : ''}${c.rating ? ` • <span class="cand-rating">★ ${esc(c.rating)}</span>` : ''}${c.subtitle ? `<br><span class="cand-sub">${esc(c.subtitle)}</span>` : ''}</span>
      </button>`).join('')
      : '<p class="muted">Tidak ada kandidat cover dari sumber yang tersedia. Coba kata kunci lain, tempel link, atau upload.</p>';
    $('#cover-results').querySelectorAll('[data-cand]').forEach(el => {
      el.addEventListener('click', () => selectCandidate(list[Number(el.dataset.cand)], el));
    });
    window._lastCandidates = list;
  } catch (e) {
    $('#cover-results').innerHTML = '<p class="error">Pencarian cover gagal: ' + esc(e.message) + '</p>';
  } finally { btn.disabled = false; btn.textContent = 'Cari'; }
}

export async function selectCandidate(c, el) {
  document.querySelectorAll('.cover-cand').forEach(x => x.classList.remove('selected'));
  if (el) el.classList.add('selected');
  // Snapshot rule: only fields that are empty or still equal to the
  // previous candidate's auto-filled value follow the new candidate.
  const cur = currentFormValues();
  const { fields } = applyCandidate(cur, state.autoFilled, c);
  if (fields.title !== undefined) $('#in-title').value = fields.title;
  if (fields.genre !== undefined) $('#in-genre').value = fields.genre;
  if (fields.year !== undefined) $('#in-year').value = fields.year;
  if (fields.totalUnits !== undefined) $('#in-total').value = fields.totalUnits;
  if (fields.author !== undefined) $('#in-author').value = fields.author;
  state.autoFilled = { ...state.autoFilled, ...fields };
  // Cover: download & store inside the app (blob), then preview.
  try {
    const r = await api('/api/cover-download', { method: 'POST', body: JSON.stringify({ url: c.imageUrl }) });
    state.coverUrl = r.coverUrl; state.coverSource = c.source;
  } catch (e) {
    state.coverUrl = c.imageUrl; state.coverSource = c.source; // fallback: external link if download fails
  }
  const p = $('#cover-preview'); p.src = state.coverUrl; p.hidden = false;
  $('#cover-preview-text').textContent = 'Cover dari ' + c.source + (c.totalUnits ? ' • ' + countLabel(c) : '');
}

export async function saveForm(e) {
  e.preventDefault();
  const err = $('#form-error'); err.hidden = true;
  const total = $('#in-total').value === '' ? null : Number($('#in-total').value);
  const progress = Number($('#in-progress').value) || 0;
  if (total !== null && progress > total) { err.textContent = '“Sudah sampai ke-” tidak boleh melebihi Total Episode/Bab.'; err.hidden = false; return; }
  const payload = {
    title: $('#in-title').value.trim(), category: $('#in-category').value,
    genre: $('#in-genre').value.trim(), author: $('#in-author').value.trim(),
    year: $('#in-year').value === '' ? null : Number($('#in-year').value),
    totalUnits: total, currentProgress: progress,
    targetDate: $('#in-target').value, link: $('#in-link').value.trim(),
    status: $('#in-status').value, tier: $('#in-tier').value || null,
    rating: Number($('#in-rating').value) || 0, favorite: $('#in-favorite').checked,
    notes: $('#in-notes').value, coverUrl: state.coverUrl, coverSource: state.coverSource,
  };
  if (!payload.title) { err.textContent = 'Judul wajib diisi.'; err.hidden = false; return; }
  const btn = $('#btn-save'); btn.disabled = true;
  try {
    if (state.editingId) {
      const r = await api('/api/items/' + state.editingId, { method: 'PUT', body: JSON.stringify(payload) });
      const idx = state.items.findIndex(x => x.id === state.editingId);
      if (idx >= 0) state.items[idx] = r.item;
    } else {
      const r = await api('/api/items', { method: 'POST', body: JSON.stringify(payload) });
      state.items.unshift(r.item);
    }
    hideModal('form-modal'); hideModal('detail-modal');
    await loadActivityOnly(); render();
  } catch (e2) { err.textContent = e2.message; err.hidden = false; }
  finally { btn.disabled = false; }
}

export async function deleteCurrent() {
  if (!state.editingId) return;
  const btn = $('#btn-delete-2'); btn.disabled = true;
  try {
    await api('/api/items/' + state.editingId, { method: 'DELETE' });
    state.items = state.items.filter(x => x.id !== state.editingId);
    hideModal('form-modal'); hideModal('detail-modal');
    await loadActivityOnly(); render();
  } catch (e) { const err = $('#form-error'); err.textContent = e.message; err.hidden = false; }
  finally { btn.disabled = false; }
}
