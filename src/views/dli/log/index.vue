<!-- DLI 系统日志：按授权范围查询重要数据、权限、导入导出及配置变更留痕（蓝图 P18）[批注 23] -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <ArtSearchBar
      v-model="searchParams"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <span class="mr-1 text-xs text-g-500">当前范围：{{ scopeLabel }}</span>
          <ElButton v-if="canExport" type="primary" @click="exportLogs">导出当前日志</ElButton>
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

    <!-- 行内查看抽屉：变更前内容 / 变更后内容 / 失败原因，关闭回表不另建详情页 [批注 23] -->
    <ElDrawer v-model="detailVisible" title="日志详情" size="560px">
      <template v-if="activeLog">
        <ElDescriptions :column="1" border class="mb-4">
          <ElDescriptionsItem label="日志编号">{{ activeLog.id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="操作时间">{{ activeLog.createdAt }}</ElDescriptionsItem>
          <ElDescriptionsItem label="操作者">{{ activeLog.operator }}</ElDescriptionsItem>
          <ElDescriptionsItem label="操作者角色">{{
            roleLabel(activeLog.role)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="所属组织">{{ activeLog.scope }}</ElDescriptionsItem>
          <ElDescriptionsItem label="业务对象类型">
            {{ activeLog.objectType || '—' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="业务对象编号">
            {{ activeLog.objectId || activeLog.target }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="操作类型">{{ activeLog.action }}</ElDescriptionsItem>
          <ElDescriptionsItem label="留痕类别">
            <ElTag :type="CATEGORY_TAG[activeLog.category]" effect="light">
              {{ activeLog.category }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="执行结果">
            <ElTag :type="activeLog.result === '失败' ? 'danger' : 'success'" effect="light">
              {{ activeLog.result }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="说明">{{ activeLog.detail }}</ElDescriptionsItem>
          <ElDescriptionsItem label="变更前内容">
            {{ activeLog.beforeContent || '不涉及' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="变更后内容">
            {{ activeLog.afterContent || '不涉及' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="失败原因">
            {{ activeLog.failureReason || '—' }}
          </ElDescriptionsItem>
        </ElDescriptions>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElMessage,
    ElDrawer,
    ElDescriptions,
    ElDescriptionsItem,
    ElTag
  } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { useUserStore } from '@/store/modules/user'
  import { fetchGetSystemLogs } from '@/mock/dli/blueprint/api'
  import type { LogCategory, LogResult, SystemLog } from '@/mock/dli/blueprint/types'

  defineOptions({ name: 'DliLog' })

  /** 留痕类别：重要数据、权限、导入导出、配置变更（抽屉内展示） */
  const CATEGORY_TAG: Record<LogCategory, 'danger' | 'warning' | 'primary' | 'info'> = {
    重要数据: 'danger',
    权限变更: 'warning',
    导入导出: 'primary',
    配置变更: 'info'
  }

  /** 操作者角色中文映射 [批注 23] */
  const ROLE_LABELS: Record<string, string> = {
    R_DOCTOR: '医生',
    R_ASSISTANT: '医生助理',
    R_NURSE: '护士',
    R_PLATFORM: '平台管理员',
    R_CENTER: '中心管理员',
    R_GROUP: '课题组管理员',
    R_SYS: '系统管理员',
    R_PATIENT: '患者',
    R_FAMILY: '患者家属'
  }
  const roleLabel = (role: string) => ROLE_LABELS[role] ?? role

  /** 业务对象类型筛选项 [批注 23] */
  const OBJECT_TYPE_OPTIONS = [
    '患者字段配置',
    '编码规则',
    '账号',
    '患者表格',
    '评估报告',
    '研究项目',
    '系统日志'
  ]
  const RESULT_OPTIONS: LogResult[] = ['成功', '失败']

  /** 组件由四个路由复用，用路由推断当前授权范围（数据层过滤） [源 #135] */
  const route = useRoute()
  const SCOPE_LABELS: Record<string, string> = {
    platform: '全平台（平台管理端）',
    center: '本中心（中心管理端）',
    group: '本课题组（课题组管理端）',
    system: '全部日志（系统管理端）'
  }
  const scopeKey = computed(() => {
    const path = route.path
    if (path.includes('/platform/')) return 'platform'
    if (path.includes('/center/')) return 'center'
    if (path.includes('/group/')) return 'group'
    if (path.includes('/system/')) return 'system'
    return 'platform'
  })
  const scopeLabel = computed(() => SCOPE_LABELS[scopeKey.value] ?? SCOPE_LABELS.platform!)

  /** 授权范围前缀：system 端不过滤，其余端只看本范围 [批注 23] */
  const AUTH_SCOPES: Record<string, string[]> = {
    platform: ['全平台'],
    center: ['中心'],
    group: ['课题组'],
    system: []
  }
  const allowedScopes = computed(() => AUTH_SCOPES[scopeKey.value] ?? [])

  /** 导出单独授权：mock 口径为系统管理员可导出 [批注 23] */
  const userStore = useUserStore()
  const canExport = computed(() => {
    const roles = userStore.getUserInfo?.roles ?? []
    return roles[0] === 'R_SYS'
  })

  interface LogQueryParams {
    current?: number
    size?: number
    timeRange?: string[]
    operator?: string
    objectType?: string
    result?: LogResult | ''
  }

  /** 日志查询：4 项筛选与授权范围均由数据层过滤后分页 [批注 23] */
  async function querySystemLogs(
    params: LogQueryParams
  ): Promise<Api.Common.PaginatedResponse<SystemLog>> {
    const response = await fetchGetSystemLogs({
      current: params.current ?? 1,
      size: params.size ?? 10,
      timeRange: params.timeRange,
      operator: params.operator,
      objectType: params.objectType,
      result: params.result,
      scopes: allowedScopes.value
    })
    return response
  }

  /** 筛选：操作时间范围 / 操作者 / 对象类型 / 执行结果 [批注 23] */
  const searchItems = [
    {
      key: 'timeRange',
      label: '操作时间',
      type: 'daterange',
      props: { type: 'daterange', 'value-format': 'YYYY-MM-DD' },
      span: 6
    },
    {
      key: 'operator',
      label: '操作者',
      type: 'input',
      placeholder: '操作者姓名（模糊匹配）',
      span: 6
    },
    {
      key: 'objectType',
      label: '对象类型',
      type: 'select',
      placeholder: '全部对象类型',
      options: OBJECT_TYPE_OPTIONS.map((item) => ({ label: item, value: item }))
    },
    {
      key: 'result',
      label: '执行结果',
      type: 'select',
      placeholder: '全部结果',
      options: RESULT_OPTIONS.map((item) => ({ label: item, value: item }))
    }
  ]

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
      apiFn: querySystemLogs,
      apiParams: {
        current: 1,
        size: 10,
        timeRange: [] as string[],
        operator: '',
        objectType: '',
        result: '' as LogResult | ''
      },
      columnsFactory: () => [
        { prop: 'createdAt', label: '操作时间', width: 170 },
        { prop: 'operator', label: '操作者', width: 120 },
        {
          prop: 'role',
          label: '操作者角色',
          width: 120,
          formatter: (row: SystemLog) => roleLabel(row.role)
        },
        { prop: 'scope', label: '所属组织', width: 120, showOverflowTooltip: true },
        {
          prop: 'objectType',
          label: '业务对象类型',
          width: 130,
          formatter: (row: SystemLog) => row.objectType || '—'
        },
        {
          prop: 'objectId',
          label: '业务对象编号',
          width: 150,
          showOverflowTooltip: true,
          formatter: (row: SystemLog) => row.objectId || row.target
        },
        { prop: 'action', label: '操作类型', minWidth: 200, showOverflowTooltip: true },
        {
          prop: 'result',
          label: '执行结果',
          width: 100,
          align: 'center' as const,
          formatter: (row: SystemLog) =>
            h(
              ElTag,
              { effect: 'light', type: row.result === '失败' ? 'danger' : 'success' },
              () => row.result
            )
        },
        {
          prop: 'operation',
          label: '操作',
          width: 90,
          fixed: 'right' as const,
          align: 'center' as const,
          formatter: (row: SystemLog) =>
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => openDetail(row) },
              () => '查看'
            )
        }
      ]
    }
  })

  /** 路由端切换后按新授权范围重新查询（keepAlive 复用） */
  watch(scopeKey, () => {
    getData()
  })

  /** 查询 */
  function handleSearch() {
    getData()
  }

  /** 重置 */
  function handleReset() {
    resetSearchParams()
  }

  /** 导出当前筛选结果：仅系统管理员可见入口；仅含脱敏字段，不含姓名 / 手机号 / 病历号 */
  function csvCell(value: string): string {
    return `"${value.replace(/"/g, '""')}"`
  }

  function downloadCsv(filename: string, lines: string[]) {
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function exportLogs() {
    const response = await fetchGetSystemLogs({
      current: 1,
      size: 10000,
      timeRange: searchParams.timeRange,
      operator: searchParams.operator,
      objectType: searchParams.objectType,
      result: searchParams.result,
      scopes: allowedScopes.value
    })
    const rows = response.records.map((log) =>
      [
        log.createdAt,
        log.operator,
        roleLabel(log.role),
        log.scope,
        log.objectType || '—',
        log.objectId || log.target,
        log.action,
        log.result,
        log.detail
      ]
        .map(csvCell)
        .join(',')
    )
    downloadCsv(`系统日志_${new Date().toISOString().slice(0, 10)}.csv`, [
      '操作时间,操作者,操作者角色,所属组织,业务对象类型,业务对象编号,操作类型,执行结果,说明',
      ...rows
    ])
    ElMessage.success(`已导出 ${response.records.length} 条脱敏日志`)
  }

  /** 行内查看抽屉 */
  const detailVisible = ref(false)
  const activeLog = ref<SystemLog>()

  function openDetail(row: SystemLog) {
    activeLog.value = row
    detailVisible.value = true
  }
</script>
