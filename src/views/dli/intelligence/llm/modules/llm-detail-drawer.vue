<!-- LLM 详情：概览 / 用量趋势 / 调用分布 / 参数与密钥 -->
<template>
  <AiDetailDrawer
    :model-value="modelValue"
    :title="detail?.name ?? '模型详情'"
    :subtitle="subtitle"
    :loading="loading"
    width="760px"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <template #extra>
      <ElTag v-if="detail" :type="LLM_STATUS_TAG[detail.status]" effect="plain">
        {{ detail.status }}
      </ElTag>
    </template>

    <TestResultAlert :result="testResult" class="mb-4" />

    <ElTabs v-if="detail" v-model="activeTab">
      <ElTabPane label="概览" name="overview">
        <MetricStrip :items="metricItems" class="mb-4" />

        <div class="mb-4 rounded-lg bg-g-100 p-3">
          <div class="flex-cb text-sm">
            <span class="text-g-700">额度消耗</span>
            <span :class="remainingPercent < detail.alertThreshold ? 'text-danger' : 'text-g-700'">
              剩余 {{ remainingPercent.toFixed(1) }}%
            </span>
          </div>
          <ElProgress
            :percentage="usedPercent"
            :stroke-width="8"
            :status="remainingPercent < detail.alertThreshold ? 'exception' : undefined"
            class="mt-2"
          />
          <p class="mt-2 text-xs text-g-500">
            余额低于 {{ detail.alertThreshold }}% 时触发告警，当前余额
            {{ formatTokens(detail.balance) }} Token
          </p>
        </div>

        <div class="mb-2 flex-cb">
          <p class="text-sm font-medium text-g-900">充值记录</p>
          <span class="text-xs text-g-500">近 {{ detail.recharges.length }} 次</span>
        </div>
        <ElTimeline v-if="detail.recharges.length">
          <ElTimelineItem
            v-for="record in detail.recharges"
            :key="record.id"
            :timestamp="record.time"
            :type="record.amount >= 1000 ? 'primary' : 'success'"
            placement="top"
          >
            <div class="flex-c flex-wrap gap-2 text-sm">
              <span class="font-medium text-g-900">{{ formatCurrency(record.amount) }}</span>
              <span class="text-g-600">{{ formatTokens(record.tokens) }} Token</span>
              <span class="text-xs text-g-500">{{ record.operator }}</span>
            </div>
            <p class="mt-1 text-sm text-g-700">{{ record.note }}</p>
          </ElTimelineItem>
        </ElTimeline>
        <ElEmpty v-else description="暂无充值记录" :image-size="70" />
      </ElTabPane>

      <ElTabPane label="用量趋势" name="usage">
        <TrendPanel
          title="近 14 天输入 / 输出 Token"
          :x-axis="last14.map((item) => item.date)"
          :series="[
            { name: '输入 Token', data: last14.map((item) => item.tokensIn) },
            { name: '输出 Token', data: last14.map((item) => item.tokensOut) }
          ]"
        />
        <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-lg bg-g-100 px-3 py-2">
            <p class="text-xs text-g-500">今日调用</p>
            <p class="mt-1 text-g-900">{{ formatInt(detail.todayCalls) }} 次</p>
          </div>
          <div class="rounded-lg bg-g-100 px-3 py-2">
            <p class="text-xs text-g-500">本月费用</p>
            <p class="mt-1 text-g-900">{{ formatCurrency(detail.monthCost) }}</p>
          </div>
        </div>
      </ElTabPane>

      <ElTabPane label="调用分布" name="distribution">
        <div class="rounded-lg border border-full-d p-3">
          <ArtRingChart
            :data="agentChartData"
            height="230px"
            center-text="今日调用"
            show-legend
            legend-position="right"
          />
        </div>
        <ElTable :data="detail.agentUsage" size="small" class="mt-3">
          <ElTableColumn prop="agent" label="智能体" min-width="160" />
          <ElTableColumn label="今日调用" width="120" align="right">
            <template #default="{ row }">{{ formatInt(row.calls) }} 次</template>
          </ElTableColumn>
          <ElTableColumn label="占比" width="100" align="right">
            <template #default="{ row }">
              <ElTag size="small" effect="plain">{{ row.share }}%</ElTag>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElTabPane>

      <ElTabPane label="参数与密钥" name="params">
        <ElDescriptions :column="1" border size="small" class="mb-4">
          <ElDescriptionsItem label="模型标识">{{ detail.model }}</ElDescriptionsItem>
          <ElDescriptionsItem label="上下文窗口">{{ detail.contextWindow }}K</ElDescriptionsItem>
          <ElDescriptionsItem label="API 密钥">
            <span class="font-mono text-g-700">{{ detail.apiKeyMasked }}</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="连接状态">
            {{ detail.connected ? '已连接' : '未连接' }} · 最近检查 {{ detail.lastCheckedAt }}
          </ElDescriptionsItem>
        </ElDescriptions>

        <ElForm label-width="110px" class="max-w-[520px]">
          <div class="grid grid-cols-2 gap-x-4">
            <ElFormItem label="输入单价">
              <ElInputNumber
                v-model="params.priceIn"
                :min="0"
                :step="0.001"
                :precision="3"
                :disabled="!isAdmin"
                class="w-full"
              />
            </ElFormItem>
            <ElFormItem label="输出单价">
              <ElInputNumber
                v-model="params.priceOut"
                :min="0"
                :step="0.001"
                :precision="3"
                :disabled="!isAdmin"
                class="w-full"
              />
            </ElFormItem>
            <ElFormItem label="限流 RPM">
              <ElInputNumber
                v-model="params.rateLimit"
                :min="10"
                :max="5000"
                :step="10"
                :disabled="!isAdmin"
                class="w-full"
              />
            </ElFormItem>
            <ElFormItem label="余额告警阈值">
              <ElInputNumber
                v-model="params.alertThreshold"
                :min="5"
                :max="80"
                :step="5"
                :disabled="!isAdmin"
                class="w-full"
              />
            </ElFormItem>
          </div>
          <ElFormItem v-if="isAdmin">
            <ElButton type="primary" :loading="saving" @click="saveParams">保存参数</ElButton>
          </ElFormItem>
        </ElForm>

        <p class="mt-2 rounded-lg bg-g-100 px-3 py-2 text-xs text-g-600">
          单价按元 / 千 Token 计，汇率与供应商账单可能存在差异；密钥仅展示脱敏结果。
        </p>
      </ElTabPane>
    </ElTabs>

    <ElEmpty v-else description="暂无模型数据" :image-size="100" />

    <template #footer>
      <div class="flex-cb w-full">
        <ElButton :loading="testing" @click="handleTest">测试连通性</ElButton>
        <div class="flex-c gap-2">
          <ElButton @click="emit('update:modelValue', false)">关闭</ElButton>
          <ElButton v-if="isAdmin && detail" type="primary" @click="rechargeVisible = true">
            充值
          </ElButton>
        </div>
      </div>
    </template>
  </AiDetailDrawer>

  <LlmRechargeDialog v-model="rechargeVisible" :llm="detail" @done="handleRecharged" />
