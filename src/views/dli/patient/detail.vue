<!-- DLI 患者详情独立页面：患者概览 + 待核对上报 / 检查管理 / 样本管理 / 检测管理 / 安全事件 -->
<template>
  <div ref="scroller" class="dli-detail art-full-height overflow-y-auto pb-5">
    <!-- 面包屑 -->
    <div class="dli-crumb">
      <ElButton link @click="goBack">
        <ArtSvgIcon icon="ri:arrow-left-s-line" class="dli-back-icon" />返回患者列表
      </ElButton>
      <span class="dli-crumb-sep">/</span>
      <span>患者详情</span>
    </div>

    <!-- 患者概览：吸顶常驻，切换 Tab 或滚动都不丢失 -->
    <section class="dli-hero">
      <div class="dli-hero-main">
        <div class="dli-avatar"><ArtSvgIcon icon="ri:user-3-line" /></div>
        <div class="dli-hero-id">
          <div class="dli-hero-title">
            <h1>{{ patient?.id ?? patientId }}</h1>
            <ElTag v-if="patient" effect="light" :type="STATUS_TAG[patient.status]">
              {{ patient.status }}
            </ElTag>
            <ElTag v-if="patient" effect="plain">{{ patient.group }}</ElTag>
            <ElTag v-if="patient" effect="plain" :type="patient.enrolled ? 'success' : 'info'">
              {{ patient.enrolled ? '已入组' : '仅建档' }}
            </ElTag>
          </div>
          <p class="dli-hero-sub">
            {{ patient?.researchNo ? `研究受试者编号 ${patient.researchNo}` : '尚未确认研究入组' }}
            <span class="dli-dot">·</span>
            {{ patient?.center ?? '—' }}
            <span class="dli-dot">·</span>
            主管医生 {{ patient?.doctor ?? '—' }}
          </p>
        </div>
        <div class="dli-hero-actions">
          <ElButton :disabled="!patient" @click="chatVisible = true">
            <ArtSvgIcon icon="ri:chat-3-line" class="dli-btn-icon" />医患对话
          </ElButton>
          <ElButton :disabled="!patient" @click="historyVisible = true">
            <ArtSvgIcon icon="ri:file-list-3-line" class="dli-btn-icon" />诊疗历程
          </ElButton>
          <ElButton @click="loadAll">
            <ArtSvgIcon icon="ri:refresh-line" class="dli-btn-icon" />刷新
          </ElButton>
        </div>
      </div>

      <div v-if="patient" class="dli-metrics">
        <div v-for="item in metrics" :key="item.label" class="dli-metric">
          <span class="dli-metric-label">{{ item.label }}</span>
          <span class="dli-metric-value" :title="item.value">{{ item.value }}</span>
        </div>
      </div>
    </section>

    <ElCard class="dli-card art-table-card dli-tab-card" shadow="never">
      <ElTabs v-model="activeTab" class="dli-tabs">
        <ElTabPane label="检查管理" name="exam">
          <div class="dli-pane dli-embed">
            <ExamView :key="patientId" :patient-id="patientId" />
          </div>
        </ElTabPane>

        <ElTabPane label="样本管理" name="sample">
          <div class="dli-pane dli-embed">
            <SampleRecordView :key="patientId" :patient-id="patientId" />
          </div>
        </ElTabPane>

        <ElTabPane label="检测管理" name="test">
          <div class="dli-pane dli-embed">
            <SampleTestView :key="patientId" :patient-id="patientId" />
          </div>
        </ElTabPane>

        <ElTabPane
          :label="`待核对上报${pendingReportCount ? '（' + pendingReportCount + '）' : ''}`"
          name="report"
        >
          <div class="dli-pane dli-own">
            <ArtTable :data="reportList" :columns="reportColumns" empty-text="暂无上报记录" />
          </div>
        </ElTabPane>

        <ElTabPane label="安全事件" name="safety">
          <div class="dli-pane dli-own">
            <div class="dli-pane-bar">
              <ElButton type="primary" @click="openSafetyDialog">
                <ArtSvgIcon icon="ri:add-circle-line" class="dli-btn-icon" />登记事件
              </ElButton>
            </div>
            <ArtTable :data="safetyList" :columns="safetyColumns" empty-text="暂无安全事件" />
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <!-- 登记安全事件 -->
    <ElDialog v-model="safetyDialogVisible" title="登记安全事件" width="440px" destroy-on-close>
      <ElForm label-width="96px">
        <ElFormItem label="事件类型">
          <ElSelect v-model="safetyForm.type" class="w-full">
            <ElOption v-for="item in SAFETY_TYPES" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="级别">
          <ElSelect v-model="safetyForm.level" class="w-full">
            <ElOption v-for="item in SAFETY_LEVELS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="safetyDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="submitSafetyEvent">确认登记</ElButton>
      </template>
    </ElDialog>

    <!-- 医患对话 / 诊疗历程：与患者列表页共用同一套抽屉 -->
    <ChatDrawer v-model="chatVisible" :patient="patient" :readonly="!canReply" />
    <HistoryDrawer v-model="historyVisible" :patient="patient" />
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElCard,
    ElDialog,
    ElForm,
    ElFormItem,
    ElMessage,
    ElOption,
    ElSelect,
    ElTabPane,
    ElTabs,
    ElTag
  } from 'element-plus'
  import { useRoute, useRouter } from 'vue-router'
  import {
    fetchAddSafetyEvent,
    fetchConfirmSafetyEvent,
    fetchGetPatientById,
    fetchGetPatientReports,
    fetchGetPatientSafetyEvents,
    fetchReviewPatientReport
  } from '@/mock/dli/api'
  import type { PatientReport, SafetyEvent, WebPatient } from '@/mock/dli/types'
  import type { ColumnOption } from '@/types/component'
  import { useUserStore } from '@/store/modules/user'
  import ExamView from '@/views/dli/exam/index.vue'
  import SampleRecordView from '@/views/dli/sample/record/index.vue'
  import SampleTestView from '@/views/dli/sample/test/index.vue'
  import ChatDrawer from './modules/chat-drawer.vue'
  import HistoryDrawer from './modules/history-drawer.vue'

  defineOptions({ name: 'DliPatientDetail' })

  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()

  const patientId = computed(() => String(route.params.id ?? ''))
  const activeTab = ref('exam')
  const scroller = ref<HTMLElement>()
  const chatVisible = ref(false)
  const historyVisible = ref(false)
  const patient = ref<WebPatient>()
  const reportList = ref<PatientReport[]>([])
  const safetyList = ref<SafetyEvent[]>([])

  const STATUS_TAG: Record<WebPatient['status'], 'success' | 'primary' | 'info' | 'warning'> = {
    待评估: 'warning',
    用药中: 'primary',
    随访中: 'success',
    已结案: 'info'
  }

  const SAFETY_TYPES = ['药物相关肝酶升高', '间质性肺病加重', '感染', '皮疹', '其他']
  const SAFETY_LEVELS: Array<SafetyEvent['level']> = ['轻度', '中度', '重度']
  const safetyDialogVisible = ref(false)
  const safetyForm = reactive({
    type: '药物相关肝酶升高',
    level: '轻度' as SafetyEvent['level']
  })

  /** 待核对上报表格列（与项目 ArtTable 风格统一） */
  const reportColumns: ColumnOption<PatientReport>[] = [
    { prop: 'date', label: '上报日期', width: 130 },
    { prop: 'type', label: '类型', width: 140 },
    { prop: 'content', label: '内容', minWidth: 220, showOverflowTooltip: true },
    {
      prop: 'status',
      label: '状态',
      width: 110,
      formatter: (row: PatientReport) =>
        h(
          ElTag,
          {
            type:
              row.status === '已核对' ? 'success' : row.status === '已退回' ? 'danger' : 'warning',
            effect: 'light'
          },
          () => row.status
        )
    },
    {
      prop: 'operation',
      label: '操作',
      width: 150,
      formatter: (row: PatientReport) => {
        if (row.status === '待核对') {
          return h('div', { class: 'flex-c gap-1' }, [
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => reviewReport(row, '已核对') },
              () => '通过'
            ),
            h(
              ElButton,
              { link: true, type: 'danger', onClick: () => reviewReport(row, '已退回') },
              () => '退回'
            )
          ])
        }
        return h('span', { class: 'text-xs text-g-500' }, () => row.reviewer)
      }
    }
  ]

  /** 安全事件表格列 */
  const safetyColumns: ColumnOption<SafetyEvent>[] = [
    { prop: 'date', label: '日期', width: 130 },
    { prop: 'type', label: '事件类型', minWidth: 190, showOverflowTooltip: true },
    { prop: 'level', label: '级别', width: 100 },
    {
      prop: 'confirmedBy',
      label: '医生确认',
      width: 130,
      formatter: (row: SafetyEvent) =>
        h(ElTag, { type: row.confirmed ? 'success' : 'warning', effect: 'light' }, () =>
          row.confirmed ? row.confirmedBy : '待确认'
        )
    },
    {
      prop: 'operation',
      label: '操作',
      width: 110,
      formatter: (row: SafetyEvent) => {
        if (!row.confirmed && isDoctor.value) {
          return h(
            ElButton,
            { link: true, type: 'primary', onClick: () => confirmSafetyEvent(row) },
            () => '确认'
          )
        }
        if (!row.confirmed) {
          return h('span', { class: 'text-xs text-g-500' }, () => '仅医生可确认')
        }
        return h('span', { class: 'text-xs text-g-500' }, () => '已确认')
      }
    }
  ]

  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const isDoctor = computed(() => role.value === 'R_DOCTOR')
  const canReply = computed(() => ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role.value))
  const operatorName = computed(() => {
    const info = userStore.getUserInfo as {
      userName?: string
      username?: string
      nickName?: string
    }
    return info.userName ?? info.username ?? info.nickName ?? '当前医护'
  })

  const pendingReportCount = computed(
    () => reportList.value.filter((item) => item.status === '待核对').length
  )

  /** 概览指标：身份字段按 G1 不展示 */
  const metrics = computed(() => {
    const p = patient.value
    if (!p) return []
    return [
      { label: '所属中心', value: p.center },
      { label: '主管医生', value: p.doctor },
      { label: '入组入口', value: p.enrollEntry || '未入组' },
      { label: '入组日期', value: p.enrollDate || '—' },
      {
        label: '知情同意',
        value: p.consent.signed ? `${p.consent.version} · ${p.consent.date}` : '未签署'
      },
      { label: '最近更新', value: p.lastUpdate }
    ]
  })

  function showError(error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败')
  }

  function goBack() {
    router.push('/dli/patient')
  }

  async function loadAll() {
    const id = patientId.value
    if (!id) return
    try {
      const [detail, reports, events] = await Promise.all([
        fetchGetPatientById(id),
        fetchGetPatientReports(id),
        fetchGetPatientSafetyEvents(id)
      ])
      patient.value = detail
      reportList.value = reports
      safetyList.value = events
    } catch (error) {
      showError(error)
    }
  }

  async function reviewReport(row: PatientReport, action: '已核对' | '已退回') {
    try {
      const updated = await fetchReviewPatientReport(row.id, action, operatorName.value)
      const target = reportList.value.find((item) => item.id === row.id)
      if (target) Object.assign(target, updated)
      ElMessage.success(`上报已${action}`)
    } catch (error) {
      showError(error)
    }
  }

  function openSafetyDialog() {
    safetyDialogVisible.value = true
  }

  async function submitSafetyEvent() {
    try {
      await fetchAddSafetyEvent(patientId.value, { ...safetyForm })
      safetyDialogVisible.value = false
      safetyList.value = await fetchGetPatientSafetyEvents(patientId.value)
      ElMessage.success('安全事件已登记，等待医生确认')
    } catch (error) {
      showError(error)
    }
  }

  async function confirmSafetyEvent(row: SafetyEvent) {
    try {
      await fetchConfirmSafetyEvent(patientId.value, row.id, operatorName.value)
      safetyList.value = await fetchGetPatientSafetyEvents(patientId.value)
      ElMessage.success('医生已确认该安全事件')
    } catch (error) {
      showError(error)
    }
  }

  /** 切换 Tab 回到顶部，避免停在上一页的滚动位置 */
  watch(activeTab, () => {
    if (scroller.value) scroller.value.scrollTop = 0
  })

  watch(
    patientId,
    () => {
      activeTab.value = 'exam'
      chatVisible.value = false
      historyVisible.value = false
      loadAll()
    },
    { immediate: true }
  )
