'use strict';
/**
 * Nontonin — helper bersama untuk sumber cover.
 * Dipakai semua modul di backend/src/sources/.
 */

function yearOf(s) {
  if (!s) return null;
  const m = String(s).match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

function normTitle(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

/** Bersihkan sinopsis/ringkasan (buang tag HTML, rapikan spasi) lalu potong. */
function shortText(s, n = 160) {
  const t = String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
}

module.exports = { yearOf, normTitle, shortText };
