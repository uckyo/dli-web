<!-- DLI 工作台数据大屏：固定深色科技风，不随明暗主题变化 -->
<template>
  <div
    ref="screenRef"
    class="art-full-height dash-screen"
    v-loading="loading"
    element-loading-background="rgba(2, 10, 24, 0.65)"
  >
    <div class="dash-grid-bg" aria-hidden="true"></div>

    <!-- 顶部标题栏 -->
    <header class="dash-head shrink-0">
      <div class="flex min-w-0 items-center gap-3">
        <div class="dash-logo">
          <ArtSvgIcon icon="ri:pulse-line" />
        </div>
        <div class="min-w-0">
          <h1 class="dash-main-title">DLI 疾病智能管理平台</h1>
          <p class="dash-main-sub">运营数据大屏 · {{ account?.orgName }}</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-3">
        <span class="dash-role">
          <ArtSvgIcon icon="ri:shield-user-line" />
          {{ account?.roleName }}
        </span>
        <div class="dash-clock">
          <span class="dash-clock-time">{{ clock }}</span>
          <span class="dash-clock-date">{{ dateText }}</span>
        </div>
        <span class="dash-updated">数据更新至 {{ lastUpdate }}</span>
        <button
          v-if="isFullscreenSupported"
          type="button"
          class="dash-fs"
          :title="isFullscreen ? '退出全屏' : '全屏展示大屏'"
          @click="toggleScreenFullscreen()"
        >
          <ArtSvgIcon :icon="isFullscreen ? 'ri:fullscreen-exit-line' : 'ri:fullscreen-line'" />
        </button>
      </div>
    </header>

    <!-- 核心指标 -->
    <div class="dash-kpis shrink-0">
      <div
        v-for="item in kpis"
        :key="item.label"
        class="dash-kpi"
        :style="{ '--kpi-color': item.color }"
      >
        <div class="dash-kpi-head">
          <span class="dash-kpi-icon">
            <ArtSvgIcon :icon="item.icon" />
          </span>
          <span class="dash-kpi-label">{{ item.label }}</span>
        </div>
        <p class="dash-kpi-value">
          <ArtCountTo
            class="dash-kpi-num"
            :target="item.target"
            :decimals="item.decimals"
            :separator="item.separator"
            :duration="1500"
            easing="easeOutQuad"
          /><small>{{ item.unit }}</small>
        </p>
      </div>
    </div>

    <!-- 主体三栏 -->
    <div class="dash-body">
      <!-- 左侧：预警准确率 / 智能预警 / 规模概览 -->
      <div class="dash-col dash-left">
        <DashPanel title="预警准确率">
          <div class="flex h-full flex-col justify-between gap-3">
            <div class="flex flex-1 items-center justify-around gap-2">
              <div v-for="item in accuracyRings" :key="item.label" class="accuracy-ring">
                <div
                  class="accuracy-ring-circle"
                  :style="{
                    background: `conic-gradient(${item.color} ${item.value * 3.6}deg, rgba(64, 199, 255, 0.12) 0deg)`
                  }"
                >
                  <div class="accuracy-ring-inner">
                    <b>{{ item.value.toFixed(1) }}</b
                    ><span>%</span>
                  </div>
                </div>
                <p class="accuracy-ring-label">{{ item.label }}</p>
              </div>
            </div>
            <div class="accuracy-foot">
              <p>
                综合准确率 <b>{{ avgAccuracy.toFixed(1) }}%</b> · 覆盖早筛 / 早诊 / 转归
              </p>
            </div>
          </div>
        </DashPanel>

        <DashPanel title="智能预警" subtitle="数量 / 总数 · 准确率">
          <div class="flex h-full flex-col">
            <div class="flex flex-1 flex-col justify-evenly">
              <div v-for="item in warningRows" :key="item.label">
                <div class="mb-1.5 flex items-baseline justify-between gap-2">
                  <span class="text-[13px] text-[#cfe9ff]">{{ item.label }}</span>
                  <span class="text-[11px] text-[#7fa6c0]">
                    <b class="text-base font-medium text-[#eaf8ff]">{{ item.count }}</b>
                    / {{ item.total }}
                    <em class="ml-2 not-italic" :style="{ color: item.color }">
                      {{ (item.accuracy * 100).toFixed(1) }}%
                    </em>
                  </span>
                </div>
                <div class="dash-bar">
                  <i
                    :style="{
                      width: percent(item.count, item.total),
                      background: `linear-gradient(90deg, ${item.color}55, ${item.color})`
                    }"
                  ></i>
                </div>
              </div>
            </div>
            <div class="warn-foot">
              <span class="text-[11px] text-[#7fa6c0]">预警患者合计</span>
              <span class="text-sm font-medium text-[#eaf8ff]">{{ totalWarnings }} 人</span>
            </div>
          </div>
        </DashPanel>

        <DashPanel title="规模概览">
          <div class="flex h-full flex-col justify-around">
            <div v-for="item in scaleItems" :key="item.label" class="scale-row">
              <span class="scale-icon" :style="{ color: item.color }">
                <ArtSvgIcon :icon="item.icon" />
              </span>
              <span class="flex-1 text-[12px] text-[#9cc7dd]">{{ item.label }}</span>
              <b class="text-lg font-medium text-[#eaf8ff]">{{ formatNum(item.value) }}</b>
              <span class="text-[11px] text-[#6f97b6]">{{ item.unit }}</span>
            </div>
          </div>
        </DashPanel>
      </div>

      <!-- 中间：地图 / 患者状态 + 趋势 -->
      <div class="dash-col dash-center">
        <WorkbenchMap v-if="showMap" :data="mapData" />
        <DashPanel v-else title="患者状态分布">
          <div class="flex h-full items-center gap-2">
            <div class="relative h-full min-h-[130px] flex-1">
              <DashChart :option="statusOption" />
              <div class="pie-center">
                <b>{{ formatNum(stats?.patientTotal) }}</b>
                <span>在管患者</span>
              </div>
            </div>
            <ul class="w-full max-w-[160px] shrink-0 space-y-3 pr-1">
              <li
                v-for="item in statusLegend"
                :key="item.status"
                class="flex items-center justify-between gap-2"
              >
                <span class="flex items-center gap-2 text-[12px] text-[#9cc7dd]">
                  <i
                    class="inline-block size-2 rounded-full"
                    :style="{ background: item.color, boxShadow: `0 0 8px ${item.color}` }"
                  ></i>
                  {{ item.status }}
                </span>
                <b class="text-sm font-medium text-[#eaf8ff]">{{ item.count }}</b>
              </li>
            </ul>
          </div>
        </DashPanel>

        <DashPanel title="近 7 日在管患者与预警趋势">
          <div class="h-full min-h-[130px]">
            <DashChart :option="trendOption" />
          </div>
        </DashPanel>
      </div>

      <!-- 右侧：转归预测 / 预警构成 / 科研影响力 -->
      <div class="dash-col dash-right">
        <DashPanel title="转归预测" subtitle="3/6/12 月">
          <template #extra>
            <span class="dash-panel-extra">已完成 {{ outcomeTotal }} 人</span>
          </template>
          <div class="flex h-full flex-col justify-around gap-2">
            <div v-for="item in outcomeRows" :key="item.window">
              <div class="mb-1.5 flex items-baseline justify-between gap-2">
                <span class="text-[13px] text-[#cfe9ff]">{{ item.window }}</span>
                <span class="text-[11px] text-[#7fa6c0]">
                  <b class="text-base font-medium text-[#eaf8ff]">{{ item.count }}</b>
                  / {{ item.total }}
                  <em class="ml-2 not-italic" :style="{ color: item.color }"
                    >{{ (item.accuracy * 100).toFixed(1) }}%</em
                  >
                </span>
              </div>
              <div class="dash-bar">
                <i
                  :style="{
                    width: percent(item.count, item.total),
                    background: `linear-gradient(90deg, ${item.color}55, ${item.color})`
                  }"
                ></i>
              </div>
            </div>
          </div>
        </DashPanel>

        <DashPanel title="预警构成">
          <div class="flex h-full items-center">
            <div class="relative h-full min-h-[104px] flex-1">
              <DashChart :option="warnPieOption" />
              <div class="pie-center">
                <b>{{ totalWarnings }}</b>
              </div>
            </div>
            <ul class="w-[112px] shrink-0 space-y-4 pr-1">
              <li v-for="item in warningRows" :key="item.label" class="flex items-center gap-2">
                <i
                  class="inline-block size-2.5 rounded-sm"
                  :style="{ background: item.color, boxShadow: `0 0 8px ${item.color}` }"
                ></i>
                <div class="min-w-0">
                  <p class="truncate text-[11px] text-[#7fa6c0]">{{ item.label }}</p>
                  <p class="text-base font-medium leading-5 text-[#eaf8ff]">{{ item.count }}</p>
                </div>
              </li>
            </ul>
          </div>
        </DashPanel>

        <DashPanel title="科研影响力">
          <div class="flex h-full items-center">
            <div class="grid w-full grid-cols-3 gap-1">
              <div class="research-item">
                <p class="research-label">发表文献</p>
                <p class="research-value">
                  {{ formatNum(stats?.publicationCount) }}<span>篇</span>
                </p>
              </div>
              <div class="research-item">
                <p class="research-label">总引用</p>
                <p class="research-value">{{ formatNum(stats?.citations) }}<span>次</span></p>
              </div>
              <div class="research-item">
                <p class="research-label">影响力指数</p>
                <p class="research-value accent">
                  {{ (stats?.influence ?? 0).toFixed(1) }}
                </p>
              </div>
            </div>
          </div>
        </DashPanel>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useFullscreen } from '@vueuse/core'
  import { fetchGetWorkbench } from '@/mock/dli/api'
  import { getAccountByRole } from '@/mock/dli/users'
  import { useUserStore } from '@/store/modules/user'
  import { CENTER_MAP_DATA } from '@/mock/dli/data'
  import { graphic } from '@/plugins/echarts'
  import type { EChartsOption } from '@/plugins/echarts'
  import type { WorkbenchStats, WebRoleCode } from '@/mock/dli/types'
  import DashPanel from './modules/dash-panel.vue'
  import DashChart from './modules/dash-chart.vue'
  import WorkbenchMap from './modules/workbench-map.vue'

  defineOptions({ name: 'DliWorkbench' })

  const userStore = useUserStore()

  /* ---------------- 大屏全屏 ---------------- */
  const screenRef = ref<HTMLElement>()
  const {
    isFullscreen,
    isSupported: isFullscreenSupported,
    toggle: toggleScreenFullscreen
  } = useFullscreen(screenRef)

  const loading = ref(true)
  const stats = ref<WorkbenchStats>()

  /** 当前角色 */
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')

  /** 当前账号信息（角色名 + 所属组织） */
  const account = computed(() => getAccountByRole(role.value))

  const lastUpdate = new Date().toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

  /* ---------------- 实时时钟 ---------------- */
  const now = ref(new Date())
  let clockTimer: number | undefined

  const pad2 = (value: number) => String(value).padStart(2, '0')
  const clock = computed(() => now.value.toLocaleTimeString('zh-CN', { hour12: false }))
  const dateText = computed(() => {
    const date = now.value
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${week}`
  })

  onMounted(() => {
    clockTimer = window.setInterval(() => {
      now.value = new Date()
    }, 1000)
  })

  onBeforeUnmount(() => {
    if (clockTimer) window.clearInterval(clockTimer)
  })

  /* ---------------- 基础数据 ---------------- */
  const formatNum = (value?: number) => (value ?? 0).toLocaleString('zh-CN')

  const percent = (count: number, total: number): string => {
    if (!total) return '0%'
    return `${Math.min(100, (count / total) * 100).toFixed(1)}%`
  }

  const kpis = computed(() => [
    {
      label: '患者数量',
      target: stats.value?.patientTotal ?? 0,
      decimals: 0,
      separator: ',',
      unit: '人',
      icon: 'ri:group-line',
      color: '#37d6ff'
    },
    {
      label: '检查数量',
      target: stats.value?.examTotal ?? 0,
      decimals: 0,
      separator: ',',
      unit: '次',
      icon: 'ri:file-search-line',
      color: '#5b8cff'
    },
    {
      label: '生物样本数量',
      target: stats.value?.sampleTotal ?? 0,
      decimals: 0,
      separator: ',',
      unit: '份',
      icon: 'ri:test-tube-line',
      color: '#2ee6b8'
    },
    {
      label: '检测数据量',
      target: stats.value?.dataVolume ?? 0,
      decimals: 1,
      separator: '',
      unit: 'TB',
      icon: 'ri:database-2-line',
      color: '#ffb347'
    },
    {
      label: '模型数',
      target: stats.value?.modelCount ?? 0,
      decimals: 0,
      separator: ',',
      unit: '个',
      icon: 'ri:cpu-line',
      color: '#a78bfa'
    },
    {
      label: '智能体数',
      target: stats.value?.agentCount ?? 0,
      decimals: 0,
      separator: ',',
      unit: '个',
      icon: 'ri:robot-2-line',
      color: '#4dd6ff'
    },
    {
      label: '研究项目数',
      target: stats.value?.researchCount ?? 0,
      decimals: 0,
      separator: ',',
      unit: '项',
      icon: 'ri:flask-line',
      color: '#f472b6'
    }
  ])

  /* ---------------- 左栏 ---------------- */
  const accuracyRings = computed(() => {
    const s = stats.value
    const outcomes = s?.outcome ?? []
    const outcomeAccuracy = outcomes.length
      ? outcomes.reduce((sum, item) => sum + item.accuracy, 0) / outcomes.length
      : 0
    return [
      { label: '早筛模型', value: (s?.earlyScreen.accuracy ?? 0) * 100, color: '#37d6ff' },
      { label: '早诊模型', value: (s?.earlyDiagnosis.accuracy ?? 0) * 100, color: '#ffb347' },
      { label: '转归模型', value: outcomeAccuracy * 100, color: '#2ee6b8' }
    ]
  })

  const avgAccuracy = computed(() => {
    const list = accuracyRings.value
    return list.length ? list.reduce((sum, item) => sum + item.value, 0) / list.length : 0
  })

  const warningRows = computed(() => [
    {
      label: '早筛预警',
      count: stats.value?.earlyScreen.count ?? 0,
      total: stats.value?.earlyScreen.total ?? 0,
      accuracy: stats.value?.earlyScreen.accuracy ?? 0,
      color: '#ff7a45'
    },
    {
      label: '早诊预警',
      count: stats.value?.earlyDiagnosis.count ?? 0,
      total: stats.value?.earlyDiagnosis.total ?? 0,
      accuracy: stats.value?.earlyDiagnosis.accuracy ?? 0,
      color: '#ffc53d'
    }
  ])

  const totalWarnings = computed(
    () => (stats.value?.earlyScreen.count ?? 0) + (stats.value?.earlyDiagnosis.count ?? 0)
  )

  const showMap = computed(() => role.value === 'R_PLATFORM' || role.value === 'R_SYS')

  const scaleItems = computed(() => {
    const s = stats.value
    const list: Array<{
      label: string
      value: number
      unit: string
      icon: string
      color: string
    }> = []
    if (!s) return list

    if (role.value === 'R_SYS') {
      list.push({
        label: '平台数',
        value: s.platformCount ?? 0,
        unit: '个',
        icon: 'ri:server-line',
        color: '#37d6ff'
      })
    }
    if (role.value === 'R_PLATFORM' || role.value === 'R_SYS') {
      list.push({
        label: '中心数',
        value: s.centerCount ?? 0,
        unit: '家',
        icon: 'ri:building-2-line',
        color: '#5b8cff'
      })
    }
    if (role.value === 'R_CENTER') {
      list.push({
        label: '课题组数',
        value: s.groupCount ?? 0,
        unit: '个',
        icon: 'ri:organization-chart',
        color: '#37d6ff'
      })
    }
    if (['R_PLATFORM', 'R_SYS', 'R_CENTER', 'R_GROUP'].includes(role.value)) {
      list.push({
        label: '医生数',
        value: s.doctorCount ?? 0,
        unit: '人',
        icon: 'ri:stethoscope-line',
        color: '#2ee6b8'
      })
    }

    if (!list.length) {
      list.push(
        {
          label: '在管患者',
          value: s.patientTotal,
          unit: '人',
          icon: 'ri:group-line',
          color: '#37d6ff'
        },
        {
          label: '预警患者',
          value: totalWarnings.value,
          unit: '人',
          icon: 'ri:alarm-warning-line',
          color: '#ffb347'
        },
        {
          label: '样本入库',
          value: s.sampleTotal,
          unit: '份',
          icon: 'ri:test-tube-line',
          color: '#2ee6b8'
        }
      )
    }
    return list
  })

  /* ---------------- 中栏 ---------------- */
  const mapData = computed(() =>
    CENTER_MAP_DATA.map((item) => ({
      ...item,
      value: role.value === 'R_SYS' ? item.value * 3 : item.value
    }))
  )

  const STATUS_COLORS = ['#37d6ff', '#5b8cff', '#2ee6b8', '#ffb347']

  const statusLegend = computed(() =>
    (stats.value?.patientStatus ?? []).map((item, index) => ({
      ...item,
      color: STATUS_COLORS[index % STATUS_COLORS.length]
    }))
  )

  const statusOption = computed<EChartsOption>(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(3, 16, 34, 0.94)',
      borderColor: 'rgba(64, 214, 255, 0.45)',
      textStyle: { color: '#d9f4ff', fontSize: 12 },
      formatter: '{b}：{c} 人（{d}%）'
    },
    series: [
      {
        type: 'pie',
        radius: ['58%', '80%'],
        center: ['50%', '50%'],
        itemStyle: { borderColor: '#061426', borderWidth: 3, borderRadius: 4 },
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scaleSize: 4, label: { show: false } },
        data: statusLegend.value.map((item) => ({
          name: item.status,
          value: item.count,
          itemStyle: { color: item.color }
        }))
      }
    ]
  }))

  const trendOption = computed<EChartsOption>(() => {
    const axis = stats.value?.trend.map((item) => item.date) ?? []
    const patients = stats.value?.trend.map((item) => item.patients) ?? []
    const alerts = stats.value?.trend.map((item) => item.alerts) ?? []

    return {
      backgroundColor: 'transparent',
      grid: { top: 36, right: 34, bottom: 10, left: 42 },
      legend: {
        top: 2,
        right: 0,
        itemWidth: 12,
        itemHeight: 6,
        icon: 'roundRect',
        itemGap: 14,
        textStyle: { color: '#8fb9d2', fontSize: 11 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: 'rgba(64, 214, 255, 0.45)' } },
        backgroundColor: 'rgba(3, 16, 34, 0.94)',
        borderColor: 'rgba(64, 214, 255, 0.45)',
        textStyle: { color: '#d9f4ff', fontSize: 12 }
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: axis,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: 'rgba(64, 199, 255, 0.2)' } },
        axisLabel: { color: '#7fa6c0', fontSize: 11 }
      },
      yAxis: [
        {
          type: 'value',
          splitLine: { lineStyle: { color: 'rgba(64, 199, 255, 0.08)', type: 'dashed' } },
          axisLabel: { color: '#6f97b6', fontSize: 11 }
        },
        {
          type: 'value',
          min: 0,
          max: 60,
          splitLine: { show: false },
          axisLabel: { color: '#6f97b6', fontSize: 11 }
        }
      ],
      series: [
        {
          name: '在管患者',
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.2, color: '#37d6ff', shadowColor: '#37d6ff', shadowBlur: 10 },
          itemStyle: { color: '#37d6ff' },
          areaStyle: {
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(55, 214, 255, 0.32)' },
              { offset: 1, color: 'rgba(55, 214, 255, 0)' }
            ])
          },
          data: patients
        },
        {
          name: '预警数量',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: '#ffb347', type: 'dashed' },
          itemStyle: { color: '#ffb347' },
          data: alerts
        }
      ]
    }
  })

  /* ---------------- 右栏 ---------------- */
  const OUTCOME_COLORS = ['#37d6ff', '#5b8cff', '#2ee6b8']

  const outcomeRows = computed(() =>
    (stats.value?.outcome ?? []).map((item, index) => ({
      ...item,
      color: OUTCOME_COLORS[index % OUTCOME_COLORS.length]
    }))
  )

  const outcomeTotal = computed(() =>
    (stats.value?.outcome ?? []).reduce((sum, item) => sum + item.count, 0)
  )

  const warnPieOption = computed<EChartsOption>(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(3, 16, 34, 0.94)',
      borderColor: 'rgba(64, 214, 255, 0.45)',
      textStyle: { color: '#d9f4ff', fontSize: 12 },
      formatter: '{b}：{c} 人（{d}%）'
    },
    series: [
      {
        type: 'pie',
        radius: ['52%', '74%'],
        center: ['50%', '50%'],
        itemStyle: { borderColor: '#061426', borderWidth: 3, borderRadius: 4 },
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scaleSize: 4, label: { show: false } },
        data: warningRows.value.map((item) => ({
          name: item.label,
          value: item.count,
          itemStyle: { color: item.color }
        }))
      }
    ]
  }))

  /* ---------------- 加载 ---------------- */
  onMounted(async () => {
    try {
      stats.value = await fetchGetWorkbench(role.value as WebRoleCode)
    } finally {
      loading.value = false
    }
  })
</script>

<style scoped lang="scss">
  .dash-screen {
    position: relative;
    gap: 12px;
    padding: 14px 16px 16px;
    overflow: hidden;
    color: #cfe9ff;
    background:
      radial-gradient(1100px 460px at 50% -12%, rgb(0 118 255 / 26%), transparent 62%),
      radial-gradient(900px 480px at 102% 110%, rgb(0 200 255 / 12%), transparent 60%),
      linear-gradient(180deg, #04101f 0%, #030a15 100%);
    border-radius: 12px;
    container-type: inline-size;
  }

  /* 只让大屏本身全屏，保留内部布局与主题 */
  .dash-screen:fullscreen {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 16px 18px 18px;
    border-radius: 0;
  }

  .dash-fs {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    font-size: 15px;
    color: #8fc6e8;
    cursor: pointer;
    background: rgb(10 40 74 / 60%);
    border: 1px solid rgb(56 180 255 / 22%);
    border-radius: 7px;
    transition:
      color 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      color: #e8fbff;
      border-color: rgb(69 219 255 / 60%);
      box-shadow: 0 0 12px rgb(55 214 255 / 35%);
    }
  }

  .dash-grid-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgb(64 199 255 / 5%) 1px, transparent 1px),
      linear-gradient(90deg, rgb(64 199 255 / 5%) 1px, transparent 1px);
    background-size: 42px 42px;
    mask-image: radial-gradient(circle at 50% 30%, #000 20%, transparent 78%);
  }

  .dash-head,
  .dash-kpis,
  .dash-body {
    position: relative;
    z-index: 1;
  }

  /* 顶部 */
  .dash-head {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    padding: 2px 4px 12px;
    border-bottom: 1px solid rgb(56 180 255 / 16%);
  }

  .dash-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    font-size: 20px;
    color: #6ce9ff;
    background: linear-gradient(160deg, rgb(30 120 220 / 35%), rgb(6 26 52 / 60%));
    border: 1px solid rgb(64 199 255 / 42%);
    border-radius: 9px;
    box-shadow:
      0 0 16px rgb(45 180 255 / 35%),
      inset 0 0 12px rgb(64 199 255 / 25%);
  }

  .dash-main-title {
    font-size: 19px;
    font-weight: 600;
    color: #eefaff;
    text-shadow: 0 0 18px rgb(55 214 255 / 45%);
    letter-spacing: 1px;
  }

  .dash-main-sub {
    margin-top: 1px;
    overflow: hidden;
    font-size: 11px;
    color: #7fa6c0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dash-role {
    display: inline-flex;
    gap: 5px;
    align-items: center;
    padding: 4px 10px;
    font-size: 11px;
    color: #9fe8ff;
    background: rgb(10 52 96 / 55%);
    border: 1px solid rgb(64 199 255 / 30%);
    border-radius: 999px;
  }

  .dash-clock {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: 1.2;
  }

  .dash-clock-time {
    font-size: 18px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #eaf8ff;
    text-shadow: 0 0 12px rgb(55 214 255 / 40%);
    letter-spacing: 1px;
  }

  .dash-clock-date {
    font-size: 10px;
    color: #7fa6c0;
  }

  .dash-updated {
    padding-left: 12px;
    font-size: 11px;
    color: #6f97b6;
    border-left: 1px solid rgb(64 199 255 / 15%);
  }

  /* KPI */
  .dash-kpis {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .dash-kpi {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    justify-content: center;
    min-width: 0;
    padding: 12px 14px;
    overflow: hidden;
    background: linear-gradient(160deg, rgb(12 40 76 / 60%), rgb(5 18 38 / 66%));
    border: 1px solid rgb(56 180 255 / 18%);
    border-radius: 8px;
    box-shadow: inset 0 0 18px rgb(0 116 255 / 6%);
  }

  .dash-kpi-head {
    display: flex;
    gap: 7px;
    align-items: center;
    min-width: 0;
  }

  .dash-kpi-icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    font-size: 14px;
    color: var(--kpi-color);
    background: rgb(6 26 52 / 75%);
    border: 1px solid rgb(56 180 255 / 24%);
    border-radius: 6px;
    box-shadow: inset 0 0 12px rgb(0 130 255 / 14%);
  }

  .dash-kpi-label {
    overflow: hidden;
    font-size: 13px;
    color: #8fb9d2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dash-kpi-value {
    margin-top: 4px;
    overflow: hidden;
    font-size: clamp(24px, 2.9cqw, 44px);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1.05;
    color: #eefaff;
    text-overflow: ellipsis;
    text-shadow: 0 0 14px rgb(55 214 255 / 40%);
    white-space: nowrap;

    /* 数字滚动组件自带 text-g-900，这里跟随大屏配色 */
    .dash-kpi-num {
      font: inherit;
      color: inherit;
    }

    small {
      margin-left: 3px;
      font-size: clamp(12px, 1.15cqw, 17px);
      font-weight: 400;
      color: #7fa6c0;
      text-shadow: none;
    }
  }

  /* 主体 */
  .dash-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    padding-bottom: 2px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgb(64 199 255 / 30%) transparent;

    &::-webkit-scrollbar {
      width: 5px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgb(64 199 255 / 28%);
      border-radius: 999px;
    }
  }

  .dash-col {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  }

  /* 左栏 */
  .accuracy-ring {
    display: flex;
    flex-direction: column;
    gap: 7px;
    align-items: center;
  }

  .accuracy-ring-circle {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: clamp(62px, calc(7.3cqw - 12px), 106px);
    height: clamp(62px, calc(7.3cqw - 12px), 106px);
    filter: drop-shadow(0 0 8px rgb(55 214 255 / 25%));
    border-radius: 50%;
  }

  .accuracy-ring-inner {
    position: absolute;
    inset: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #06162b;
    border-radius: 50%;
    box-shadow: inset 0 0 18px rgb(0 130 255 / 22%);

    b {
      font-size: clamp(18px, 2.05cqw, 30px);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      line-height: 1;
      color: #eaf8ff;
    }

    span {
      position: absolute;
      bottom: 14%;
      left: 50%;
      margin: 0;
      font-size: clamp(10px, 0.72cqw, 13px);
      color: #7fa6c0;
      transform: translateX(-50%);
    }
  }

  .accuracy-ring-label {
    font-size: 13px;
    color: #9cc7dd;
  }

  .accuracy-foot {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    margin-bottom: calc(-1 * var(--dash-pad-b, 14px));
    font-size: 11px;
    line-height: 1.4;
    color: #6f97b6;
    text-align: center;
    border-top: 1px solid rgb(64 199 255 / 10%);

    b {
      font-weight: 600;
      color: #9fe8ff;
    }
  }

  .pie-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: center;
    justify-content: center;
    pointer-events: none;

    b {
      font-size: clamp(20px, 1.8vw, 30px);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      line-height: 1;
      color: #eaf8ff;
      text-shadow: 0 0 14px rgb(55 214 255 / 40%);
    }

    span {
      font-size: 11px;
      color: #7fa6c0;
    }
  }

  .warn-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 42px;
    margin-bottom: calc(-1 * var(--dash-pad-b, 14px));
    border-top: 1px solid rgb(64 199 255 / 12%);
  }

  .dash-bar {
    height: 6px;
    overflow: hidden;
    background: rgb(64 199 255 / 10%);
    border-radius: 999px;

    i {
      display: block;
      height: 100%;
      border-radius: 999px;
      box-shadow: 0 0 10px rgb(55 214 255 / 40%);
      transition: width 0.6s ease;
    }
  }

  .scale-row {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 7px 2px;
    border-bottom: 1px dashed rgb(64 199 255 / 12%);

    &:last-child {
      border-bottom: none;
    }
  }

  .scale-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    font-size: 14px;
    background: rgb(6 26 52 / 80%);
    border: 1px solid rgb(56 180 255 / 22%);
    border-radius: 6px;
  }

  /* 右栏 */
  .dash-panel-extra {
    flex-shrink: 0;
    padding: 2px 8px;
    font-size: 10px;
    color: #9fe8ff;
    white-space: nowrap;
    background: rgb(10 52 96 / 50%);
    border: 1px solid rgb(64 199 255 / 24%);
    border-radius: 999px;
  }

  .research-item {
    padding: 4px 2px;
    text-align: center;
    border-right: 1px solid rgb(64 199 255 / 10%);

    &:last-child {
      border-right: none;
    }
  }

  .research-label {
    font-size: 11px;
    color: #7fa6c0;
    white-space: nowrap;
  }

  .research-value {
    margin-top: 3px;
    font-size: 24px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
    color: #eaf8ff;

    span {
      margin-left: 2px;
      font-size: 11px;
      font-weight: 400;
      color: #7fa6c0;
    }

    &.accent {
      font-size: 24px;
      color: #2ee6b8;
      text-shadow: 0 0 12px rgb(46 230 184 / 45%);
    }
  }

  @container (min-width: 560px) {
    .dash-kpis {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @container (min-width: 900px) {
    .dash-kpis {
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 8px;
    }

    .dash-kpi {
      gap: 5px;
      padding: 10px;
    }

    .dash-kpi-head {
      gap: 5px;
    }

    .dash-kpi-icon {
      width: 22px;
      height: 22px;
      font-size: 12px;
      border-radius: 5px;
    }

    .dash-kpi-label {
      font-size: 11px;
    }
  }

  @container (min-width: 1180px) {
    .dash-kpis {
      gap: 10px;
    }

    .dash-kpi {
      gap: 7px;
      padding: 14px;
    }

    .dash-kpi-head {
      gap: 7px;
    }

    .dash-kpi-icon {
      width: 28px;
      height: 28px;
      font-size: 15px;
      border-radius: 7px;
    }

    .dash-kpi-label {
      font-size: 13px;
    }
  }

  @media (width >= 1280px) {
    .dash-body {
      display: grid;
      grid-template-rows: minmax(0, 1fr);
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 2.12fr) minmax(0, 0.92fr);
    }

    .dash-col {
      display: grid;
      min-height: 0;
    }

    .dash-left {
      grid-template-rows:
        minmax(min-content, 1.1fr) minmax(min-content, 1.08fr)
        minmax(min-content, 0.82fr);
    }

    .dash-center {
      grid-template-rows: minmax(min-content, 2.3fr) minmax(min-content, 0.95fr);
    }

    .dash-right {
      grid-template-rows:
        minmax(min-content, 1.35fr) minmax(min-content, 0.95fr)
        minmax(min-content, 0.8fr);
    }
  }

  @media (height <= 880px) {
    .dash-screen {
      gap: 10px;
      padding: 12px 14px 14px;
    }

    .dash-head {
      padding-bottom: 8px;
    }

    .dash-kpi {
      gap: 4px;
      padding: 8px 10px;
    }

    .dash-kpi-icon {
      width: 20px;
      height: 20px;
      font-size: 12px;
      border-radius: 5px;
    }

    .dash-kpi-label {
      font-size: 11px;
    }

    .dash-kpi-value {
      margin-top: 2px;
      font-size: 25px;
      line-height: 1.05;
    }

    .accuracy-ring {
      gap: 4px;
    }

    .accuracy-ring-circle {
      width: clamp(58px, 5vw, 88px);
      height: clamp(58px, 5vw, 88px);
    }

    .accuracy-ring-inner {
      inset: 7px;
    }

    .accuracy-ring-inner b {
      font-size: 20px;
    }

    .accuracy-ring-label {
      font-size: 12px;
    }

    .pie-center b {
      font-size: 22px;
    }

    .accuracy-foot {
      min-height: 38px;
      font-size: 10px;
    }

    .warn-foot {
      min-height: 38px;
    }

    .dash-col {
      gap: 10px;
    }

    .scale-row {
      padding: 2px;
    }

    .scale-icon {
      width: 22px;
      height: 22px;
      font-size: 13px;
    }

    .scale-row b {
      font-size: 16px;
    }

    .research-value {
      font-size: 18px;

      &.accent {
        font-size: 18px;
      }
    }
  }

  @media (height <= 780px) {
    .dash-screen {
      gap: 8px;
      padding: 10px 12px 12px;
    }

    .accuracy-foot {
      display: none;
    }

    .dash-col {
      gap: 10px;
    }

    .scale-row {
      padding: 2px;
    }
  }

  @media (width <= 639px) {
    .dash-screen {
      height: auto;
      overflow: visible;
    }

    .dash-updated {
      display: none;
    }
  }
</style>
