'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { getData, mutateData, cleanItem, cleanReleaseReminderMinutes, createSerializedWriter } = require('../src/state');
const { titleSimilarity, candidateMatchScore } = require('../src/sources/helpers');
const { MATCH_THRESHOLD } = require('../src/releaseProviders');
const { CACHE_TTL_MS, buildReleaseCalendar, getReleaseCalendar, resetReleaseCache } = require('../src/releaseCalendar');

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
  assert.ok(candidateMatchScore({ title: 'Love', year: 2026 }, ['Love Island'], 2026) < MATCH_THRESHOLD);
  assert.ok(candidateMatchScore({ title: 'Frieren', year: 2023 }, ["Frieren: Beyond Journey's End"], 2023) >= MATCH_THRESHOLD);
});

test('penulisan snapshot berjalan serial dan mempertahankan urutan terbaru', async () => {
  const writes = [];
  let active = 0;
  let maxActive = 0;
  const write = createSerializedWriter(async value => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setTimeout(resolve, value === 'awal' ? 15 : 1));
    writes.push(value);
    active -= 1;
  });
  await Promise.all([write('awal'), write('tengah'), write('terbaru')]);
  assert.equal(maxActive, 1);
  assert.deepEqual(writes, ['awal', 'tengah', 'terbaru']);
});

test('antrean penulisan tetap berjalan setelah satu snapshot gagal', async () => {
  const writes = [];
  const write = createSerializedWriter(async value => {
    if (value === 'gagal') throw new Error('disk penuh');
    writes.push(value);
  });
  const failed = write('gagal');
  const recovered = write('pulih');
  await assert.rejects(failed, /disk penuh/);
  await recovered;
  assert.deepEqual(writes, ['pulih']);
});

test('mutasi state berjalan serial dan rollback saat transaksi gagal', async () => {
  const original = JSON.parse(JSON.stringify(getData()));
  await mutateData(data => { data.items = []; data.activity = []; });
  const first = mutateData(async data => {
    await new Promise(resolve => setTimeout(resolve, 10));
    data.items.push({ id: 'awal' });
  });
  const second = mutateData(data => { data.items.push({ id: 'terbaru' }); });
  await Promise.all([first, second]);
  assert.deepEqual(getData().items.map(item => item.id), ['awal', 'terbaru']);
  await assert.rejects(mutateData(data => {
    data.items.push({ id: 'gagal' });
    throw new Error('batalkan transaksi');
  }), /batalkan transaksi/);
  assert.deepEqual(getData().items.map(item => item.id), ['awal', 'terbaru']);
  await mutateData(data => { data.items = original.items; data.activity = original.activity; });
});

test('cache kalender menggabungkan request aktif, mendukung force, dan kedaluwarsa', async () => {
  resetReleaseCache();
  let now = NOW;
  let calls = 0;
  let releaseBuild;
  const gate = new Promise(resolve => { releaseBuild = resolve; });
  const result = {
    events: [], generatedAt: new Date(NOW).toISOString(),
    summary: { checked: 0, scheduled: 0, noUpcoming: 0, unmatched: 0 },
    sources: {}, warnings: [],
  };
  const build = async () => { calls += 1; await gate; return result; };
  const first = getReleaseCalendar([], { build, clock: () => now });
  const concurrent = getReleaseCalendar([], { build, clock: () => now });
  assert.equal(calls, 1);
  releaseBuild();
  await Promise.all([first, concurrent]);
  assert.equal((await getReleaseCalendar([], { build, clock: () => now })).cached, true);
  await getReleaseCalendar([], { force: true, build, clock: () => now });
  assert.equal(calls, 2);
  now += CACHE_TTL_MS + 1;
  await getReleaseCalendar([], { build, clock: () => now });
  assert.equal(calls, 3);
  resetReleaseCache();
});

test('cleanItem hanya menyimpan external refs yang valid', () => {
  const item = cleanItem({ title: 'Contoh', externalRefs: { tvmaze: 42, shikimori: '21', other: 99 } });
  assert.deepEqual(item.externalRefs, { tvmaze: 42, shikimori: 21 });
  const updated = cleanItem({ title: 'Contoh baru' }, item);
  assert.deepEqual(updated.externalRefs, item.externalRefs);
});

test('pengingat menerima pilihan yang didukung dan mempertahankan nilai lama', () => {
  assert.equal(cleanReleaseReminderMinutes(60, null), 60);
  assert.equal(cleanReleaseReminderMinutes(0, null), 0);
  assert.equal(cleanReleaseReminderMinutes(7, 60), null);
  assert.equal(cleanReleaseReminderMinutes(undefined, 1440), 1440);
  const item = cleanItem({ title: 'Pengingat', releaseReminderMinutes: 15 });
  assert.equal(item.releaseReminderMinutes, 15);
  assert.equal(cleanItem({ title: 'Pengingat baru' }, item).releaseReminderMinutes, 15);
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
