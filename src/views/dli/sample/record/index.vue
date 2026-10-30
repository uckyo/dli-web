<!-- DLI 生物样本 · 样本管理：只读展示样本库数据 -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <ArtSearchBar
      v-model="searchParams"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData" />

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <SampleDetailDrawer v-model="drawerVisible" :sample="activeSample" :tab="drawerTab" />
  </div>
</template>

<script setup lang="ts">
  import { ElTag, ElButton } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchGetSampleList } from '@/mock/dli/api'
  import type { SampleRecord } from '@/mock/dli/types'
  import { SAMPLE_STATUS_TAG, SCOPE_TAG } from '../format'
  import SampleDetailDrawer from './modules/sample-detail-drawer.vue'

  defineOptions({ name: 'DliSampleRecord' })

  const searchItems = [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: '样本编号 / 样本名称 / 患者编号',
      span: 6
    }
  ]

  const drawerVisible = ref(false)
  const drawerTab = ref<'detail' | 'flow'>('detail')
  const activeSample = ref<SampleRecord>()

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    searchParams,
    getData,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: fetchGetSampleList,
      apiParams: { current: 1, size: 10, keyword: '' },
      columnsFactory: () => [
        { prop: 'id', label: '样本编号', minWidth: 205 },
        { prop: 'name', label: '样本名称', width: 88 },
        { prop: 'patientId', label: '患者编号', width: 118 },
        { prop: 'center', label: '所属中心', width: 78 },
        {
          prop: 'type',
          label: '样本类型',
          width: 80,
          formatter: (row: SampleRecord) =>
            h(ElTag, { effect: 'plain', type: 'primary' }, () => row.type)
        },
        { prop: 'collectedAt', label: '采集时间', width: 138 },
        {
          prop: 'remaining',
          label: '剩余样本量',
          width: 88,
          align: 'right' as const,
          formatter: (row: SampleRecord) => `${row.remaining} ${row.unit}`
        },
        {
          prop: 'status',
          label: '样本状态',
          width: 80,
          formatter: (row: SampleRecord) =>
            h(ElTag, { effect: 'light', type: SAMPLE_STATUS_TAG[row.status] }, () => row.status)
        },
        { prop: 'location', label: '保存位置', minWidth: 120 },
        {
          prop: 'shareLevel',
          label: '共享级别',
          width: 80,
          formatter: (row: SampleRecord) =>
            h(ElTag, { effect: 'plain', type: SCOPE_TAG[row.shareLevel] }, () => row.shareLevel)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 145,
          fixed: 'right' as const,
          align: 'center' as const,
          formatter: (row: SampleRecord) =>
            h('div', { class: 'flex-c justify-center gap-3' }, [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openDetail(row, 'detail') },
                () => '查看详情'
              ),
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openDetail(row, 'flow') },
                () => '流转记录'
              )
            ])
        }
      ]
    }
  })

  function openDetail(row: SampleRecord, tab: 'detail' | 'flow') {
    activeSample.value = row
    drawerTab.value = tab
    drawerVisible.value = true
  }

  function handleSearch() {
    getData()
  }

  function handleReset() {
    resetSearchParams()
  }
</script>

<style scoped>
  :deep(.el-table .cell) {
    padding: 0 8px;
  }
</style>
