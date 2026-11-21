'use strict';
/**
 * Nontonin — konfigurasi aplikasi.
 * Satu tempat untuk semua konstanta: port, path data, dan enum
 * (kategori, status, tier) yang dipakai backend.
 */
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, '..', '..');
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const DATA_FILE = path.join(__dirname, '..', 'data', 'data.json');
const BLOBS_DIR = path.join(__dirname, '..', 'data', 'blobs');

const CATEGORIES = ['Anime', 'Film', 'Drama', 'Novel', 'Wattpad'];
const STATUSES = ['Berlangsung', 'Rencana', 'Selesai', 'Jeda', 'Berhenti'];
const TIERS = [null, 'S', 'A', 'B', 'C', 'D'];
const RELEASE_REMINDER_LEADS = [0, 15, 60, 1440, 10080];

module.exports = { PORT, ROOT, FRONTEND_DIR, DATA_FILE, BLOBS_DIR, CATEGORIES, STATUSES, TIERS, RELEASE_REMINDER_LEADS };
