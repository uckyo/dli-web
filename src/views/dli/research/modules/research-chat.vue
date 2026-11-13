<!-- 研究 Agent 对话 [批注 08]：列表 / 详情复用同一弹窗，带入项目及所选条件，结果可保存到数据分析 -->
<template>
  <ChatDialog
    v-model="visible"
    :title="`研究 Agent · ${research?.name ?? ''}`"
    :subtitle="subtitle"
    avatar-icon="ri:robot-2-line"
    :badge-text="readonly ? '只读查看' : '可对话'"
    :badge-type="readonly ? 'info' : 'success'"
    peer-name="研究 Agent"
    peer-subtitle="在线 · 已加载研究配置"
    peer-icon="ri:robot-2-line"
    :messages="chatMessages"
    :readonly="readonly"
    readonly-tip="当前角色仅可查看共享研究项目的对话记录；发起分析与保存结果需由项目授权成员操作。"
    placeholder="描述分析需求，例如：按研究组别对比 6 个月转归概率"
    :quick-prompts="QUICK_PROMPTS"
    :context-title="research?.name ?? '研究项目'"
    :context-subtitle="research?.id"
    context-icon="ri:flask-line"
    :context-tags="contextTags"
    :context-note="`当前条件：${formatCondition(effectiveCondition)}。切换条件后旧结果仍标原条件；无数据不生成结论。`"
    :pending="replying"
    pending-text="研究 Agent 正在分析…"
    @send="sendMessage"
  >
    <template #actions>
      <ElButton
        v-if="!readonly"
        size="small"
        type="primary"
        plain
        :disabled="replying"
        @click="startAnalysis"
      >
        按当前条件发起分析
      </ElButton>
      <ElTooltip content="清空对话" placement="top">
        <ArtIconButton
          icon="ri:delete-bin-6-line"
          circle
          class="size-9 text-g-600"
          @click="resetMessages"
        />
      </ElTooltip>
    </template>

    <template #after-messages>
      <div
        v-for="run in runs"
        :key="run.id"
        class="mb-3 rounded-lg border border-full-d bg-active-color/30 p-3"
      >
        <div class="flex-cb gap-2">
          <div class="flex-c gap-2">
            <span class="text-sm font-medium text-g-900">分析任务 {{ run.id }}</span>
            <ElTag
              size="small"
              effect="plain"
              :type="
                run.status === '完成' ? 'success' : run.status === '失败' ? 'danger' : 'warning'
              "
            >
              {{ run.status }}
            </ElTag>
          </div>
          <span class="text-xs text-g-500">{{ run.createdAt }}</span>
        </div>
        <p class="mt-2 text-xs leading-5 text-g-600">{{ formatCondition(run.condition) }}</p>
        <p v-if="run.error" class="mt-1 text-xs text-danger">{{ run.error }}</p>
        <div v-if="run.status === '完成' && !readonly" class="mt-2 flex-c gap-2">
          <ElButton size="small" @click="viewResult(run)">查看结果</ElButton>
          <ElButton
            size="small"
            type="primary"
            :disabled="run.saved"
            :loading="savingRunId === run.id"
            @click="saveResult(run)"
          >
            {{ run.saved ? '已保存到数据分析' : '保存到数据分析' }}
          </ElButton>
        </div>
      </div>
    </template>
  </ChatDialog>
</template>

