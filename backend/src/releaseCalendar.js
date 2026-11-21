'use strict';
/**
 * Nontonin - orkestrator kalender rilis untuk judul episodik tersimpan.
 * Anime memprioritaskan Shikimori; TVMaze menangani drama dan menjadi fallback.
 */
const { findShikimoriReleases, findTVMazeRelease } = require('./releaseProviders');

const CACHE_TTL_MS = 15 * 60 * 1000;
const EPISODIC_CATEGORIES = new Set(['Anime', 'Drama']);
let cache = null;
let inFlight = null;

function calendarKey(items) {
  return JSON.stringify(items
    .filter(item => EPISODIC_CATEGORIES.has(item.category))
    .map(item => [item.id, item.title, item.category, item.year || null, item.externalRefs || {}]));
}

async function buildReleaseCalendar(items, options = {}) {
  const now = options.now ?? Date.now();
  const lookupShikimori = options.lookupShikimori || findShikimoriReleases;
  const lookupTVMaze = options.lookupTVMaze || findTVMazeRelease;
  const episodicItems = items.filter(item => EPISODIC_CATEGORIES.has(item.category));
  const animeItems = episodicItems.filter(item => item.category === 'Anime');
  const results = new Map();
  const warnings = [];
  const sourceStatus = {
    Shikimori: { checked: animeItems.length, failed: false },
    TVMaze: { checked: 0, failed: 0 },
  };

  let shikimoriResults = new Map();
  if (animeItems.length) {
    try {
      shikimoriResults = await lookupShikimori(animeItems, { now });
    } catch (error) {
      sourceStatus.Shikimori.failed = true;
      warnings.push('Shikimori sedang tidak dapat diakses; anime dicoba melalui TVMaze.');
    }
  }

  const tvmazeItems = [];
  for (const item of episodicItems) {
    const shikimori = shikimoriResults.get(item.id);
    if (shikimori && shikimori.status === 'scheduled') results.set(item.id, shikimori);
    else tvmazeItems.push(item);
  }
  sourceStatus.TVMaze.checked = tvmazeItems.length;

  for (const item of tvmazeItems) {
    try {
      const tvmaze = await lookupTVMaze(item, { now });
      const shikimori = shikimoriResults.get(item.id);
      if (tvmaze.status === 'scheduled') results.set(item.id, tvmaze);
      else if (tvmaze.status === 'no-upcoming' || (shikimori && shikimori.status === 'no-upcoming')) {
        results.set(item.id, { status: 'no-upcoming' });
      } else results.set(item.id, { status: 'no-match' });
    } catch (error) {
      sourceStatus.TVMaze.failed += 1;
      const shikimori = shikimoriResults.get(item.id);
      results.set(item.id, shikimori && shikimori.status === 'no-upcoming'
        ? { status: 'no-upcoming' } : { status: 'no-match' });
    }
  }
  if (sourceStatus.TVMaze.failed) {
    warnings.push('Sebagian jadwal TVMaze gagal dimuat dan akan dicoba lagi saat penyegaran berikutnya.');
  }

  const events = [...results.values()]
    .filter(result => result.status === 'scheduled')
    .map(result => result.event)
    .sort((a, b) => new Date(a.releaseAt) - new Date(b.releaseAt));
  const noUpcoming = [...results.values()].filter(result => result.status === 'no-upcoming').length;
  const unmatched = episodicItems.length - events.length - noUpcoming;
  return {
    events,
    generatedAt: new Date(now).toISOString(),
    summary: { checked: episodicItems.length, scheduled: events.length, noUpcoming, unmatched },
    sources: sourceStatus,
    warnings,
  };
}

async function getReleaseCalendar(items, options = {}) {
  const force = Boolean(options.force);
  const now = Date.now();
  const key = calendarKey(items);
  if (!force && cache && cache.key === key && cache.expiresAt > now) {
    return { ...cache.value, cached: true };
  }
  if (inFlight && inFlight.key === key) return inFlight.promise;

  const promise = buildReleaseCalendar(items, { now }).then(value => {
    const expiresAt = Date.now() + CACHE_TTL_MS;
    const complete = { ...value, expiresAt: new Date(expiresAt).toISOString(), cached: false };
    cache = { key, expiresAt, value: complete };
    return complete;
  }).finally(() => {
    if (inFlight && inFlight.promise === promise) inFlight = null;
  });
  inFlight = { key, promise };
  return promise;
}

function resetReleaseCache() { cache = null; inFlight = null; }

module.exports = { CACHE_TTL_MS, calendarKey, buildReleaseCalendar, getReleaseCalendar, resetReleaseCache };
