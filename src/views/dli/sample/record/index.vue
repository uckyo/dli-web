<!-- DLI 生物样本 · 样本管理 -->
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
  </div>
</template>

<script setup lang="ts">
  import { ElTag } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchGetSampleList } from '@/mock/dli/api'
  import type { SampleRecord } from '@/mock/dli/types'

  defineOptions({ name: 'DliSampleRecord' })

  const searchItems = [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: '样本编号 / 患者姓名',
      span: 6
    }
  ]

  /** 样本状态标签 */
  const SAMPLE_STATUS_TAG: Record<SampleRecord['status'], 'success' | 'warning' | 'info'> = {
    已入库: 'success',
    待入库: 'warning',
    已出库: 'info'
  }

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
        { prop: 'id', label: '样本编号', width: 130 },
        {
          prop: 'type',
          label: '样本类型',
          width: 110,
          formatter: (row: SampleRecord) =>
            h(ElTag, { effect: 'plain', type: 'primary' }, () => row.type)
        },
        { prop: 'collectedAt', label: '采集日期', width: 120 },
        { prop: 'location', label: '存储位置', minWidth: 180 },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row: SampleRecord) =>
            h(ElTag, { effect: 'light', type: SAMPLE_STATUS_TAG[row.status] }, () => row.status)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 110,
          align: 'center' as const,
          formatter: (row: SampleRecord) =>
            h(
              'span',
              { class: 'cursor-pointer text-primary', onClick: () => viewSampleFlow(row) },
              '流转记录'
            )
        }
      ]
    }
  })

  /** 查看样本流转（演示） */
  function viewSampleFlow(row: SampleRecord) {
    ElMessage.info(`样本 ${row.id}：${row.location} · ${row.status}（演示）`)
  }

  function handleSearch() {
    getData()
  }

  function handleReset() {
    resetSearchParams()
  }
</script>
