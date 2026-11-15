'use strict';
/**
 * Nontonin — sumber cover: Gutendex / Project Gutenberg (novel & Wattpad).
 * API publik, tanpa key. Pencocokan longgar (ikut mencocokkan ringkasan
 * buku) — sengaja diurutkan di bawah Open Library. Tidak menerbitkan
 * jumlah bab (totalUnits selalu null).
 */
const { fetchJson } = require('../http');

async function srcGutendex(q) {
  // Loose matching (also matches summaries) — deliberately ranked below Open Library.
  const j = await fetchJson('https://gutendex.com/books/?search=' + encodeURIComponent(q), {}, 9000);
  return ((j.results || []).slice(0, 5)).map(b => {
    const fmt = b.formats || {};
    const img = fmt['image/jpeg'] || null;
    return { title: b.title, source: 'Gutendex', imageUrl: img, year: null, genre: (b.subjects || []).slice(0, 3).join(', '), author: (b.authors || []).map(a => a.name).join(', '), totalUnits: null, subtitle: (b.summaries && b.summaries[0]) ? String(b.summaries[0]).slice(0, 160) : '', rating: null };
  }).filter(c => c.title && c.imageUrl);
}

module.exports = srcGutendex;
