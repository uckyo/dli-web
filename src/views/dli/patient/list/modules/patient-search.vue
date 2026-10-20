<!-- 患者列表搜索栏 -->
<template>
  <ArtSearchBar v-model="formData" :items="formItems" @reset="handleReset" @search="handleSearch">
  </ArtSearchBar>
</template>

<script setup lang="ts">
  import type { PatientSearchForm } from '@/views/dli/patient/constants'
  import {
    ENTRY_TYPE_CONFIG,
    GROUP_TYPE_CONFIG,
    MED_STATUS_CONFIG,
    RISK_LEVEL_CONFIG
  } from '@/views/dli/patient/constants'

  interface Props {
    modelValue: PatientSearchForm
  }

  interface Emits {
    (e: 'update:modelValue', value: PatientSearchForm): void
    (e: 'search', params: PatientSearchForm): void
    (e: 'reset'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  /**
   * 表单数据双向绑定
   */
  const formData = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  /**
   * 由枚举配置生成下拉选项
   */
  const toOptions = (config: Record<string, { label: string }>) =>
    Object.entries(config).map(([value, item]) => ({ label: item.label, value }))

  /**
   * 搜索表单配置项
   */
  const formItems = computed(() => [
    {
      label: '关键词',
      key: 'keyword',
      type: 'input',
      placeholder: '姓名 / 编号 / 医生',
      clearable: true
    },
    {
      label: '入组入口',
      key: 'entryType',
      type: 'select',
      props: {
        placeholder: '请选择入组入口',
        clearable: true,
        options: toOptions(ENTRY_TYPE_CONFIG)
      }
    },
    {
      label: '风险分层',
      key: 'riskLevel',
      type: 'select',
      props: {
        placeholder: '请选择风险分层',
        clearable: true,
        options: toOptions(RISK_LEVEL_CONFIG)
      }
    },
    {
      label: '用药状态',
      key: 'medStatus',
      type: 'select',
      props: {
        placeholder: '请选择用药状态',
        clearable: true,
        options: toOptions(MED_STATUS_CONFIG)
      }
    },
    {
      label: '入组分组',
      key: 'groupType',
      type: 'select',
      props: {
        placeholder: '请选择入组分组',
        clearable: true,
        options: toOptions(GROUP_TYPE_CONFIG)
      }
    }
  ])

  /**
   * 处理重置事件
   */
  const handleReset = () => {
    emit('reset')
  }

  /**
   * 处理搜索事件
   */
  const handleSearch = (params: PatientSearchForm) => {
    emit('search', params)
  }
</script>
