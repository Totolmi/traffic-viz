<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts/core'
import { PieChart, BarChart, LineChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 按需注册：只引入这个页面真正用到的三种图与三个组件，
// 目的是把整包 1.19MB 压下来，而不是无脑 import 整个 echarts。
echarts.use([
  PieChart,
  BarChart,
  LineChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer,
])

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: '320px' },
})

const el = ref(null)
let chart = null

const resize = () => chart && chart.resize()

onMounted(() => {
  chart = echarts.init(el.value)
  chart.setOption(props.option)
  window.addEventListener('resize', resize)
})

watch(
  () => props.option,
  (opt) => chart && chart.setOption(opt, true),
  { deep: true }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart && chart.dispose()
  chart = null
})
</script>

<template>
  <div ref="el" class="echart" :style="{ height }"></div>
</template>

<style scoped>
.echart {
  width: 100%;
}
</style>
