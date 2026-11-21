'use strict';
/**
 * Nontonin - adapter jadwal episode TVMaze dan Shikimori.
 * Semua hasil dinormalisasi agar orkestrator tidak bergantung pada bentuk
 * respons masing-masing provider.
 */
const { fetchTimeout } = require('./http');
const { yearOf, candidateMatchScore } = require('./sources/helpers');

const USER_AGENT = 'Nontonin/2.3.0 (https://github.com/Reagenn/Nontonin)';
const MATCH_THRESHOLD = 0.72;
let nextTVMazeRequestAt = 0;

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function requestJson(url, opts, timeout = 10000, paceMs = 0) {
  if (paceMs > 0) {
    const delay = Math.max(0, nextTVMazeRequestAt - Date.now());
    if (delay) await wait(delay);
    nextTVMazeRequestAt = Date.now() + paceMs;
  }
  let response = await fetchTimeout(url, opts, timeout);
  if (response.status === 429) {
    const retryAfter = Math.min(5000, Math.max(500, Number(response.headers.get('retry-after') || 1) * 1000));
    await wait(retryAfter);
    response = await fetchTimeout(url, opts, timeout);
  }
  if (!response.ok) {
    const error = new Error('HTTP ' + response.status + ' ' + url);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function pickCandidate(item, candidates, namesOf, yearOfCandidate) {
  let best = null;
  let bestScore = -Infinity;
  for (const candidate of candidates || []) {
    const score = candidateMatchScore(item, namesOf(candidate), yearOfCandidate(candidate));
    if (score > bestScore) { best = candidate; bestScore = score; }
  }
  return best && bestScore >= MATCH_THRESHOLD ? best : null;
}

function validFutureDate(value, now) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time > now ? new Date(time).toISOString() : null;
}

function shikimoriEvent(item, anime, now) {
  const releaseAt = validFutureDate(anime.nextEpisodeAt, now);
  if (!releaseAt) return null;
  const aired = Number(anime.episodesAired);
  const episode = Number.isFinite(aired) ? aired + 1 : null;
  return {
    id: 'shikimori:' + anime.id + ':' + (episode || releaseAt),
    itemId: item.id,
    source: 'Shikimori',
    sourceShowId: String(anime.id),
    sourceEpisodeId: null,
    sourceTitle: anime.english || anime.name || item.title,
    sourceUrl: anime.url || ('https://shikimori.one/animes/' + anime.id),
    episodeUrl: anime.url || ('https://shikimori.one/animes/' + anime.id),
    episodeTitle: '',
    season: null,
    episode,
    releaseAt,
    precision: 'instant',
  };
}

function buildShikimoriQuery(batch) {
  const definitions = batch.map((_, i) => '$q' + i + ': String').join(', ');
  const fields = batch.map((item, i) => {
    const byId = item.externalRefs && item.externalRefs.shikimori;
    return 'a' + i + ': animes(' + (byId ? 'ids' : 'search') + ': $q' + i + ', limit: ' + (byId ? '1' : '5') + ') {' +
      ' id name russian english synonyms status kind episodes episodesAired nextEpisodeAt url airedOn { year } }';
  }).join(' ');
  const variables = {};
  batch.forEach((item, i) => {
    variables['q' + i] = item.externalRefs && item.externalRefs.shikimori
      ? String(item.externalRefs.shikimori) : item.title;
  });
  return { query: 'query (' + definitions + ') { ' + fields + ' }', variables };
}

async function findShikimoriReleases(items, options = {}) {
  const now = options.now ?? Date.now();
  const request = options.request || requestJson;
  const results = new Map();
  for (let start = 0; start < items.length; start += 12) {
    const batch = items.slice(start, start + 12);
    const payload = buildShikimoriQuery(batch);
    const response = await request('https://shikimori.one/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': USER_AGENT },
      body: JSON.stringify(payload),
    }, 12000);
    if (!response || !response.data) throw new Error('Respons Shikimori tidak valid');
    batch.forEach((item, i) => {
      const candidates = Array.isArray(response.data['a' + i]) ? response.data['a' + i] : [];
      const storedId = item.externalRefs && item.externalRefs.shikimori;
      const match = storedId
        ? candidates.find(anime => String(anime.id) === String(storedId))
        : pickCandidate(item, candidates,
          anime => [anime.name, anime.russian, anime.english, ...(anime.synonyms || [])],
          anime => anime.airedOn && anime.airedOn.year);
      if (!match) results.set(item.id, { status: 'no-match' });
      else {
        const event = shikimoriEvent(item, match, now);
        results.set(item.id, event ? { status: 'scheduled', event } : { status: 'no-upcoming' });
      }
    });
  }
  return results;
}

function tvmazeEvent(item, show, episode, now) {
  let releaseAt = validFutureDate(episode && episode.airstamp, now);
  let precision = 'instant';
  if (!releaseAt && episode && episode.airdate) {
    releaseAt = validFutureDate(episode.airdate + 'T00:00:00.000Z', now);
    precision = 'date';
  }
  if (!releaseAt) return null;
  return {
    id: 'tvmaze:' + episode.id,
    itemId: item.id,
    source: 'TVMaze',
    sourceShowId: String(show.id),
    sourceEpisodeId: String(episode.id),
    sourceTitle: show.name || item.title,
    sourceUrl: show.url || ('https://www.tvmaze.com/shows/' + show.id),
    episodeUrl: episode.url || show.url || ('https://www.tvmaze.com/shows/' + show.id),
    episodeTitle: episode.name || '',
    season: Number.isInteger(episode.season) ? episode.season : null,
    episode: Number.isInteger(episode.number) ? episode.number : null,
    releaseAt,
    precision,
  };
}

async function findTVMazeRelease(item, options = {}) {
  const now = options.now ?? Date.now();
  const request = options.request || ((url, opts, timeout) => requestJson(url, opts, timeout, 550));
  const requestOptions = { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } };
  const storedId = item.externalRefs && item.externalRefs.tvmaze;
  let show = null;
  let episode = null;

  if (storedId) {
    try {
      show = await request('https://api.tvmaze.com/shows/' + storedId + '?embed=nextepisode', requestOptions, 10000);
      const score = candidateMatchScore(item, [show.name], yearOf(show.premiered));
      if (score < MATCH_THRESHOLD) show = null;
      else episode = show._embedded && show._embedded.nextepisode;
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  }

  if (!show) {
    const response = await request('https://api.tvmaze.com/search/shows?q=' + encodeURIComponent(item.title), requestOptions, 10000);
    const matches = (Array.isArray(response) ? response : []).map(entry => entry.show).filter(Boolean);
    show = pickCandidate(item, matches, candidate => [candidate.name], candidate => yearOf(candidate.premiered));
    if (!show) return { status: 'no-match' };
    const nextUrl = show._links && show._links.nextepisode && show._links.nextepisode.href;
    if (nextUrl) episode = await request(nextUrl, requestOptions, 10000);
  }

  if (!episode) return { status: 'no-upcoming' };
  const event = tvmazeEvent(item, show, episode, now);
  return event ? { status: 'scheduled', event } : { status: 'no-upcoming' };
}

module.exports = {
  MATCH_THRESHOLD,
  pickCandidate,
  buildShikimoriQuery,
  findShikimoriReleases,
  findTVMazeRelease,
};
