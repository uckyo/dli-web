<!-- 趋势卡：折线 / 柱状，带空态 -->
<template>
  <div class="art-card p-4">
    <div class="mb-2 flex-cb gap-2">
      <p class="text-sm font-medium text-g-900">{{ title }}</p>
      <slot name="extra" />
    </div>
    <div v-if="isEmpty" class="flex-cc rounded-lg bg-g-100 text-sm text-g-500" :style="{ height }">
      暂无数据
    </div>
    <ArtLineChart
      v-else-if="type === 'line'"
      :height="height"
      :data="lineData"
      :x-axis-data="axisLabels"
      :show-legend="series.length > 1"
      :show-area-color="series.length === 1"
      :colors="colors.length ? colors : undefined"
    />
    <ArtBarChart
      v-else
      :height="height"
      :data="barData"
      :x-axis-data="axisLabels"
      :show-legend="series.length > 1"
      :colors="colors.length ? colors : undefined"
      bar-width="46%"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { formatAxisDate } from '../format'

  defineOptions({ name: 'TrendPanel' })

  interface TrendSeries {
    name: string
    data: number[]
  }

  const props = withDefaults(
    defineProps<{
      title: string
      xAxis: string[]
      series: TrendSeries[]
      type?: 'line' | 'bar'
      height?: string
      colors?: string[]
    }>(),
    {
      type: 'line',
      height: '200px',
      colors: () => []
    }
  )

  const isEmpty = computed(
    () => !props.xAxis.length || props.series.every((item) => item.data.every((value) => !value))
  )

  const axisLabels = computed(() => props.xAxis.map(formatAxisDate))

  const lineData = computed(() =>
    props.series.map((item) => ({
      name: item.name,
      data: item.data,
      showAreaColor: props.series.length === 1
    }))
  )

  const barData = computed(() =>
    props.series.map((item) => ({
      name: item.name,
      data: item.data
    }))
  )
</script>
