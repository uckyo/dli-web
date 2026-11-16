<!-- 患者研究记录抽屉 [批注 15]：终点资料 / 安全事件，研究进度与患者详情研究入组共用 -->
<template>
  <ElDrawer
    v-model="visible"
    :title="`患者研究记录 · ${patientId}`"
    size="860px"
    append-to-body
    destroy-on-close
  >
    <div v-loading="loading">
      <ElDescriptions :column="2" border class="mb-4">
        <ElDescriptionsItem label="患者编号">{{ patientId }}</ElDescriptionsItem>
        <ElDescriptionsItem label="研究项目">{{ projectId }}</ElDescriptionsItem>
      </ElDescriptions>

      <ElTabs v-model="activeTab">
        <ElTabPane label="终点资料" name="endpoint">
          <ArtTable
            :data="record?.endpoints ?? []"
            :columns="endpointColumns"
            empty-text="暂无终点资料"
          />
        </ElTabPane>

        <!-- 安全事件：事件名称 / 发生时间 / 事件说明 / 关联资料 / 医生确认状态 [批注 15] -->
        <ElTabPane label="安全事件" name="safety">
          <div v-if="canManage" class="dli-pane-bar">
            <ElButton type="primary" plain @click="openSafetyDialog">登记事件</ElButton>
          </div>
          <ArtTable :data="safetyRows" :columns="safetyColumns" empty-text="暂无安全事件" />
        </ElTabPane>
      </ElTabs>
    </div>

    <!-- 登记安全事件：字段与列表一致，不再额外采集“级别”等文档未约定的字段 -->
    <ElDialog
      v-model="safetyDialogVisible"
      title="登记安全事件"
      width="520px"
      append-to-body
      destroy-on-close
    >
      <ElForm ref="safetyFormRef" :model="safetyForm" :rules="safetyRules" label-width="96px">
        <ElFormItem label="事件名称" prop="name">
          <ElInput v-model="safetyForm.name" maxlength="30" placeholder="例如：药物相关肝酶升高" />
        </ElFormItem>
        <ElFormItem label="发生时间" prop="occurredAt">
          <ElDatePicker
            v-model="safetyForm.occurredAt"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择发生时间"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="事件说明" prop="description">
          <ElInput
            v-model="safetyForm.description"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="填写事件经过与处理情况"
          />
        </ElFormItem>
        <ElFormItem label="关联资料" prop="source">
          <ElInput
            v-model="safetyForm.source"
            maxlength="40"
            placeholder="例如：检验报告 EX-0013"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="safetyDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="safetySaving" @click="submitSafetyEvent">
          确认登记
        </ElButton>
      </template>
    </ElDialog>
  </ElDrawer>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElDatePicker,
    ElDescriptions,
    ElDescriptionsItem,
    ElDialog,
    ElDrawer,
    ElForm,
    ElFormItem,
    ElInput,
    ElMessage,
    ElTabPane,
    ElTabs,
    ElTag
  } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { computed, reactive, ref, watch } from 'vue'
  import {
    fetchAddSafetyEvent,
    fetchConfirmSafetyEvent,
    fetchGetPatientSafetyEvents
  } from '@/mock/dli/api'
  import { fetchGetPatientResearchRecord } from '@/mock/dli/blueprint/api'
  import { useUserStore } from '@/store/modules/user'
  import type {
    PatientEndpointRecord,
    PatientResearchRecord,
    PatientSafetyEvent
  } from '@/mock/dli/blueprint/types'
  import type { SafetyEvent } from '@/mock/dli/types'
  import type { ColumnOption } from '@/types/component'

  defineOptions({ name: 'PatientResearchRecordDrawer' })

  const props = defineProps<{
    modelValue: boolean
    patientId: string
    projectId: string
  }>()
  const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  const activeTab = ref('endpoint')
  const loading = ref(false)
  const record = ref<PatientResearchRecord>()
  const safetyList = ref<SafetyEvent[]>([])

  /** 安全事件按批注 15 的五个字段展示，数据源与登记 / 医生确认一致 */
  const safetyRows = computed<PatientSafetyEvent[]>(() =>
    safetyList.value.map((event) => ({
      id: event.id,
      name: event.type,
      occurredAt: event.date,
      description: event.description,
      source: event.source,
      doctorConfirmed: event.confirmed,
      confirmedBy: event.confirmedBy
    }))
  )

  /* 登记与医生确认沿用患者档案同一份安全事件数据，医护 / 医生权限分流 */
  const userStore = useUserStore()
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const isDoctor = computed(() => role.value === 'R_DOCTOR')
  const canManage = computed(() => ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role.value))
  const operatorName = computed(() => {
    const info = userStore.getUserInfo as {
      userName?: string
      username?: string
      nickName?: string
    }
    return info.userName ?? info.username ?? info.nickName ?? '当前医护'
  })

  const endpointColumns: ColumnOption<PatientEndpointRecord>[] = [
    { prop: 'indicator', label: '指标名称', minWidth: 150 },
    { prop: 'observedAt', label: '观察时点 / 日期', width: 150 },
    { prop: 'value', label: '指标值', width: 100 },
    { prop: 'unit', label: '单位', width: 90 },
    { prop: 'source', label: '来源资料', minWidth: 160 },
    {
      prop: 'status',
      label: '核对状态',
      width: 110,
      formatter: (row: PatientEndpointRecord) =>
        h(
          ElTag,
          { effect: 'plain', type: row.status === '已核对' ? 'success' : 'warning', size: 'small' },
          () => row.status
        )
    }
  ]

  const safetyColumns: ColumnOption<PatientSafetyEvent>[] = [
    { prop: 'name', label: '事件名称', minWidth: 140, showOverflowTooltip: true },
    { prop: 'occurredAt', label: '发生时间', width: 115 },
    { prop: 'description', label: '事件说明', minWidth: 180, showOverflowTooltip: true },
    { prop: 'source', label: '关联资料', minWidth: 130, showOverflowTooltip: true },
    {
      prop: 'doctorConfirmed',
      label: '医生确认状态',
      width: 120,
      formatter: (row: PatientSafetyEvent) =>
        h(
          ElTag,
          { effect: 'plain', type: row.doctorConfirmed ? 'success' : 'info', size: 'small' },
          () => (row.doctorConfirmed ? '医生已确认' : '待医生确认')
        )
    },
    {
      prop: 'operation',
      label: '操作',
      width: 90,
      formatter: (row: PatientSafetyEvent) => {
        if (row.doctorConfirmed) {
          return h('span', { class: 'text-xs text-g-500' }, () => row.confirmedBy || '已确认')
        }
        if (!isDoctor.value) return h('span', { class: 'text-xs text-g-500' }, () => '待医生确认')
        return h(
          ElButton,
          { link: true, type: 'primary', onClick: () => confirmSafetyEvent(row) },
          () => '确认'
        )
      }
    }
  ]

  /* ---------------------- 登记安全事件 ---------------------- */
  const safetyDialogVisible = ref(false)
  const safetySaving = ref(false)
  const safetyFormRef = ref<FormInstance>()
  const safetyForm = reactive({
    name: '',
    occurredAt: new Date().toISOString().slice(0, 10),
    description: '',
    source: ''
  })
  const safetyRules: FormRules = {
    name: [{ required: true, message: '请填写事件名称', trigger: 'blur' }],
    occurredAt: [{ required: true, message: '请选择发生时间', trigger: 'change' }],
    description: [{ required: true, message: '请填写事件说明', trigger: 'blur' }]
  }

  function openSafetyDialog() {
    safetyForm.name = ''
    safetyForm.occurredAt = new Date().toISOString().slice(0, 10)
    safetyForm.description = ''
    safetyForm.source = ''
    safetyDialogVisible.value = true
  }

  async function submitSafetyEvent() {
    if (!safetyFormRef.value) return
    const valid = await safetyFormRef.value.validate().catch(() => false)
    if (!valid) return
    safetySaving.value = true
    try {
      await fetchAddSafetyEvent(props.patientId, {
        type: safetyForm.name,
        level: '中度',
        description: safetyForm.description,
        source: safetyForm.source
      })
      safetyDialogVisible.value = false
      await load()
      ElMessage.success('安全事件已登记，待医生确认后生效')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '登记失败')
    } finally {
      safetySaving.value = false
    }
  }

  async function confirmSafetyEvent(row: PatientSafetyEvent) {
    try {
      await fetchConfirmSafetyEvent(props.patientId, row.id, operatorName.value)
      await load()
      ElMessage.success('医生已确认该安全事件')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '确认失败')
    }
  }

  async function load() {
    if (!props.modelValue || !props.patientId || !props.projectId) return
    loading.value = true
    try {
      const [detail, events] = await Promise.all([
        fetchGetPatientResearchRecord(props.projectId, props.patientId),
        fetchGetPatientSafetyEvents(props.patientId)
      ])
      record.value = detail
      safetyList.value = events
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '患者研究记录加载失败')
    } finally {
      loading.value = false
    }
  }

  watch(
    () => [props.modelValue, props.patientId, props.projectId],
    () => void load(),
    { immediate: true }
  )
</script>
