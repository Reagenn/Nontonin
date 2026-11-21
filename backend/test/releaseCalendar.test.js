'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanItem } = require('../src/state');
const { titleSimilarity, candidateMatchScore } = require('../src/sources/helpers');
const { buildReleaseCalendar } = require('../src/releaseCalendar');

const NOW = Date.parse('2026-11-21T12:00:00.000Z');

function event(item, source, hour) {
  return {
    id: source.toLowerCase() + ':' + item.id,
    itemId: item.id,
    source,
    sourceShowId: '1',
    sourceEpisodeId: '2',
    sourceTitle: item.title,
    sourceUrl: 'https://example.com/show',
    episodeUrl: 'https://example.com/episode',
    episodeTitle: 'Episode baru',
    season: 1,
    episode: 2,
    releaseAt: '2026-11-22T' + hour + ':00:00.000Z',
    precision: 'instant',
  };
}

test('title matching menggabungkan alias dan tahun rilis', () => {
  assert.equal(titleSimilarity('Frieren: Beyond Journey\'s End', 'Frieren Beyond Journeys End'), 1);
  const exactYear = candidateMatchScore({ title: 'One Piece', year: 1999 }, ['One Piece'], 1999);
  const wrongYear = candidateMatchScore({ title: 'One Piece', year: 1999 }, ['One Piece'], 2023);
  assert.ok(exactYear > wrongYear);
});

test('cleanItem hanya menyimpan external refs yang valid', () => {
  const item = cleanItem({ title: 'Contoh', externalRefs: { tvmaze: 42, shikimori: '21', other: 99 } });
  assert.deepEqual(item.externalRefs, { tvmaze: 42, shikimori: 21 });
  const updated = cleanItem({ title: 'Contoh baru' }, item);
  assert.deepEqual(updated.externalRefs, item.externalRefs);
});

test('kalender memprioritaskan Shikimori untuk anime dan TVMaze untuk drama', async () => {
  const anime = { id: 'anime', title: 'Anime Aktif', category: 'Anime' };
  const drama = { id: 'drama', title: 'Drama Aktif', category: 'Drama' };
  const novel = { id: 'novel', title: 'Novel', category: 'Novel' };
  const tvmazeCalls = [];
  const result = await buildReleaseCalendar([anime, drama, novel], {
    now: NOW,
    lookupShikimori: async () => new Map([
      [anime.id, { status: 'scheduled', event: event(anime, 'Shikimori', '08') }],
    ]),
    lookupTVMaze: async item => {
      tvmazeCalls.push(item.id);
      return { status: 'scheduled', event: event(item, 'TVMaze', '09') };
    },
  });
  assert.deepEqual(tvmazeCalls, ['drama']);
  assert.deepEqual(result.events.map(value => value.source), ['Shikimori', 'TVMaze']);
  assert.deepEqual(result.summary, { checked: 2, scheduled: 2, noUpcoming: 0, unmatched: 0 });
});

test('kalender memakai TVMaze saat Shikimori tidak punya jadwal', async () => {
  const anime = { id: 'anime', title: 'Anime TV', category: 'Anime' };
  const result = await buildReleaseCalendar([anime], {
    now: NOW,
    lookupShikimori: async () => new Map([[anime.id, { status: 'no-match' }]]),
    lookupTVMaze: async item => ({ status: 'scheduled', event: event(item, 'TVMaze', '10') }),
  });
  assert.equal(result.events[0].source, 'TVMaze');
  assert.equal(result.summary.scheduled, 1);
});

test('kegagalan provider menjadi peringatan, bukan kegagalan seluruh kalender', async () => {
  const anime = { id: 'anime', title: 'Anime', category: 'Anime' };
  const result = await buildReleaseCalendar([anime], {
    now: NOW,
    lookupShikimori: async () => { throw new Error('offline'); },
    lookupTVMaze: async () => { throw new Error('offline'); },
  });
  assert.equal(result.events.length, 0);
  assert.equal(result.summary.unmatched, 1);
  assert.equal(result.warnings.length, 2);
});
