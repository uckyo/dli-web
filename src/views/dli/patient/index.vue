<!-- DLI 患者管理 [批注 01-04]：可收起筛选 + 新增患者 / 导入 / 导出 -->
<template>
  <div class="art-full-height">
    <!-- 搜索区 -->
    <ArtListControls>
      <template #actions>
        <ElButton v-if="canManage" type="primary" @click="openArchive">
          <ArtSvgIcon icon="ri:add-line" class="mr-1" />新增患者
        </ElButton>
        <ElButton v-if="canManage" plain :loading="syncing" @click="syncFromHis">
          <ArtSvgIcon icon="ri:refresh-line" class="mr-1" />同步
        </ElButton>
        <ElButton v-if="canManage" plain @click="importVisible = true">
          <ArtSvgIcon icon="ri:download-2-line" class="mr-1" />导入
        </ElButton>
        <ElButton plain @click="exportVisible = true">
          <ArtSvgIcon icon="ri:upload-2-line" class="mr-1" />导出
        </ElButton>
      </template>
      <ElForm :inline="true" class="dli-filter-form" @submit.prevent>
        <div class="dli-filter-items">
          <ElFormItem label="关键词">
            <ElInput
              v-model="searchParams.keyword"
              placeholder="患者编号 / 研究编号 / 主管医生"
              clearable
              style="width: 240px"
              @keyup.enter="handleSearch"
            />
          </ElFormItem>
          <ElFormItem label="管理状态">
            <ElSelect
              v-model="searchParams.status"
              placeholder="全部状态"
              clearable
              style="width: 140px"
            >
              <ElOption
                v-for="item in MANAGE_STATUS_OPTIONS"
                :key="item"
                :label="item"
                :value="item"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="当前阶段">
            <ElSelect
              v-model="searchParams.stage"
              placeholder="全部阶段"
              clearable
              style="width: 130px"
            >
              <ElOption v-for="item in STAGE_OPTIONS" :key="item" :label="item" :value="item" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="预警等级">
            <ElSelect
              v-model="searchParams.warnLevel"
              placeholder="全部等级"
              clearable
              style="width: 130px"
            >
              <ElOption label="高风险" value="high" />
              <ElOption label="中风险" value="medium" />
              <ElOption label="低风险" value="low" />
              <ElOption label="未触发" value="none" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="初始入口">
            <ElSelect
              v-model="searchParams.initialEntry"
              placeholder="全部入口"
              clearable
              style="width: 190px"
            >
              <ElOption
                v-for="item in INITIAL_ENTRY_OPTIONS"
                :key="item"
                :label="item"
                :value="item"
              />
            </ElSelect>
          </ElFormItem>
        </div>

        <ElFormItem class="dli-filter-actions">
          <ElButton type="primary" @click="handleSearch">查询</ElButton>
          <ElButton @click="handleReset">重置</ElButton>
        </ElFormItem>
      </ElForm>
    </ArtListControls>

    <!-- 表格 -->
    <ArtTable
      list-layout
      :loading="loading"
      :data="data"
      :columns="columns"
      :pagination="pagination"
      @selection-change="handleSelectionChange"
      @pagination:size-change="handleSizeChange"
      @pagination:current-change="handleCurrentChange"
    />

    <!-- 医患对话 / 诊疗历程：沿用原抽屉，标题已使用患者编号 -->
    <ChatDrawer v-model="chatVisible" :patient="activePatient" :readonly="!canManage" />
    <HistoryDrawer v-model="historyVisible" :patient="activePatient" />

    <!-- 建档 / 编辑 / 导入 / 导出 -->
    <ArchiveDialog
      v-model="archiveVisible"
      :patient-id="editPatientId || undefined"
      @saved="handleArchiveSaved"
    />
    <ImportDialog v-model="importVisible" @saved="refreshData" />
    <ExportDialog v-model="exportVisible" :query="exportQuery" :selected-ids="selectedIds" />
  </div>
</template>

