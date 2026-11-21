'use strict';
/* Nontonin — orkestrator render: memuat data lalu menggambar semua
 * bagian halaman. Modul render lain tidak saling mengimpor modul ini
 * lewat jalur melingkar: render-detail.js dan forms.js mengimpor
 * render()/loadActivityOnly() dari sini, tapi file ini tidak mengimpor
 * mereka kembali. */
import { api } from './api.js';
import { state } from './state.js';
import { renderStats, renderTierList, renderContinue, renderChart } from './render-dashboard.js';
import { renderGrid } from './render-items.js';
import { renderReleaseCalendar, loadReleaseCalendar } from './releases.js';

export function render() {
  renderStats(); renderTierList(); renderContinue(); renderGrid(); renderChart(); renderReleaseCalendar();
}

export async function loadActivityOnly() {
  const a = await api('/api/activity'); state.activity = a.activity || [];
}

export async function loadAll() {
  const [itemsRes, actRes] = await Promise.all([api('/api/items'), api('/api/activity')]);
  state.items = itemsRes.items || [];
  state.activity = actRes.activity || [];
  render();
  await loadReleaseCalendar();
}
