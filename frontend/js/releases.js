'use strict';
/* Nontonin - kalender episode berikutnya dari sumber eksternal. */
import { $, esc } from './utils.js';
import { api } from './api.js';
import { state } from './state.js';

const dayFormat = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });
const DELIVERY_KEY = 'nontonin-release-notification-deliveries';
const REMINDER_OPTIONS = [
  ['', 'Nonaktif'],
  ['0', 'Saat tayang'],
  ['15', '15 menit sebelumnya'],
  ['60', '1 jam sebelumnya'],
  ['1440', '1 hari sebelumnya'],
  ['10080', '7 hari sebelumnya'],
];
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

function isReminderDue(event, minutes, now = Date.now()) {
  if (minutes === null || minutes === undefined) return false;
  const releaseAt = new Date(event.releaseAt).getTime();
  if (!Number.isFinite(releaseAt)) return false;
  const notifyAt = releaseAt - Number(minutes) * 60000;
  return now >= notifyAt && now <= releaseAt + 15 * 60000;
}

function reminderOptions(selected) {
  return REMINDER_OPTIONS.map(([value, label]) =>
    `<option value="${value}"${String(selected ?? '') === value ? ' selected' : ''}>${label}</option>`).join('');
}

function notificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return window.Notification.permission;
}

function renderNotificationState() {
  const button = $('#btn-enable-notifications');
  const notice = $('#release-reminder-status');
  if (!button || !notice) return;
  const permission = notificationPermission();
  if (permission === 'granted') { button.textContent = 'Notifikasi aktif'; button.disabled = true; }
  else if (permission === 'denied') { button.textContent = 'Notifikasi diblokir'; button.disabled = true; }
  else if (permission === 'unsupported') { button.textContent = 'Notifikasi tidak didukung'; button.disabled = true; }
  else { button.textContent = 'Aktifkan notifikasi'; button.disabled = false; }
  notice.textContent = state.reminderNotice || 'Pengingat tersimpan per judul. Notifikasi browser dipicu selama halaman Nontonin terbuka.';
  notice.classList.toggle('error', state.reminderNoticeError);
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
  const due = isReminderDue(event, item.releaseReminderMinutes);
  return `<article class="release-event${due ? ' reminder-due' : ''}">
    <div class="release-time"><b>${esc(time)}</b><span>waktu lokal</span></div>
    ${cover}
    <div class="release-event-body">
      <button type="button" class="release-title-button" data-open="${esc(event.itemId)}">${esc(item.title || event.sourceTitle)}</button>
      <div class="release-episode"><b>${esc(episodeLabel(event))}</b>${event.episodeTitle ? ` <span>${esc(event.episodeTitle)}</span>` : ''}</div>
      <div class="release-meta">
        <span class="release-countdown">${esc(relativeTime(event.releaseAt))}</span>
        <a class="release-source" href="${esc(event.episodeUrl || event.sourceUrl)}" target="_blank" rel="noopener">${esc(event.source)}</a>
        ${due ? '<span class="release-due">Waktu pengingat tercapai</span>' : ''}
        ${sourceTitle}
      </div>
      <label class="release-reminder"><span>Pengingat</span>
        <select data-release-reminder="${esc(event.itemId)}" aria-label="Pengingat untuk ${esc(item.title || event.sourceTitle)}">
          ${reminderOptions(item.releaseReminderMinutes)}
        </select>
      </label>
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
  renderNotificationState();
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
    checkReleaseReminders();
  }
}

function readDeliveries() {
  try {
    const value = JSON.parse(localStorage.getItem(DELIVERY_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (error) { return {}; }
}

function saveDeliveries(deliveries) {
  const cutoff = Date.now() - 30 * 864e5;
  const fresh = Object.fromEntries(Object.entries(deliveries).filter(([, deliveredAt]) => Number(deliveredAt) > cutoff));
  try { localStorage.setItem(DELIVERY_KEY, JSON.stringify(fresh)); } catch (error) {}
}

function checkReleaseReminders() {
  if (notificationPermission() !== 'granted' || !state.releaseCalendar) return;
  const deliveries = readDeliveries();
  for (const event of state.releaseCalendar.events || []) {
    const item = state.items.find(value => value.id === event.itemId);
    if (!item || !isReminderDue(event, item.releaseReminderMinutes)) continue;
    const key = event.id + ':' + item.releaseReminderMinutes;
    if (deliveries[key]) continue;
    try {
      const atRelease = Number(item.releaseReminderMinutes) === 0;
      const notification = new window.Notification(atRelease ? item.title + ' tayang sekarang' : item.title + ' segera tayang', {
        body: episodeLabel(event) + (event.episodeTitle ? ' - ' + event.episodeTitle : '') + (atRelease ? ' sudah tayang.' : ' tayang ' + relativeTime(event.releaseAt) + '.'),
        icon: item.coverUrl ? new URL(item.coverUrl, window.location.origin).href : undefined,
        tag: 'nontonin-' + event.id,
      });
      notification.onclick = () => { window.focus(); notification.close(); };
      deliveries[key] = Date.now();
    } catch (error) {
      state.reminderNotice = 'Notifikasi gagal ditampilkan: ' + error.message;
      state.reminderNoticeError = true;
      renderNotificationState();
    }
  }
  saveDeliveries(deliveries);
}

async function requestNotificationPermission() {
  if (notificationPermission() === 'unsupported') return 'unsupported';
  if (window.Notification.permission !== 'default') return window.Notification.permission;
  try { return await window.Notification.requestPermission(); }
  catch (error) { return 'error'; }
}

async function updateReminder(select) {
  const item = state.items.find(value => value.id === select.dataset.releaseReminder);
  if (!item) return;
  const minutes = select.value === '' ? null : Number(select.value);
  const permissionPromise = minutes === null ? Promise.resolve(notificationPermission()) : requestNotificationPermission();
  select.disabled = true;
  try {
    const response = await api('/api/items/' + encodeURIComponent(item.id) + '/reminder', {
      method: 'PUT', body: JSON.stringify({ minutesBefore: minutes }),
    });
    const index = state.items.findIndex(value => value.id === item.id);
    if (index >= 0) state.items[index] = response.item;
    const permission = await permissionPromise;
    state.reminderNoticeError = false;
    if (minutes === null) state.reminderNotice = 'Pengingat untuk ' + item.title + ' dinonaktifkan.';
    else if (permission === 'denied') state.reminderNotice = 'Pengingat tersimpan, tetapi notifikasi diblokir oleh browser.';
    else if (permission === 'unsupported') state.reminderNotice = 'Pengingat tersimpan, tetapi browser ini tidak mendukung notifikasi.';
    else if (permission === 'error') state.reminderNotice = 'Pengingat tersimpan, tetapi izin notifikasi gagal diminta.';
    else state.reminderNotice = 'Pengingat untuk ' + item.title + ' sudah disimpan.';
    renderReleaseCalendar();
    checkReleaseReminders();
  } catch (error) {
    state.reminderNotice = 'Pengingat gagal disimpan: ' + error.message;
    state.reminderNoticeError = true;
    renderReleaseCalendar();
  }
}

export function initReleaseCalendar() {
  if (initialized) return;
  initialized = true;
  $('#btn-refresh-releases').addEventListener('click', () => loadReleaseCalendar(true));
  $('#btn-enable-notifications').addEventListener('click', async () => {
    const permission = await requestNotificationPermission();
    state.reminderNoticeError = permission === 'denied' || permission === 'error';
    state.reminderNotice = permission === 'granted'
      ? 'Notifikasi browser sudah aktif.'
      : permission === 'denied' ? 'Notifikasi diblokir. Ubah izin situs di pengaturan browser untuk mengaktifkannya.'
        : permission === 'unsupported' ? 'Browser ini tidak mendukung notifikasi.'
          : 'Izin notifikasi gagal diminta oleh browser.';
    renderNotificationState();
    checkReleaseReminders();
  });
  $('#release-calendar-list').addEventListener('change', event => {
    const select = event.target.closest('[data-release-reminder]');
    if (select) updateReminder(select);
  });
  window.setInterval(() => loadReleaseCalendar(false), 15 * 60 * 1000);
  window.setInterval(() => { renderReleaseCalendar(); checkReleaseReminders(); }, 60 * 1000);
}
