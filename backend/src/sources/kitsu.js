'use strict';
/**
 * Nontonin — sumber cover: Kitsu (anime).
 * API publik, tanpa key. Mengembalikan jumlah episode bila tersedia.
 */
const { fetchJson } = require('../http');
const { yearOf, shortText } = require('./helpers');

async function srcKitsu(q) {
  const j = await fetchJson('https://kitsu.io/api/edge/anime?filter[text]=' + encodeURIComponent(q) + '&page[limit]=5',
    { headers: { Accept: 'application/vnd.api+json', 'User-Agent': 'Nontonin/2.3.0 (https://github.com/Reagenn/Nontonin)' } }, 9000);
  return (j.data || []).map(a => {
    const at = a.attributes || {};
    const img = (at.posterImage && (at.posterImage.original || at.posterImage.large || at.posterImage.medium)) || null;
    return { title: at.canonicalTitle || at.titles?.en || at.slug, source: 'Kitsu', imageUrl: img, year: yearOf(at.startDate), genre: (at.genres || []).join(', ') || '', author: '', totalUnits: at.episodeCount ?? null, subtitle: shortText(at.synopsis), rating: at.averageRating ? Math.round(Number(at.averageRating) / 10 * 10) / 10 : null };
  }).filter(c => c.title && c.imageUrl);
}

module.exports = srcKitsu;
