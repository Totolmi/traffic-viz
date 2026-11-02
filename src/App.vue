<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import FigureCard from './components/FigureCard.vue'
import EChart from './components/EChart.vue'
import { countBy, hourHistogram } from './utils/aggregate.js'

const stats = [
  { label: '原始记录', value: '20,000' },
  { label: '有效记录', value: '19,778' },
  { label: '用户数',   value: '202' },
  { label: '出行点占比', value: '27.6%' },
]

const sections = [
  {
    id: 'clean',
    title: '一、数据清洗',
    note: '20,000 行原始记录，剔除 17 条经纬度空值与 205 条低频用户记录，得到 19,778 条有效记录，覆盖 202 位用户。',
    items: [
      { src: '/figures/fig_hour_distribution.png', title: '24 小时记录分布', desc: '清洗后数据在各小时的记录量变化。' },
      { src: '/figures/fig_user_summary.png',      title: '用户维度概览',   desc: '单用户统计汇总。' },
    ],
  },
  {
    id: 'judge',
    title: '二、出行判定',
    note: '速度阈值粗筛 → 逐用户 KMeans 聚类 → 距离与时长规则精判，三步定下每个点属于出行还是驻留。',
    items: [
      { src: '/figures/fig_speed_distribution.png', title: '移动速度分布',   desc: '阶段1 的判定依据：含大量静止记录，速度中位数为 0。' },
      { src: '/figures/fig_sse_curve.png',          title: 'KMeans 肘部曲线', desc: '阶段2 的选参依据：200 位用户各自的 K–SSE 曲线。' },
      { src: '/figures/fig_stage3_pie.png',         title: '驻留 / 出行占比', desc: '阶段3 结果：驻留 10,697 点，出行 9,081 点。' },
    ],
  },
  {
    id: 'result',
    title: '三、结果分析',
    note: '在判定结果之上做业务侧统计：去哪、怎么去、什么时候人多。',
    items: [
      { src: '/figures/fig_purpose_bar.png',      title: '出行目的分布',   desc: '居住 7,026、购物 2,990、旅游 294（分母为匹配上 POI 的 10,310 个驻留点）。' },
      { src: '/figures/fig_mode_bar.png',         title: '出行方式分布',   desc: '公交 6,668、其他 1,640、地铁 773。' },
      { src: '/figures/fig_heatmap_by_hour.png',  title: '分时人流热力图', desc: '按小时切分的网格热度。' },
      { src: '/figures/fig_flow_all.png',         title: '全时段人流分布', desc: '不区分小时的汇总热度。' },
    ],
  },
]

/* ---------------- 前端实时渲染 ---------------- */
const modeOption = ref(null)
const purposeOption = ref(null)
const hourOption = ref(null)
const hourValid = ref(0)
const loading = ref(true)
const error = ref('')

/* 返回顶部：滚动过一屏再浮出来，避免一进页面就挡住内容 */
const showTop = ref(false)
const onScroll = () => {
  showTop.value = window.scrollY > 400
}
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const baseAxis = {
  axisLine: { lineStyle: { color: '#e3e6ea' } },
  axisLabel: { color: '#6b7280', fontSize: 12 },
  axisTick: { show: false },
}

