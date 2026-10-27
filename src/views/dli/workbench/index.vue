<!-- DLI 工作台：占满可用高度，核心指标 / 智能预警 / 中心地图 / 趋势 / 智能资产 -->
<template>
  <div class="art-full-height gap-4 overflow-y-auto xl:overflow-hidden" v-loading="loading">
    <!-- 欢迎区 -->
    <div class="art-card shrink-0 px-5 py-3.5">
      <div class="flex-cb flex-wrap gap-3">
        <div>
          <h3 class="text-xl font-medium text-g-900">{{ account?.roleName }}工作台</h3>
        </div>
        <div class="flex-c gap-2 text-sm text-g-600">
          <ArtSvgIcon icon="ri:shield-check-line" class="text-base text-primary" />
          <span>数据更新至 {{ lastUpdate }}</span>
        </div>
      </div>
    </div>

    <!-- 核心指标 + 角色规模指标 -->
    <div class="grid shrink-0 grid-cols-2 gap-4" :class="statsGridClass">
      <ArtStatsCard
        title="患者数量"
        :count="stats?.patientTotal ?? 0"
        :description="patientScopeText"
        icon="ri:group-line"
        icon-style="bg-primary"
      />
      <ArtStatsCard
        title="检查数量"
        :count="stats?.examTotal ?? 0"
        description="影像 / 病理 / 检验 / 病历"
        icon="ri:file-search-line"
        icon-style="bg-primary"
      />
      <ArtStatsCard
        title="生物样本数量"
        :count="stats?.sampleTotal ?? 0"
        description="已入库样本总数"
        icon="ri:test-tube-line"
        icon-style="bg-success"
      />
      <ArtStatsCard
        title="检测数据量"
        :count="stats?.dataVolume ?? 0"
        :decimals="1"
        description="多模态数据存储（TB）"
        icon="ri:database-2-line"
        icon-style="bg-warning"
      />
      <ArtStatsCard
        v-for="item in extraCards"
        :key="item.label"
        :title="item.label"
        :count="item.value"
        :description="item.desc"
        :icon="item.icon"
        :icon-style="item.iconStyle"
      />
    </div>

    <!-- 中间区：智能预警 / 中心地图 / 趋势 -->
    <div
      class="grid min-h-0 gap-4 xl:flex-1"
      :class="
        showMap ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)]' : 'xl:grid-cols-2'
      "
    >
      <!-- 智能预警 -->
      <div class="art-card flex flex-col p-5 xl:min-h-0">
        <div class="art-card-header shrink-0 !pr-0">
          <div class="title">
            <h4>智能预警</h4>
            <p>数量 / 总数 · 模型准确率</p>
          </div>
        </div>
        <div class="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div v-for="item in warnings" :key="item.key">
            <div class="flex-cb text-sm">
              <span class="text-g-800">{{ item.label }}</span>
              <span class="text-g-500">
                <b class="text-base text-g-900">{{ item.count }}</b> / {{ item.total }}
              </span>
            </div>
            <div class="mt-2 h-2 overflow-hidden rounded-full bg-g-200">
              <div
                class="h-full rounded-full"
                :class="item.barClass"
                :style="{ width: item.width }"
              ></div>
            </div>
            <p class="mt-1 text-xs text-g-500">准确率 {{ (item.accuracy * 100).toFixed(1) }}%</p>
          </div>

          <div class="border-t border-full-d pt-3">
            <p class="text-xs text-g-500">转归预测（分窗口）</p>
            <div v-for="item in stats?.outcome ?? []" :key="item.window" class="mt-2">
              <div class="flex-cb text-sm">
                <span class="text-g-700">{{ item.window }}</span>
                <span class="text-g-500"
                  >{{ item.count }} / {{ item.total }} ·
                  {{ (item.accuracy * 100).toFixed(0) }}%</span
                >
              </div>
              <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-g-200">
                <div
                  class="h-full rounded-full bg-theme"
                  :style="{ width: percent(item.count, item.total) }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中心分布：地图居中，高度随页面伸缩 -->
      <div v-if="showMap" class="art-card relative flex flex-col p-5 xl:min-h-0">
        <div class="art-card-header shrink-0 !pr-0">
          <div class="title">
            <h4>中心分布</h4>
            <p>全国多中心试点分布 · 共 {{ centerTotal }} 家中心</p>
          </div>
        </div>
        <div class="relative mt-3 h-[420px] xl:h-auto xl:min-h-0 xl:flex-1">
          <ArtMapChart height="100%" :mapData="mapData" :showLabels="true" />
          <!-- 规模指标叠加在地图上 -->
          <div class="pointer-events-none absolute left-2 top-2 z-10 flex flex-wrap gap-2">
            <div
              v-for="item in mapStats"
              :key="item.label"
              class="flex-c gap-2 rounded-lg border border-full-d bg-white/90 px-3 py-2 shadow-sm backdrop-blur dark:bg-g-800/90"
            >
              <ArtSvgIcon :icon="item.icon" class="text-base" :class="item.color" />
              <div>
                <p class="text-xs leading-4 text-g-500">{{ item.label }}</p>
                <p class="text-lg font-medium leading-6 text-g-900">{{ item.value }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 趋势 -->
      <div class="art-card flex flex-col p-5 xl:min-h-0">
        <div class="art-card-header shrink-0 !pr-0">
          <div class="title">
            <h4>近 7 日在管患者与预警趋势</h4>
            <p>患者入组持续增长 · 预警数量保持在低位</p>
          </div>
        </div>
        <div class="mt-3 h-[320px] xl:h-auto xl:min-h-0 xl:flex-1">
          <ArtLineChart
            height="100%"
            :data="trendSeries"
            :xAxisData="trendAxis"
            :showLegend="true"
            :showAxisLine="false"
          />
        </div>
      </div>
    </div>

    <!-- 智能资产 -->
    <div class="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-5">
      <div class="art-card flex-c gap-3 px-5 py-4">
        <div class="size-10 flex-cc rounded-lg text-lg bg-primary/10 text-primary">
          <ArtSvgIcon icon="ri:cpu-line" />
        </div>
        <div>
          <p class="text-sm text-g-500">模型数</p>
          <p class="text-xl font-medium text-g-900">{{ stats?.modelCount ?? 0 }}</p>
        </div>
      </div>
      <div class="art-card flex-c gap-3 px-5 py-4">
        <div class="size-10 flex-cc rounded-lg text-lg bg-theme/10 text-theme">
          <ArtSvgIcon icon="ri:robot-2-line" />
        </div>
        <div>
          <p class="text-sm text-g-500">智能体数</p>
          <p class="text-xl font-medium text-g-900">{{ stats?.agentCount ?? 0 }}</p>
        </div>
      </div>
      <div class="art-card flex-c gap-3 px-5 py-4">
        <div class="size-10 flex-cc rounded-lg text-lg bg-success/10 text-success">
          <ArtSvgIcon icon="ri:flask-line" />
        </div>
        <div>
          <p class="text-sm text-g-500">研究项目数</p>
          <p class="text-xl font-medium text-g-900">{{ stats?.researchCount ?? 0 }}</p>
        </div>
      </div>
      <div class="art-card flex-c gap-3 px-5 py-4">
        <div class="size-10 flex-cc rounded-lg text-lg bg-warning/10 text-warning">
          <ArtSvgIcon icon="ri:article-line" />
        </div>
        <div>
          <p class="text-sm text-g-500">发表文献（引用）</p>
          <p class="text-xl font-medium text-g-900">
            {{ stats?.publicationCount ?? 0 }}（{{ stats?.citations ?? 0 }}）
          </p>
        </div>
      </div>
      <div class="art-card flex-c gap-3 px-5 py-4">
        <div class="size-10 flex-cc rounded-lg text-lg bg-danger/10 text-danger">
          <ArtSvgIcon icon="ri:global-line" />
        </div>
        <div>
          <p class="text-sm text-g-500">影响力指数</p>
          <p class="text-xl font-medium text-g-900">{{ stats?.influence ?? 0 }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { fetchGetWorkbench } from '@/mock/dli/api'
  import { getAccountByRole } from '@/mock/dli/users'
  import { useUserStore } from '@/store/modules/user'
  import { CENTER_MAP_DATA } from '@/mock/dli/data'
  import type { LineDataItem } from '@/types/component/chart'
  import type { WorkbenchStats, WebRoleCode } from '@/mock/dli/types'

  defineOptions({ name: 'DliWorkbench' })

  const userStore = useUserStore()

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

  /** 患者数量口径 */
  const patientScopeText = computed(() => {
    const map: Record<string, string> = {
      R_DOCTOR: '本课题组在管患者',
      R_ASSISTANT: '所协助医生名下患者',
      R_NURSE: '所负责患者',
      R_PLATFORM: '平台在管患者',
      R_CENTER: '本中心在管患者',
      R_GROUP: '本课题组在管患者',
      R_SYS: '全系统在管患者'
    }
    return map[role.value] ?? '在管患者'
  })

  /** 预警指标 */
  const warnings = computed(() => [
    {
      key: 'screen',
      label: '早筛预警',
      count: stats.value?.earlyScreen.count ?? 0,
      total: stats.value?.earlyScreen.total ?? 0,
      accuracy: stats.value?.earlyScreen.accuracy ?? 0,
      barClass: 'bg-danger',
      width: percent(stats.value?.earlyScreen.count ?? 0, stats.value?.earlyScreen.total ?? 0)
    },
    {
      key: 'diagnosis',
      label: '早诊预警',
      count: stats.value?.earlyDiagnosis.count ?? 0,
      total: stats.value?.earlyDiagnosis.total ?? 0,
      accuracy: stats.value?.earlyDiagnosis.accuracy ?? 0,
      barClass: 'bg-warning',
      width: percent(stats.value?.earlyDiagnosis.count ?? 0, stats.value?.earlyDiagnosis.total ?? 0)
    }
  ])

  /** 趋势图 */
  const trendAxis = computed(() => stats.value?.trend.map((item) => item.date) ?? [])
  const trendSeries = computed<LineDataItem[]>(() => [
    {
      name: '在管患者',
      data: stats.value?.trend.map((item) => item.patients) ?? [],
      showAreaColor: true
    },
    {
      name: '预警数量',
      data: stats.value?.trend.map((item) => item.alerts) ?? []
    }
  ])

  /** 角色附加指标：中心 / 课题组规模（平台与系统改由地图承载） */
  const extraCards = computed(() => {
    const cards: Array<{
      label: string
      value: number
      desc: string
      icon: string
      iconStyle: string
    }> = []
    if (role.value === 'R_CENTER') {
      cards.push({
        label: '课题组数',
        value: stats.value?.groupCount ?? 0,
        desc: '本中心在研课题组',
        icon: 'ri:organization-chart',
        iconStyle: 'bg-primary'
      })
    }
    if (role.value === 'R_CENTER' || role.value === 'R_GROUP') {
      cards.push({
        label: '医生数',
        value: stats.value?.doctorCount ?? 0,
        desc: '范围内执业医生',
        icon: 'ri:stethoscope-line',
        iconStyle: 'bg-success'
      })
    }
    return cards
  })

  /** 指标区列数随附加指标数量变化 */
  const statsGridClass = computed(() => {
    const total = 4 + extraCards.value.length
    const map: Record<number, string> = {
      4: 'xl:grid-cols-4',
      5: 'xl:grid-cols-5',
      6: 'xl:grid-cols-6'
    }
    return map[total] ?? 'xl:grid-cols-4'
  })

  const showMap = computed(() => role.value === 'R_PLATFORM' || role.value === 'R_SYS')

  /** 地图上叠加的规模指标 */
  const mapStats = computed(() => {
    const list: Array<{ label: string; value: number; icon: string; color: string }> = []
    if (role.value === 'R_SYS') {
      list.push({
        label: '平台数',
        value: stats.value?.platformCount ?? 0,
        icon: 'ri:server-line',
        color: 'text-primary'
      })
    }
    list.push({
      label: '中心数',
      value: stats.value?.centerCount ?? 0,
      icon: 'ri:building-2-line',
      color: 'text-theme'
    })
    list.push({
      label: '医生数',
      value: stats.value?.doctorCount ?? 0,
      icon: 'ri:stethoscope-line',
      color: 'text-success'
    })
    return list
  })

  /** 系统管理端统计全部平台下的中心，按平台数放大分布 */
  const mapData = computed(() =>
    CENTER_MAP_DATA.map((item) => ({
      ...item,
      value: role.value === 'R_SYS' ? item.value * 3 : item.value
    }))
  )

  const centerTotal = computed(() => mapData.value.reduce((sum, item) => sum + item.value, 0))

  /** 计算占比 */
  function percent(count: number, total: number): string {
    if (!total) return '0%'
    return `${Math.min(100, (count / total) * 100).toFixed(1)}%`
  }

  onMounted(async () => {
    try {
      stats.value = await fetchGetWorkbench(role.value as WebRoleCode)
    } finally {
      loading.value = false
    }
  })
</script>
