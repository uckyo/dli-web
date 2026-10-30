<!-- DLI 生物样本 · 检测管理：只读展示样本库检测数据 -->
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

    <SampleTestDetailDrawer v-model="testDrawerVisible" :record="activeTest" :tab="testDrawerTab" />
    <SampleDetailDrawer v-model="sampleDrawerVisible" :sample="linkedSample" tab="detail" />
  </div>
</template>

<script setup lang="ts">
  import { ElTag, ElButton } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchGetSampleById, fetchGetSampleTestList } from '@/mock/dli/api'
  import type { SampleRecord, SampleTestRecord } from '@/mock/dli/types'
  import { QC_TAG, SCOPE_TAG, TEST_STATUS_TAG } from '../format'
  import SampleDetailDrawer from '../record/modules/sample-detail-drawer.vue'
  import SampleTestDetailDrawer from './modules/sample-test-detail-drawer.vue'

  defineOptions({ name: 'DliSampleTest' })

  const searchItems = [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: '检测编号 / 检测项目 / 关联样本 / 患者编号',
      span: 8
    }
  ]

  const testDrawerVisible = ref(false)
  const testDrawerTab = ref<'detail' | 'report'>('detail')
  const activeTest = ref<SampleTestRecord>()

  const sampleDrawerVisible = ref(false)
  const linkedSample = ref<SampleRecord>()

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
      apiFn: fetchGetSampleTestList,
      apiParams: { current: 1, size: 10, keyword: '' },
      columnsFactory: () => [
        { prop: 'id', label: '检测编号', minWidth: 216 },
        {
          prop: 'type',
          label: '检测类型',
          width: 76,
          formatter: (row: SampleTestRecord) =>
            h(ElTag, { effect: 'plain', type: 'primary' }, () => row.type)
        },
        { prop: 'item', label: '检测项目', minWidth: 102 },
        { prop: 'batch', label: '批次', width: 82 },
        {
          prop: 'sampleId',
          label: '关联样本',
          minWidth: 212,
          formatter: (row: SampleTestRecord) =>
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => openSample(row) },
              () => row.sampleId
            )
        },
        { prop: 'center', label: '所属中心', width: 76 },
        { prop: 'testedAt', label: '检测时间', width: 138 },
        {
          prop: 'status',
          label: '检测状态',
          width: 74,
          formatter: (row: SampleTestRecord) =>
            h(ElTag, { effect: 'light', type: TEST_STATUS_TAG[row.status] }, () => row.status)
        },
        {
          prop: 'qc',
          label: '质控结论',
          width: 76,
          formatter: (row: SampleTestRecord) =>
            h(ElTag, { effect: 'plain', type: QC_TAG[row.qc] }, () => row.qc)
        },
        {
          prop: 'shareLevel',
          label: '共享级别',
          width: 74,
          formatter: (row: SampleTestRecord) =>
            h(ElTag, { effect: 'plain', type: SCOPE_TAG[row.shareLevel] }, () => row.shareLevel)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 152,
          fixed: 'right' as const,
          align: 'center' as const,
          formatter: (row: SampleTestRecord) =>
            h('div', { class: 'flex-c justify-center gap-3' }, [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openTest(row, 'detail') },
                () => '查看详情'
              ),
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openTest(row, 'report') },
                () => '报告与数据'
              )
            ])
        }
      ]
    }
  })

  function openTest(row: SampleTestRecord, tab: 'detail' | 'report') {
    activeTest.value = row
    testDrawerTab.value = tab
    testDrawerVisible.value = true
  }

  async function openSample(row: SampleTestRecord) {
    linkedSample.value = await fetchGetSampleById(row.sampleId)
    sampleDrawerVisible.value = true
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
