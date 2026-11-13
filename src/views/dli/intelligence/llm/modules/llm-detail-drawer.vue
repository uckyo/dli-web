<!-- LLM 详情：概览 / 用量趋势 / 调用分布 / 参数与密钥 [批注 22] -->
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

        <ElDescriptions :column="2" border size="small" class="mb-4">
          <ElDescriptionsItem label="服务名称">{{ detail.name }}</ElDescriptionsItem>
          <ElDescriptionsItem label="计费 / 额度单位">{{ detail.unit }}</ElDescriptionsItem>
          <ElDescriptionsItem label="额度所属组织">{{ detail.quotaOrg }}</ElDescriptionsItem>
          <ElDescriptionsItem label="数据更新时间">{{ detail.updatedAt }}</ElDescriptionsItem>
          <ElDescriptionsItem label="已用额度">
            {{ formatTokens(detail.used) }} {{ detail.unit }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="剩余额度">
            {{ formatTokens(detail.balance) }} {{ detail.unit }}
          </ElDescriptionsItem>
        </ElDescriptions>

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
            剩余额度低于 {{ detail.alertThreshold }}% 时触发告警；费用按人民币（¥）单独计费，不将
            Token 数当作金额。
          </p>
        </div>

        <div class="mb-2 flex-cb">
          <p class="text-sm font-medium text-g-900">分配记录</p>
          <span class="text-xs text-g-500">共 {{ detail.allocations.length }} 条</span>
        </div>
        <ElTable v-if="detail.allocations.length" :data="detail.allocations" size="small" border>
          <ElTableColumn prop="time" label="操作时间" width="150" />
          <ElTableColumn prop="target" label="分配对象" min-width="180" show-overflow-tooltip />
          <ElTableColumn label="分配数量" width="100" align="right">
            <template #default="{ row }">{{ formatInt(row.amount) }}</template>
          </ElTableColumn>
          <ElTableColumn prop="unit" label="额度单位" width="100" />
          <ElTableColumn prop="operator" label="操作者" width="110" />
        </ElTable>
        <ElEmpty v-else description="暂无分配记录" :image-size="70" />
      </ElTabPane>

      <ElTabPane label="用量趋势" name="usage">
        <TrendPanel
          title="近 14 天输入 / 输出 Token（统计范围：近 14 天，单位：Token）"
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
            <p class="text-xs text-g-500">本月费用（人民币）</p>
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
          <ElDescriptionsItem v-if="isAdmin" label="API 密钥">
            <span class="font-mono text-g-700">{{ detail.apiKeyMasked }}</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem v-else label="API 密钥">
            <span class="text-g-500">仅授权管理员可见，普通医护不下发凭据</span>
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
          单价按元 / 千 Token 计（人民币），金额与 Token 用量分别展示；密钥仅授权管理员可见。
        </p>
      </ElTabPane>
    </ElTabs>

    <ElEmpty v-else description="暂无模型数据" :image-size="100" />

    <template #footer>
      <div class="flex-cb w-full">
        <ElButton :loading="testing" @click="handleTest">测试连通性</ElButton>
        <div class="flex-c gap-2">
          <ElButton @click="emit('update:modelValue', false)">关闭</ElButton>
          <ElButton v-if="isAdmin && detail" type="primary" @click="allocateVisible = true">
            分配额度
          </ElButton>
        </div>
      </div>
    </template>
  </AiDetailDrawer>

  <LlmAllocateDialog v-model="allocateVisible" :llm="detail" @done="handleAllocated" />
</template>

<script setup lang="ts">
  import { computed, reactive, ref, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import AiDetailDrawer from '../../modules/ai-detail-drawer.vue'
  import MetricStrip from '../../modules/metric-strip.vue'
  import TrendPanel from '../../modules/trend-panel.vue'
  import TestResultAlert from '../../modules/test-result-alert.vue'
  import LlmAllocateDialog from './llm-allocate-dialog.vue'
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
  const allocateVisible = ref(false)
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
      { label: '剩余额度', value: `${formatTokens(detail.value.balance)} ${detail.value.unit}` },
      { label: '已用额度', value: `${formatTokens(detail.value.used)} ${detail.value.unit}` },
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

  async function handleAllocated() {
    if (!detail.value) return
    await loadDetail(detail.value.id)
    emit('refresh')
  }
</script>
