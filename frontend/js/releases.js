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
let calendarRequestId = 0;
let serviceWorkerPromise = null;
let reminderCheckPromise = null;
const sessionDeliveries = new Set();
const failedDeliveries = new Map();

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
  if (!window.isSecureContext || !('Notification' in window)) return 'unsupported';
  return window.Notification.permission;
}

function notificationRegistration() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  if (!serviceWorkerPromise) {
    serviceWorkerPromise = navigator.serviceWorker.register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .catch(() => null);
  }
  return serviceWorkerPromise;
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
  return `<article class="release-event${due ? ' reminder-due' : ''}" data-release-event="${esc(event.id)}">
    <div class="release-time"><b>${esc(time)}</b><span>waktu lokal</span></div>
    ${cover}
    <div class="release-event-body">
      <button type="button" class="release-title-button" data-open="${esc(event.itemId)}" data-calendar-focus="open:${esc(event.itemId)}">${esc(item.title || event.sourceTitle)}</button>
      <div class="release-episode"><b>${esc(episodeLabel(event))}</b>${event.episodeTitle ? ` <span>${esc(event.episodeTitle)}</span>` : ''}</div>
      <div class="release-meta">
        <span class="release-countdown" data-release-countdown>${esc(relativeTime(event.releaseAt))}</span>
        <a class="release-source" href="${esc(event.episodeUrl || event.sourceUrl)}" target="_blank" rel="noopener" data-calendar-focus="source:${esc(event.id)}">${esc(event.source)}</a>
        <span class="release-due" data-release-due${due ? '' : ' hidden'}>Waktu pengingat tercapai</span>
        ${sourceTitle}
      </div>
      <label class="release-reminder"><span>Pengingat</span>
        <select data-release-reminder="${esc(event.itemId)}" data-calendar-focus="reminder:${esc(event.itemId)}" aria-label="Pengingat untuk ${esc(item.title || event.sourceTitle)}">
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

function focusedCalendarControl(list) {
  const active = document.activeElement;
  return active && list.contains(active) ? active.dataset.calendarFocus || null : null;
}

function setCalendarContent(list, html, focusKey) {
  list.innerHTML = html;
  focusCalendarControl(list, focusKey);
}

function focusCalendarControl(list, focusKey) {
  if (!list || !focusKey) return;
  const match = [...list.querySelectorAll('[data-calendar-focus]')]
    .find(element => element.dataset.calendarFocus === focusKey);
  if (match) match.focus();
}

export function renderReleaseCalendar() {
  const list = $('#release-calendar-list');
  const status = $('#release-status');
  const button = $('#btn-refresh-releases');
  if (!list || !status || !button) return;
  const focusKey = focusedCalendarControl(list);
  renderNotificationState();
  list.setAttribute('aria-busy', state.releaseLoading ? 'true' : 'false');
  button.disabled = state.releaseLoading;
  button.textContent = state.releaseLoading ? 'Memuat jadwal...' : 'Perbarui jadwal';

  const calendar = state.releaseCalendar;
  if (state.releaseLoading && !calendar) {
    status.innerHTML = '<span class="release-pill">Menghubungi sumber jadwal</span>';
    setCalendarContent(list, '<div class="release-loading"><i></i><i></i><i></i></div>', focusKey);
    return;
  }
  if (state.releaseError && !calendar) {
    status.innerHTML = '<span class="release-pill release-pill-error">Jadwal gagal dimuat</span>';
    setCalendarContent(list, `<p class="error">${esc(state.releaseError)}</p>`, focusKey);
    return;
  }
  if (!calendar) {
    status.innerHTML = '';
    setCalendarContent(list, '', focusKey);
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
  setCalendarContent(list, warnings + (calendar.events && calendar.events.length
    ? renderGroups(calendar.events)
    : emptyMessage(summary)), focusKey);
}

export async function loadReleaseCalendar(force = false) {
  const requestId = ++calendarRequestId;
  state.releaseLoading = true;
  state.releaseError = '';
  renderReleaseCalendar();
  try {
    const calendar = await api('/api/releases' + (force ? '?refresh=1' : ''));
    if (requestId !== calendarRequestId) return;
    state.releaseCalendar = calendar;
  } catch (error) {
    if (requestId !== calendarRequestId) return;
    state.releaseError = error.message || 'Tidak dapat memuat kalender rilis.';
  } finally {
    if (requestId === calendarRequestId) {
      state.releaseLoading = false;
      renderReleaseCalendar();
      checkReleaseReminders();
    }
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
  try { localStorage.setItem(DELIVERY_KEY, JSON.stringify(fresh)); return true; }
  catch (error) { return false; }
}

function notificationContent(event, item) {
  const atRelease = Number(item.releaseReminderMinutes) === 0;
  const title = atRelease ? item.title + ' tayang sekarang' : item.title + ' segera tayang';
  const body = episodeLabel(event) + (event.episodeTitle ? ' - ' + event.episodeTitle : '')
    + (atRelease ? ' sudah tayang.' : ' tayang ' + relativeTime(event.releaseAt) + '.');
  const options = {
    body,
    tag: 'nontonin-' + event.id,
    data: { url: window.location.origin + '/' },
  };
  if (item.coverUrl) options.icon = new URL(item.coverUrl, window.location.origin).href;
  return { title, options };
}

async function displayNotification(event, item) {
  const { title, options } = notificationContent(event, item);
  const registration = await notificationRegistration();
  if (registration) {
    await registration.showNotification(title, options);
    return;
  }
  await new Promise((resolve, reject) => {
    let notification;
    try { notification = new window.Notification(title, options); }
    catch (error) { reject(error); return; }
    const timeout = window.setTimeout(() => reject(new Error('Notifikasi tidak dikonfirmasi browser')), 5000);
    notification.onshow = () => { window.clearTimeout(timeout); resolve(); };
    notification.onerror = () => { window.clearTimeout(timeout); reject(new Error('Browser menolak notifikasi')); };
    notification.onclick = () => { window.focus(); notification.close(); };
  });
}

async function runReminderCheck() {
  if (notificationPermission() !== 'granted' || !state.releaseCalendar) return;
  const deliveries = readDeliveries();
  let changed = false;
  let failed = false;
  for (const event of state.releaseCalendar.events || []) {
    const item = state.items.find(value => value.id === event.itemId);
    if (!item || !isReminderDue(event, item.releaseReminderMinutes)) continue;
    const key = event.id + ':' + item.releaseReminderMinutes;
    const failedAt = failedDeliveries.get(key) || 0;
    if (deliveries[key] || sessionDeliveries.has(key)) continue;
    if (Date.now() - failedAt < 10 * 60000) { failed = true; continue; }
    try {
      await displayNotification(event, item);
      failedDeliveries.delete(key);
      sessionDeliveries.add(key);
      deliveries[key] = Date.now();
      changed = true;
    } catch (error) {
      failed = true;
      failedDeliveries.set(key, Date.now());
      state.reminderNotice = 'Notifikasi gagal ditampilkan: ' + error.message;
      state.reminderNoticeError = true;
      renderNotificationState();
    }
  }
  if (changed && !saveDeliveries(deliveries)) {
    state.reminderNotice = 'Notifikasi terkirim, tetapi riwayat hanya tersimpan untuk sesi ini karena penyimpanan browser diblokir.';
    state.reminderNoticeError = false;
    renderNotificationState();
  } else if (changed && !failed && state.reminderNoticeError
    && state.reminderNotice.startsWith('Notifikasi gagal ditampilkan:')) {
    state.reminderNotice = 'Notifikasi pengingat berhasil dikirim.';
    state.reminderNoticeError = false;
    renderNotificationState();
  }
}

function checkReleaseReminders() {
  if (reminderCheckPromise) return reminderCheckPromise;
  reminderCheckPromise = runReminderCheck().finally(() => { reminderCheckPromise = null; });
  return reminderCheckPromise;
}

async function requestNotificationPermission() {
  if (notificationPermission() === 'unsupported') return 'unsupported';
  if (window.Notification.permission !== 'default') return window.Notification.permission;
  try {
    const permission = await window.Notification.requestPermission();
    if (permission === 'granted') await notificationRegistration();
    return permission;
  }
  catch (error) { return 'error'; }
}

async function updateReminder(select) {
  const item = state.items.find(value => value.id === select.dataset.releaseReminder);
  if (!item) return;
  const minutes = select.value === '' ? null : Number(select.value);
  const focusKey = select.dataset.calendarFocus;
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
    focusCalendarControl($('#release-calendar-list'), focusKey);
    checkReleaseReminders();
  } catch (error) {
    state.reminderNotice = 'Pengingat gagal disimpan: ' + error.message;
    state.reminderNoticeError = true;
    renderReleaseCalendar();
    focusCalendarControl($('#release-calendar-list'), focusKey);
  }
}

export function initReleaseCalendar() {
  if (initialized) return;
  initialized = true;
  notificationRegistration();
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
  window.setInterval(() => { refreshReleaseTimes(); checkReleaseReminders(); }, 60 * 1000);
}

function refreshReleaseTimes() {
  if (!state.releaseCalendar) return;
  const events = new Map((state.releaseCalendar.events || []).map(event => [event.id, event]));
  document.querySelectorAll('[data-release-event]').forEach(card => {
    const event = events.get(card.dataset.releaseEvent);
    if (!event) return;
    const item = state.items.find(value => value.id === event.itemId) || {};
    const due = isReminderDue(event, item.releaseReminderMinutes);
    card.classList.toggle('reminder-due', due);
    const countdown = card.querySelector('[data-release-countdown]');
    const dueLabel = card.querySelector('[data-release-due]');
    if (countdown) countdown.textContent = relativeTime(event.releaseAt);
    if (dueLabel) dueLabel.hidden = !due;
  });
}
