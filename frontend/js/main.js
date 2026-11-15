'use strict';
/* Nontonin — entry point frontend (ES module, no build step).
 * Hanya wiring event dan init. Logika tinggal di modul js/ lainnya.
 * window.applyCandidate dipertahankan untuk kompatibilitas (dulu
 * diekspos dari app.js v1). */
import { $, esc, hideModal } from './utils.js';
import { api } from './api.js';
import { state, applyCandidate } from './state.js';
import { loadAll } from './render.js';
import { renderGrid } from './render-items.js';
import { openDetail, toggleUnit, setTier } from './render-detail.js';
import { openForm, updateCoverHint, searchCover, saveForm, deleteCurrent } from './forms.js';

if (typeof window !== 'undefined') window.applyCandidate = applyCandidate;

// ---------- Wiring ----------
document.addEventListener('click', async e => {
  const open = e.target.closest('[data-open]');
  if (open && !e.target.closest('[data-edit]') && !e.target.closest('[data-tier]') && !e.target.closest('[data-toggle]')) { openDetail(open.dataset.open); return; }
  const edit = e.target.closest('[data-edit]');
  if (edit) { hideModal('detail-modal'); openForm(state.items.find(x => x.id === edit.dataset.edit)); return; }
  const tier = e.target.closest('[data-tier]');
  if (tier) { const [id, t] = tier.dataset.tier.split(':'); setTier(id, t); return; }
  const tog = e.target.closest('[data-toggle]');
  if (tog) { const [id, n] = tog.dataset.toggle.split(':'); toggleUnit(id, Number(n)); return; }
  const close = e.target.closest('[data-close]');
  if (close) hideModal(close.dataset.close);
});
$('#btn-add').addEventListener('click', () => openForm(null));
$('#btn-search-cover').addEventListener('click', searchCover);
$('#in-search').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); searchCover(); } });
$('#in-category').addEventListener('change', updateCoverHint);
$('#item-form').addEventListener('submit', saveForm);
$('#btn-cover-url').addEventListener('click', async () => {
  const url = $('#in-cover-url').value.trim(); if (!url) return;
  try { const r = await api('/api/cover-download', { method: 'POST', body: JSON.stringify({ url }) }); state.coverUrl = r.coverUrl; state.coverSource = 'Link ditempel'; const p = $('#cover-preview'); p.src = state.coverUrl; p.hidden = false; }
  catch (e2) { const err = $('#form-error'); err.textContent = e2.message; err.hidden = false; }
});
$('#in-cover-file').addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try { const r = await api('/api/cover-upload', { method: 'POST', body: JSON.stringify({ dataUrl: reader.result }) }); state.coverUrl = r.coverUrl; state.coverSource = 'Upload'; const p = $('#cover-preview'); p.src = state.coverUrl; p.hidden = false; $('#cover-preview-text').textContent = 'Cover di-upload: ' + f.name; }
    catch (e2) { const err = $('#form-error'); err.textContent = e2.message; err.hidden = false; }
  };
  reader.readAsDataURL(f);
});
$('#btn-delete-1').addEventListener('click', () => { $('#delete-confirm').hidden = false; });
$('#btn-delete-cancel').addEventListener('click', () => { $('#delete-confirm').hidden = true; });
$('#btn-delete-2').addEventListener('click', deleteCurrent);
$('#btn-random').addEventListener('click', () => {
  const pool = state.items.filter(it => it.status === 'Berlangsung' || it.status === 'Rencana');
  if (!pool.length) { alert('Belum ada judul Berlangsung / Rencana.'); return; }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  openDetail(pick.id);
});
['#f-search', '#f-category', '#f-status', '#f-sort'].forEach(s => document.querySelector(s).addEventListener('input', renderGrid));

// ---------- Init ----------
if (window.location.protocol === 'file:') document.getElementById('file-warning').hidden = false;
loadAll().catch(e => { document.getElementById('grid').innerHTML = '<p class="error">Gagal memuat data: ' + esc(e.message) + '</p>'; });
