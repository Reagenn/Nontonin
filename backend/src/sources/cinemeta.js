'use strict';
/**
 * Nontonin — sumber cover: Cinemeta (film & serial, poster IMDb).
 * API publik, tanpa key. Untuk film total = 1; untuk serial jumlah
 * episode dihitung dari daftar video (season >= 1).
 */
const { fetchJson } = require('../http');
const { yearOf, shortText } = require('./helpers');

async function srcCinemeta(q, type) {
  // type: 'movie' | 'series'. Correct Cinemeta search form: /catalog/<type>/top/search=<q>.json
  const j = await fetchJson('https://v3-cinemeta.strem.io/catalog/' + type + '/top/search=' + encodeURIComponent(q) + '.json', {}, 9000);
  const metas = (j.metas || []).slice(0, 4);
  const out = await Promise.all(metas.map(async m => {
    let total = type === 'movie' ? 1 : null;
    let subtitle = '';
    if (type === 'series' && m.id) {
      try {
        const det = await fetchJson('https://v3-cinemeta.strem.io/meta/series/' + encodeURIComponent(m.id) + '.json', {}, 8000);
        const videos = (det.meta && det.meta.videos) || [];
        const eps = videos.filter(v => (v.season || 0) >= 1);
        if (eps.length) total = eps.length;
        subtitle = shortText(det.meta && det.meta.description);
      } catch (e) { /* total stays null */ }
    }
    return { title: m.name, source: 'Cinemeta', imageUrl: m.poster || null, year: yearOf(m.releaseInfo || m.released), genre: (m.genre || m.genres || []).join(', '), author: '', totalUnits: total, subtitle, rating: null };
  }));
  return out.filter(c => c.title && c.imageUrl);
}

module.exports = srcCinemeta;
