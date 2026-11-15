'use strict';
/**
 * Nontonin — route items (CRUD + checklist episode/bab).
 * Endpoint (tidak berubah dari v1):
 *   GET    /api/items            -> { items }
 *   POST   /api/items            -> 201 { item }
 *   PUT    /api/items/:id        -> { item }
 *   DELETE /api/items/:id        -> { ok: true }
 *   POST   /api/items/:id/toggle -> { item }   (body: { unit })
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { BLOBS_DIR } = require('../config');
const { sendJson, readBody } = require('../http');
const { getData, saveData, logActivity, cleanItem, syncStatus } = require('../state');

async function listItems(req, res) {
  return sendJson(res, 200, { items: getData().items });
}

async function createItem(req, res) {
  const body = JSON.parse(await readBody(req) || '{}');
  if (!String(body.title || '').trim()) return sendJson(res, 400, { error: 'Judul wajib diisi' });
  const item = cleanItem(body, null);
  getData().items.unshift(item);
  logActivity('tambah', item);
  await saveData();
  return sendJson(res, 201, { item });
}

async function updateItem(req, res, id) {
  const data = getData();
  const item = data.items.find(x => x.id === id);
  if (!item) return sendJson(res, 404, { error: 'Judul tidak ditemukan' });
  const body = JSON.parse(await readBody(req) || '{}');
  const updated = cleanItem(body, item);
  const idx = data.items.findIndex(x => x.id === id);
  data.items[idx] = updated;
  logActivity('edit', updated);
  await saveData();
  return sendJson(res, 200, { item: updated });
}

async function deleteItem(req, res, id) {
  const data = getData();
  const item = data.items.find(x => x.id === id);
  if (!item) return sendJson(res, 404, { error: 'Judul tidak ditemukan' });
  data.items = data.items.filter(x => x.id !== id);
  logActivity('hapus', item);
  if (item.coverUrl && item.coverUrl.startsWith('/blobs/')) {
    const stillUsed = data.items.some(x => x.coverUrl === item.coverUrl);
    if (!stillUsed) { try { await fsp.unlink(path.join(BLOBS_DIR, path.basename(item.coverUrl))); } catch (e) {} }
  }
  await saveData();
  return sendJson(res, 200, { ok: true });
}

async function toggleUnit(req, res, id) {
  const item = getData().items.find(x => x.id === id);
  if (!item) return sendJson(res, 404, { error: 'Judul tidak ditemukan' });
  const body = JSON.parse(await readBody(req) || '{}');
  const unit = Number(body.unit);
  if (!Number.isInteger(unit) || unit < 1) return sendJson(res, 400, { error: 'Nomor episode/bab tidak valid' });
  if (item.totalUnits && unit > item.totalUnits) return sendJson(res, 400, { error: 'Nomor melebihi Total Episode/Bab' });
  const set = new Set(item.checked || []);
  if (set.has(unit)) set.delete(unit); else set.add(unit);
  item.checked = [...set].sort((a, b) => a - b);
  item.currentProgress = item.checked.length ? Math.max(...item.checked) : 0;
  item.updatedAt = new Date().toISOString();
  syncStatus(item);
  logActivity(set.has(unit) ? 'centang' : 'batal-centang', item);
  await saveData();
  return sendJson(res, 200, { item });
}

/** Dispatch semua rute /api/items*. Mengembalikan true bila rute ditangani. */
async function handleItems(req, res, url) {
  const p = url.pathname;
  if (req.method === 'GET' && p === '/api/items') { await listItems(req, res); return true; }
  if (req.method === 'POST' && p === '/api/items') { await createItem(req, res); return true; }
  const idMatch = p.match(/^\/api\/items\/([^/]+)(\/toggle)?$/);
  if (idMatch) {
    const id = decodeURIComponent(idMatch[1]);
    if (req.method === 'PUT') { await updateItem(req, res, id); return true; }
    if (req.method === 'DELETE') { await deleteItem(req, res, id); return true; }
    if (req.method === 'POST' && idMatch[2] === '/toggle') { await toggleUnit(req, res, id); return true; }
  }
  return false;
}

module.exports = { handleItems, listItems, createItem, updateItem, deleteItem, toggleUnit };
