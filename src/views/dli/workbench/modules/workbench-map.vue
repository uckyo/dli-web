<!-- 中心分布地图：固定深色科技风，不随主题切换 -->
<template>
  <DashPanel title="中心分布">
    <template #extra>
      <button type="button" class="map-reset" aria-label="复位地图" @click="resetMap">
        <ArtSvgIcon icon="ri:restart-line" />
      </button>
    </template>
    <div class="relative h-full min-h-[220px]">
      <div class="absolute inset-0">
        <DashChart ref="chartRef" :option="option" />
      </div>
    </div>
  </DashPanel>
</template>

<script setup lang="ts">
  import { echarts } from '@/plugins/echarts'
  import type { EChartsOption } from '@/plugins/echarts'
  import chinaMapJson from '@/mock/json/chinaMap.json'
  import DashPanel from './dash-panel.vue'
  import DashChart from './dash-chart.vue'

  defineOptions({ name: 'WorkbenchMap' })

  const props = defineProps<{
    data: Array<{ name: string; value: number }>
  }>()

  const MAP_NAME = 'dli-dash-china'

  const chartRef = ref<{ reset: () => void } | null>(null)
  const resetMap = () => chartRef.value?.reset()

  let mapRegistered = false
  if (!mapRegistered) {
    echarts.registerMap(MAP_NAME, chinaMapJson as any)
    mapRegistered = true
  }

  /** 中心所在城市的经纬度，用于散点标注 */
  const CITY_POINTS: Record<string, [number, number]> = {
    北京市: [116.405285, 39.904989],
    上海市: [121.472644, 31.231706],
    广东省: [113.280637, 23.125178],
    四川省: [104.065735, 30.659462]
  }

  const option = computed<EChartsOption>(() => {
    const max = Math.max(1, ...props.data.map((item) => item.value))
    const points = props.data
      .filter((item) => CITY_POINTS[item.name])
      .map((item) => ({
        name: item.name.replace(/[省市]$/, ''),
        value: [...CITY_POINTS[item.name], item.value]
      }))

    return {
      backgroundColor: 'transparent',
      animationDuration: 800,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(3, 16, 34, 0.94)',
        borderColor: 'rgba(64, 214, 255, 0.45)',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: '#d9f4ff', fontSize: 12 },
        formatter: (params: unknown) => {
          const item = params as { name?: string; value?: number | number[] }
          const raw = Array.isArray(item.value) ? item.value[2] : item.value
          const count = Number(raw)
          return Number.isFinite(count)
            ? `${item.name ?? ''}<br/>中心数量：${count} 家`
            : `${item.name ?? ''}<br/>暂无中心`
        }
      },
      geo: {
        map: MAP_NAME,
        roam: true,
        scaleLimit: { min: 1, max: 2.5 },
        zoom: 1,
        preserveAspect: true,
        aspectScale: 0.81,
        top: 4,
        bottom: 4,
        left: 6,
        right: 6,
        label: {
          show: true,
          color: 'rgba(150, 214, 244, 0.5)',
          fontSize: 9
        },
        regions: Object.keys(CITY_POINTS).map((name) => ({
          name,
          label: { show: false }
        })),
        itemStyle: {
          areaColor: '#0a2a4c',
          borderColor: 'rgba(64, 199, 255, 0.38)',
          borderWidth: 0.7,
          shadowColor: 'rgba(0, 110, 210, 0.42)',
          shadowBlur: 12
        },
        emphasis: {
          label: { show: true, color: '#ffffff', fontSize: 10 },
          itemStyle: {
            areaColor: '#1f7fc4',
            borderColor: '#8fe8ff',
            borderWidth: 1.2
          }
        }
      },
      series: [
        {
          name: '中心数量',
          type: 'map',
          map: MAP_NAME,
          geoIndex: 0,
          selectedMode: false,
          data: props.data.map((item) => ({
            name: item.name,
            value: item.value,
            itemStyle: {
              areaColor:
                item.value >= max * 0.7 ? '#2b9fe0' : item.value > 0 ? '#1668a8' : '#0a2a4c'
            }
          }))
        },
        {
          name: '中心',
          type: 'scatter',
          coordinateSystem: 'geo',
          zlevel: 2,
          symbolSize: 9,
          label: {
            show: true,
            position: 'right',
            distance: 6,
            color: '#c8f2ff',
            fontSize: 10,
            formatter: '{b}'
          },
          itemStyle: {
            color: '#54f2ff',
            borderColor: '#e8ffff',
            borderWidth: 1,
            shadowBlur: 16,
            shadowColor: '#37d6ff'
          },
          data: points
        }
      ]
    }
  })
</script>

<style scoped lang="scss">
  .map-reset {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    font-size: 14px;
    line-height: 1;
    color: #8fc6e8;
    cursor: pointer;
    background: none;
    border: none;
    transition:
      color 0.2s ease,
      text-shadow 0.2s ease;

    &:hover {
      color: #e8fbff;
      text-shadow: 0 0 10px rgb(55 214 255 / 65%);
    }
  }
</style>