onMounted(async () => {
  try {
    const [modes, purposes] = await Promise.all([
      fetch('/data/mode_result.json').then((r) => r.json()),
      fetch('/data/purpose_result.json').then((r) => r.json()),
    ])

    // 1. 出行方式：环形图
    modeOption.value = {
      tooltip: { trigger: 'item', formatter: '{b}<br/>{c} 次（{d}%）' },
      legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 12, color: '#6b7280' } },
      series: [
        {
          type: 'pie',
          radius: ['44%', '68%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: '#fff', borderWidth: 2 },
          label: { formatter: '{b} {c}', fontSize: 12, color: '#374151' },
          data: countBy(modes, 'mode'),
        },
      ],
    }

    // 2. 出行目的：柱状图
    const purposeData = countBy(purposes, 'purpose')
    purposeOption.value = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 60, right: 24, top: 28, bottom: 34 },
      xAxis: { type: 'category', data: purposeData.map((d) => d.name), ...baseAxis },
      yAxis: {
        type: 'value',
        axisLabel: baseAxis.axisLabel,
        splitLine: { lineStyle: { color: '#eef1f4' } },
      },
      series: [
        {
          type: 'bar',
          barWidth: '46%',
          data: purposeData.map((d) => d.value),
          itemStyle: { color: '#4c7dff', borderRadius: [6, 6, 0, 0] },
          label: { show: true, position: 'top', fontSize: 12, color: '#6b7280' },
        },
      ],
    }

    // 3. 24 小时出行量：从 14 位时间戳切小时位
    const hist = hourHistogram(modes, 'time')
    hourValid.value = hist.valid
    hourOption.value = {
      tooltip: { trigger: 'axis', formatter: '{b}<br/>{c} 次' },
      grid: { left: 60, right: 24, top: 28, bottom: 34 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: hist.points.map((p) => p.hour + '时'),
        ...baseAxis,
        axisLabel: { ...baseAxis.axisLabel, interval: 2 },
      },
      yAxis: {
        type: 'value',
        axisLabel: baseAxis.axisLabel,
        splitLine: { lineStyle: { color: '#eef1f4' } },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          data: hist.points.map((p) => p.count),
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(245, 158, 11, 0.28)' },
                { offset: 1, color: 'rgba(245, 158, 11, 0.02)' },
              ],
            },
          },
        },
      ],
    }
  } catch (e) {
    error.value = '数据加载失败：' + (e && e.message ? e.message : e)
    console.error(e)
  } finally {
    loading.value = false
  }

  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="page">
    <header class="hero">
      <h1>交通时空大数据分析与可视化</h1>
      <p>沈阳市 · 抽样 20,000 行 · 202 位用户 · 19,778 条有效记录</p>

      <nav class="nav">
        <a v-for="s in sections" :key="s.id" :href="'#' + s.id">{{ s.title }}</a>
        <a href="#live">四、前端实时渲染</a>
      </nav>

      <ul class="stats">
        <li v-for="st in stats" :key="st.label">
          <strong>{{ st.value }}</strong>
          <span>{{ st.label }}</span>
        </li>
      </ul>
    </header>

    <section v-for="s in sections" :key="s.id" :id="s.id" class="block">
      <h2>{{ s.title }}</h2>
      <p class="note">{{ s.note }}</p>
      <div class="grid">
        <FigureCard v-for="f in s.items" :key="f.src" v-bind="f" />
      </div>
    </section>

    <section id="live" class="block">
      <h2>四、前端实时渲染</h2>
      <p class="note">
        上面三块展示的是分析阶段导出的 PNG。下面这三张不读图——浏览器直接 fetch <code>public/data</code>
        下的结构化结果（出行 9,081 条、驻留 10,310 条），在组件内完成字段聚合，再交给 ECharts 绘制。
      </p>

      <p v-if="loading" class="tip">正在加载数据…</p>
      <p v-else-if="error" class="tip tip-error">{{ error }}</p>

      <div v-else class="grid">
        <div class="chart-card">
          <div class="chart-head">
            <h3>出行方式分布</h3>
            <span>9,081 条出行记录 · mode 字段</span>
          </div>
          <EChart v-if="modeOption" :option="modeOption" height="300px" />
        </div>

        <div class="chart-card">
          <div class="chart-head">
            <h3>出行目的分布</h3>
            <span>10,310 条驻留记录 · purpose 字段</span>
          </div>
          <EChart v-if="purposeOption" :option="purposeOption" height="300px" />
        </div>

        <div class="chart-card chart-wide">
          <div class="chart-head">
            <h3>24 小时出行量</h3>
            <span>从 time 时间戳切小时位统计 · 有效 {{ hourValid.toLocaleString() }} 条</span>
          </div>
          <EChart v-if="hourOption" :option="hourOption" height="300px" />
        </div>
      </div>
    </section>

    <Transition name="fade">
      <button
        v-show="showTop"
        class="to-top"
        type="button"
        aria-label="返回顶部"
        title="返回顶部"
        @click="scrollToTop"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M12 19V5M12 5l-6 6M12 5l6 6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.page { max-width: 1280px; margin: 0 auto; padding: 32px 20px 64px; }

.hero { margin-bottom: 36px; }
.hero h1 { margin: 0 0 8px; font-size: 26px; }
.hero p { margin: 0 0 18px; font-size: 14px; color: #6b7280; }

.nav { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 22px; }
.nav a {
  font-size: 13px; text-decoration: none; color: #1f2328;
  padding: 6px 12px; border: 1px solid #d9dee4; border-radius: 999px;
  background: #fff;
}
.nav a:hover { border-color: #9aa4b0; }

.stats {
  display: flex; flex-wrap: wrap; gap: 28px;
  margin: 0; padding: 18px 20px; list-style: none;
  background: #fff; border: 1px solid #e3e6ea; border-radius: 10px;
  box-shadow: 0 0 3px;
}
.stats li { display: flex; flex-direction: column; gap: 4px; }
.stats strong { font-size: 20px; }
.stats span { font-size: 12px; color: #6b7280; }

.block { margin-top: 44px; scroll-margin-top: 20px; }
.block h2 { margin: 0 0 8px; font-size: 19px; }
.note {
  margin: 0 0 20px; font-size: 13px; line-height: 1.7; color: #6b7280;
  padding-left: 12px; border-left: 3px solid #d9dee4;
}
.note code {
  padding: 1px 5px; border-radius: 4px; background: #f3f4f6;
  font-size: 12px; color: #374151;
}

.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 24px; }
@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }

.chart-card {
  background: #fff; border: 1px solid #e3e6ea; border-radius: 10px;
  padding: 14px 16px 10px; box-shadow: 0 0 5px;
}
.chart-wide { grid-column: 1 / -1; }
.chart-head {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px;
  margin-bottom: 6px;
}
.chart-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
.chart-head span { font-size: 12px; color: #9aa4b0; }

.tip { margin: 0; font-size: 13px; color: #6b7280; }
.tip-error { color: #dc2626; }

/* 返回顶部：固定钉在右下角，滚过一屏才浮出来 */
.to-top {
  position: fixed;
  right: 28px;
  bottom: 32px;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid #e3e6ea;
  border-radius: 50%;
  background: #fff;
  color: #374151;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.to-top:hover {
  transform: translateY(-2px);
  border-color: #9aa4b0;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.14);
}
.to-top:active {
  transform: translateY(0);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 900px) {
  .to-top {
    right: 16px;
    bottom: 20px;
    width: 40px;
    height: 40px;
  }
}
</style>
