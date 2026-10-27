<!-- 医患对话：复用 DLI 通用对话弹窗，临床角色可继续回复，管理端只读 -->
<template>
  <ChatDialog
    v-model="visible"
    :title="`医患对话 · ${patient?.name ?? ''}`"
    :subtitle="`患者编号 ${detail?.id ?? patient?.id ?? '—'} · 主管医生 ${patient?.doctor ?? '—'}`"
    avatar-icon="ri:user-heart-line"
    :badge-text="readonly ? '只读查看' : '可回复'"
    :badge-type="readonly ? 'info' : 'success'"
    :peer-name="patient?.name ?? '患者'"
    :peer-subtitle="peerSubtitle"
    peer-icon="ri:user-line"
    :messages="chatMessages"
    :readonly="readonly"
    readonly-tip="当前角色仅可查看医患对话，回复与处置需由医生 / 医生助理 / 护士完成。"
    placeholder="输入回复内容，仅作为沟通记录，不替代医嘱"
    :maxlength="200"
    :context-title="patient?.name ?? '患者'"
    :context-subtitle="patient?.id"
    context-icon="ri:user-heart-line"
    :context-tags="contextTags"
    context-note="对话仅作为医患沟通记录，涉及诊疗处置请前往对应业务模块。"
    :loading="loading"
    @send="sendMessage"
  />
</template>

<script setup lang="ts">
  import { fetchGetPatientDetail } from '@/mock/dli/api'
  import type { WebPatient, WebPatientDetail } from '@/mock/dli/types'
  import ChatDialog from '@/components/business/dli/chat-dialog/index.vue'

  defineOptions({ name: 'PatientChatDrawer' })

  const props = defineProps<{
    modelValue: boolean
    patient?: WebPatient
    readonly: boolean
  }>()

  const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const loading = ref(false)
  const detail = ref<WebPatientDetail>()

  watch(
    () => [props.modelValue, props.patient?.id],
    async ([open]) => {
      if (!open || !props.patient) return
      loading.value = true
      try {
        detail.value = await fetchGetPatientDetail(props.patient.id)
      } finally {
        loading.value = false
      }
    },
    { immediate: true }
  )

  /** 会话对象状态 */
  const peerSubtitle = computed(() =>
    props.patient
      ? `${props.patient.gender} · ${props.patient.age} 岁 · ${props.patient.status}`
      : ''
  )

  /** 左侧患者上下文 */
  const contextTags = computed(() => {
    const groups = [
      {
        label: '基本信息',
        items: props.patient ? [`${props.patient.gender} · ${props.patient.age} 岁`] : []
      },
      {
        label: '诊疗信息',
        items: props.patient
          ? [props.patient.group, props.patient.status, props.patient.doctor]
          : []
      },
      { label: '当前用药', items: detail.value?.medication ?? [] }
    ]
    return groups.filter((group) => group.items.length > 0)
  })

  /** 转换为对话弹窗消息结构 */
  const chatMessages = computed(() =>
    (detail.value?.conversations ?? []).map((message) => ({
      id: message.id,
      from: message.from === 'doctor' ? ('me' as const) : ('other' as const),
      sender: message.sender,
      content: message.content,
      time: message.time
    }))
  )

  /** 发送回复（前端演示，不持久化） */
  function sendMessage(text: string) {
    if (!detail.value) return
    detail.value.conversations.push({
      id: `local-${Date.now()}`,
      from: 'doctor',
      sender: '我',
      content: text,
      time: new Date().toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    })
    ElMessage.success('回复已发送（演示）')
  }
</script>
