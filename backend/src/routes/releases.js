'use strict';
/** Nontonin - route kalender rilis episode berikutnya. */
const { sendJson } = require('../http');
const { getData } = require('../state');
const { getReleaseCalendar } = require('../releaseCalendar');

async function handleReleases(req, res, url) {
  if (req.method !== 'GET' || url.pathname !== '/api/releases') return false;
  const force = url.searchParams.get('refresh') === '1';
  const calendar = await getReleaseCalendar(getData().items, { force });
  sendJson(res, 200, calendar);
  return true;
}

module.exports = { handleReleases };
