'use strict';
/**
 * Nontonin — unduh & simpan cover sebagai blob di dalam aplikasi.
 * Cover yang dipilih tidak pernah sekadar di-hotlink: file gambarnya
 * diunduh dan disimpan di backend/data/blobs/, lalu disajikan dari /blobs/.
 */
const crypto = require('crypto');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { BLOBS_DIR } = require('./config');
const { fetchTimeout } = require('./http');

function extFor(contentType, url) {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('png')) return '.png';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('gif')) return '.gif';
  if (/\.png(\?|$)/i.test(url)) return '.png';
  if (/\.webp(\?|$)/i.test(url)) return '.webp';
  if (/\.gif(\?|$)/i.test(url)) return '.gif';
  return '.jpg';
}

async function storeImageBuffer(buf, ext) {
  await fsp.mkdir(BLOBS_DIR, { recursive: true });
  const name = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 24) + ext;
  await fsp.writeFile(path.join(BLOBS_DIR, name), buf);
  return '/blobs/' + name;
}

async function downloadCover(url) {
  const r = await fetchTimeout(url, { headers: { 'User-Agent': 'Nontonin/2.3.0 (https://github.com/Reagenn/Nontonin)', Accept: 'image/*' } }, 15000);
  if (!r.ok) throw new Error('Cover gagal diunduh (HTTP ' + r.status + ')');
  const ct = r.headers.get('content-type') || '';
  if (ct && !ct.startsWith('image/')) throw new Error('URL itu bukan gambar');
  const ab = await r.arrayBuffer();
  if (!ab.byteLength) throw new Error('Gambar kosong');
  if (ab.byteLength > 10 * 1024 * 1024) throw new Error('Gambar lebih dari 10 MB');
  return storeImageBuffer(Buffer.from(ab), extFor(ct, url));
}

module.exports = { extFor, storeImageBuffer, downloadCover };
