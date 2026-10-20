<!-- 处理记录 / 预警中心：分级处置、SLA 响应与处置留痕 -->
<template>
  <div class="dli-alert-page art-full-height">
    <!-- 预警统计 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-5" v-loading="statsLoading">
      <ArtStatsCard
        title="待处理数"
        :count="stats.pending"
        description="响应时限内需处置"
        icon="ri:alarm-warning-line"
        icon-style="bg-danger"
      />
      <ArtStatsCard
        title="今日新增"
        :count="stats.today"
        description="今日 00:00 起新增预警"
        icon="ri:add-circle-line"
        icon-style="bg-primary"
      />
      <ArtStatsCard
        title="红色预警数"
        :count="stats.red"
        description="全部红色等级预警"
        icon="ri:error-warning-line"
        icon-style="bg-warning"
      />
      <ArtStatsCard
        title="已升级数"
        :count="stats.escalated"
        description="已升级至上级医生"
        icon="ri:arrow-up-circle-line"
        icon-style="bg-success"
      />
    </div>

    <ElCard class="art-table-card">
      <div class="flex h-full flex-col">
        <!-- 状态页签 -->
        <ElTabs :model-value="activeTab" @tab-change="handleTabChange">
          <ElTabPane v-for="tab in TABS" :key="tab.value" :label="tab.label" :name="tab.value" />
        </ElTabs>

        <!-- 搜索区 -->
        <ArtSearchBar
          v-model="searchForm"
          :items="formItems"
          @search="handleSearch"
          @reset="handleReset"
        />

        <!-- 表格头部 -->
        <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
          <template #left>
            <span class="text-sm text-g-600">
              当前「{{ TAB_LABEL[activeTab] }}」预警共
              <span class="font-medium text-g-900">{{ pagination.total }}</span>
              条
            </span>
          </template>
        </ArtTableHeader>

        <!-- 表格 -->
        <div class="min-h-0 flex-1">
          <ArtTable
            :loading="loading"
            :data="data"
            :columns="columns"
            :pagination="pagination"
            @pagination:size-change="handleSizeChange"
            @pagination:current-change="handleCurrentChange"
          />
        </div>
      </div>
    </ElCard>

    <!-- 处置 / 详情抽屉 -->
    <HandleDrawer
      v-model:visible="drawerVisible"
      :alert="currentAlert"
      :readonly="drawerReadonly"
      @submitted="handleSubmitted"
    />
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElTag } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchGetAlertList } from '@/mock/dli/api'
  import type { AlertStatus, DliAlert } from '@/mock/dli/types'
  import HandleDrawer from './modules/handle-drawer.vue'

  defineOptions({ name: 'DliAlert' })

  type TagType = 'success' | 'warning' | 'info' | 'danger' | 'primary'

  /** 预警搜索表单 */
  interface AlertSearchForm {
    keyword?: string
    level?: string
    source?: string
  }

  /** 状态页签 */
  const TABS: Array<{ label: string; value: AlertStatus }> = [
    { label: '待处理', value: 'pending' },
    { label: '已处理', value: 'handled' },
    { label: '已升级', value: 'escalated' }
  ]

  /** 状态文案 */
  const TAB_LABEL: Record<AlertStatus, string> = {
    pending: '待处理',
    handled: '已处理',
    escalated: '已升级'
  }

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

  const activeTab = ref<AlertStatus>('pending')

  const searchForm = ref<AlertSearchForm>({
    keyword: undefined,
    level: undefined,
    source: undefined
  })

  /** 搜索项 */
  const formItems = [
    {
      label: '关键词',
      key: 'keyword',
      type: 'input',
      placeholder: '预警编号 / 患者 / 触发规则',
      clearable: true
    },
    {
      label: '预警等级',
      key: 'level',
      type: 'select',
      props: {
        placeholder: '请选择预警等级',
        clearable: true,
        options: [
          { label: '红色', value: 'red' },
          { label: '橙色', value: 'orange' },
          { label: '黄色', value: 'yellow' }
        ]
      }
    },
    {
      label: '预警来源',
      key: 'source',
      type: 'select',
      props: {
        placeholder: '请选择预警来源',
        clearable: true,
        options: [
          { label: '系统监测', value: 'system' },
          { label: '患者上报', value: 'patient' }
        ]
      }
    }
  ]

  /** 抽屉状态 */
  const drawerVisible = ref(false)
  const drawerReadonly = ref(false)
  const currentAlert = ref<DliAlert | null>(null)

  /** 全量预警统计 */
  const allAlerts = ref<DliAlert[]>([])
  const statsLoading = ref(false)

  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  const stats = computed(() => ({
    pending: allAlerts.value.filter((item) => item.status === 'pending').length,
    today: allAlerts.value.filter((item) => item.occurTime.startsWith(todayStr)).length,
    red: allAlerts.value.filter((item) => item.level === 'red').length,
    escalated: allAlerts.value.filter((item) => item.status === 'escalated').length
  }))

  /**
   * 渲染预警编号 + 患者
   */
  const renderAlertPatient = (row: DliAlert) =>
    h('div', [
      h('p', { class: 'font-medium text-g-900' }, row.patientName),
      h('p', { class: 'mt-0.5 text-xs text-g-500' }, row.id)
    ])

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: fetchGetAlertList,
      apiParams: {
        current: 1,
        size: 10,
        status: 'pending',
        ...searchForm.value
      },
      columnsFactory: () => [
        {
          prop: 'patientName',
          label: '预警编号 / 患者',
          minWidth: 190,
          formatter: (row) => renderAlertPatient(row)
        },
        {
          prop: 'level',
          label: '等级',
          width: 90,
          formatter: (row) =>
            h(ElTag, { type: LEVEL_META[row.level].type }, () => LEVEL_META[row.level].label)
        },
        {
          prop: 'source',
          label: '来源',
          width: 110,
          formatter: (row) =>
            h(ElTag, { type: SOURCE_META[row.source].type }, () => SOURCE_META[row.source].label)
        },
        {
          prop: 'ruleName',
          label: '触发规则',
          minWidth: 200,
          showOverflowTooltip: true
        },
        {
          prop: 'triggerData',
          label: '触发数据',
          minWidth: 260,
          showOverflowTooltip: true,
          formatter: (row) => h('span', { class: 'text-g-600' }, row.triggerData)
        },
        {
          prop: 'occurTime',
          label: '发生时间',
          width: 150
        },
        {
          prop: 'deadline',
          label: '响应时限',
          width: 150
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row) =>
            h(ElTag, { type: STATUS_META[row.status].type }, () => STATUS_META[row.status].label)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 140,
          fixed: 'right',
          formatter: (row) =>
            h('div', { class: 'flex' }, [
              row.status === 'pending' &&
                h(
                  ElButton,
                  {
                    link: true,
                    type: 'primary',
                    size: 'small',
                    onClick: () => openDrawer(row, false)
                  },
                  () => '处置'
                ),
              h(
                ElButton,
                {
                  link: true,
                  type: 'primary',
                  size: 'small',
                  onClick: () => openDrawer(row, true)
                },
                () => '详情'
              )
            ])
        }
      ]
    }
  })

  /**
   * 加载全量预警用于统计
   */
  const loadStats = async () => {
    statsLoading.value = true
    try {
      const res = await fetchGetAlertList({ current: 1, size: 999 })
      allAlerts.value = res.records
    } finally {
      statsLoading.value = false
    }
  }

  /**
   * 切换状态页签
   */
  const handleTabChange = (name: string | number) => {
    activeTab.value = String(name) as AlertStatus
    replaceSearchParams({ status: activeTab.value, current: 1 })
    getData()
  }

  /**
   * 搜索
   */
  const handleSearch = (params: AlertSearchForm) => {
    replaceSearchParams({ ...params, status: activeTab.value })
    getData()
  }

  /**
   * 重置搜索条件（保留当前页签状态）
   */
  const handleReset = async () => {
    await resetSearchParams()
    replaceSearchParams({ status: activeTab.value, current: 1 })
    getData()
  }

  /**
   * 打开处置 / 详情抽屉
   */
  const openDrawer = (row: DliAlert, readonly: boolean) => {
    currentAlert.value = row
    drawerReadonly.value = readonly
    drawerVisible.value = true
  }

  /**
   * 处置成功后刷新
   */
  const handleSubmitted = () => {
    getData()
    loadStats()
  }

  onMounted(loadStats)
</script>