</script>

<style lang="scss">
  /* 仅作用于患者详情页，全部类名带 dli- 前缀 */
  .dli-detail {
    padding: 16px 18px 20px;
  }

  .dli-crumb {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;
    font-size: 12px;
    color: var(--art-gray-600);
  }

  .dli-crumb .el-button {
    height: auto;
    padding: 0;
    font-size: 12px;
  }

  .dli-back-icon {
    margin-right: 2px;
    font-size: 15px;
  }

  .dli-crumb-sep {
    color: var(--art-gray-400);
  }

  .dli-hero {
    position: sticky;
    top: 0;
    z-index: 12;
    margin-bottom: 16px;
    overflow: hidden;
    background: var(--default-box-color);
    border: 1px solid var(--art-card-border);
    border-radius: 10px;
    box-shadow: 0 4px 18px rgb(0 0 0 / 3.5%);
  }

  .dli-hero-main {
    display: flex;
    gap: 16px;
    align-items: center;
    padding: 18px 20px 16px;
  }

  .dli-avatar {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    font-size: 22px;
    color: #fff;
    background: linear-gradient(135deg, var(--el-color-primary), var(--art-secondary));
    border-radius: 13px;
  }

  .dli-hero-id {
    flex: 1;
    min-width: 0;
  }

  .dli-hero-title {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
    align-items: center;
  }

  .dli-hero-title h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--art-gray-900);
    letter-spacing: 0.2px;
  }

  .dli-hero-title .el-tag {
    border-radius: 999px;
  }

  .dli-hero-sub {
    margin: 7px 0 0;
    font-size: 12px;
    color: var(--art-gray-600);
  }

  .dli-dot {
    margin: 0 6px;
    color: var(--art-gray-400);
  }

  .dli-hero-actions {
    display: flex;
    flex: none;
    gap: 8px;
  }

  .dli-btn-icon {
    margin-right: 4px;
    font-size: 14px;
  }

  .dli-metrics {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    background: var(--art-gray-100);
    border-top: 1px solid var(--art-gray-200);
  }

  .dli-metric {
    min-width: 0;
    padding: 11px 16px 12px;
    border-right: 1px solid var(--art-gray-200);
  }

  .dli-metric:last-child {
    border-right: none;
  }

  .dli-metric-label {
    display: block;
    margin-bottom: 5px;
    font-size: 11px;
    color: var(--art-gray-500);
  }

  .dli-metric-value {
    display: block;
    overflow: hidden;
    font-size: 13px;
    font-weight: 500;
    color: var(--art-gray-900);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dli-tabs .el-tabs__header {
    margin-bottom: 14px;
  }

  .dli-tabs .el-tabs__nav-wrap::after {
    height: 1px;
    background: var(--art-gray-200);
  }

  .dli-tabs .el-tabs__item {
    height: 44px;
    padding: 0 20px;
    font-size: 13px;
    line-height: 44px;
  }

  .dli-tabs .el-tabs__active-bar {
    height: 2px;
    border-radius: 2px;
  }

  .dli-card.el-card {
    border-radius: 10px;
  }

  .dli-card .el-card__body {
    padding: 16px 18px;
  }

  /* Tab 卡：标签头贴卡片顶部 */
  .dli-tab-card .el-card__body {
    padding: 6px 18px 16px;
  }

  /* 嵌入的管理页自带卡片在 Tab 卡内去边框，融合为一块内容 */
  .dli-embed .el-card {
    border: none !important;
    box-shadow: none !important;

    --el-card-border-color: transparent;
  }

  .dli-embed .el-card__body {
    padding: 0;
  }

  /* 自有内容区（上报 / 安全事件）的左上操作栏 */
  .dli-pane-bar {
    display: flex;
    margin-bottom: 12px;
  }

  /* 关键：三个管理页自身是「固定视口高度 + 独立滚动」的整页容器，
     嵌入 Tab 时改为普通内容流，否则会把外层顶部概览挤出可视区域。 */
  .dli-embed > .art-full-height {
    height: auto !important;
    padding-bottom: 0 !important;
    overflow: visible !important;
  }

  @media (width <= 1180px) {
    .dli-metrics {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .dli-metric:nth-child(3) {
      border-right: none;
    }

    .dli-metric:nth-child(n + 4) {
      border-top: 1px solid var(--art-gray-200);
    }
  }

  @media (width <= 640px) {
    .dli-hero {
      position: static;
    }

    .dli-hero-main {
      flex-wrap: wrap;
    }

    .dli-hero-actions {
      width: 100%;
    }

    .dli-metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dli-metric:nth-child(2n) {
      border-right: none;
    }
  }
</style>
