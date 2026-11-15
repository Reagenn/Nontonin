'use strict';
/**
 * Nontonin v2.2.0 — Watchlist & Reading Tracker (local copy)
 * Entry point tipis: hanya memuat data, lalu menjalankan server HTTP.
 * Routing ada di ./router.js, logika di ./state.js, ./coverSources.js,
 * ./covers.js, dan ./routes/. Zero npm dependencies, Node.js >= 18.
 */
const http = require('http');
const { PORT } = require('./config');
const { loadData } = require('./state');
const handleRequest = require('./router');

const server = http.createServer((req, res) => { handleRequest(req, res); });

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port ' + PORT + ' sudah dipakai aplikasi lain, server tidak bisa jalan.');
    console.error('Tutup aplikasi yang memakai port itu, atau jalankan dengan port lain:');
    console.error('  PORT=3001 node backend/src/server.js');
    console.error('Lalu buka http://localhost:3001');
    process.exit(1);
  }
  throw err;
});

loadData().then(() => {
  server.listen(PORT, () => {
    console.log('Nontonin v2.2.0 jalan di http://localhost:' + PORT);
    console.log('Data tersimpan di backend/data/data.json');
    console.log('Tekan Ctrl+C untuk berhenti.');
  });
});
