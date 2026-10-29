<!-- DLI 模型管理：用量总览、模型卡片、充值、参数与密钥 -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <div class="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <ArtStatsCard
        title="接入模型"
        :count="overview.models"
        icon="ri:cloud-line"
        icon-style="bg-primary"
      />
      <ArtStatsCard
        title="今日调用"
        :count="overview.todayCalls"
        icon="ri:loop-left-line"
        icon-style="bg-success"
      />
      <ArtStatsCard
        title="今日 Token"
        :count="overview.todayTokens / 10000"
        :decimals="1"
        suffix=" 万"
        icon="ri:database-2-line"
        icon-style="bg-warning"
      />
      <ArtStatsCard
        title="本月费用"
        :count="overview.monthCost"
        :decimals="2"
        prefix="¥"
        icon="ri:money-cny-circle-line"
        icon-style="bg-danger"
      />
    </div>

    <TrendPanel
      title="近 30 天用量趋势"
      :x-axis="usageTrend.map((item) => item.date)"
      :series="usageSeries"
      height="220px"
      class="mb-5"
    >
      <template #extra>
        <ElRadioGroup v-model="usageMetric" size="small">
          <ElRadioButton value="calls">调用次数</ElRadioButton>
          <ElRadioButton value="tokens">Token</ElRadioButton>
          <ElRadioButton value="cost">费用</ElRadioButton>
        </ElRadioGroup>
      </template>
    </TrendPanel>

    <ArtSearchBar
      v-model="searchParams"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <div v-loading="loading" class="mt-3 min-h-[200px]">
      <div v-if="models.length" class="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <div
          v-for="item in models"
          :key="item.id"
          class="art-card flex flex-col gap-3 p-4"
          :class="item.status === '已停用' ? 'opacity-70' : ''"
        >
          <div class="flex-cb gap-2">
            <div class="min-w-0">
              <div class="flex-c gap-2">
                <span class="truncate text-base font-medium text-g-900">{{ item.name }}</span>
                <ElTag :type="LLM_STATUS_TAG[item.status]" effect="plain" size="small">
                  {{ item.status }}
                </ElTag>
              </div>
              <p class="mt-1 truncate text-xs text-g-500">
                {{ item.vendor }} · {{ item.model }} · {{ item.contextWindow }}K 上下文
              </p>
            </div>
            <ElSwitch
              v-if="isAdmin"
              :model-value="item.status !== '已停用'"
              :before-change="() => handleToggle(item)"
            />
          </div>

          <div>
            <div class="flex-cb text-xs text-g-600">
              <span>余额 {{ formatTokens(item.balance) }}</span>
              <span>已用 {{ formatTokens(item.used) }}</span>
            </div>
            <ElProgress
              :percentage="usedPercent(item)"
              :stroke-width="6"
              :status="isAlert(item) ? 'exception' : undefined"
              class="mt-1.5"
            />
            <p class="mt-1 text-xs" :class="isAlert(item) ? 'text-danger' : 'text-g-500'">
              剩余 {{ remainingPercent(item).toFixed(1) }}% · 低于 {{ item.alertThreshold }}% 时告警
            </p>
          </div>

          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="rounded-lg bg-g-100 py-2">
              <p class="text-xs text-g-500">今日调用</p>
              <p class="mt-0.5 text-sm text-g-900">{{ formatInt(item.todayCalls) }}</p>
            </div>
            <div class="rounded-lg bg-g-100 py-2">
              <p class="text-xs text-g-500">今日 Token</p>
              <p class="mt-0.5 text-sm text-g-900">{{ formatTokens(item.todayTokens) }}</p>
            </div>
            <div class="rounded-lg bg-g-100 py-2">
              <p class="text-xs text-g-500">平均延迟</p>
              <p class="mt-0.5 text-sm text-g-900">{{ formatLatency(item.avgLatency) }}</p>
            </div>
          </div>

          <div class="mt-auto flex-cb border-t border-full-d pt-3">
            <span class="text-xs text-g-500">本月 {{ formatCurrency(item.monthCost) }}</span>
            <div class="flex-c gap-1">
              <ElButton link type="primary" @click="openDetail(item)">详情</ElButton>
              <ElButton v-if="isAdmin" link type="primary" @click="openRecharge(item)">
                充值
              </ElButton>
              <ElButton
                link
                type="primary"
                :loading="testingId === item.id"
                @click="handleTest(item)"
              >
                测试
              </ElButton>
            </div>
          </div>
        </div>
      </div>
      <ElCard v-else-if="!loading" class="art-table-card">
        <ElEmpty description="没有符合条件的模型" :image-size="100" />
      </ElCard>
    </div>

    <LlmDetailDrawer
      v-model="detailVisible"
      :llm-id="activeLlmId"
      :is-admin="isAdmin"
      @refresh="handleRefresh"
    />

    <LlmRechargeDialog v-model="rechargeVisible" :llm="rechargeTarget" @done="handleRefresh" />
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElMessage, ElSwitch, ElTag } from 'element-plus'
  import {
    fetchGetLlmList,
    fetchGetLlmOverview,
    fetchGetLlmUsageTrend,
    fetchTestLlm,
    fetchToggleLlm
  } from '@/mock/dli/api'
  import { LLMS } from '@/mock/dli/data'
  import type { LlmItem, LlmOverview, LlmUsagePoint } from '@/mock/dli/types'
  import { useIntelligenceRole } from '../useIntelligenceRole'
  import { formatCurrency, formatInt, formatLatency, formatTokens, LLM_STATUS_TAG } from '../format'
  import TrendPanel from '../modules/trend-panel.vue'
  import LlmDetailDrawer from './modules/llm-detail-drawer.vue'
  import LlmRechargeDialog from './modules/llm-recharge-dialog.vue'

  defineOptions({ name: 'DliIntelligenceLlm' })

  const { isAdmin } = useIntelligenceRole()

  const overview = ref<LlmOverview>({ models: 0, todayCalls: 0, todayTokens: 0, monthCost: 0 })
  const usageTrend = ref<LlmUsagePoint[]>([])
  const usageMetric = ref<'calls' | 'tokens' | 'cost'>('calls')

  const models = ref<LlmItem[]>([])
  const loading = ref(false)
  const testingId = ref('')

  const searchParams = ref<{ keyword: string; vendor: string; status: string }>({
    keyword: '',
    vendor: '',
    status: ''
  })

  const searchItems = [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: '模型名称 / 模型标识',
      span: 6
    },
    {
      key: 'vendor',
      label: '厂商',
      type: 'select',
      placeholder: '全部厂商',
      options: Array.from(new Set(LLMS.map((item) => item.vendor))).map((vendor) => ({
        label: vendor,
        value: vendor
      }))
    },
    {
      key: 'status',
      label: '状态',
      type: 'select',
      placeholder: '全部状态',
      options: [
        { label: '正常', value: '正常' },
        { label: '余额预警', value: '余额预警' },
        { label: '已停用', value: '已停用' }
      ]
    }
  ]

  const usageSeries = computed(() => {
    if (usageMetric.value === 'tokens') {
      return [
        { name: '输入 Token', data: usageTrend.value.map((item) => item.tokensIn) },
        { name: '输出 Token', data: usageTrend.value.map((item) => item.tokensOut) }
      ]
    }
    if (usageMetric.value === 'cost') {
      return [{ name: '费用（元）', data: usageTrend.value.map((item) => item.cost) }]
    }
    return [{ name: '调用次数', data: usageTrend.value.map((item) => item.calls) }]
  })

  const detailVisible = ref(false)
  const activeLlmId = ref('')
  const rechargeVisible = ref(false)
  const rechargeTarget = ref<LlmItem | null>(null)

  function usedPercent(item: LlmItem): number {
    const total = item.balance + item.used
    return total ? Math.round((item.used / total) * 1000) / 10 : 0
  }

  function remainingPercent(item: LlmItem): number {
    return Math.round((100 - usedPercent(item)) * 10) / 10
  }

  function isAlert(item: LlmItem): boolean {
    return item.status !== '已停用' && remainingPercent(item) < item.alertThreshold
  }

  async function loadOverview() {
    overview.value = await fetchGetLlmOverview()
  }

  async function loadTrend() {
    usageTrend.value = await fetchGetLlmUsageTrend()
  }

  async function loadModels() {
    loading.value = true
    try {
      models.value = await fetchGetLlmList({
        keyword: searchParams.value.keyword,
        vendor: searchParams.value.vendor,
        status: (searchParams.value.status || '') as LlmItem['status'] | ''
      })
    } finally {
      loading.value = false
    }
  }

  async function loadAll() {
    await Promise.all([loadOverview(), loadTrend(), loadModels()])
  }

  let mountedOnce = false
  onMounted(loadAll)
  onActivated(() => {
    if (!mountedOnce) {
      mountedOnce = true
      return
    }
    loadAll()
  })

  function handleSearch() {
    loadModels()
  }

  function handleReset() {
    searchParams.value = { keyword: '', vendor: '', status: '' }
    loadModels()
  }

  function handleRefresh() {
    loadAll()
  }

  function openDetail(item: LlmItem) {
    activeLlmId.value = item.id
    detailVisible.value = true
  }

  function openRecharge(item: LlmItem) {
    rechargeTarget.value = item
    rechargeVisible.value = true
  }

  async function handleToggle(item: LlmItem): Promise<boolean> {
    await fetchToggleLlm(item.id, item.status === '已停用')
    ElMessage.success(`已${item.status === '已停用' ? '启用' : '停用'}「${item.name}」`)
    await loadAll()
    return true
  }

  async function handleTest(item: LlmItem) {
    testingId.value = item.id
    try {
      const result = await fetchTestLlm(item.id)
      if (result.ok) ElMessage.success(result.message)
      else ElMessage.error(result.message)
      await loadModels()
    } finally {
      testingId.value = ''
    }
  }
</script>
