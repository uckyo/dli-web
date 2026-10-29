<!-- 技能详情：概览 / 配置 / 版本 / 调用记录 -->
<template>
  <AiDetailDrawer
    :model-value="modelValue"
    :title="detail?.name ?? '技能详情'"
    :subtitle="subtitle"
    :loading="loading"
    width="800px"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <TestResultAlert :result="testResult" class="mb-4" />

    <ElTabs v-if="detail" v-model="activeTab">
      <ElTabPane label="概览" name="overview">
        <MetricStrip :items="metricItems" class="mb-4" />
        <ElDescriptions :column="2" border size="small" class="mb-4">
          <ElDescriptionsItem label="技能编号">{{ detail.id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="归属智能体">{{ detail.agent }}</ElDescriptionsItem>
          <ElDescriptionsItem label="维护人">{{ detail.owner }}</ElDescriptionsItem>
          <ElDescriptionsItem label="可见范围">
            <ElTag :type="SCOPE_TAG[detail.scope]" size="small" effect="plain">
              {{ detail.scope }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="超时 / 重试">
            {{ detail.timeout }}s / {{ detail.retries }} 次
          </ElDescriptionsItem>
          <ElDescriptionsItem label="更新时间">{{ detail.updatedAt }}</ElDescriptionsItem>
        </ElDescriptions>
        <TrendPanel
          title="近 7 日调用与失败"
          :x-axis="detail.trend.map((item) => item.date)"
          :series="trendSeries"
        />
      </ElTabPane>

      <ElTabPane label="配置" name="config">
        <div class="mb-4 flex-cb">
          <p class="text-sm font-medium text-g-900">入参定义</p>
          <ElButton v-if="isAdmin" link type="primary" @click="emit('edit', detail)">
            编辑配置
          </ElButton>
        </div>
        <ElTable :data="detail.params" size="small" border>
          <ElTableColumn prop="name" label="参数名" min-width="130" />
          <ElTableColumn prop="type" label="类型" width="90" />
          <ElTableColumn label="必填" width="70" align="center">
            <template #default="{ row }">{{ row.required ? '是' : '否' }}</template>
          </ElTableColumn>
          <ElTableColumn prop="defaultValue" label="默认值" width="110">
            <template #default="{ row }">{{ row.defaultValue || '—' }}</template>
          </ElTableColumn>
          <ElTableColumn prop="description" label="说明" min-width="150" />
        </ElTable>

        <div class="mt-4 rounded-lg bg-g-100 p-3">
          <p class="mb-2 text-sm font-medium text-g-900">
            {{
              detail.type === '工具调用'
                ? '工具标识'
                : detail.type === '提示词'
                  ? '提示词模板'
                  : '工作流步骤'
            }}
          </p>
          <pre
            class="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5 text-g-700"
            >{{
              detail.type === '工具调用'
                ? detail.tool || '未配置'
                : detail.type === '提示词'
                  ? detail.prompt || '未配置'
                  : detail.workflow || '未配置'
            }}</pre
          >
        </div>

        <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-lg bg-g-100 px-3 py-2">
            <p class="text-xs text-g-500">超时上限</p>
            <p class="mt-1 text-g-900">{{ detail.timeout }} 秒</p>
          </div>
          <div class="rounded-lg bg-g-100 px-3 py-2">
            <p class="text-xs text-g-500">失败重试</p>
            <p class="mt-1 text-g-900">{{ detail.retries }} 次</p>
          </div>
        </div>
      </ElTabPane>

      <ElTabPane label="版本" name="versions">
        <div class="mb-3 flex-cb">
          <p class="text-sm text-g-500"
            >共 {{ detail.versions.length }} 个版本，当前生效版本已高亮</p
          >
          <ElButton v-if="isAdmin" type="primary" size="small" @click="openPublish">
            发布新版本
          </ElButton>
        </div>
        <ElTimeline>
          <ElTimelineItem
            v-for="item in detail.versions"
            :key="item.version"
            :timestamp="item.publishedAt"
            :type="item.active ? 'primary' : 'info'"
            placement="top"
          >
            <div class="flex-c flex-wrap gap-2">
              <span class="text-sm font-medium text-g-900">{{ item.version }}</span>
              <ElTag v-if="item.active" type="success" size="small" effect="plain">当前版本</ElTag>
              <span class="text-xs text-g-500">{{ item.publisher }}</span>
            </div>
            <p class="mt-1 text-sm text-g-700">{{ item.note }}</p>
          </ElTimelineItem>
        </ElTimeline>
      </ElTabPane>

      <ElTabPane label="调用记录" name="logs">
        <div class="mb-3 flex-c flex-wrap gap-3">
          <ElRadioGroup v-model="logStatus" size="small">
            <ElRadioButton value="">全部</ElRadioButton>
            <ElRadioButton value="成功">成功</ElRadioButton>
            <ElRadioButton value="失败">失败</ElRadioButton>
            <ElRadioButton value="超时">超时</ElRadioButton>
          </ElRadioGroup>
          <span class="text-xs text-g-500">共 {{ filteredLogs.length }} 条记录</span>
        </div>
        <ElTable :data="pagedLogs" size="small" border>
          <ElTableColumn prop="calledAt" label="调用时间" width="150" />
          <ElTableColumn prop="scene" label="调用场景" width="110" />
          <ElTableColumn prop="agent" label="调用方" min-width="130" />
          <ElTableColumn label="状态" width="80">
            <template #default="{ row }">
              <ElTag :type="callStatusTag(row.status)" size="small" effect="plain">
                {{ row.status }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="延迟" width="80" align="right">
            <template #default="{ row }">{{ formatLatency(row.latency) }}</template>
          </ElTableColumn>
          <ElTableColumn label="Token" width="90" align="right">
            <template #default="{ row }">{{ formatInt(row.tokens) }}</template>
          </ElTableColumn>
          <ElTableColumn label="错误摘要" min-width="150">
            <template #default="{ row }">
              <span :class="row.error ? 'text-danger' : 'text-g-400'">
                {{ row.error || '—' }}
              </span>
            </template>
          </ElTableColumn>
        </ElTable>
        <div v-if="filteredLogs.length" class="mt-3 flex justify-end">
          <ElPagination
            v-model:current-page="logPage"
            :page-size="LOG_PAGE_SIZE"
            :total="filteredLogs.length"
            layout="prev, pager, next"
            small
            background
          />
        </div>
        <ElEmpty v-else description="暂无调用记录" :image-size="80" />
      </ElTabPane>
    </ElTabs>

    <ElEmpty v-else description="暂无技能数据" :image-size="100" />

    <template #footer>
      <div class="flex-cb w-full">
        <ElButton :loading="testing" @click="handleTest">测试调用</ElButton>
        <div class="flex-c gap-2">
          <ElButton @click="emit('update:modelValue', false)">关闭</ElButton>
          <ElButton v-if="isAdmin && detail" type="primary" @click="emit('edit', detail)">
            编辑配置
          </ElButton>
        </div>
      </div>
    </template>
  </AiDetailDrawer>

  <!-- 发布新版本 -->
  <ElDialog v-model="publishVisible" title="发布新版本" width="480px">
    <ElForm label-width="80px">
      <ElFormItem label="版本号">
        <ElInput v-model="publishForm.version" placeholder="如：v3.3.0" />
      </ElFormItem>
      <ElFormItem label="变更说明">
        <ElInput
          v-model="publishForm.note"
          type="textarea"
          :rows="3"
          maxlength="120"
          show-word-limit
          placeholder="说明本次版本的主要变更"
        />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="publishVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="publishing" @click="submitPublish">发布</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { computed, reactive, ref, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import AiDetailDrawer from '../../modules/ai-detail-drawer.vue'
  import MetricStrip from '../../modules/metric-strip.vue'
  import TrendPanel from '../../modules/trend-panel.vue'
  import TestResultAlert from '../../modules/test-result-alert.vue'
  import { fetchGetSkillDetail, fetchPublishSkillVersion, fetchTestSkill } from '@/mock/dli/api'
  import type { SkillDetail, SkillItem } from '@/mock/dli/types'
  import {
    formatInt,
    formatLatency,
    formatPercent,
    SCOPE_TAG,
    SKILL_CALL_STATUS_TAG
  } from '../../format'

  defineOptions({ name: 'SkillDetailDrawer' })

  const props = defineProps<{
    modelValue: boolean
    skillId: string
    isAdmin: boolean
    tab?: string
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    refresh: []
    edit: [skill: SkillItem]
  }>()

  const LOG_PAGE_SIZE = 6

  const detail = ref<SkillDetail | null>(null)
  const loading = ref(false)
  const activeTab = ref('overview')
  const logStatus = ref('')
  const logPage = ref(1)
  const testing = ref(false)
  const testResult = ref<{ ok: boolean; latency: number; message: string } | null>(null)

  const subtitle = computed(() =>
    detail.value ? `${detail.value.id} · ${detail.value.type} · ${detail.value.version}` : ''
  )

  const metricItems = computed(() => {
    if (!detail.value) return []
    return [
      { label: '近 30 天调用', value: formatInt(detail.value.calls), tone: 'default' as const },
      {
        label: '成功率',
        value: formatPercent(detail.value.successRate),
        tone: detail.value.successRate >= 95 ? ('success' as const) : ('warning' as const)
      },
      {
        label: '平均延迟',
        value: formatLatency(detail.value.avgLatency),
        tone: 'default' as const
      },
      {
        label: '近 7 日失败',
        value: detail.value.trend.reduce((sum, item) => sum + item.failures, 0),
        tone: 'danger' as const
      }
    ]
  })

  const trendSeries = computed(() => {
    if (!detail.value) return []
    return [
      { name: '调用次数', data: detail.value.trend.map((item) => item.calls) },
      { name: '失败次数', data: detail.value.trend.map((item) => item.failures) }
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

  const callStatusTag = (status: string) =>
    SKILL_CALL_STATUS_TAG[status as keyof typeof SKILL_CALL_STATUS_TAG] ?? 'info'

  watch(logStatus, () => {
    logPage.value = 1
  })

  watch(
    () => [props.modelValue, props.skillId] as const,
    ([visible, id]) => {
      if (!visible) return
      activeTab.value = props.tab || 'overview'
      logStatus.value = ''
      logPage.value = 1
      testResult.value = null
      if (id) loadDetail(id)
    },
    { immediate: true }
  )

  watch(
    () => props.tab,
    (tab) => {
      if (props.modelValue && tab) activeTab.value = tab
    }
  )

  async function loadDetail(id: string) {
    loading.value = true
    try {
      detail.value = await fetchGetSkillDetail(id)
    } finally {
      loading.value = false
    }
  }

  async function handleTest() {
    if (!detail.value) return
    testing.value = true
    try {
      const result = await fetchTestSkill(detail.value.id)
      testResult.value = result
      if (result.ok) ElMessage.success(result.message)
      else ElMessage.error(result.message)
    } finally {
      testing.value = false
    }
  }

  const publishVisible = ref(false)
  const publishing = ref(false)
  const publishForm = reactive({ version: '', note: '' })

  function openPublish() {
    const current = detail.value?.version ?? 'v1.0.0'
    const [major, minor] = current.slice(1).split('.').map(Number)
    publishForm.version = `v${major}.${(minor || 0) + 1}.0`
    publishForm.note = ''
    publishVisible.value = true
  }

  async function submitPublish() {
    if (!detail.value) return
    if (!publishForm.version.trim() || !publishForm.note.trim()) {
      ElMessage.warning('请填写版本号与变更说明')
      return
    }
    publishing.value = true
    try {
      await fetchPublishSkillVersion(detail.value.id, {
        version: publishForm.version.trim(),
        note: publishForm.note.trim()
      })
      ElMessage.success('新版本已发布')
      publishVisible.value = false
      await loadDetail(detail.value.id)
      emit('refresh')
    } finally {
      publishing.value = false
    }
  }
</script>
