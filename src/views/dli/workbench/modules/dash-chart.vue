<!-- 大屏图表容器：直接使用固定配色的 ECharts 配置，不读取主题 -->
<template>
  <div ref="chartRef" class="dash-chart"></div>
</template>

<script setup lang="ts">
  import { echarts } from '@/plugins/echarts'
  import type { EChartsOption } from '@/plugins/echarts'

  defineOptions({ name: 'DashChart' })

  const props = defineProps<{
    option: EChartsOption
  }>()

  const chartRef = ref<HTMLElement | null>(null)

  let chart: echarts.ECharts | null = null
  let observer: ResizeObserver | null = null

  /** 容器尺寸就绪后再初始化，避免 ECharts 拿到 0 宽高 */
  const ensureChart = () => {
    const el = chartRef.value
    if (!el || chart) return
    if (!el.clientWidth || !el.clientHeight) return
    chart = echarts.init(el)
    chart.setOption(props.option)
  }

  onMounted(() => {
    const el = chartRef.value
    if (!el) return
    ensureChart()
    observer = new ResizeObserver(() => {
      ensureChart()
      chart?.resize()
    })
    observer.observe(el)
  })

  watch(
    () => props.option,
    (option) => {
      ensureChart()
      chart?.setOption(option, true)
    },
    { deep: true }
  )

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
    chart?.dispose()
    chart = null
  })
</script>

<style scoped lang="scss">
  /* ECharts 会写入固定像素尺寸，改为绝对定位避免撑大面板；只作用于图表根节点，避免影响 tooltip */
  .dash-chart {
    position: relative;
    width: 100%;
    min-width: 0;
    height: 100%;
    min-height: 0;
    overflow: hidden;

    :deep(> div:first-child) {
      position: absolute;
      inset: 0;
      width: 100% !important;
      height: 100% !important;
    }
  }
</style>
