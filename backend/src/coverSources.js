'use strict';
/**
 * Nontonin — orkestrator pencarian cover.
 * Menjalankan sumber-sumber per kategori secara paralel, lalu menggabungkan
 * hasilnya round-robin (maks. 12 kandidat), tiap kandidat berlabel sumber.
 * Sumber yang gagal dilewati diam-diam — hasil sumber lain tetap tampil.
 */
const srcKitsu = require('./sources/kitsu');
const srcShikimori = require('./sources/shikimori');
const srcTVMaze = require('./sources/tvmaze');
const srcCinemeta = require('./sources/cinemeta');
const wikiCandidates = require('./sources/wikipedia');
const srcOpenLibrary = require('./sources/openlibrary');
const srcGutendex = require('./sources/gutendex');
const { normTitle } = require('./sources/helpers');

function roundRobin(lists, cap = 12) {
  const out = []; const seen = new Set(); let i = 0;
  while (out.length < cap) {
    let added = false;
    for (const list of lists) {
      if (i < list.length) {
        const c = list[i];
        const key = c.source + '|' + normTitle(c.title);
        if (!seen.has(key)) { seen.add(key); out.push(c); added = true; }
        if (out.length >= cap) break;
      }
    }
    if (!added) break;
    i++;
  }
  return out;
}

async function searchCover(q, category) {
  const jobs = [];
  if (category === 'Anime') jobs.push(srcKitsu, srcShikimori, srcTVMaze, () => srcCinemeta(q, 'series'), () => wikiCandidates(q, 'en'), () => wikiCandidates(q, 'id'));
  else if (category === 'Film') jobs.push(() => srcCinemeta(q, 'movie'), () => wikiCandidates(q, 'en'), () => wikiCandidates(q, 'id'));
  else if (category === 'Drama') jobs.push(srcTVMaze, () => srcCinemeta(q, 'series'), () => wikiCandidates(q, 'en'), () => wikiCandidates(q, 'id'));
  else jobs.push(srcOpenLibrary, srcGutendex, () => wikiCandidates(q, 'en'), () => wikiCandidates(q, 'id'), srcTVMaze); // Novel & Wattpad
  const settled = await Promise.allSettled(jobs.map(fn => fn(q)));
  const lists = settled.filter(s => s.status === 'fulfilled').map(s => s.value || []);
  return roundRobin(lists, 12);
}

module.exports = { searchCover, roundRobin };