</template>

<script setup lang="ts">
  import { computed, reactive, ref, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import AiDetailDrawer from '../../modules/ai-detail-drawer.vue'
  import MetricStrip from '../../modules/metric-strip.vue'
  import TrendPanel from '../../modules/trend-panel.vue'
  import TestResultAlert from '../../modules/test-result-alert.vue'
  import LlmRechargeDialog from './llm-recharge-dialog.vue'
  import { fetchGetLlmDetail, fetchTestLlm, fetchUpdateLlm } from '@/mock/dli/api'
  import type { LlmDetail } from '@/mock/dli/types'
  import {
    formatCurrency,
    formatInt,
    formatLatency,
    formatTokens,
    LLM_STATUS_TAG
  } from '../../format'

  defineOptions({ name: 'LlmDetailDrawer' })

  const props = defineProps<{
    modelValue: boolean
    llmId: string
    isAdmin: boolean
    tab?: string
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    refresh: []
  }>()

  const detail = ref<LlmDetail | null>(null)
  const loading = ref(false)
  const activeTab = ref('overview')
  const testing = ref(false)
  const testResult = ref<{ ok: boolean; latency: number; message: string } | null>(null)
  const rechargeVisible = ref(false)
  const saving = ref(false)

  const params = reactive({
    priceIn: 0,
    priceOut: 0,
    rateLimit: 0,
    alertThreshold: 20
  })

  const subtitle = computed(() =>
    detail.value ? `${detail.value.vendor} · ${detail.value.model}` : ''
  )

  const usedPercent = computed(() => {
    if (!detail.value) return 0
    const total = detail.value.balance + detail.value.used
    return total ? Math.round((detail.value.used / total) * 1000) / 10 : 0
  })

  const remainingPercent = computed(() => Math.round((100 - usedPercent.value) * 10) / 10)

  const last14 = computed(() => detail.value?.trend.slice(-14) ?? [])

  const agentChartData = computed(
    () => detail.value?.agentUsage.map((item) => ({ name: item.agent, value: item.calls })) ?? []
  )

  const metricItems = computed(() => {
    if (!detail.value) return []
    return [
      { label: '余额 Token', value: formatTokens(detail.value.balance) },
      { label: '已用 Token', value: formatTokens(detail.value.used) },
      { label: '今日调用', value: formatInt(detail.value.todayCalls) },
      { label: '平均延迟', value: formatLatency(detail.value.avgLatency) }
    ]
  })

  watch(
    () => [props.modelValue, props.llmId] as const,
    ([visible, id]) => {
      if (!visible) return
      activeTab.value = props.tab || 'overview'
      testResult.value = null
      if (id) loadDetail(id)
    },
    { immediate: true }
  )

  async function loadDetail(id: string) {
    loading.value = true
    try {
      detail.value = await fetchGetLlmDetail(id)
      Object.assign(params, {
        priceIn: detail.value.priceIn,
        priceOut: detail.value.priceOut,
        rateLimit: detail.value.rateLimit,
        alertThreshold: detail.value.alertThreshold
      })
    } finally {
      loading.value = false
    }
  }

  async function handleTest() {
    if (!detail.value) return
    testing.value = true
    try {
      const result = await fetchTestLlm(detail.value.id)
      testResult.value = result
      if (result.ok) ElMessage.success(result.message)
      else ElMessage.error(result.message)
      await loadDetail(detail.value.id)
      emit('refresh')
    } finally {
      testing.value = false
    }
  }

  async function saveParams() {
    if (!detail.value) return
    saving.value = true
    try {
      await fetchUpdateLlm(detail.value.id, {
        priceIn: params.priceIn,
        priceOut: params.priceOut,
        rateLimit: params.rateLimit,
        alertThreshold: params.alertThreshold
      })
      ElMessage.success('参数已保存')
      await loadDetail(detail.value.id)
      emit('refresh')
    } finally {
      saving.value = false
    }
  }

  async function handleRecharged() {
    if (!detail.value) return
    await loadDetail(detail.value.id)
    emit('refresh')
  }
</script>
