<!-- 研究 Agent 对话：复用 DLI 通用对话弹窗，临床角色可发起分析，管理端只读 -->
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
    readonly-tip="当前角色仅可查看共享研究项目的对话记录；新建研究与共享设置需由医生、医生助理或护士发起。"
    placeholder="描述分析需求，例如：按用药方案分组对比 6 个月转归概率"
    :quick-prompts="QUICK_PROMPTS"
    :context-title="research?.name ?? '研究项目'"
    :context-subtitle="research?.id"
    context-icon="ri:flask-line"
    :context-tags="contextTags"
    context-note="对话基于研究配置与演示数据生成，正式环境将调用研究 Agent 服务。"
    :pending="replying"
    pending-text="研究 Agent 正在分析…"
    @send="sendMessage"
  >
    <template #actions>
      <ElTooltip content="清空对话" placement="top">
        <ArtIconButton
          icon="ri:delete-bin-6-line"
          circle
          class="size-9 text-g-600"
          @click="resetMessages"
        />
      </ElTooltip>
      <ArtIconButton icon="ri:more-2-fill" circle class="size-9 text-g-600" />
    </template>
  </ChatDialog>
</template>

<script setup lang="ts">
  import type { ResearchItem, ResearchChatMessage } from '@/mock/dli/types'
  import { useUserStore } from '@/store/modules/user'
  import ChatDialog from '@/components/business/dli/chat-dialog/index.vue'

  defineOptions({ name: 'ResearchChat' })

  const props = defineProps<{
    modelValue: boolean
    research?: ResearchItem
    readonly: boolean
  }>()

  const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

  const userStore = useUserStore()
  const userName = computed(() => userStore.getUserInfo.userName ?? '我')

  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  /** 快捷问题 */
  const QUICK_PROMPTS = [
    '按分组对比转归概率',
    '生成入组与排除标准',
    '列出还需补充的指标',
    '输出统计分析计划'
  ]

  const messages = ref<ResearchChatMessage[]>([])
  const replying = ref(false)

  const subtitle = computed(
    () => `${props.research?.id} · ${props.research?.owner} · ${props.research?.center}`
  )

  /** 左侧研究上下文 */
  const contextTags = computed(() => [
    { label: '分组维度', items: props.research?.groupBy ?? [] },
    { label: '观察指标', items: props.research?.indicators ?? [], type: 'primary' as const }
  ])

  /** 转换为对话弹窗消息结构 */
  const chatMessages = computed(() =>
    messages.value.map((message) => ({
      id: message.id,
      from: message.from === 'user' ? ('me' as const) : ('other' as const),
      sender: message.from === 'user' ? userName.value : '研究 Agent',
      content: message.content,
      time: message.time
    }))
  )

  /** 当前时间（时:分） */
  const now = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  /** 打开时初始化对话 */
  watch(
    () => [props.modelValue, props.research?.id],
    ([open]) => {
      if (!open || !props.research) return
      replying.value = false
      messages.value = buildInitialMessages(props.research)
    },
    { immediate: true }
  )

  /** 基于研究配置生成初始对话 */
  function buildInitialMessages(research: ResearchItem): ResearchChatMessage[] {
    const [firstGroup, secondGroup] = research.groupBy
    const indicators = research.indicators.slice(0, 3).join('、')
    return [
      {
        id: 'init-1',
        from: 'agent',
        content: `已加载研究「${research.name}」。当前分组维度：${research.groupBy.join('、')}；观察指标：${indicators}。可以让我做分组对比、生成分析计划或补充指标建议。`,
        time: '09:12'
      },
      {
        id: 'init-2',
        from: 'user',
        content: `先按${research.groupBy.join('和')}分组，看看转归预测的差异。`,
        time: '09:14'
      },
      {
        id: 'init-3',
        from: 'agent',
        content: `已完成初步分层（演示数据）：\n· ${firstGroup ?? '分组一'}：高风险占比 18.2%，6 个月转归良好率 71.4%\n· ${secondGroup ?? '分组二'}：高风险占比 26.8%，6 个月转归良好率 62.1%\n建议下一步补充「${research.indicators[0] ?? '核心指标'}」的时序变化，以判断差异是否具有统计学意义。`,
        time: '09:15'
      }
    ]
  }

  /** 清空并恢复初始对话 */
  function resetMessages() {
    if (!props.research) return
    replying.value = false
    messages.value = buildInitialMessages(props.research)
  }

  /** 发送消息（演示：本地生成回复） */
  function sendMessage(text: string) {
    if (!props.research || replying.value) return
    const research = props.research
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
        content: `收到。我将基于「${research.name}」按 ${research.groupBy.join('、')} 分组，围绕 ${research.indicators
          .slice(0, 3)
          .join('、')} 运行分析。结果将写入研究报告，并同步至共享范围内的成员（演示）。`,
        time: now()
      })
    }, 900)
  }
</script>
