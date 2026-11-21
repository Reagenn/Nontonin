'use strict';
/* Nontonin - kalender episode berikutnya dari sumber eksternal. */
import { $, esc } from './utils.js';
import { api } from './api.js';
import { state } from './state.js';

const dayFormat = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });
let initialized = false;

function dateKey(value) {
  const date = new Date(value);
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function relativeTime(value) {
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return 'Sudah tayang';
  const minutes = Math.ceil(diff / 60000);
  if (minutes < 60) return minutes + ' menit lagi';
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return hours + ' jam lagi';
  const days = Math.ceil(hours / 24);
  return days + ' hari lagi';
}

function episodeLabel(event) {
  if (event.season && event.episode) return 'Season ' + event.season + ', Episode ' + event.episode;
  if (event.episode) return 'Episode ' + event.episode;
  return 'Episode berikutnya';
}

function renderEvent(event) {
  const item = state.items.find(value => value.id === event.itemId) || {};
  const date = new Date(event.releaseAt);
  const time = event.precision === 'date' ? 'Belum pasti' : timeFormat.format(date);
  const sourceTitle = event.sourceTitle && event.sourceTitle !== item.title
    ? `<span class="release-match">Cocok dengan ${esc(event.sourceTitle)}</span>` : '';
  const cover = item.coverUrl
    ? `<img class="release-event-cover" src="${esc(item.coverUrl)}" alt="Cover ${esc(item.title || event.sourceTitle)}">`
    : '<div class="release-event-cover release-cover-empty" aria-hidden="true"></div>';
  return `<article class="release-event">
    <div class="release-time"><b>${esc(time)}</b><span>waktu lokal</span></div>
    ${cover}
    <div class="release-event-body">
      <button type="button" class="release-title-button" data-open="${esc(event.itemId)}">${esc(item.title || event.sourceTitle)}</button>
      <div class="release-episode"><b>${esc(episodeLabel(event))}</b>${event.episodeTitle ? ` <span>${esc(event.episodeTitle)}</span>` : ''}</div>
      <div class="release-meta">
        <span class="release-countdown">${esc(relativeTime(event.releaseAt))}</span>
        <a class="release-source" href="${esc(event.episodeUrl || event.sourceUrl)}" target="_blank" rel="noopener">${esc(event.source)}</a>
        ${sourceTitle}
      </div>
    </div>
  </article>`;
}

function renderGroups(events) {
  const groups = new Map();
  for (const event of events) {
    const key = dateKey(event.releaseAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  return [...groups.values()].map(group => {
    const date = new Date(group[0].releaseAt);
    return `<section class="release-day">
      <h3>${esc(dayFormat.format(date))}</h3>
      <div class="release-events">${group.map(renderEvent).join('')}</div>
    </section>`;
  }).join('');
}

function emptyMessage(summary) {
  if (!summary || summary.checked === 0) {
    return '<div class="release-empty"><b>Belum ada Anime atau Drama.</b><span>Tambahkan judul episodik untuk melihat jadwal rilis berikutnya.</span></div>';
  }
  return '<div class="release-empty"><b>Belum ada episode berikutnya yang diumumkan.</b><span>Jadwal akan muncul otomatis setelah tersedia di TVMaze atau Shikimori.</span></div>';
}

export function renderReleaseCalendar() {
  const list = $('#release-calendar-list');
  const status = $('#release-status');
  const button = $('#btn-refresh-releases');
  if (!list || !status || !button) return;
  list.setAttribute('aria-busy', state.releaseLoading ? 'true' : 'false');
  button.disabled = state.releaseLoading;
  button.textContent = state.releaseLoading ? 'Memuat jadwal...' : 'Perbarui jadwal';

  const calendar = state.releaseCalendar;
  if (state.releaseLoading && !calendar) {
    status.innerHTML = '<span class="release-pill">Menghubungi sumber jadwal</span>';
    list.innerHTML = '<div class="release-loading"><i></i><i></i><i></i></div>';
    return;
  }
  if (state.releaseError && !calendar) {
    status.innerHTML = '<span class="release-pill release-pill-error">Jadwal gagal dimuat</span>';
    list.innerHTML = `<p class="error">${esc(state.releaseError)}</p>`;
    return;
  }
  if (!calendar) {
    status.innerHTML = '';
    list.innerHTML = '';
    return;
  }

  const summary = calendar.summary || {};
  const updated = calendar.generatedAt ? timeFormat.format(new Date(calendar.generatedAt)) : '';
  status.innerHTML = `<span class="release-pill"><b>${summary.scheduled || 0}</b> jadwal ditemukan</span>
    <span class="release-pill"><b>${summary.checked || 0}</b> judul diperiksa</span>
    ${state.releaseError ? '<span class="release-pill release-pill-error">Penyegaran gagal</span>' : ''}
    ${updated ? `<span class="release-updated">Diperbarui ${esc(updated)}</span>` : ''}`;
  const warningValues = state.releaseError
    ? ['Jadwal lama tetap ditampilkan: ' + state.releaseError, ...(calendar.warnings || [])]
    : (calendar.warnings || []);
  const warnings = warningValues.map(value => `<p class="release-warning">${esc(value)}</p>`).join('');
  list.innerHTML = warnings + (calendar.events && calendar.events.length
    ? renderGroups(calendar.events)
    : emptyMessage(summary));
}

export async function loadReleaseCalendar(force = false) {
  state.releaseLoading = true;
  state.releaseError = '';
  renderReleaseCalendar();
  try {
    state.releaseCalendar = await api('/api/releases' + (force ? '?refresh=1' : ''));
  } catch (error) {
    state.releaseError = error.message || 'Tidak dapat memuat kalender rilis.';
  } finally {
    state.releaseLoading = false;
    renderReleaseCalendar();
  }
}

export function initReleaseCalendar() {
  if (initialized) return;
  initialized = true;
  $('#btn-refresh-releases').addEventListener('click', () => loadReleaseCalendar(true));
  window.setInterval(() => loadReleaseCalendar(false), 15 * 60 * 1000);
  window.setInterval(renderReleaseCalendar, 60 * 1000);
}
