'use strict';
/**
 * Nontonin — penyajian file statis.
 *   GET / atau /index.html        -> frontend/index.html
 *   GET /frontend/<path>          -> file di dalam folder frontend/
 *                                     (js/main.js, css/styles.css, ...)
 *   GET /blobs/<file>             -> cover yang tersimpan di data/blobs/
 * Path di luar folder yang diizinkan ditolak (perlindungan traversal).
 */
const path = require('path');
const { FRONTEND_DIR, BLOBS_DIR } = require('../config');
const { sendJson, serveFile } = require('../http');

function safeJoin(base, rel) {
  const resolved = path.resolve(base, rel);
  return resolved === base || resolved.startsWith(base + path.sep) ? resolved : null;
}

async function handleStatic(req, res, url) {
  if (req.method !== 'GET') return false;
  const p = url.pathname;
  if (p === '/' || p === '/index.html') {
    await serveFile(res, path.join(FRONTEND_DIR, 'index.html'));
    return true;
  }
  if (p.startsWith('/blobs/')) {
    const name = path.basename(p);
    if (!/^[\w-]+\.(jpg|jpeg|png|webp|gif)$/i.test(name)) { sendJson(res, 400, { error: 'Nama file tidak valid' }); return true; }
    await serveFile(res, path.join(BLOBS_DIR, name));
    return true;
  }
  if (p.startsWith('/frontend/')) {
    const rel = decodeURIComponent(p.slice('/frontend/'.length));
    const filePath = safeJoin(FRONTEND_DIR, rel);
    if (!filePath) { sendJson(res, 400, { error: 'Path tidak valid' }); return true; }
    await serveFile(res, filePath);
    return true;
  }
  return false;
}

module.exports = { handleStatic };
