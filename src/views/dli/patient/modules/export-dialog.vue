<!-- 患者导出 [批注 04]：范围（当前筛选结果 / 已勾选记录）/ 字段 / 预计条数 -->
<template>
  <ElDialog
    :model-value="modelValue"
    title="导出患者数据"
    width="520px"
    destroy-on-close
    @update:model-value="close"
  >
    <ElForm label-width="110px">
      <ElFormItem label="导出范围">
        <ElRadioGroup v-model="scope">
          <ElRadioButton value="filtered">当前筛选结果</ElRadioButton>
          <ElRadioButton value="selected" :disabled="!selectedIds.length">
            已勾选记录（{{ selectedIds.length }}）
          </ElRadioButton>
        </ElRadioGroup>
      </ElFormItem>
      <ElFormItem label="导出字段">
        <ElCheckboxGroup v-model="selectedFields" class="flex flex-col">
          <ElCheckbox
            v-for="item in optionalFields"
            :key="item.key"
            :value="item.key"
            :label="item.label"
          />
        </ElCheckboxGroup>
        <div class="text-xs text-g-500 mt-1">
          患者编号为必导字段；导出内容不含姓名、手机号、病历号
        </div>
      </ElFormItem>
      <ElFormItem label="预计导出条数">
        <span class="text-g-900 font-medium">{{ count }} 条</span>
      </ElFormItem>
    </ElForm>
    <ElAlert
      v-if="count === 0"
      type="warning"
      :closable="false"
      show-icon
      :title="
        scope === 'selected' && !selectedIds.length
          ? '尚未勾选任何记录，请先在表格左侧勾选'
          : '当前条件下没有符合的记录，导出结果为空'
      "
    />

    <template #footer>
      <ElButton @click="close(false)">取消</ElButton>
      <ElButton type="primary" :disabled="count === 0" @click="download">确认下载</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import {
    ElAlert,
    ElButton,
    ElCheckbox,
    ElCheckboxGroup,
    ElDialog,
    ElForm,
    ElFormItem,
    ElMessage,
    ElRadioButton,
    ElRadioGroup
  } from 'element-plus'
  import { computed, ref, watch } from 'vue'
  import {
    EXPORT_FIELDS,
    buildExportCsv,
    fetchGetExportCount,
    type PatientRowQuery
  } from '@/mock/dli/patient-admin'

  defineOptions({ name: 'PatientExportDialog' })

  const props = defineProps<{
    modelValue: boolean
    query: PatientRowQuery
    /** 表格勾选的患者编号（空 = 无勾选） [批注 04] */
    selectedIds?: string[]
  }>()
  const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

  const optionalFields = EXPORT_FIELDS.filter((item) => !item.required)
  const selectedFields = ref<string[]>(optionalFields.map((item) => item.key))
  const count = ref(0)
  const scope = ref<'filtered' | 'selected'>('filtered')

  const selectedIds = computed(() => props.selectedIds ?? [])
  const effectiveIds = computed(() => (scope.value === 'selected' ? selectedIds.value : []))

  const queryKey = computed(() => JSON.stringify(props.query))
  watch(
    [() => props.modelValue, queryKey, effectiveIds],
    async () => {
      if (!props.modelValue) return
      if (scope.value === 'selected' && !selectedIds.value.length) {
        count.value = 0
        return
      }
      count.value = await fetchGetExportCount(props.query, effectiveIds.value)
    },
    { immediate: true }
  )

  /** 打开时默认回到筛选范围；有勾选则默认勾选范围 */
  watch(
    () => props.modelValue,
    (visible) => {
      if (visible) scope.value = selectedIds.value.length ? 'selected' : 'filtered'
    }
  )

  function close(value: boolean) {
    emit('update:modelValue', value)
  }

  function download() {
    const csv = buildExportCsv(props.query, selectedFields.value, effectiveIds.value)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `患者列表_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success(`已下载 ${count.value} 条记录`)
    // 下载完成仍停留原列表，只关闭弹窗
    close(false)
  }
</script>
