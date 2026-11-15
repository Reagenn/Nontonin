'use strict';
/**
 * Nontonin — sumber cover: Wikipedia (EN & ID).
 * API publik, tanpa key. Mengambil thumbnail dari ringkasan halaman
 * untuk 2 hasil pencarian teratas. Tidak menerbitkan jumlah episode.
 */
const { fetchJson } = require('../http');
const { shortText } = require('./helpers');

async function wikiCandidates(q, lang) {
  const base = 'https://' + lang + '.wikipedia.org';
  const search = await fetchJson(base + '/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(q) + '&srlimit=3&format=json&origin=*', { headers: { 'User-Agent': 'Nontonin/1.0' } }, 9000);
  const titles = ((search.query && search.query.search) || []).map(r => r.title).slice(0, 2);
  const out = [];
  for (const t of titles) {
    try {
      const sum = await fetchJson(base + '/api/rest_v1/page/summary/' + encodeURIComponent(t), { headers: { 'User-Agent': 'Nontonin/1.0' } }, 8000);
      if (sum && sum.thumbnail && sum.thumbnail.source) {
        out.push({ title: sum.title, source: lang === 'id' ? 'Wikipedia ID' : 'Wikipedia EN', imageUrl: sum.thumbnail.source, year: null, genre: '', author: '', totalUnits: null, subtitle: shortText(sum.extract), rating: null });
      }
    } catch (e) { /* skip */ }
  }
  return out;
}

module.exports = wikiCandidates;
