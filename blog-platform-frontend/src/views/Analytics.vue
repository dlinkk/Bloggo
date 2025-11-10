<template>
  <section class="ui-card p-3 p-md-4">
    <h4 class="section-title">Thống kê</h4>
    <div v-if="!blog || loading" class="muted">Đang tải dữ liệu…</div>
    <div v-else>
      <div class="filters d-flex gap-2 mb-3">
        <button class="btn btn-light" :class="{active: rangeDays===7}" @click="setRange(7)">7 ngày</button>
        <button class="btn btn-light" :class="{active: rangeDays===30}" @click="setRange(30)">30 ngày</button>
        <button class="btn btn-light" :class="{active: rangeDays===90}" @click="setRange(90)">90 ngày</button>
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

      <div class="split mt-3">
        <div class="split-item">
          <h6 class="mb-2">Top bài viết (theo lượt xem)</h6>
          <ul class="list-unstyled small">
            <li v-for="p in topPosts" :key="p.postId">{{ p.title }} — {{ p.views }}</li>
            <li v-if="topPosts.length===0" class="muted">Chưa có dữ liệu.</li>
          </ul>
        </div>
        <div class="split-item">
          <h6 class="mb-2">Nguồn truy cập</h6>
          <apexchart type="donut" height="240" :options="refOpts" :series="refSeries" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { getAnalyticsSummary, getAnalyticsSeries, getTopPosts, getReferrers } from '../services/api';

const props = defineProps({ blog: Object });
const rangeDays = ref(7);
const loading = ref(false);
const totals = ref({ views: 0, uniqueVisitors: 0, comments: 0, likes: 0 });
const viewsSeries = ref([{ name: 'Views', data: [] }]);
const viewsOpts = ref({
  chart: { id: 'views', toolbar: { show: false } },
  xaxis: { categories: [] },
  stroke: { curve: 'smooth' },
});
const topPosts = ref([]);
const refSeries = ref([]);
const refOpts = ref({
  labels: [], legend: { show: true }
});

function formatDateKey(d) { return d.toISOString().slice(0,10); }
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
    const [sum, series, tops, refs] = await Promise.all([
      getAnalyticsSummary(props.blog.id, from, to),
      getAnalyticsSeries(props.blog.id, 'views', from, to),
      getTopPosts(props.blog.id, 10, from, to),
      getReferrers(props.blog.id, from, to),
    ]);
    totals.value = sum.totals || { views:0, uniqueVisitors:0, comments:0, likes:0 };
    viewsOpts.value.xaxis.categories = (series.series || []).map(p => p.date);
    viewsSeries.value = [{ name: 'Views', data: (series.series || []).map(p => p.value) }];
    topPosts.value = tops || [];
    refOpts.value.labels = (refs || []).map(r => r.host);
    refSeries.value = (refs || []).map(r => r.count);
  } catch (e) {
    console.error('Load analytics failed', e);
  } finally {
    loading.value = false;
  }
}

function setRange(days){ rangeDays.value = days; load(); }

watch(() => props.blog?.id, () => load());
onMounted(() => load());

// register component locally for `<apexchart>`
const apexchart = VueApexCharts;
</script>

<style scoped>
.filters .btn.active { border: 1px solid #6c5ce7; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
.kpi { background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 12px; }
.kpi-label { font-size: 12px; color: #6b7280; }
.kpi-value { font-weight: 700; font-size: 20px; }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.muted { color: #6b7280; }
</style>

