'use strict';
/**
 * Nontonin — sumber cover: Open Library (novel & Wattpad).
 * API publik, tanpa key. Sumber utama untuk buku. Tidak menerbitkan
 * jumlah bab (totalUnits selalu null).
 */
const { fetchJson } = require('../http');

async function srcOpenLibrary(q) {
  const j = await fetchJson('https://openlibrary.org/search.json?q=' + encodeURIComponent(q) + '&limit=5', {}, 9000);
  return ((j.docs || []).slice(0, 5)).map(d => ({
    title: d.title, source: 'Open Library',
    imageUrl: d.cover_i ? 'https://covers.openlibrary.org/b/id/' + d.cover_i + '-L.jpg' : null,
    year: d.first_publish_year || null, genre: (d.subject || []).slice(0, 3).join(', '),
    author: (d.author_name || []).join(', '), totalUnits: null,
    subtitle: (d.first_sentence && d.first_sentence[0]) ? String(d.first_sentence[0]).slice(0, 160) : '', rating: null,
  })).filter(c => c.title && c.imageUrl);
}

module.exports = srcOpenLibrary;
