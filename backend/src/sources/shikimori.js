'use strict';
/**
 * Nontonin — sumber cover: Shikimori (anime).
 * API publik, tanpa key. Mengembalikan jumlah episode bila tersedia.
 */
const { fetchJson } = require('../http');
const { yearOf } = require('./helpers');

async function srcShikimori(q) {
  const j = await fetchJson('https://shikimori.one/api/animes?search=' + encodeURIComponent(q) + '&limit=5',
    { headers: { 'User-Agent': 'Nontonin/1.0', Accept: 'application/json' } }, 9000);
  return (Array.isArray(j) ? j : []).map(a => {
    const img = a.image && a.image.original && !a.image.original.includes('missing_original')
      ? 'https://shikimori.one' + a.image.original : null;
    return { title: a.name, source: 'Shikimori', imageUrl: img, year: yearOf(a.aired_on), genre: '', author: '', totalUnits: a.episodes ? Number(a.episodes) : null, subtitle: '', rating: a.score ? Number(a.score) : null };
  }).filter(c => c.title && c.imageUrl);
}

module.exports = srcShikimori;