<script setup lang="ts">
  import ArtListControls from '@/components/core/tables/art-list-controls/index.vue'
  import {
    ElButton,
    ElForm,
    ElFormItem,
    ElIcon,
    ElInput,
    ElMessage,
    ElMessageBox,
    ElOption,
    ElPopover,
    ElSelect,
    ElTag
  } from 'element-plus'
  import { InfoFilled } from '@element-plus/icons-vue'
  import { computed, h, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useTable } from '@/hooks/core/useTable'
  import {
    INITIAL_ENTRY_OPTIONS,
    MANAGE_STATUS_OPTIONS,
    STAGE_OPTIONS,
    fetchGetPatientRows,
    type PatientRowQuery
  } from '@/mock/dli/patient-admin'
  import { useUserStore } from '@/store/modules/user'
  import type { PatientRow, WarnLevel, WebPatient } from '@/mock/dli/types'
  import ChatDrawer from './modules/chat-drawer.vue'
  import HistoryDrawer from './modules/history-drawer.vue'
  import ArchiveDialog from './modules/archive-dialog.vue'
  import ImportDialog from './modules/import-dialog.vue'
  import ExportDialog from './modules/export-dialog.vue'

  defineOptions({ name: 'DliPatient' })

  const LIST_STATE_KEY = 'dli-patient-list-state'
  const CLINICAL_ROLES = ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE']

  const userStore = useUserStore()
  const router = useRouter()

  interface PatientSearchParams extends PatientRowQuery {
    current: number
    size: number
  }

  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const canManage = computed(() => CLINICAL_ROLES.includes(role.value))

  const chatVisible = ref(false)
  const historyVisible = ref(false)
  const archiveVisible = ref(false)
  const editPatientId = ref('')
  const importVisible = ref(false)
  const exportVisible = ref(false)
  const activePatient = ref<WebPatient>()

  /** 从医院 HIS 系统同步患者数据（演示：确认后走本地刷新，不产生真实外部写入） */
  const syncing = ref(false)
  async function syncFromHis() {
    const confirmed = await ElMessageBox.confirm(
      '将从医院 HIS 系统同步患者数据，过程可能需要几分钟。',
      '同步患者数据',
      { type: 'warning', confirmButtonText: '开始同步', cancelButtonText: '取消' }
    )
      .then(() => true)
      .catch(() => false)
    if (!confirmed || syncing.value) return
    syncing.value = true
    try {
      await getData()
      ElMessage.success('已从医院 HIS 系统同步患者数据')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '同步失败')
    } finally {
      syncing.value = false
    }
  }

  /** 关闭建档弹窗后清掉编辑目标，避免下次「新增患者」误进编辑模式 */
  watch(archiveVisible, (visible) => {
    if (!visible) editPatientId.value = ''
  })

  const WARN_CONFIG: Record<WarnLevel, { label: string; type: 'danger' | 'warning' | 'info' }> = {
    high: { label: '高风险', type: 'danger' },
    medium: { label: '中风险', type: 'warning' },
    low: { label: '低风险', type: 'info' },
    none: { label: '未触发', type: 'info' }
  }
  const STATUS_TAG: Record<WebPatient['status'], 'success' | 'primary' | 'info' | 'warning'> = {
    待评估: 'warning',
    用药中: 'primary',
    随访中: 'success',
    已结案: 'info'
  }

  /** 组别限制：常规组依方案不开放 AI 报告、预警与患者消息 */
  const isAiGroup = (row: PatientRow) => row.group === 'AI 组'

  function renderWarn(row: PatientRow, field: 'earlyScreen' | 'earlyDiagnosis') {
    if (!isAiGroup(row)) return renderUnavailable()
    const warn = row[field]
    const config = WARN_CONFIG[warn.level]
    const text = warn.level === 'none' ? config.label : `${config.label} ${warn.score}`
    return h(ElTag, { type: config.type, effect: 'light' }, () => text)
  }

  function renderUnavailable() {
    return h('span', { class: 'patient-table-secondary' }, '—')
  }

  /**
   * 「诊断后」是否处于待医生确认状态。
   * 只有初始入口为「已确诊DLI」才有这个状态，其他入口不存在待确认。
   */
  function isStagePending(row: PatientRow): boolean {
    return row.initialEntry === '已确诊DLI' && row.stage === '诊断后' && !row.diagnosisConfirmed
  }

  const {
    columns,
    data,
    loading,
    pagination,
    searchParams: tableSearchParams,
    getData,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: fetchGetPatientRows,
      apiParams: {
        current: 1,
        size: 10,
        keyword: '',
        status: '',
        warnLevel: '',
        initialEntry: '',
        stage: ''
      } as PatientSearchParams,
      columnsFactory: () => [
        { type: 'selection', width: 45 }, // 勾选列：配合导出「已勾选记录」 [批注 04]
        { prop: 'id', label: '患者编号', minWidth: 128, fixed: 'left' as const },
        { prop: 'initialEntry', label: '初始入口', minWidth: 160 },
        {
          prop: 'stage',
          className: 'patient-compact-cell',
          label: '当前阶段',
          minWidth: 140,
          formatter: (row: PatientRow) => {
            // 只有「已确诊DLI + 诊断后」存在待医生确认，其他入口/阶段不显示待确认
            if (!isStagePending(row)) return h('span', {}, row.stage)
            return h(
              ElPopover,
              { trigger: 'click', width: 300, placement: 'bottom-start' },
              {
                reference: () =>
                  h('span', { class: 'dli-stage-pending' }, [
                    '诊断后（待确认）',
                    h(ElIcon, { class: 'dli-stage-pending-icon' }, () => h(InfoFilled))
                  ]),
                default: () =>
                  h('div', { class: 'dli-stage-pop' }, [
                    h('div', { class: 'dli-stage-pop-title' }, '诊断信息（待医生确认）'),
                    h('div', { class: 'dli-stage-pop-row' }, [
                      h('span', { class: 'dli-stage-pop-label' }, '诊断日期'),
                      h('span', {}, row.diagnosisDate || '—')
                    ]),
                    h('div', { class: 'dli-stage-pop-row' }, [
                      h('span', { class: 'dli-stage-pop-label' }, '诊断依据'),
                      h('span', {}, row.diagnosisBasis || '—')
                    ])
                  ])
              }
            )
          }
        },
        {
          prop: 'projectCount',
          className: 'patient-compact-cell',
          label: '研究项目',
          minWidth: 94,
          formatter: (row: PatientRow) => {
            const text = row.projectCount ? `关联${row.projectCount}个项目` : '暂无项目'
            return h(
              ElButton,
              {
                link: true,
                type: 'primary',
                onClick: () => goPatientDetail(row, 'enrollment')
              },
              () => text
            )
          }
        },
        {
          prop: 'pendingReportCount',
          className: 'patient-compact-cell',
          label: '上报',
          minWidth: 94,
          align: 'center' as const,
          // 显示待核对条数，点击进患者详情的「上报」页签
          formatter: (row: PatientRow) =>
            h(
              ElButton,
              {
                link: true,
                type: row.pendingReportCount ? 'warning' : 'info',
                onClick: () => goPatientDetail(row, 'report')
              },
              () => (row.pendingReportCount ? `${row.pendingReportCount} 条待核对` : '无')
            )
        },
        { prop: 'center', label: '所属中心', minWidth: 80 },
        { prop: 'doctor', label: '主管医生', minWidth: 80 },
        {
          prop: 'status',
          label: '管理状态',
          minWidth: 84,
          formatter: (row: PatientRow) =>
            h(ElTag, { type: STATUS_TAG[row.status], effect: 'light' }, () => row.status)
        },
        {
          prop: 'consent',
          label: '知情同意',
          minWidth: 80,
          formatter: (row: PatientRow) =>
            h(ElTag, { type: row.consent.signed ? 'success' : 'warning', effect: 'light' }, () =>
              row.consent.signed ? row.consent.version : '未签署'
            )
        },
        {
          prop: 'earlyScreen',
          className: 'patient-compact-cell',
          label: '早筛预警',
          minWidth: 88,
          align: 'center' as const,
          formatter: (row: PatientRow) => renderWarn(row, 'earlyScreen')
        },
        {
          prop: 'earlyDiagnosis',
          className: 'patient-compact-cell',
          label: '早诊预警',
          minWidth: 88,
          align: 'center' as const,
          formatter: (row: PatientRow) => renderWarn(row, 'earlyDiagnosis')
        },
        {
          prop: 'outcome',
          label: '转归预测',
          minWidth: 112,
          align: 'center' as const,
          formatter: (row: PatientRow) =>
            isAiGroup(row)
              ? h('div', { class: 'leading-5' }, [
                  h(
                    'div',
                    { class: 'text-g-900' },
                    `${row.outcome.window} · ${(row.outcome.probability * 100).toFixed(0)}%`
                  ),
                  h('div', { class: 'patient-table-secondary' }, row.outcome.label)
                ])
              : renderUnavailable()
        },
        {
          prop: 'chat',
          label: '对话',
          minWidth: 88,
          align: 'center' as const,
          formatter: (row: PatientRow) =>
            isAiGroup(row)
              ? h(
                  ElButton,
                  { link: true, type: 'primary', onClick: () => openChat(row) },
                  () => '医患对话'
                )
              : renderUnavailable()
        },
        {
          prop: 'history',
          label: '诊疗历程',
          minWidth: 88,
          align: 'center' as const,
          formatter: (row: PatientRow) =>
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => openHistory(row) },
              () => '查看历程'
            )
        },
        {
          prop: 'action',
          label: '操作',
          minWidth: 108,
          fixed: 'right' as const,
          formatter: (row: PatientRow) => {
            const buttons = [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => goPatientDetail(row) },
                () => '详情'
              )
            ]
            if (canManage.value) {
              buttons.unshift(
                h(
                  ElButton,
                  { link: true, type: 'primary', onClick: () => openEdit(row) },
                  () => '编辑'
                )
              )
            }
            return h('div', { class: 'flex-c gap-1' }, buttons)
          }
        }
      ]
    }
  })

  const searchParams = tableSearchParams as PatientSearchParams

  const exportQuery = computed<PatientRowQuery>(() => ({
    keyword: searchParams.keyword,
    status: searchParams.status,
    warnLevel: searchParams.warnLevel,
    initialEntry: searchParams.initialEntry,
    stage: searchParams.stage
  }))

  /** 返回详情时保留筛选与页码 */
  watch(
    searchParams,
    () => sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify({ ...searchParams })),
    { deep: true }
  )

  onMounted(() => {
    try {
      const raw = sessionStorage.getItem(LIST_STATE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PatientSearchParams>
        // 项目筛选已从界面移除；丢弃历史状态，避免出现看不见的过滤条件
        delete saved.projectId
        delete saved.enrollStatus
        delete saved.researchGroup
        Object.assign(searchParams, saved)
      }
    } catch {
      sessionStorage.removeItem(LIST_STATE_KEY)
    }
    void getData()
  })

  function openChat(row: PatientRow) {
    activePatient.value = row
    chatVisible.value = true
  }

  /** 表格勾选：跨页保留本次会话内勾选的编号集合 */
  const selectedIds = ref<string[]>([])
  function handleSelectionChange(rows: PatientRow[]) {
    selectedIds.value = rows.map((row) => row.id)
  }

  function openArchive() {
    editPatientId.value = ''
    archiveVisible.value = true
  }

  function openEdit(row: PatientRow) {
    editPatientId.value = row.id
    archiveVisible.value = true
  }

  function openHistory(row: PatientRow) {
    activePatient.value = row
    historyVisible.value = true
  }

  function goPatientDetail(row: PatientRow, tab?: string) {
    sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify({ ...searchParams }))
    router.push({
      name: 'DliPatientDetail',
      params: { id: row.id },
      query: tab ? { tab } : {}
    })
  }

  function handleSearch() {
    searchParams.current = 1
    void getData()
  }

  function handleReset() {
    resetSearchParams()
    searchParams.initialEntry = ''
    searchParams.stage = ''
    sessionStorage.removeItem(LIST_STATE_KEY)
    void getData()
  }

  function handleArchiveSaved() {
    void refreshData()
  }
