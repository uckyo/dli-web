<!-- 患者研究记录抽屉 [批注 15]：终点资料 / 安全事件，研究进度与患者详情研究入组共用 -->
<template>
  <ElDrawer
    v-model="visible"
    :title="`患者研究记录 · ${patientId}`"
    size="620px"
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
        <ElTabPane label="安全事件" name="safety">
          <ArtTable
            :data="record?.safetyEvents ?? []"
            :columns="safetyColumns"
            empty-text="暂无安全事件"
          />
        </ElTabPane>
      </ElTabs>
    </div>
  </ElDrawer>
</template>

<script setup lang="ts">
  import {
    ElDescriptions,
    ElDescriptionsItem,
    ElDrawer,
    ElMessage,
    ElTabPane,
    ElTabs,
    ElTag
  } from 'element-plus'
  import { computed, ref, watch } from 'vue'
  import { fetchGetPatientResearchRecord } from '@/mock/dli/blueprint/api'
  import type {
    PatientEndpointRecord,
    PatientResearchRecord,
    PatientSafetyEvent
  } from '@/mock/dli/blueprint/types'
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
    { prop: 'name', label: '事件名称', minWidth: 140 },
    { prop: 'occurredAt', label: '发生时间', width: 130 },
    { prop: 'description', label: '事件说明', minWidth: 220, showOverflowTooltip: true },
    { prop: 'source', label: '关联资料', minWidth: 160 },
    {
      prop: 'doctorConfirmed',
      label: '医生确认状态',
      width: 130,
      formatter: (row: PatientSafetyEvent) =>
        h(
          ElTag,
          { effect: 'plain', type: row.doctorConfirmed ? 'success' : 'info', size: 'small' },
          () => (row.doctorConfirmed ? '医生已确认' : '待医生确认')
        )
    }
  ]

  async function load() {
    if (!props.modelValue || !props.patientId || !props.projectId) return
    loading.value = true
    try {
      record.value = await fetchGetPatientResearchRecord(props.projectId, props.patientId)
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
