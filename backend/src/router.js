'use strict';
/**
 * Nontonin — router.
 * Satu-satunya tempat yang tahu peta rute: file statis, /api/items,
 * /api/activity, dan rute cover. Logika tiap rute tinggal di
 * backend/src/routes/ masing-masing.
 */
const { sendJson } = require('./http');
const { getData } = require('./state');
const { handleStatic } = require('./routes/static');
const { handleItems } = require('./routes/items');
const { handleCovers } = require('./routes/covers');

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (await handleStatic(req, res, url)) return;
    if (await handleItems(req, res, url)) return;
    if (await handleCovers(req, res, url)) return;
    if (req.method === 'GET' && url.pathname === '/api/activity') {
      return sendJson(res, 200, { activity: getData().activity });
    }
    return sendJson(res, 404, { error: 'Rute tidak ditemukan' });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) sendJson(res, 500, { error: e.message || 'Kesalahan server' });
  }
}

module.exports = handleRequest;
