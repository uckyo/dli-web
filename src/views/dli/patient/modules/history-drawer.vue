<!-- 诊疗历程抽屉：按时间倒序展示现病史 / 用药 / 检查 / 诊断等事件 -->
<template>
  <ElDrawer v-model="visible" :title="`诊疗历程 · ${patient?.name ?? ''}`" size="560px">
    <div v-loading="loading" class="flex h-full flex-col">
      <div class="mb-4 rounded-lg bg-g-100 px-3 py-2 text-xs text-g-600">
        现病史置顶，其余事件按发生时间倒序排列 · 当前状态：{{ patient?.status ?? '—' }}
      </div>

      <div class="flex-1 overflow-y-auto pr-1">
        <ElTimeline>
          <ElTimelineItem
            v-for="event in detail?.history ?? []"
            :key="event.id"
            :timestamp="event.date"
            placement="top"
            :color="CATEGORY_COLOR[event.category]"
          >
            <div class="rounded-lg border border-full-d bg-g-100/60 px-3 py-2">
              <div class="flex-cb gap-2">
                <span class="text-sm font-medium text-g-900">{{ event.title }}</span>
                <ElTag size="small" effect="plain">{{ event.category }}</ElTag>
              </div>
              <p class="mt-1 text-sm leading-6 text-g-600">{{ event.detail }}</p>
            </div>
          </ElTimelineItem>
        </ElTimeline>
      </div>

      <div class="mt-3 border-t border-full-d pt-3">
        <p class="text-xs text-g-500">诊疗历程由系统自动汇总，编辑需在对应业务模块中完成。</p>
        <div class="mt-2 flex justify-end">
          <ElButton @click="visible = false">关闭</ElButton>
        </div>
      </div>
    </div>
  </ElDrawer>
</template>

<script setup lang="ts">
  import { fetchGetPatientDetail } from '@/mock/dli/api'
  import type { HistoryEvent, WebPatient, WebPatientDetail } from '@/mock/dli/types'

  defineOptions({ name: 'PatientHistoryDrawer' })

  const props = defineProps<{
    modelValue: boolean
    patient?: WebPatient
  }>()

  const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  /** 事件分类颜色 */
  const CATEGORY_COLOR: Record<HistoryEvent['category'], string> = {
    现病史: '#f56c6c',
    既往史: '#909399',
    用药: '#409eff',
    检查: '#e6a23c',
    诊断: '#67c23a',
    随访: '#909399'
  }

  const loading = ref(false)
  const detail = ref<WebPatientDetail>()

  watch(
    () => [props.modelValue, props.patient?.id],
    async ([open]) => {
      if (!open || !props.patient) return
      loading.value = true
      try {
        const data = await fetchGetPatientDetail(props.patient.id)
        detail.value = {
          ...data,
          history: [...data.history].sort((a, b) => {
            if (a.category === '现病史') return -1
            if (b.category === '现病史') return 1
            return b.date.localeCompare(a.date)
          })
        }
      } finally {
        loading.value = false
      }
    },
    { immediate: true }
  )
</script>
