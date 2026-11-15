'use strict';
/**
 * Nontonin — helper HTTP.
 * Response JSON, parsing body, fetch dengan timeout, dan penyajian
 * file statis. Tidak ada logika bisnis di sini.
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req, limit = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => { size += c.length; if (size > limit) reject(new Error('Body terlalu besar')); else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function fetchTimeout(url, opts = {}, ms = 9000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal, redirect: 'follow' }); }
  finally { clearTimeout(t); }
}

async function fetchJson(url, opts, ms) {
  const r = await fetchTimeout(url, opts, ms);
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
  return r.json();
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };

async function serveFile(res, filePath) {
  try {
    const buf = await fsp.readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Content-Length': buf.length });
    res.end(buf);
  } catch (e) { sendJson(res, 404, { error: 'Tidak ditemukan' }); }
}

module.exports = { sendJson, readBody, fetchTimeout, fetchJson, serveFile, MIME };
