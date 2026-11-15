'use strict';
/* Nontonin — state lokal frontend + aturan snapshot auto-fill kandidat.
 * applyCandidate adalah fungsi murni: satu field diganti kandidat baru
 * hanya bila kosong ATAU masih sama dengan nilai auto-isi kandidat
 * sebelumnya. Nilai yang diketik manual tidak pernah ditimpa. Nilai
 * kandidat null/'' membiarkan field (dan snapshot field itu) apa adanya.
 */

export const state = { items: [], activity: [], editingId: null, autoFilled: null, coverUrl: '', coverSource: '' };

export function applyCandidate(current, autoFilled, cand) {
  const fields = ['title', 'genre', 'year', 'totalUnits', 'author'];
  const out = {}; const snap = { ...(autoFilled || {}) };
  for (const f of fields) {
    const v = cand[f];
    if (v === null || v === undefined || v === '') continue;
    const cur = current[f];
    const isEmpty = cur === null || cur === undefined || cur === '';
    if (isEmpty || (autoFilled && String(cur) === String(autoFilled[f]))) {
      out[f] = v; snap[f] = v;
    }
  }
  return { fields: out, autoFilled: snap };
}
