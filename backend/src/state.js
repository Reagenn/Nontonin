'use strict';
/**
 * Nontonin — state & penyimpanan.
 * Memuat/menyimpan backend/data/data.json (bentuk: {"activity":[],"items":[]})
 * dan logika domain item: status otomatis, progress, dan pembersihan input.
 * Field tambahan tetap opsional supaya data.json versi lama dapat dipindah
 * dengan menyalin file itu saja.
 */
const crypto = require('crypto');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { DATA_FILE, CATEGORIES, STATUSES, TIERS, RELEASE_REMINDER_LEADS } = require('./config');

let data = { items: [], activity: [] };

function createSerializedExecutor() {
  let queue = Promise.resolve();
  return task => {
    const pending = queue.catch(() => {}).then(task);
    queue = pending;
    return pending;
  };
}

function createSerializedWriter(write) {
  const execute = createSerializedExecutor();
  return value => execute(() => write(value));
}

const executeMutation = createSerializedExecutor();

const writeSnapshot = createSerializedWriter(async snapshot => {
  await fsp.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  await fsp.writeFile(tmp, snapshot, 'utf8');
  await fsp.rename(tmp, DATA_FILE);
});

/** Objek data live (satu-satunya sumber kebenaran di memori). */
function getData() { return data; }

async function loadData() {
  try {
    const raw = await fsp.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items)) {
      data = { items: parsed.items, activity: Array.isArray(parsed.activity) ? parsed.activity : [] };
      return;
    }
  } catch (e) { /* missing / corrupt -> start empty, never crash */ }
  data = { items: [], activity: [] };
}

async function saveData() {
  const snapshot = JSON.stringify(data, null, 2);
  await writeSnapshot(snapshot);
}

function mutateData(task) {
  return executeMutation(async () => {
    const previous = JSON.stringify(data);
    try { return await task(data); }
    catch (error) {
      data = JSON.parse(previous);
      throw error;
    }
  });
}

function logActivity(action, item) {
  const d = new Date();
  const date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  data.activity.push({ ts: d.toISOString(), date, action, itemId: item ? item.id : null, title: item ? item.title : null });
  if (data.activity.length > 500) data.activity = data.activity.slice(-500);
  // prune entries older than 60 days (chart only needs 7)
  const cutoff = Date.now() - 60 * 864e5;
  data.activity = data.activity.filter(a => new Date(a.ts).getTime() > cutoff);
}

function checkedCount(item) { return (item.checked || []).length; }

function syncStatus(item) {
  const total = Number(item.totalUnits) || 0;
  if (total > 0 && checkedCount(item) >= total) item.status = 'Selesai';
  else if (item.status === 'Selesai' && total > 0 && checkedCount(item) < total) item.status = 'Berlangsung';
  else if (item.status === 'Selesai' && total === 0) item.status = 'Berlangsung';
}

function setProgress(item, progress) {
  const total = Number(item.totalUnits) || 0;
  const p = Math.max(0, Math.min(total || 0, Number(progress) || 0));
  item.currentProgress = p;
  if (total > 0) item.checked = Array.from({ length: p }, (_, i) => i + 1);
  syncStatus(item);
}

function cleanExternalRefs(input, existing) {
  const raw = input === undefined ? (existing || {}) : input;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const refs = {};
  const tvmaze = Number(raw.tvmaze);
  const shikimori = Number(raw.shikimori);
  if (Number.isInteger(tvmaze) && tvmaze > 0) refs.tvmaze = tvmaze;
  if (Number.isInteger(shikimori) && shikimori > 0) refs.shikimori = shikimori;
  return refs;
}

function cleanReleaseReminderMinutes(input, existing) {
  const raw = input === undefined ? existing : input;
  if (raw === null || raw === '' || raw === false || raw === undefined) return null;
  const minutes = Number(raw);
  return RELEASE_REMINDER_LEADS.includes(minutes) ? minutes : null;
}

function cleanItem(input, existing) {
  const it = existing || {};
  const title = String(input.title || it.title || '').trim();
  const category = CATEGORIES.includes(input.category) ? input.category : (it.category || 'Anime');
  const totalRaw = input.totalUnits === '' || input.totalUnits === null || input.totalUnits === undefined
    ? (it.totalUnits ?? null) : Number(input.totalUnits);
  const total = totalRaw === null || Number.isNaN(totalRaw) ? null : Math.max(0, Math.floor(totalRaw));
  const out = {
    id: it.id || crypto.randomUUID(),
    title,
    category,
    genre: String(input.genre ?? it.genre ?? '').trim(),
    author: String(input.author ?? it.author ?? '').trim(),
    year: input.year === '' || input.year === null || input.year === undefined ? (it.year ?? null) : Number(input.year) || null,
    targetDate: String(input.targetDate ?? it.targetDate ?? ''),
    link: String(input.link ?? it.link ?? '').trim(),
    notes: String(input.notes ?? it.notes ?? ''),
    rating: Math.max(0, Math.min(5, Number(input.rating ?? it.rating ?? 0) || 0)),
    favorite: Boolean(input.favorite ?? it.favorite ?? false),
    status: STATUSES.includes(input.status) ? input.status : (it.status || 'Berlangsung'),
    tier: TIERS.includes(input.tier ?? null) ? (input.tier ?? null) : (it.tier ?? null),
    totalUnits: total,
    currentProgress: Number(input.currentProgress ?? it.currentProgress ?? 0) || 0,
    checked: Array.isArray(input.checked) ? input.checked.filter(n => Number.isInteger(n) && n >= 1) : (it.checked || []),
    coverUrl: String(input.coverUrl ?? it.coverUrl ?? ''),
    coverSource: String(input.coverSource ?? it.coverSource ?? ''),
    externalRefs: cleanExternalRefs(input.externalRefs, it.externalRefs),
    releaseReminderMinutes: cleanReleaseReminderMinutes(input.releaseReminderMinutes, it.releaseReminderMinutes),
    createdAt: it.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (out.totalUnits !== null) {
    out.checked = [...new Set(out.checked.filter(n => n <= out.totalUnits))].sort((a, b) => a - b);
    out.currentProgress = out.checked.length ? Math.max(...out.checked) : 0;
    // If caller explicitly set currentProgress (form), checked follows it:
    if (input.currentProgress !== undefined && input.currentProgress !== null && input.currentProgress !== '') {
      const p = Math.max(0, Math.min(out.totalUnits, Number(input.currentProgress) || 0));
      out.checked = Array.from({ length: p }, (_, i) => i + 1);
      out.currentProgress = p;
    }
  } else {
    out.currentProgress = 0;
  }
  syncStatus(out);
  return out;
}

module.exports = { getData, loadData, saveData, mutateData, createSerializedExecutor, createSerializedWriter, logActivity, checkedCount, syncStatus, setProgress, cleanExternalRefs, cleanReleaseReminderMinutes, cleanItem };
