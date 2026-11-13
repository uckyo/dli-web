<!-- MCP 服务详情（只读）：概览 / 工具清单 / 连接配置 / 调用记录 [批注 21] -->
<template>
  <AiDetailDrawer
    :model-value="modelValue"
    :title="detail?.name ?? 'MCP 服务详情'"
    :subtitle="subtitle"
    :loading="loading"
    width="760px"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <template #extra>
      <div v-if="detail" class="flex-c gap-2">
        <span class="size-2 rounded-full" :class="MCP_STATUS_DOT[detail.status]" />
        <span class="text-sm text-g-600">{{ detail.status }}</span>
      </div>
    </template>

    <ElTabs v-if="detail" v-model="activeTab">
      <ElTabPane label="概览" name="overview">
        <MetricStrip :items="metricItems" class="mb-4" />
        <ElDescriptions :column="1" border size="small" class="mb-4">
          <ElDescriptionsItem label="服务用途">{{ detail.purpose }}</ElDescriptionsItem>
          <ElDescriptionsItem label="适用范围">{{ detail.scope }}</ElDescriptionsItem>
        </ElDescriptions>
        <ElDescriptions :column="2" border size="small" class="mb-4">
          <ElDescriptionsItem label="服务编号">{{ detail.id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="协议类型">{{
            detail.protocol.toUpperCase()
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="服务版本">{{ detail.version }}</ElDescriptionsItem>
          <ElDescriptionsItem label="维护方">{{ detail.maintainer }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最近调用时间">
            {{ detail.lastCalledAt || '暂无' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="配置更新">{{ detail.updatedAt }}</ElDescriptionsItem>
        </ElDescriptions>
        <template v-if="hasCalls">
          <TrendPanel
            title="近 14 天调用次数"
            type="bar"
            :x-axis="detail.trend.map((item) => item.date)"
            :series="[{ name: '调用次数', data: detail.trend.map((item) => item.calls) }]"
          />
        </template>
        <ElEmpty v-else description="该服务尚未接入，暂无调用数据" :image-size="80" />
      </ElTabPane>

      <ElTabPane label="工具清单" name="tools">
        <ElTable :data="detail.toolList" size="small" border>
          <ElTableColumn prop="name" label="工具名称" min-width="220" />
          <ElTableColumn prop="description" label="功能说明" min-width="280" />
        </ElTable>
        <p v-if="!detail.toolList.length" class="mt-3 text-sm text-g-500">该服务暂未注册工具</p>
      </ElTabPane>

      <ElTabPane label="连接配置" name="config">
        <ElAlert
          type="info"
          :closable="false"
          show-icon
          title="配置由平台统一维护，只读展示"
          description="连接配置仅包含地址与巡检策略等基础信息，不包含任何密钥或凭据；只读不代表可修改，如需调整请联系平台运维组。"
          class="mb-4"
        />
        <ElDescriptions :column="1" border size="small">
          <ElDescriptionsItem label="Endpoint">{{ detail.endpoint }}</ElDescriptionsItem>
          <ElDescriptionsItem label="传输协议">
            {{ detail.protocol.toUpperCase() }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="鉴权方式">{{ detail.authType }}</ElDescriptionsItem>
          <ElDescriptionsItem label="超时时间">{{ detail.timeout }} 秒</ElDescriptionsItem>
          <ElDescriptionsItem label="心跳间隔">{{ detail.heartbeat }} 秒</ElDescriptionsItem>
          <ElDescriptionsItem label="巡检计划">{{ detail.inspectedAt }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最近巡检">{{ detail.lastCheckedAt }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElTabPane>

      <ElTabPane label="调用记录" name="logs">
        <template v-if="detail.logs.length">
          <div class="mb-3 flex-c flex-wrap gap-3">
            <ElRadioGroup v-model="logStatus" size="small">
              <ElRadioButton value="">全部</ElRadioButton>
              <ElRadioButton value="成功">成功</ElRadioButton>
              <ElRadioButton value="失败">失败</ElRadioButton>
            </ElRadioGroup>
            <span class="text-xs text-g-500">共 {{ filteredLogs.length }} 条记录</span>
          </div>
          <ElTable :data="pagedLogs" size="small" border>
            <ElTableColumn prop="calledAt" label="调用时间" width="160" />
            <ElTableColumn prop="tool" label="工具名称" min-width="200" />
            <ElTableColumn label="调用结果" width="100">
              <template #default="{ row }">
                <ElTag
                  :type="row.status === '成功' ? 'success' : 'danger'"
                  size="small"
                  effect="plain"
                >
                  {{ row.status }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="耗时" width="100" align="right">
              <template #default="{ row }">{{ formatLatency(row.latency) }}</template>
            </ElTableColumn>
          </ElTable>
          <div class="mt-3 flex justify-end">
            <ElPagination
              v-model:current-page="logPage"
              :page-size="LOG_PAGE_SIZE"
              :total="filteredLogs.length"
              layout="prev, pager, next"
              small
              background
            />
          </div>
        </template>
        <ElEmpty v-else description="该服务尚未接入，暂无调用数据" :image-size="80" />
      </ElTabPane>
    </ElTabs>

    <ElEmpty v-else description="暂无服务数据" :image-size="100" />

    <template #footer>
      <div class="flex-cb w-full">
        <span class="text-xs text-g-500">
          MCP 由平台统一维护，详情只读；服务描述文件下载需单独授权
        </span>
        <ElButton @click="emit('update:modelValue', false)">关闭</ElButton>
      </div>
    </template>
  </AiDetailDrawer>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import AiDetailDrawer from '../../modules/ai-detail-drawer.vue'
  import MetricStrip from '../../modules/metric-strip.vue'
  import TrendPanel from '../../modules/trend-panel.vue'
  import { fetchGetMcpDetail } from '@/mock/dli/api'
  import type { McpDetail } from '@/mock/dli/types'
  import { formatInt, formatLatency, MCP_STATUS_DOT } from '../../format'

  defineOptions({ name: 'McpDetailDrawer' })

  const props = defineProps<{
    modelValue: boolean
    mcpId: string
    tab?: string
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
  }>()

  const LOG_PAGE_SIZE = 6

  const detail = ref<McpDetail | null>(null)
  const loading = ref(false)
  const activeTab = ref('overview')
  const logStatus = ref('')
  const logPage = ref(1)

  const subtitle = computed(() =>
    detail.value ? `${detail.value.id} · ${detail.value.protocol.toUpperCase()}` : ''
  )

  /** 未接入（离线）或近 14 天全部为 0 时，趋势图展示「暂无」 */
  const hasCalls = computed(() => {
    if (!detail.value) return false
    if (detail.value.status === '离线') return false
    return detail.value.trend.some((point) => point.calls > 0)
  })

  const metricItems = computed(() => {
    if (!detail.value) return []
    return [
      { label: '工具数', value: detail.value.tools },
      {
        label: '连接延迟',
        value: detail.value.status === '离线' ? '暂无' : formatLatency(detail.value.latency),
        tone: detail.value.status === '在线' ? ('success' as const) : ('danger' as const)
      },
      {
        label: '近 30 天调用',
        value: detail.value.calls30d ? formatInt(detail.value.calls30d) : '暂无'
      },
      {
        label: '当前状态',
        value: detail.value.status,
        tone:
          detail.value.status === '在线'
            ? ('success' as const)
            : detail.value.status === '异常'
              ? ('warning' as const)
              : ('danger' as const)
      }
    ]
  })

  const filteredLogs = computed(() => {
    if (!detail.value) return []
    return logStatus.value
      ? detail.value.logs.filter((log) => log.status === logStatus.value)
      : detail.value.logs
  })

  const pagedLogs = computed(() => {
    const start = (logPage.value - 1) * LOG_PAGE_SIZE
    return filteredLogs.value.slice(start, start + LOG_PAGE_SIZE)
  })

  watch(logStatus, () => {
    logPage.value = 1
  })

  watch(
    () => [props.modelValue, props.mcpId] as const,
    ([visible, id]) => {
      if (!visible) return
      activeTab.value = props.tab || 'overview'
      logStatus.value = ''
      logPage.value = 1
      if (id) loadDetail(id)
    },
    { immediate: true }
  )

  async function loadDetail(id: string) {
    loading.value = true
    try {
      detail.value = await fetchGetMcpDetail(id)
    } finally {
      loading.value = false
    }
  }
</script>