</script>

<style scoped lang="scss">
  :deep(.patient-compact-cell > .cell) {
    padding-inline: 4px;
  }

  :deep(.patient-table-secondary) {
    color: var(--el-text-color-regular);
  }

  .dli-filter-form.el-form {
    display: flex;
    align-items: flex-start;
    width: 100%;
  }

  .dli-filter-items {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    row-gap: 12px;
    align-items: flex-start;
    min-width: 0;

    :deep(.el-form-item) {
      flex: 0 0 auto;
    }
  }

  .dli-filter-actions {
    flex: 0 0 auto;
    margin-right: 0 !important;
    white-space: nowrap;

    :deep(.el-form-item__content) {
      flex-wrap: nowrap;
    }
  }

  @media (width <= 768px) {
    .dli-filter-form.el-form {
      flex-direction: column;
      gap: 12px;
    }

    .dli-filter-actions {
      align-self: flex-end;
    }
  }
</style>

<!-- 阶段待确认：内容渲染在表格单元格与 popover 中，用非 scoped 样式保证命中 -->
<style lang="scss">
  .dli-stage-pending {
    display: inline-flex;
    gap: 3px;
    align-items: center;
    color: var(--el-color-warning);
    white-space: nowrap;
    cursor: pointer;
    border-bottom: 1px dashed var(--el-color-warning);
  }

  .dli-stage-pending-icon {
    font-size: 12px;
  }

  .dli-stage-pop-title {
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--art-gray-800);
  }

  .dli-stage-pop-row {
    display: flex;
    gap: 8px;
    font-size: 12px;
    line-height: 20px;
    color: var(--art-gray-700);
  }

  .dli-stage-pop-label {
    flex: none;
    width: 56px;
    color: var(--art-gray-500);
  }
</style>
