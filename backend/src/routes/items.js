'use strict';
/**
 * Nontonin — route items (CRUD + checklist episode/bab).
 * Endpoint (tidak berubah dari v1):
 *   GET    /api/items            -> { items }
 *   POST   /api/items            -> 201 { item }
 *   PUT    /api/items/:id        -> { item }
 *   DELETE /api/items/:id        -> { ok: true }
 *   POST   /api/items/:id/toggle -> { item }   (body: { unit })
 *   PUT    /api/items/:id/reminder -> { item } (body: { minutesBefore })
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { BLOBS_DIR, RELEASE_REMINDER_LEADS } = require('../config');
const { sendJson, readBody } = require('../http');
const { getData, saveData, mutateData, logActivity, cleanItem, syncStatus } = require('../state');

async function listItems(req, res) {
  return sendJson(res, 200, { items: getData().items });
}

async function createItem(req, res) {
  const body = JSON.parse(await readBody(req) || '{}');
  if (!String(body.title || '').trim()) return sendJson(res, 400, { error: 'Judul wajib diisi' });
  const result = await mutateData(async data => {
    const item = cleanItem(body, null);
    data.items.unshift(item);
    logActivity('tambah', item);
    await saveData();
    return { status: 201, body: { item } };
  });
  return sendJson(res, result.status, result.body);
}

async function updateItem(req, res, id) {
  const body = JSON.parse(await readBody(req) || '{}');
  const result = await mutateData(async data => {
    const idx = data.items.findIndex(x => x.id === id);
    if (idx < 0) return { status: 404, body: { error: 'Judul tidak ditemukan' } };
    const updated = cleanItem(body, data.items[idx]);
    data.items[idx] = updated;
    logActivity('edit', updated);
    await saveData();
    return { status: 200, body: { item: updated } };
  });
  return sendJson(res, result.status, result.body);
}

async function deleteItem(req, res, id) {
  const result = await mutateData(async data => {
    const item = data.items.find(x => x.id === id);
    if (!item) return { status: 404, body: { error: 'Judul tidak ditemukan' } };
    data.items = data.items.filter(x => x.id !== id);
    logActivity('hapus', item);
    const unusedCover = item.coverUrl && item.coverUrl.startsWith('/blobs/')
      && !data.items.some(x => x.coverUrl === item.coverUrl) ? item.coverUrl : null;
    await saveData();
    return { status: 200, body: { ok: true }, unusedCover };
  });
  if (result.unusedCover) {
    try { await fsp.unlink(path.join(BLOBS_DIR, path.basename(result.unusedCover))); } catch (e) {}
  }
  return sendJson(res, result.status, result.body);
}

async function toggleUnit(req, res, id) {
  const body = JSON.parse(await readBody(req) || '{}');
  const unit = Number(body.unit);
  if (!Number.isInteger(unit) || unit < 1) return sendJson(res, 400, { error: 'Nomor episode/bab tidak valid' });
  const result = await mutateData(async data => {
    const item = data.items.find(x => x.id === id);
    if (!item) return { status: 404, body: { error: 'Judul tidak ditemukan' } };
    if (item.totalUnits && unit > item.totalUnits) {
      return { status: 400, body: { error: 'Nomor melebihi Total Episode/Bab' } };
    }
    const set = new Set(item.checked || []);
    if (set.has(unit)) set.delete(unit); else set.add(unit);
    item.checked = [...set].sort((a, b) => a - b);
    item.currentProgress = item.checked.length ? Math.max(...item.checked) : 0;
    item.updatedAt = new Date().toISOString();
    syncStatus(item);
    logActivity(set.has(unit) ? 'centang' : 'batal-centang', item);
    await saveData();
    return { status: 200, body: { item } };
  });
  return sendJson(res, result.status, result.body);
}

async function setReleaseReminder(req, res, id) {
  const body = JSON.parse(await readBody(req) || '{}');
  const raw = body.minutesBefore;
  const disabled = raw === null || raw === '';
  const validType = typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '');
  const minutes = disabled ? null : Number(raw);
  if (!disabled && (!validType || !RELEASE_REMINDER_LEADS.includes(minutes))) {
    return sendJson(res, 400, { error: 'Waktu pengingat tidak valid' });
  }
  const result = await mutateData(async data => {
    const item = data.items.find(x => x.id === id);
    if (!item) return { status: 404, body: { error: 'Judul tidak ditemukan' } };
    item.releaseReminderMinutes = minutes;
    item.updatedAt = new Date().toISOString();
    await saveData();
    return { status: 200, body: { item } };
  });
  return sendJson(res, result.status, result.body);
}

/** Dispatch semua rute /api/items*. Mengembalikan true bila rute ditangani. */
async function handleItems(req, res, url) {
  const p = url.pathname;
  if (req.method === 'GET' && p === '/api/items') { await listItems(req, res); return true; }
  if (req.method === 'POST' && p === '/api/items') { await createItem(req, res); return true; }
  const reminderMatch = p.match(/^\/api\/items\/([^/]+)\/reminder$/);
  if (req.method === 'PUT' && reminderMatch) {
    await setReleaseReminder(req, res, decodeURIComponent(reminderMatch[1]));
    return true;
  }
  const idMatch = p.match(/^\/api\/items\/([^/]+)(\/toggle)?$/);
  if (idMatch) {
    const id = decodeURIComponent(idMatch[1]);
    if (req.method === 'PUT') { await updateItem(req, res, id); return true; }
    if (req.method === 'DELETE') { await deleteItem(req, res, id); return true; }
    if (req.method === 'POST' && idMatch[2] === '/toggle') { await toggleUnit(req, res, id); return true; }
  }
  return false;
}

module.exports = { handleItems, listItems, createItem, updateItem, deleteItem, toggleUnit, setReleaseReminder };
