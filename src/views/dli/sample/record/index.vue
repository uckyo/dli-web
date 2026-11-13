<!-- DLI 生物样本 · 样本管理：只读展示样本库数据 [批注 07] -->
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

    <SampleDetailDrawer
      v-model="drawerVisible"
      :sample="activeSample"
      :tab="drawerTab"
      @synced="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
  import { ElTag, ElButton } from 'element-plus'
  import { useRouter } from 'vue-router'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchGetSampleList } from '@/mock/dli/api'
  import { CENTERS_DATA } from '@/mock/dli/data'
  import type { SampleRecord } from '@/mock/dli/types'
  import { SAMPLE_STATUS_TAG, SCOPE_TAG, SYNC_STATUS_TAG } from '../format'
  import SampleDetailDrawer from './modules/sample-detail-drawer.vue'

  defineOptions({ name: 'DliSampleRecord' })

  /** 患者详情页嵌入模式：传入患者编号后仅展示该患者样本 */
  const props = defineProps<{ patientId?: string }>()

  /** 嵌入模式下不跳路由，交由患者详情在原抽屉内切换 [批注 07] */
  const emit = defineEmits<{ openTests: [sampleId: string] }>()

  const router = useRouter()

  const CENTER_OPTIONS = CENTERS_DATA.map((item) => ({ label: item.name, value: item.name }))
  const TYPE_OPTIONS = ['全血', '血浆', '血清', '组织', '尿液'].map((item) => ({
    label: item,
    value: item
  }))
  const STATUS_OPTIONS = ['已入库', '待入库', '已出库'].map((item) => ({
    label: item,
    value: item
  }))

  /** 六项筛选：样本编号 / 患者编号 / 所属中心 / 样本类型 / 采集时间 / 样本状态 [批注 07] */
  const searchItems = [
    {
      key: 'sampleId',
      label: '样本编号',
      type: 'input',
      placeholder: '样本编号',
      span: 6
    },
    {
      key: 'patientId',
      label: '患者编号',
      type: 'input',
      placeholder: '患者编号（脱敏）',
      span: 6
    },
    {
      key: 'center',
      label: '所属中心',
      type: 'select',
      placeholder: '全部中心',
      options: CENTER_OPTIONS,
      span: 6
    },
    {
      key: 'type',
      label: '样本类型',
      type: 'select',
      placeholder: '全部类型',
      options: TYPE_OPTIONS,
      span: 6
    },
    {
      key: 'collectDateRange',
      label: '采集时间',
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
      label: '样本状态',
      type: 'select',
      placeholder: '全部状态',
      options: STATUS_OPTIONS,
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
      apiParams: {
        current: 1,
        size: 10,
        keyword: '',
        sampleId: '',
        patientId: props.patientId ?? '',
        center: '',
        type: '',
        collectDateRange: [] as string[],
        status: '',
        syncStatus: ''
      },
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
          width: 128,
          formatter: (row: SampleRecord) =>
            h('div', { class: 'flex-c gap-1' }, [
              h(ElTag, { effect: 'light', type: SAMPLE_STATUS_TAG[row.status] }, () => row.status),
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
          width: 235,
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
              ),
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openLinkedTests(row) },
                () => '关联检测'
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

  /** 独立页跳检测管理并带入样本编号；患者详情嵌入模式保持抽屉切换，不丢患者上下文 */
  function openLinkedTests(row: SampleRecord) {
    if (props.patientId) {
      emit('openTests', row.id)
      return
    }
    void router.push({ name: 'DliSampleTest', query: { sampleId: row.id } })
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
