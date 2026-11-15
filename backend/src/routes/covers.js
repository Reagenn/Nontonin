'use strict';
/**
 * Nontonin — route cover.
 * Endpoint (tidak berubah dari v1):
 *   GET  /api/search-cover?q=&category= -> { candidates }
 *   POST /api/cover-download            -> { coverUrl }  (body: { url })
 *   POST /api/cover-upload              -> { coverUrl }  (body: { dataUrl })
 */
const { CATEGORIES } = require('../config');
const { sendJson, readBody } = require('../http');
const { searchCover } = require('../coverSources');
const { downloadCover, storeImageBuffer } = require('../covers');

async function searchCoverRoute(req, res, url) {
  const q = (url.searchParams.get('q') || '').trim();
  const category = CATEGORIES.includes(url.searchParams.get('category')) ? url.searchParams.get('category') : 'Anime';
  if (!q) return sendJson(res, 400, { error: 'Kata kunci pencarian kosong' });
  const candidates = await searchCover(q, category);
  return sendJson(res, 200, { candidates });
}

async function downloadCoverRoute(req, res) {
  const body = JSON.parse(await readBody(req) || '{}');
  if (!body.url) return sendJson(res, 400, { error: 'URL cover kosong' });
  const coverUrl = await downloadCover(String(body.url));
  return sendJson(res, 200, { coverUrl });
}

async function uploadCoverRoute(req, res) {
  const body = JSON.parse(await readBody(req) || '{}');
  const m = String(body.dataUrl || '').match(/^data:(image\/(png|jpeg|webp|gif));base64,(.+)$/);
  if (!m) return sendJson(res, 400, { error: 'File harus berupa gambar (PNG/JPG/WebP/GIF)' });
  const buf = Buffer.from(m[3], 'base64');
  if (buf.length > 10 * 1024 * 1024) return sendJson(res, 400, { error: 'Gambar lebih dari 10 MB' });
  const coverUrl = await storeImageBuffer(buf, '.' + (m[2] === 'jpeg' ? 'jpg' : m[2]));
  return sendJson(res, 200, { coverUrl });
}

/** Dispatch semua rute cover. Mengembalikan true bila rute ditangani. */
async function handleCovers(req, res, url) {
  const p = url.pathname;
  if (req.method === 'GET' && p === '/api/search-cover') { await searchCoverRoute(req, res, url); return true; }
  if (req.method === 'POST' && p === '/api/cover-download') { await downloadCoverRoute(req, res); return true; }
  if (req.method === 'POST' && p === '/api/cover-upload') { await uploadCoverRoute(req, res); return true; }
  return false;
}

module.exports = { handleCovers, searchCoverRoute, downloadCoverRoute, uploadCoverRoute };
