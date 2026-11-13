<!-- DLI 生物样本 · 检测管理：只读展示样本库检测数据 [批注 07] -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <ArtSearchBar
      v-if="!props.patientId"
      v-model="searchParams"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElTag
            v-if="props.patientId && props.sampleId"
            closable
            type="primary"
            effect="plain"
            @close="clearSampleFilter"
          >
            关联样本：{{ props.sampleId }}
          </ElTag>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <SampleTestDetailDrawer
      v-model="testDrawerVisible"
      :record="activeTest"
      :tab="testDrawerTab"
      :patient-id="props.patientId"
      @synced="handleSynced"
    />
    <SampleDetailDrawer v-model="sampleDrawerVisible" :sample="linkedSample" tab="detail" />
  </div>
</template>

<script setup lang="ts">
  import { ElTag, ElButton, ElTable, ElTableColumn } from 'element-plus'
  import { useRoute } from 'vue-router'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchGetSampleById, fetchGetSampleTestList } from '@/mock/dli/api'
  import type { SampleRecord, SampleTestRecord } from '@/mock/dli/types'
  import { QC_TAG, SCOPE_TAG, SYNC_STATUS_TAG, TEST_STATUS_TAG } from '../format'
  import SampleDetailDrawer from '../record/modules/sample-detail-drawer.vue'
  import SampleTestDetailDrawer from './modules/sample-test-detail-drawer.vue'

  defineOptions({ name: 'DliSampleTest' })

  /** 患者详情页嵌入模式：只显示本人有权记录；sampleId 由抽屉内「关联检测」带入 */
  const props = defineProps<{ patientId?: string; sampleId?: string }>()
  const emit = defineEmits<{ clearSample: [] }>()

  const route = useRoute()

  const initialSampleId =
    props.sampleId ?? (props.patientId ? '' : String(route.query.sampleId ?? ''))

  const TYPE_OPTIONS = ['蛋白组', '转录组', '代谢组', '基因组'].map((item) => ({
    label: item,
    value: item
  }))
  const STATUS_OPTIONS = ['已完成', '检测中', '异常'].map((item) => ({
    label: item,
    value: item
  }))

  /** 六项筛选：检测编号 / 关联样本编号 / 检测类型 / 检测批次 / 检测时间 / 检测状态 [批注 07] */
  const searchItems = [
    { key: 'testId', label: '检测编号', type: 'input', placeholder: '检测编号', span: 6 },
    {
      key: 'sampleId',
      label: '关联样本编号',
      type: 'input',
      placeholder: '关联样本编号',
      span: 6
    },
    {
      key: 'type',
      label: '检测类型',
      type: 'select',
      placeholder: '全部类型',
      options: TYPE_OPTIONS,
      span: 6
    },
    { key: 'batch', label: '检测批次', type: 'input', placeholder: '检测批次', span: 6 },
    {
      key: 'testDateRange',
      label: '检测时间',
      type: 'daterange',
      span: 8,
      props: {
        type: 'daterange',
        'value-format': 'YYYY-MM-DD',
        'start-placeholder': '开始日期',
        'end-placeholder': '结束日期',
        clearable: true,
        'unlink-panels': true
      }
    },
    {
      key: 'status',
      label: '检测状态',
      type: 'select',
      placeholder: '全部状态',
      options: STATUS_OPTIONS,
      span: 6
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
      apiParams: {
        current: 1,
        size: 10,
        keyword: '',
        testId: '',
        sampleId: initialSampleId,
        patientId: props.patientId ?? '',
        type: '',
        batch: '',
        testDateRange: [] as string[],
        status: ''
      },
      columnsFactory: () => [
        {
          type: 'expand' as const,
          width: 46,
          /** 行展开：批次内「样本 - 患者」完整对应关系，不另加弹窗 [批注 07] */
          formatter: (row: SampleTestRecord) => () =>
            h('div', { class: 'px-4 py-3' }, [
              h(
                'p',
                { class: 'mb-2 text-sm font-medium text-g-900' },
                `检测批次 ${row.batch} · 样本-患者对应关系（${row.linkedSamples.length} 份）`
              ),
              h(ElTable, { data: row.linkedSamples, size: 'small', border: true }, () => [
                h(ElTableColumn, { prop: 'sampleId', label: '样本编号', minWidth: 205 }),
                h(ElTableColumn, { prop: 'patientId', label: '患者编号', width: 130 }),
                h(ElTableColumn, { prop: 'center', label: '所属中心', width: 100 }),
                h(ElTableColumn, { prop: 'type', label: '样本类型', width: 90 }),
                h(ElTableColumn, { prop: 'collectedAt', label: '采集时间', width: 150 }),
                h(ElTableColumn, { prop: 'role', label: '批次内角色', width: 110 })
              ])
            ])
        },
        { prop: 'id', label: '检测编号', minWidth: 216 },
        {
          prop: 'type',
          label: '检测类型',
          width: 76,
          formatter: (row: SampleTestRecord) =>
            h(ElTag, { effect: 'plain', type: 'primary' }, () => row.type)
        },
        { prop: 'item', label: '检测项目', minWidth: 102 },
        { prop: 'batch', label: '检测批次', width: 92 },
        {
          prop: 'sampleId',
          label: '关联样本编号',
          minWidth: 252,
          formatter: (row: SampleTestRecord) =>
            h('div', { class: 'flex-c gap-1' }, [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openSample(row) },
                () => row.sampleId
              ),
              ...(row.linkedSamples.length > 1
                ? [
                    h(
                      ElTag,
                      { size: 'small', effect: 'plain', type: 'info' },
                      () => `共 ${row.linkedSamples.length} 份`
                    )
                  ]
                : [])
            ])
        },
        { prop: 'center', label: '所属中心', width: 76 },
        { prop: 'testedAt', label: '检测时间', width: 138 },
        {
          prop: 'status',
          label: '检测状态',
          width: 132,
          formatter: (row: SampleTestRecord) =>
            h('div', { class: 'flex-c gap-1' }, [
              h(ElTag, { effect: 'light', type: TEST_STATUS_TAG[row.status] }, () => row.status),
              ...(row.syncStatus !== '正常'
                ? [
                    h(
                      ElTag,
                      {
                        effect: 'plain',
                        size: 'small',
                        type: SYNC_STATUS_TAG[row.syncStatus],
                        title: row.syncNote
                      },
                      () => `同步${row.syncStatus}`
                    )
                  ]
                : [])
            ])
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
          width: 235,
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
                () => '查看报告／数据文件'
              )
            ])
        }
      ]
    }
  })

  /** 独立页从样本管理「关联检测」跳转时同步 query；患者详情嵌入模式不读路由 */
  watch(
    () => route.query.sampleId,
    (value) => {
      if (props.patientId) return
      searchParams.sampleId = typeof value === 'string' ? value : ''
      getData()
    }
  )

  /** 患者详情抽屉内点「关联检测」时切换样本过滤，不跳路由 */
  watch(
    () => props.sampleId,
    (value) => {
      if (!props.patientId) return
      searchParams.sampleId = value ?? ''
      getData()
    }
  )

  function clearSampleFilter() {
    emit('clearSample')
  }

  function handleSynced() {
    refreshData()
  }

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
