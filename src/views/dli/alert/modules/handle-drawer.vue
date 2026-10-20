<!-- 预警处置 / 详情抽屉 -->
<template>
  <ElDrawer v-model="visible" :title="drawerTitle" size="500px" :close-on-click-modal="false">
    <template v-if="alert">
      <div class="flex flex-col gap-5">
        <!-- 基础信息 -->
        <div class="rounded-lg bg-g-100 p-4">
          <div class="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
            <div class="flex gap-2">
              <span class="shrink-0 text-g-500">患者</span>
              <span class="min-w-0 break-all text-g-900">{{ alert.patientName }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-g-500">等级</span>
              <ElTag size="small" :type="LEVEL_META[alert.level].type">
                {{ LEVEL_META[alert.level].label }}
              </ElTag>
            </div>
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-g-500">来源</span>
              <ElTag size="small" :type="SOURCE_META[alert.source].type">
                {{ SOURCE_META[alert.source].label }}
              </ElTag>
            </div>
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-g-500">状态</span>
              <ElTag size="small" :type="STATUS_META[alert.status].type">
                {{ STATUS_META[alert.status].label }}
              </ElTag>
            </div>
            <div class="flex gap-2">
              <span class="shrink-0 text-g-500">发生时间</span>
              <span class="text-g-900">{{ alert.occurTime }}</span>
            </div>
            <div class="flex gap-2">
              <span class="shrink-0 text-g-500">响应时限</span>
              <span class="text-g-900">{{ alert.deadline }}</span>
            </div>
          </div>
        </div>

        <!-- 触发详情 -->
        <div>
          <h4 class="text-base font-medium text-g-900">触发详情</h4>
          <div class="mt-2 rounded-lg bg-g-100 p-4 text-sm">
            <div class="flex gap-3">
              <span class="shrink-0 text-g-500">触发规则</span>
              <span class="min-w-0 text-g-900">{{ alert.ruleName }}</span>
            </div>
            <div class="mt-2 flex gap-3">
              <span class="shrink-0 text-g-500">触发数据</span>
              <span class="min-w-0 leading-6 text-g-700">{{ alert.triggerData }}</span>
            </div>
          </div>
        </div>

        <!-- 处置记录 -->
        <div v-if="alert.handleRecord">
          <h4 class="text-base font-medium text-g-900">处置记录</h4>
          <div class="mt-2 rounded-lg border-full-d p-4 text-sm">
            <div class="flex items-center gap-3">
              <span class="shrink-0 text-g-500">处置动作</span>
              <ElTag size="small" :type="ACTION_META[alert.handleRecord.action].type">
                {{ ACTION_META[alert.handleRecord.action].label }}
              </ElTag>
            </div>
            <div class="mt-2 flex gap-3">
              <span class="shrink-0 text-g-500">处理意见</span>
              <span class="min-w-0 leading-6 text-g-700">{{ alert.handleRecord.opinion }}</span>
            </div>
            <div class="mt-2 flex gap-3">
              <span class="shrink-0 text-g-500">处置人</span>
              <span class="text-g-900">{{ alert.handleRecord.handler }}</span>
            </div>
            <div class="mt-2 flex gap-3">
              <span class="shrink-0 text-g-500">处置时间</span>
              <span class="text-g-900">{{ alert.handleRecord.handleTime }}</span>
            </div>
          </div>
        </div>

        <!-- 待处理：处置表单 -->
        <div v-else-if="showHandleForm">
          <h4 class="text-base font-medium text-g-900">处置操作</h4>
          <ElRadioGroup v-model="handleAction" class="mt-3">
            <ElRadio value="mark">标记处理</ElRadio>
            <ElRadio value="escalate">升级</ElRadio>
            <ElRadio value="followup">转随访</ElRadio>
          </ElRadioGroup>
          <ElInput
            v-model="handleOpinion"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            class="mt-3"
            placeholder="请填写处理意见（必填）"
          />
        </div>

        <!-- 只读查看未处置预警 -->
        <ElAlert
          v-else
          type="info"
          :closable="false"
          title="该预警尚未处置，当前为只读查看，请点击「处置」进行处理"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <ElButton @click="visible = false">{{ props.readonly ? '关闭' : '取消' }}</ElButton>
        <ElButton v-if="showHandleForm" type="primary" :loading="submitting" @click="submitHandle">
          提交处置
        </ElButton>
      </div>
    </template>
  </ElDrawer>
</template>

<script setup lang="ts">
  import { fetchHandleAlert } from '@/mock/dli/api'
  import type { AlertStatus, DliAlert } from '@/mock/dli/types'

  defineOptions({ name: 'DliAlertHandleDrawer' })

  type TagType = 'success' | 'warning' | 'info' | 'danger' | 'primary'
  type HandleAction = 'mark' | 'escalate' | 'followup'

  interface Props {
    alert?: DliAlert | null
    readonly?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    alert: null,
    readonly: false
  })

  const visible = defineModel<boolean>('visible', { default: false })

  const emit = defineEmits<{
    (e: 'submitted'): void
  }>()

  /** 预警等级配置 */
  const LEVEL_META: Record<DliAlert['level'], { label: string; type: TagType }> = {
    red: { label: '红色', type: 'danger' },
    orange: { label: '橙色', type: 'warning' },
    yellow: { label: '黄色', type: 'info' }
  }

  /** 预警来源配置 */
  const SOURCE_META: Record<DliAlert['source'], { label: string; type: TagType }> = {
    system: { label: '系统监测', type: 'primary' },
    patient: { label: '患者上报', type: 'warning' }
  }

  /** 预警状态配置 */
  const STATUS_META: Record<AlertStatus, { label: string; type: TagType }> = {
    pending: { label: '待处理', type: 'warning' },
    handled: { label: '已处理', type: 'success' },
    escalated: { label: '已升级', type: 'danger' }
  }

  /** 处置动作配置 */
  const ACTION_META: Record<HandleAction, { label: string; type: TagType }> = {
    mark: { label: '标记处理', type: 'success' },
    escalate: { label: '升级', type: 'danger' },
    followup: { label: '转随访', type: 'primary' }
  }

  const handleAction = ref<HandleAction>('mark')
  const handleOpinion = ref('')
  const submitting = ref(false)

  /** 抽屉标题 */
  const drawerTitle = computed(() => (props.readonly ? '预警详情' : '预警处置'))

  /** 是否展示处置表单 */
  const showHandleForm = computed(
    () => !!props.alert && props.alert.status === 'pending' && !props.readonly
  )

  /**
   * 提交处置
   */
  const submitHandle = async () => {
    if (!props.alert) return
    if (!handleOpinion.value.trim()) {
      ElMessage.warning('请填写处理意见')
      return
    }

    submitting.value = true
    try {
      await fetchHandleAlert(props.alert.id, handleAction.value, handleOpinion.value.trim())
      ElMessage.success('处置已提交')
      visible.value = false
      emit('submitted')
    } catch {
      ElMessage.error('处置提交失败，请稍后重试')
    } finally {
      submitting.value = false
    }
  }

  watch(visible, (value) => {
    if (!value) return
    handleAction.value = 'mark'
    handleOpinion.value = ''
  })
</script>
