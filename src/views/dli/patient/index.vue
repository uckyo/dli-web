<!-- DLI 患者管理 [批注 01-04]：可收起筛选 + 新增患者 / 导入 / 导出 -->
<template>
  <div class="art-full-height">
    <!-- 搜索区 -->
    <div class="art-card px-5 pt-4 pb-0">
      <ElForm :inline="true" class="dli-filter-form" @submit.prevent>
        <div
          ref="filterItemsRef"
          class="dli-filter-items"
          :class="{ 'is-collapsed': !searchExpanded && hiddenCount > 0 }"
          :style="{ '--dli-filter-row-h': `${filterRowHeight}px` }"
        >
          <ElFormItem label="关键词">
            <ElInput
              v-model="searchParams.keyword"
              placeholder="患者编号 / 研究编号 / 负责医生"
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
          <ElButton
            v-if="hiddenCount > 0"
            link
            type="primary"
            @click="searchExpanded = !searchExpanded"
          >
            {{ searchExpanded ? '收起' : `展开（${hiddenCount}）` }}
            <ArtSvgIcon :icon="searchExpanded ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'" />
          </ElButton>
        </ElFormItem>
      </ElForm>
    </div>

    <!-- 表格 -->
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <div class="flex-c gap-2">
            <ElButton v-if="canManage" type="primary" @click="openArchive">新增患者</ElButton>
            <ElButton plain @click="downloadTemplate">下载模板</ElButton>
            <ElButton v-if="canManage" plain @click="importVisible = true">导入</ElButton>
            <ElButton plain @click="exportVisible = true">导出</ElButton>
          </div>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

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
  import {
    ElButton,
    ElForm,
    ElFormItem,
    ElInput,
    ElMessage,
    ElOption,
    ElSelect,
    ElTag
  } from 'element-plus'
  import { computed, h, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useTable } from '@/hooks/core/useTable'
  import {
    INITIAL_ENTRY_OPTIONS,
    MANAGE_STATUS_OPTIONS,
    STAGE_OPTIONS,
    buildTemplateCsv,
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
  const searchExpanded = ref(false)
  const activePatient = ref<WebPatient>()

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
    if (!isAiGroup(row)) return h('span', { class: 'text-xs text-g-400' }, '依方案不开放')
    const warn = row[field]
    const config = WARN_CONFIG[warn.level]
    const text = warn.level === 'none' ? config.label : `${config.label} ${warn.score}`
    return h(ElTag, { type: config.type, effect: 'plain' }, () => text)
  }

  const {
    columns,
    columnChecks,
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
        { prop: 'id', label: '患者编号', width: 160, fixed: 'left' as const },
        { prop: 'initialEntry', label: '初始入口', width: 170 },
        {
          prop: 'stage',
          label: '当前阶段',
          width: 125,
          formatter: (row: PatientRow) =>
            h('div', { class: 'flex-c gap-1' }, [
              h('span', {}, row.stage),
              row.stageConfirmed
                ? null
                : h(ElTag, { type: 'warning', effect: 'plain', size: 'small' }, () => '待确认')
            ])
        },
        {
          prop: 'projectCount',
          label: '研究项目',
          width: 175,
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
        { prop: 'center', label: '所属中心', width: 115 },
        { prop: 'doctor', label: '负责医生', width: 105 },
        {
          prop: 'status',
          label: '管理状态',
          width: 105,
          formatter: (row: PatientRow) =>
            h(ElTag, { type: STATUS_TAG[row.status], effect: 'light' }, () => row.status)
        },
        {
          prop: 'consent',
          label: '知情同意',
          width: 110,
          formatter: (row: PatientRow) =>
            h(ElTag, { type: row.consent.signed ? 'success' : 'warning', effect: 'plain' }, () =>
              row.consent.signed ? row.consent.version : '未签署'
            )
        },
        {
          prop: 'earlyScreen',
          label: '早筛预警',
          width: 130,
          formatter: (row: PatientRow) => renderWarn(row, 'earlyScreen')
        },
        {
          prop: 'earlyDiagnosis',
          label: '早诊预警',
          width: 130,
          formatter: (row: PatientRow) => renderWarn(row, 'earlyDiagnosis')
        },
        {
          prop: 'outcome',
          label: '转归预测',
          minWidth: 170,
          formatter: (row: PatientRow) =>
            isAiGroup(row)
              ? h('div', { class: 'leading-5' }, [
                  h(
                    'div',
                    { class: 'text-g-900' },
                    `${row.outcome.window} · ${(row.outcome.probability * 100).toFixed(0)}%`
                  ),
                  h('div', { class: 'text-xs text-g-500' }, row.outcome.label)
                ])
              : h('span', { class: 'text-xs text-g-400' }, '依方案不开放')
        },
        {
          prop: 'chat',
          label: '对话',
          width: 120,
          align: 'center' as const,
          formatter: (row: PatientRow) =>
            isAiGroup(row)
              ? h(
                  ElButton,
                  { link: true, type: 'primary', onClick: () => openChat(row) },
                  () => '医患对话'
                )
              : h('span', { class: 'text-xs text-g-400' }, '依方案不开放')
        },
        {
          prop: 'history',
          label: '诊疗历程',
          width: 100,
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
          width: 150,
          fixed: 'right' as const,
          formatter: (row: PatientRow) => {
            const buttons = [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => goPatientDetail(row) },
                () => '患者详情'
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

  /** 筛选区按容器宽度自适应：第一行能放下的筛选项全部显示，放不下的才收起 */
  const filterItemsRef = ref<HTMLElement | null>(null)
  const hiddenCount = ref(0)
  const filterRowHeight = ref(56)
  let filterObserver: ResizeObserver | null = null
  let lastFilterWidth = 0

  /**
   * 依据各筛选项的 offsetTop 判断第一行之后的项。
   * 收起用 max-height 裁剪而非 display:none，元素仍参与布局，重复测量不会失真。
   */
  function measureFilterRow() {
    const box = filterItemsRef.value
    if (!box) return
    const items = Array.from(box.children) as HTMLElement[]
    if (!items.length) return
    const top0 = items[0].offsetTop
    const overflowing = items.filter((el) => el.offsetTop > top0 + 1)
    hiddenCount.value = overflowing.length
    filterRowHeight.value = overflowing.length
      ? overflowing[0].offsetTop - top0
      : items[0].offsetHeight + 18
  }

  function scheduleFilterMeasure() {
    void nextTick(measureFilterRow)
  }

  /** 容器宽度变化才重新测量，避免收起/展开引起的高度变化造成回调循环 */
  function initFilterObserver() {
    // 兜底：部分环境下容器宽度变化不触发 ResizeObserver
    window.addEventListener('resize', scheduleFilterMeasure)
    const form = filterItemsRef.value?.parentElement
    if (!form || typeof ResizeObserver === 'undefined') return
    lastFilterWidth = Math.round(form.getBoundingClientRect().width)
    filterObserver = new ResizeObserver((entries) => {
      const width = Math.round(entries[0].contentRect.width)
      if (width === lastFilterWidth) return
      lastFilterWidth = width
      scheduleFilterMeasure()
    })
    filterObserver.observe(form)
  }

  watch(hiddenCount, (count) => {
    if (count === 0) searchExpanded.value = false
  })

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
    // 首屏布局稳定后测量第一行，再由容器宽度变化驱动后续重算
    void nextTick(() => {
      measureFilterRow()
      initFilterObserver()
      requestAnimationFrame(measureFilterRow)
    })
  })

  onUnmounted(() => {
    filterObserver?.disconnect()
    window.removeEventListener('resize', scheduleFilterMeasure)
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

  /** 下载当前已发布字段导入模板（与导入弹窗同一份模板，不含敏感字段） [批注 04] */
  function downloadTemplate() {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '患者导入模板.csv'
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('模板已下载')
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
  /* 筛选区自适应：第一行铺满后，只有换行的筛选项才进入「展开」 */
  .dli-filter-form {
    display: flex;
    align-items: flex-start;
    width: 100%;
  }

  .dli-filter-items {
    position: relative; // 让子项 offsetTop 相对本容器，测量更精确
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: flex-start;
    min-width: 0;
    transition: max-height 0.2s ease;

    &.is-collapsed {
      max-height: calc(var(--dli-filter-row-h, 56px) + 2px);
      overflow: hidden;
    }

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
</style>
