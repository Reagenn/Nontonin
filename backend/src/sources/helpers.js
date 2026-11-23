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

function normTitle(s) {
  return String(s || '')
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function titleSimilarity(a, b) {
  const left = normTitle(a);
  const right = normTitle(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftTokens = new Set(left.split(' '));
  const rightTokens = new Set(right.split(' '));
  const shared = [...leftTokens].filter(token => rightTokens.has(token)).length;
  const dice = (2 * shared) / (leftTokens.size + rightTokens.size);
  const contains = left.includes(right) || right.includes(left)
    ? 0.9 * Math.min(left.length, right.length) / Math.max(left.length, right.length)
    : 0;
  return Math.max(dice, contains);
}

function candidateMatchScore(item, names, candidateYear) {
  const aliases = (Array.isArray(names) ? names : [names]).filter(Boolean);
  let score = aliases.reduce((best, name) => Math.max(best, titleSimilarity(item.title, name)), 0);
  const normalizedTitle = normTitle(item.title);
  const exactAlias = aliases.some(name => normTitle(name) === normalizedTitle);
  if (normalizedTitle && !normalizedTitle.includes(' ') && !exactAlias) {
    const uniqueTokenMatch = normalizedTitle.length >= 6
      && aliases.some(name => normTitle(name).split(' ').includes(normalizedTitle));
    score = uniqueTokenMatch ? Math.max(score, 0.6) : Math.min(score, 0.35);
  }
  const itemYear = Number(item.year) || null;
  const year = Number(candidateYear) || null;
  if (itemYear && year) {
    const gap = Math.abs(itemYear - year);
    if (gap === 0) score += 0.2;
    else if (gap === 1) score += 0.05;
    else score -= Math.min(0.45, gap * 0.08);
  }
  return score;
}

/** Bersihkan sinopsis/ringkasan (buang tag HTML, rapikan spasi) lalu potong. */
function shortText(s, n = 160) {
  const t = String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
}

module.exports = { yearOf, normTitle, titleSimilarity, candidateMatchScore, shortText };
