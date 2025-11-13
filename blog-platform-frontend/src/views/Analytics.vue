<template>
  <section class="ui-card p-3 p-md-4">
    <h4 class="section-title">Thống kê</h4>
    <div v-if="!blog || loading" class="muted">Đang tải dữ liệu…</div>
    <div v-else>
      <div class="filters d-flex gap-2 mb-3">
        <button type="button" class="ui-btn filter-btn" :class="{active: rangeDays===7}" @click="setRange(7)">7 ngày</button>
        <button type="button" class="ui-btn filter-btn" :class="{active: rangeDays===30}" @click="setRange(30)">30 ngày</button>
        <button type="button" class="ui-btn filter-btn" :class="{active: rangeDays===90}" @click="setRange(90)">90 ngày</button>
      </div>

      <div class="kpi-grid">
        <div class="kpi">
          <div class="kpi-label">Lượt xem</div>
          <div class="kpi-value">{{ totals.views }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Người truy cập</div>
          <div class="kpi-value">{{ totals.uniqueVisitors }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Bình luận</div>
          <div class="kpi-value">{{ totals.comments }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Lượt thích</div>
          <div class="kpi-value">{{ totals.likes }}</div>
        </div>
      </div>

      <div class="charts mt-3">
        <apexchart type="line" height="240" :options="viewsOpts" :series="viewsSeries" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { getAnalyticsSummary, getAnalyticsSeries } from '../services/api';

function getCssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  } catch (_) {
    return fallback;
  }
}

function hexToRgb(hex) {
  if (!hex) return null;
  const cleaned = hex.replace('#', '').trim();
  const normalized = cleaned.length === 3
    ? cleaned.split('').map((c) => c + c).join('')
    : cleaned.length === 6
      ? cleaned
      : null;
  if (!normalized) return null;
  const num = Number.parseInt(normalized, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r, g, b) {
  const toHex = (v) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function darkenHex(hex, amount = 0.2) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = 1 - Math.min(Math.max(amount, 0), 1);
  const r = Math.max(0, Math.round(rgb.r * factor));
  const g = Math.max(0, Math.round(rgb.g * factor));
  const b = Math.max(0, Math.round(rgb.b * factor));
  return rgbToHex(r, g, b);
}

function rgbaFromHex(hex, alpha = 1) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const a = Math.min(Math.max(alpha, 0), 1);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

function buildThemePalette() {
  const base = getCssVar('--brand-700', '#8b5cf6');
  const stroke = darkenHex(base, 0.25);
  const fillTop = rgbaFromHex(base, 0.75);
  const fillBottom = rgbaFromHex(base, 0.22);
  const grid = rgbaFromHex(stroke, 0.16);
  const axis = rgbaFromHex(stroke, 0.45);
  return { base, stroke, fillTop, fillBottom, grid, axis };
}

function createViewsOptions() {
  const palette = buildThemePalette();
  return {
    chart: {
      id: 'views',
      toolbar: { show: false },
      foreColor: '#475569',
      dropShadow: {
        enabled: true,
        top: 10,
        left: 0,
        blur: 14,
        color: rgbaFromHex(palette.stroke, 0.45),
        opacity: 0.32,
      },
    },
    xaxis: {
      categories: [],
      labels: { style: { colors: '#1f2937', fontWeight: 600 } },
      axisBorder: { color: palette.axis },
      axisTicks: { color: palette.axis },
    },
    yaxis: {
      labels: {
        style: { colors: '#475569', fontWeight: 600 },
        formatter: (val) => {
          const num = Number(val);
          if (Number.isNaN(num)) return val;
          return Math.round(num);
        },
      },
    },
    colors: [palette.stroke],
    stroke: { curve: 'smooth', width: 4, lineCap: 'round' },
    fill: {
      type: 'gradient',
      gradient: {
        type: 'vertical',
        shadeIntensity: 0.95,
        colorStops: [
          [
            { offset: 0, color: palette.fillTop, opacity: 1 },
            { offset: 100, color: palette.fillBottom, opacity: 1 },
          ],
        ],
      },
    },
    markers: {
      size: 8,
      colors: ['#ffffff'],
      strokeWidth: 3.5,
      strokeColors: palette.stroke,
      hover: { sizeOffset: 2 },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: palette.grid,
      strokeDashArray: 5,
    },
  };
}

const props = defineProps({ blog: Object });
const rangeDays = ref(7);
const loading = ref(false);
const totals = ref({ views: 0, uniqueVisitors: 0, comments: 0, likes: 0 });
const viewsSeries = ref([{ name: 'Views', data: [] }]);
const viewsOpts = ref(createViewsOptions());
function formatDateKey(d) { return d.toISOString().slice(0,10); }

// Convert server date keys (YYYYMMDD or YYYY-MM-DD) to display format dd/mm/yy
function formatDisplayDate(key) {
  if (!key) return '';
  // YYYYMMDD
  const compact = /^\d{8}$/.test(key);
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(key);
  let yyyy, mm, dd;
  if (compact) {
    yyyy = key.slice(0,4);
    mm = key.slice(4,6);
    dd = key.slice(6,8);
  } else if (iso) {
    [yyyy, mm, dd] = key.split('-');
  } else {
    // try Date parse as fallback
    const d = new Date(key);
    if (isNaN(d)) return key;
    yyyy = d.getFullYear().toString();
    mm = String(d.getMonth()+1).padStart(2,'0');
    dd = String(d.getDate()).padStart(2,'0');
  }
  const yy = yyyy.slice(2);
  return `${dd}/${mm}/${yy}`;
}
function calcRange(days){
  const to = new Date();
  const from = new Date(to.getTime() - (days-1)*24*60*60*1000);
  return { from: formatDateKey(from), to: formatDateKey(to) };
}

async function load(){
  if (!props.blog) return;
  loading.value = true;
  try {
    const { from, to } = calcRange(rangeDays.value);
    const [sum, series] = await Promise.all([
      getAnalyticsSummary(props.blog.id, from, to),
      getAnalyticsSeries(props.blog.id, 'views', from, to),
    ]);
    totals.value = sum.totals || { views:0, uniqueVisitors:0, comments:0, likes:0 };
  viewsOpts.value.xaxis.categories = (series.series || []).map(p => formatDisplayDate(p.date));
    viewsSeries.value = [{ name: 'Views', data: (series.series || []).map(p => p.value) }];
  } catch (e) {
    console.error('Load analytics failed', e);
  } finally {
    loading.value = false;
  }
}

function setRange(days){ rangeDays.value = days; load(); }

watch(() => props.blog?.id, () => load());
onMounted(() => {
  viewsOpts.value = createViewsOptions();
  load();
});

// register component locally for `<apexchart>`
const apexchart = VueApexCharts;
</script>

<style scoped>
.filters { flex-wrap: wrap; gap: 10px !important; }
.filter-btn {
  border-radius: 999px;
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: linear-gradient(180deg, var(--brand), color-mix(in srgb, var(--brand) 85%, black 8%));
  color: #fff;
  box-shadow: 0 8px 24px -14px rgba(99, 102, 241, 0.35);
  transition: transform 0.12s ease, box-shadow 0.18s ease, filter 0.25s ease, opacity 0.2s ease;
}
.filter-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 34px -18px rgba(99, 102, 241, 0.45);
  filter: brightness(1.03);
}
.filter-btn:active {
  transform: translateY(0);
  filter: brightness(0.97);
}
.filter-btn:not(.active) {
  opacity: 0.64;
}
.filter-btn.active {
  background: linear-gradient(180deg, var(--brand-600), var(--brand-700));
  box-shadow: 0 20px 42px -18px rgba(99, 102, 241, 0.52);
  opacity: 1;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 16px;
}
.kpi {
  position: relative;
  padding: 18px 20px;
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(196, 181, 253, 0.55), rgba(167, 139, 250, 0.85));
  border: 1px solid rgba(167, 139, 250, 0.45);
  box-shadow: 0 24px 44px -32px rgba(99, 102, 241, 0.55);
  overflow: hidden;
}
.kpi::after {
  content: "";
  position: absolute;
  top: -48px;
  right: -36px;
  width: 140px;
  height: 140px;
  background: rgba(255, 255, 255, 0.24);
  border-radius: 50%;
  filter: blur(0.5px);
}
.kpi-label {
  font-size: 12.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 6px;
}
.kpi-value {
  font-weight: 800;
  font-size: 28px;
  color: #ffffff;
}

.charts {
  background: var(--card);
  border: 1px solid rgba(167, 139, 250, 0.18);
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: 0 16px 40px -32px rgba(99, 102, 241, 0.35);
}

.muted { color: #6b7280; }
</style>

