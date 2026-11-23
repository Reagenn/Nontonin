'use strict';
/**
 * Nontonin — sumber cover: TVMaze (serial / drama / adaptasi).
 * API publik, tanpa key. Jumlah episode dihitung dari satu panggilan
 * tambahan per serial (maks. 4), paralel; gagal diabaikan (total null).
 */
const { fetchJson } = require('../http');
const { yearOf, shortText } = require('./helpers');

async function srcTVMaze(q) {
  const j = await fetchJson('https://api.tvmaze.com/search/shows?q=' + encodeURIComponent(q), {}, 9000);
  const shows = (Array.isArray(j) ? j : []).slice(0, 4).map(x => x.show).filter(Boolean);
  // episode count: one extra call per show (max 4), in parallel
  const withEps = await Promise.all(shows.map(async s => {
    let total = null;
    try {
      const eps = await fetchJson('https://api.tvmaze.com/shows/' + s.id + '/episodes', {}, 8000);
      if (Array.isArray(eps)) total = eps.filter(e => (e.season || 0) >= 1).length || eps.length;
    } catch (e) { /* total stays null */ }
    return { title: s.name, source: 'TVMaze', imageUrl: s.image ? (s.image.original || s.image.medium) : null, year: yearOf(s.premiered), genre: (s.genres || []).join(', '), author: '', totalUnits: total, subtitle: shortText(s.summary), rating: s.rating && s.rating.average ? Number(s.rating.average) : null, externalRefs: { tvmaze: s.id } };
  }));
  return withEps.filter(c => c.title && c.imageUrl);
}

module.exports = srcTVMaze;