<script setup lang="ts">
  import { ElButton, ElMessage, ElMessageBox, ElTag, ElTooltip } from 'element-plus'
  import { computed, ref, watch } from 'vue'
  import type { ResearchItem, ResearchChatMessage } from '@/mock/dli/types'
  import { useUserStore } from '@/store/modules/user'
  import ChatDialog from '@/components/business/dli/chat-dialog/index.vue'
  import {
    fetchCreateAnalysisRun,
    fetchEnsureResearchProjectDetail,
    fetchGetAnalysisRuns,
    fetchRefreshAnalysisRun,
    fetchSaveAnalysisRun
  } from '@/mock/dli/blueprint/api'
  import type { AnalysisCondition, AnalysisRun } from '@/mock/dli/blueprint/types'

  defineOptions({ name: 'ResearchChat' })

  const props = defineProps<{
    modelValue: boolean
    research?: ResearchItem
    readonly: boolean
    condition?: AnalysisCondition
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    saved: []
  }>()

  const userStore = useUserStore()
  const userName = computed(() => userStore.getUserInfo.userName ?? '我')

  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const QUICK_PROMPTS = [
    '按分组对比转归概率',
    '生成入组与排除标准',
    '列出还需补充的指标',
    '输出统计分析计划'
  ]

  const messages = ref<ResearchChatMessage[]>([])
  const runs = ref<AnalysisRun[]>([])
  const replying = ref(false)
  const savingRunId = ref('')

  const subtitle = computed(
    () =>
      `${props.research?.id ?? ''} · ${props.research?.owner ?? ''} · ${props.research?.center ?? ''}`
  )

  const effectiveCondition = computed<AnalysisCondition>(() => {
    if (props.condition) return props.condition
    const groupBy = props.research?.groupBy[0] ?? '研究组别'
    const indicators = props.research?.indicators ?? []
    return {
      group: '全部入组',
      indicator: indicators[0] ?? '',
      timeRange: '全研究周期',
      groupBy,
      groupValue: '全部入组',
      indicators
    }
  })

  const contextTags = computed(() => [
    { label: '分组维度', items: [effectiveCondition.value.groupBy ?? '研究组别'] },
    {
      label: '分组取值',
      items: [(effectiveCondition.value.groupValue ?? effectiveCondition.value.group) || '全部入组']
    },
    {
      label: '观察指标',
      items:
        effectiveCondition.value.indicators ??
        (effectiveCondition.value.indicator ? [effectiveCondition.value.indicator] : []),
      type: 'primary' as const
    },
    { label: '观察时间范围', items: [effectiveCondition.value.timeRange || '全研究周期'] }
  ])

  const chatMessages = computed(() =>
    messages.value.map((message) => ({
      id: message.id,
      from: message.from === 'user' ? ('me' as const) : ('other' as const),
      sender: message.from === 'user' ? userName.value : '研究 Agent',
      content: message.content,
      time: message.time
    }))
  )

  const now = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  function formatCondition(condition: AnalysisCondition): string {
    const indicators = condition.indicators ?? (condition.indicator ? [condition.indicator] : [])
    const groupValue = (condition.groupValue ?? condition.group) || '全部入组'
    return `${condition.groupBy ?? '研究组别'}：${groupValue}；观察指标：${
      indicators.join('、') || '—'
    }；观察时间：${condition.timeRange || '全研究周期'}`
  }

  function buildInitialMessages(research: ResearchItem): ResearchChatMessage[] {
    return [
      {
        id: 'init-1',
        from: 'agent',
        content: `已加载研究「${research.name}」。当前条件：${formatCondition(effectiveCondition.value)}。可以确认条件后发起分析，也可以继续讨论分析计划。`,
        time: '09:12'
      },
      {
        id: 'init-2',
        from: 'user',
        content: `先按${effectiveCondition.value.groupBy ?? '研究组别'}分组，看看所选指标差异。`,
        time: '09:14'
      },
      {
        id: 'init-3',
        from: 'agent',
        content:
          '已记录当前条件。正式结论需通过「按当前条件发起分析」生成；旧结果会保留原条件快照，无数据时不会生成结论。',
        time: '09:15'
      }
    ]
  }

  function resetMessages() {
    if (!props.research) return
    replying.value = false
    messages.value = buildInitialMessages(props.research)
  }

  function sendMessage(text: string) {
    if (!props.research || replying.value) return
    messages.value.push({
      id: `user-${Date.now()}`,
      from: 'user',
      content: text,
      time: now()
    })
    replying.value = true
    setTimeout(() => {
      replying.value = false
      messages.value.push({
        id: `agent-${Date.now()}`,
        from: 'agent',
        content: `收到。当前项目「${props.research?.name ?? ''}」使用条件：${formatCondition(effectiveCondition.value)}。如需正式结果，请点击右上角「按当前条件发起分析」。`,
        time: now()
      })
    }, 700)
  }

  async function startAnalysis() {
    if (!props.research || props.readonly || replying.value) return
    replying.value = true
    try {
      await fetchEnsureResearchProjectDetail(props.research)
      const run = await fetchCreateAnalysisRun(props.research.id, effectiveCondition.value)
      runs.value.unshift(run)
      messages.value.push({
        id: `analysis-${run.id}`,
        from: 'agent',
        content: `已按条件发起分析：${formatCondition(effectiveCondition.value)}。结果卡片显示进行中 / 完成 / 失败。`,
        time: now()
      })
      window.setTimeout(async () => {
        try {
          const updated = await fetchRefreshAnalysisRun(run.id)
          runs.value = runs.value.map((item) => (item.id === updated.id ? updated : item))
        } catch (error) {
          ElMessage.error(error instanceof Error ? error.message : '分析状态刷新失败')
        }
      }, 700)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '发起分析失败')
    } finally {
      replying.value = false
    }
  }

  function viewResult(run: AnalysisRun) {
    const result = run.result
    if (!result) return
    ElMessageBox.alert(
      [
        `条件：${formatCondition(run.condition)}`,
        `统计方式：${result.statisticalMethod}`,
        `单位：${result.unit || '—'}`,
        `有效样本数：${result.validCount}`,
        `缺失数：${result.missingCount}`,
        `统计结果：${result.value}${result.unit}`
      ].join('\n'),
      '查看分析结果',
      { type: 'info' }
    )
  }

  async function saveResult(run: AnalysisRun) {
    if (run.saved || savingRunId.value) return
    savingRunId.value = run.id
    try {
      await fetchSaveAnalysisRun(run.id)
      runs.value = runs.value.map((item) => (item.id === run.id ? { ...item, saved: true } : item))
      emit('saved')
      ElMessage.success('结果已保存到数据分析页签')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存结果失败')
    } finally {
      savingRunId.value = ''
    }
  }

  watch(
    () => [props.modelValue, props.research?.id],
    async ([open]) => {
      if (!open || !props.research) return
      replying.value = false
      messages.value = buildInitialMessages(props.research)
      try {
        runs.value = await fetchGetAnalysisRuns(props.research.id)
      } catch {
        runs.value = []
      }
    },
    { immediate: true }
  )
</script>
