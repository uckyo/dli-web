<!-- DLI 医生工作台：患者总览 / 风险分层 / 最新预警 / 今日随访 -->
<template>
  <div class="dli-home art-full-height relative overflow-y-auto pb-5" v-loading="loading">
    <!-- 欢迎区 -->
    <div class="art-card flex-cb flex-wrap gap-3 px-5 py-4 mb-5">
      <div>
        <h3 class="text-xl font-medium text-g-900">医生工作台</h3>
        <p class="mt-1 text-sm text-g-600">{{ todayText }} · 高危药物智能诊疗与随访管理</p>
      </div>
      <div class="flex-c gap-2 text-sm text-g-600">
        <ArtSvgIcon icon="ri:cpu-line" class="text-base text-primary" />
        <span>评估模型 {{ stats?.modelVersion || '—' }}</span>
        <span class="text-g-400">|</span>
        <span class="text-success">{{ stats?.modelStatus || '—' }}</span>
      </div>
    </div>

    <!-- 核心指标 -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
      <ArtStatsCard
        title="今日在管患者"
        :count="stats?.patientTotal ?? 0"
        description="全部在管患者总数"
        icon="ri:group-line"
        icon-style="bg-primary"
        class="c-p"
        @click="go('/dli/patient/list')"
      />
      <ArtStatsCard
        title="未处理预警"
        :count="stats?.pendingAlertCount ?? 0"
        description="需在响应时限内处置"
        icon="ri:alarm-warning-line"
        icon-style="bg-danger"
        class="c-p"
        @click="go('/dli/alert')"
      />
      <ArtStatsCard
        title="今日待随访"
        :count="stats?.todayFollowupCount ?? 0"
        description="今日随访任务总数"
        icon="ri:calendar-check-line"
        icon-style="bg-warning"
        class="c-p"
        @click="go('/dli/followup')"
      />
      <div
        class="art-card h-32 flex-c px-5 tad-200 hover:-translate-y-0.5 c-p"
        @click="go('/dli/cdss')"
      >
        <div class="mr-4 size-11 flex-cc rounded-lg text-xl bg-theme/12 text-theme">
          <ArtSvgIcon icon="ri:stethoscope-line" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-g-500">评估模型</p>
          <p class="mt-1 text-lg font-medium text-g-900 truncate">
            {{ stats?.modelVersion || '—' }}
          </p>
          <p class="mt-1 text-sm text-success truncate">{{ stats?.modelStatus || '—' }}</p>
        </div>
      </div>
    </div>

    <!-- 风险分布与列表 -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <!-- 风险分层分布 -->
      <div class="art-card p-5">
        <div class="art-card-header !pr-0">
          <div class="title">
            <h4>风险分层分布</h4>
            <p
              >共<span>{{ totalPatients }}</span
              >位在管患者</p
            >
          </div>
        </div>
        <div class="mt-5 flex flex-col gap-5">
          <div v-for="item in riskDistribution" :key="item.level" class="flex-c gap-3">
            <span class="w-16 shrink-0 text-sm text-g-700">{{ item.label }}</span>
            <div class="h-2 flex-1 overflow-hidden rounded-full bg-g-200">
              <div
                class="h-full rounded-full tad-300"
                :class="RISK_BAR_CLASS[item.level]"
                :style="{ width: getPercent(item.count) }"
              ></div>
            </div>
            <span class="w-12 shrink-0 text-right text-sm font-medium text-g-900">
              {{ item.count }} 人
            </span>
          </div>
        </div>
      </div>

      <!-- 最新预警 -->
      <div class="art-card p-5 flex flex-col">
        <div class="art-card-header !pr-0">
          <div class="title">
            <h4>最新预警</h4>
            <p
              >待处理<span class="text-danger">{{ stats?.pendingAlertCount ?? 0 }}</span></p
            >
          </div>
          <ElButton link type="primary" @click="go('/dli/alert')">查看全部</ElButton>
        </div>
        <div v-if="alerts.length" class="mt-2 flex-1">
          <div
            v-for="item in alerts"
            :key="item.id"
            class="-mx-2 px-2 py-3 rounded-md c-p tad-200 border-b border-full-d last:border-b-0 hover:bg-g-100"
            @click="go('/dli/alert')"
          >
            <div class="flex-cb gap-2">
              <div class="flex-c gap-2 min-w-0">
                <span class="text-sm font-medium text-g-900 truncate">{{ item.patientName }}</span>
                <ElTag :type="ALERT_TAG_TYPE[item.level]" size="small">
                  {{ ALERT_LEVEL_LABEL[item.level] }}
                </ElTag>
              </div>
              <span class="shrink-0 text-xs text-g-500">{{ item.occurTime }}</span>
            </div>
            <p class="mt-1 text-sm text-g-600 truncate">{{ item.ruleName }}</p>
          </div>
        </div>
        <ElEmpty v-else description="暂无预警" :image-size="80" class="flex-1" />
      </div>

      <!-- 今日随访任务 -->
      <div class="art-card p-5 flex flex-col">
        <div class="art-card-header !pr-0">
          <div class="title">
            <h4>今日随访任务</h4>
            <p
              >共<span>{{ followups.length }}</span
              >项待跟进</p
            >
          </div>
        </div>
        <div v-if="followups.length" class="mt-2 flex-1">
          <div
            v-for="item in followups"
            :key="item.taskId"
            class="-mx-2 px-2 py-3 rounded-md tad-200 border-b border-full-d last:border-b-0 hover:bg-g-100"
          >
            <div class="flex-cb gap-2">
              <span class="text-sm font-medium text-g-900 truncate">{{ item.patientName }}</span>
              <ElTag :type="FOLLOWUP_STATUS[item.status].type" size="small">
                {{ FOLLOWUP_STATUS[item.status].label }}
              </ElTag>
            </div>
            <div class="flex-cb gap-2 mt-1">
              <p class="text-sm text-g-600 truncate">{{ item.itemName }}</p>
              <span class="shrink-0 text-xs text-g-500">截止 {{ item.dueDate }}</span>
            </div>
          </div>
        </div>
        <ElEmpty v-else description="今日暂无随访任务" :image-size="80" class="flex-1" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchGetLatestAlerts,
    fetchGetTodayFollowups,
    fetchGetWorkbenchStats
  } from '@/mock/dli/api'
  import type { DliAlert, RiskLevel, WorkbenchStats } from '@/mock/dli/types'

  defineOptions({ name: 'DliHome' })

  type TodayFollowup = Awaited<ReturnType<typeof fetchGetTodayFollowups>>[number]

  const router = useRouter()

  const loading = ref(true)
  const stats = ref<WorkbenchStats>()
  const alerts = ref<DliAlert[]>([])
  const followups = ref<TodayFollowup[]>([])

  /** 今日日期文案 */
  const todayText = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })

  /** 风险条填充色 */
  const RISK_BAR_CLASS: Record<RiskLevel, string> = {
    L1: 'bg-danger',
    L2: 'bg-warning',
    L3: 'bg-primary',
    L4: 'bg-success'
  }

  /** 预警等级标签类型 */
  const ALERT_TAG_TYPE: Record<DliAlert['level'], 'danger' | 'warning' | 'info'> = {
    red: 'danger',
    orange: 'warning',
    yellow: 'info'
  }

  /** 预警等级文案 */
  const ALERT_LEVEL_LABEL: Record<DliAlert['level'], string> = {
    red: '红色',
    orange: '橙色',
    yellow: '黄色'
  }

  /** 随访状态展示配置 */
  const FOLLOWUP_STATUS: Record<
    TodayFollowup['status'],
    { label: string; type: 'success' | 'danger' | 'info' }
  > = {
    done: { label: '已完成', type: 'success' },
    overdue: { label: '已逾期', type: 'danger' },
    pending: { label: '待完成', type: 'info' }
  }

  const riskDistribution = computed(() => stats.value?.riskDistribution ?? [])

  const totalPatients = computed(() =>
    riskDistribution.value.reduce((sum, item) => sum + item.count, 0)
  )

  /** 计算风险占比 */
  const getPercent = (count: number): string => {
    if (!totalPatients.value) return '0%'
    return `${(count / totalPatients.value) * 100}%`
  }

  const go = (path: string): void => {
    router.push(path)
  }

  onMounted(async () => {
    try {
      const [statsRes, alertRes, followupRes] = await Promise.all([
        fetchGetWorkbenchStats(),
        fetchGetLatestAlerts(5),
        fetchGetTodayFollowups()
      ])
      stats.value = statsRes
      alerts.value = alertRes
      followups.value = followupRes
    } finally {
      loading.value = false
    }
  })
</script>
