<!-- DLI 患者详情独立页面 [批注 01/02]：五页签 + 顶部阶段区 -->
<template>
  <div ref="scroller" class="dli-detail art-full-height overflow-y-auto pb-5">
    <!-- 面包屑 -->
    <div class="dli-crumb">
      <ElButton link @click="goBack">
        <ArtSvgIcon icon="ri:arrow-left-s-line" class="dli-back-icon" />返回
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
            <ElTag v-if="profile" effect="light" type="primary">
              当前阶段 {{ profile.stage }}
            </ElTag>
            <ElTag v-if="profile && !profile.stageConfirmed" effect="plain" type="warning">
              阶段待医生确认
            </ElTag>
            <ElTag v-if="patient" effect="plain" :type="STATUS_TAG[patient.status]">
              {{ patient.status }}
            </ElTag>
            <ElTag v-if="profile" effect="plain">{{ profile.initialEntry }}</ElTag>
          </div>
          <p class="dli-hero-sub">
            {{ profile?.diagnosisDate ? `诊断日期 ${profile.diagnosisDate}` : '暂无诊断日期' }}
            <span class="dli-dot">·</span>
            {{ profile?.diagnosisBasis || '暂无诊断依据摘要' }}
            <span class="dli-dot">·</span>
            {{ patient?.center ?? '—' }}
            <span class="dli-dot">·</span>
            负责医生 {{ patient?.doctor ?? '—' }}
          </p>
        </div>
        <div class="dli-hero-actions">
          <ElDropdown :disabled="!patient" trigger="click" @command="handleShortcut">
            <ElButton> 快捷入口<ArtSvgIcon icon="ri:arrow-down-s-line" /> </ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="chat">医患对话</ElDropdownItem>
                <ElDropdownItem command="history">诊疗历程</ElDropdownItem>
                <ElDropdownItem command="exam">检查资料</ElDropdownItem>
                <ElDropdownItem command="sample">样本记录</ElDropdownItem>
                <ElDropdownItem command="test">检测记录</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
      </div>

      <!-- 阶段区：确认后的阶段、诊断信息及阶段操作 [批注 02] -->
      <div class="dli-stage-bar">
        <div class="dli-stage-info">
          <template v-if="profile?.diagnosisConfirmed">
            诊断已确认 · {{ profile.stage }} · 生效 {{ profile.stageUpdatedAt || '—' }}
            <span v-if="!hasReport" class="text-g-500">· 暂无报告</span>
          </template>
          <template v-else>
            阶段 {{ profile?.stage ?? '—' }}
            <span v-if="profile && !profile.stageConfirmed">（待医生核对确认）</span>
            <span v-else-if="profile?.initialEntry === '已确诊DLI'">· 诊断结论待医生确认</span>
          </template>
        </div>
        <ElButton v-if="isDoctor" @click="openStageDialog">更新阶段</ElButton>
        <ElButton
          v-if="isDoctor && profile?.initialEntry === '已确诊DLI' && !profile?.diagnosisConfirmed"
          type="primary"
          plain
          @click="confirmDiagnosis"
        >
          确认诊断
        </ElButton>
        <ElButton v-if="profile?.diagnosisConfirmed && hasReport" @click="goReports">
          查看诊断后评估
        </ElButton>
        <ElButton
          v-if="profile?.diagnosisConfirmed && !hasReport && canManage"
          @click="startAssessment"
        >
          发起评估
        </ElButton>
        <ElButton v-if="profile?.diagnosisConfirmed" @click="goFollowup">制定随访</ElButton>
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
        <ElTabPane label="基础资料" name="basic">
          <BasicPanel
            ref="basicRef"
            :patient-id="patientId"
            :patient="patient"
            @edit="openEditBasic"
          />
        </ElTabPane>

        <ElTabPane label="检查资料" name="exam">
          <div class="dli-pane dli-embed">
            <ExamView :key="patientId" :patient-id="patientId" />
          </div>
        </ElTabPane>

        <ElTabPane label="管理计划" name="plan">
          <ManagementPanel :key="`plan-${patientId}`" :patient-id="patientId" />
        </ElTabPane>

        <ElTabPane label="研究入组" name="enrollment">
          <EnrollmentPanel
            :key="`enroll-${patientId}`"
            :patient-id="patientId"
            @go-consent="goConsent"
          />
        </ElTabPane>

        <ElTabPane label="知情同意" name="consent">
          <ConsentPanel
            :key="`consent-${patientId}`"
            :patient-id="patientId"
            :focus-project-id="consentProjectId"
          />
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <!-- 更新阶段 -->
    <ElDialog v-model="stageDialogVisible" title="更新阶段" width="480px" destroy-on-close>
      <ElForm label-width="110px">
        <ElFormItem label="调整后阶段">
          <ElSelect v-model="stageForm.stage" class="w-full">
            <ElOption v-for="item in STAGE_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="阶段生效时间">
          <ElDatePicker
            v-model="stageForm.effectiveAt"
            type="date"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="调整说明">
          <ElInput v-model="stageForm.note" type="textarea" :rows="2" placeholder="说明调整原因" />
        </ElFormItem>
      </ElForm>
      <div class="text-xs text-g-500">医生确认后写入诊疗历程，初始入口保持不变</div>
      <template #footer>
        <ElButton @click="stageDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="stageBusy" @click="submitStage">医生确认</ElButton>
      </template>
    </ElDialog>

    <!-- 编辑基础资料：复用建档弹窗编辑模式，保存后刷新详情 [批注 02] -->
    <ArchiveDialog v-model="editVisible" :patient-id="patientId" @saved="handleBasicSaved" />

    <!-- 医患对话 / 诊疗历程：与患者列表页共用同一套抽屉 -->
    <ChatDrawer v-model="chatVisible" :patient="patient" :readonly="!canManage" />
    <HistoryDrawer v-model="historyVisible" :patient="patient" />

    <!-- 样本 / 检测记录：复用原列表，不新增侧栏栏目；抽屉内切换不丢患者上下文 -->
    <ElDrawer v-model="sampleDrawer" title="样本记录" size="72%">
      <div class="dli-embed">
        <SampleRecordView
          :key="`sample-${patientId}`"
          :patient-id="patientId"
          @open-tests="handleOpenLinkedTests"
        />
      </div>
    </ElDrawer>
    <ElDrawer v-model="testDrawer" title="检测记录" size="72%">
      <div class="dli-embed">
        <SampleTestView
          :key="`test-${patientId}`"
          :patient-id="patientId"
          :sample-id="linkedSampleId"
          @clear-sample="linkedSampleId = ''"
        />
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElCard,
    ElDatePicker,
    ElDialog,
    ElDrawer,
    ElDropdown,
    ElDropdownItem,
    ElDropdownMenu,
    ElForm,
    ElFormItem,
    ElInput,
    ElMessage,
    ElOption,
    ElSelect,
    ElTabPane,
    ElTabs,
    ElTag
  } from 'element-plus'
  import { computed, onMounted, reactive, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { fetchGetPatientById } from '@/mock/dli/api'
  import {
    STAGE_OPTIONS,
    fetchConfirmDiagnosis,
    fetchGetPatientProfile,
    fetchUpdatePatientStage,
    hasDiagnosisReport
  } from '@/mock/dli/patient-admin'
  import type { PatientProfile, PatientStage, WebPatient } from '@/mock/dli/types'
  import { useUserStore } from '@/store/modules/user'
  import ExamView from '@/views/dli/exam/index.vue'
  import SampleRecordView from '@/views/dli/sample/record/index.vue'
  import SampleTestView from '@/views/dli/sample/test/index.vue'
  import ChatDrawer from './modules/chat-drawer.vue'
  import HistoryDrawer from './modules/history-drawer.vue'
  import ArchiveDialog from './modules/archive-dialog.vue'
  import BasicPanel from './modules/basic-panel.vue'
  import ManagementPanel from './modules/management-panel.vue'
  import EnrollmentPanel from './modules/enrollment-panel.vue'
  import ConsentPanel from './modules/consent-panel.vue'

  defineOptions({ name: 'DliPatientDetail' })

  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()

  const patientId = computed(() => String(route.params.id ?? ''))
  const activeTab = ref('basic')
  const scroller = ref<HTMLElement>()
  const chatVisible = ref(false)
  const historyVisible = ref(false)
  const sampleDrawer = ref(false)
  const testDrawer = ref(false)
  /** 样本记录抽屉「关联检测」带入的样本编号 */
  const linkedSampleId = ref('')
  const patient = ref<WebPatient>()
  const profile = ref<PatientProfile>()
  const consentProjectId = ref('')
  const basicRef = ref<{ load: () => Promise<void> }>()
  const stageDialogVisible = ref(false)
  /** 基础资料编辑弹窗（复用建档弹窗编辑模式） [批注 02] */
  const editVisible = ref(false)
  const stageBusy = ref(false)
  const stageForm = reactive({
    stage: '治疗前' as PatientStage,
    effectiveAt: new Date().toISOString().slice(0, 10),
    note: ''
  })

  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const isDoctor = computed(() => role.value === 'R_DOCTOR')
  const canManage = computed(() => ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role.value))
  const hasReport = computed(() => hasDiagnosisReport(patientId.value))

  const STATUS_TAG: Record<WebPatient['status'], 'success' | 'primary' | 'info' | 'warning'> = {
    待评估: 'warning',
    用药中: 'primary',
    随访中: 'success',
    已结案: 'info'
  }

  /** 概览指标：身份字段按 G1 不展示 */
  const metrics = computed(() => {
    const p = patient.value
    if (!p) return []
    return [
      { label: '所属中心', value: p.center },
      { label: '负责医生', value: p.doctor },
      { label: '初始入口', value: profile.value?.initialEntry ?? '—' },
      { label: '管理状态', value: p.status },
      { label: '入组状态', value: p.enrolled ? '已入组' : '仅建档' },
      { label: '最近更新', value: p.lastUpdate }
    ]
  })

  function showError(error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败')
  }

  function goBack() {
    // 从哪里进来回哪里：有应用内上一页则返回，直接打开 URL 时兜底回患者列表
    const back = (window.history.state as { back?: string } | null)?.back
    if (back) {
      router.back()
    } else {
      router.push('/dli/patient')
    }
  }

  async function loadAll() {
    const id = patientId.value
    if (!id) return
    try {
      const [detail, detailProfile] = await Promise.all([
        fetchGetPatientById(id),
        fetchGetPatientProfile(id)
      ])
      patient.value = detail
      profile.value = detailProfile
    } catch (error) {
      showError(error)
    }
  }

  function openStageDialog() {
    stageForm.stage = profile.value?.stage ?? '治疗前'
    stageForm.effectiveAt = new Date().toISOString().slice(0, 10)
    stageForm.note = ''
    stageDialogVisible.value = true
  }

  /** 基础资料右上角编辑入口：复用建档弹窗编辑模式 [批注 02] */
  function openEditBasic() {
    editVisible.value = true
  }

  /** 编辑保存成功：关闭弹窗并刷新当前详情（基础资料 + 概览指标 + 阶段区） */
  async function handleBasicSaved() {
    await loadAll()
    await basicRef.value?.load()
    ElMessage.success('基础资料已更新')
  }

  async function submitStage() {
    stageBusy.value = true
    try {
      await fetchUpdatePatientStage(patientId.value, { ...stageForm }, role.value)
      stageDialogVisible.value = false
      await loadAll()
      await basicRef.value?.load()
      ElMessage.success('阶段已更新并写入诊疗历程')
    } catch (error) {
      showError(error)
    } finally {
      stageBusy.value = false
    }
  }

  async function confirmDiagnosis() {
    try {
      await fetchConfirmDiagnosis(patientId.value, role.value)
      await loadAll()
      await basicRef.value?.load()
      ElMessage.success('医生已确认诊断结论')
    } catch (error) {
      showError(error)
    }
  }

  function goReports() {
    router.push({ name: 'DliAssessmentReports', query: { patientId: patientId.value } })
  }

  function startAssessment() {
    router.push({
      name: 'DliAssessmentReports',
      query: { patientId: patientId.value, openManual: '1' }
    })
  }

  function goFollowup() {
    router.push({ name: 'DliFollowup', query: { patientId: patientId.value } })
  }

  /** 从研究入组行内「办理知情同意」切页签并带项目 */
  function goConsent(projectId: string) {
    consentProjectId.value = projectId
    activeTab.value = 'consent'
  }

  /** 右上角快捷入口：复用原有抽屉 / 列表，不新增侧栏栏目 */
  function handleShortcut(command: unknown) {
    const key = String(command)
    if (key === 'chat') chatVisible.value = true
    else if (key === 'history') historyVisible.value = true
    else if (key === 'exam') activeTab.value = 'exam'
    else if (key === 'sample') sampleDrawer.value = true
    else if (key === 'test') {
      linkedSampleId.value = ''
      testDrawer.value = true
    }
  }

  /** 样本记录行内「关联检测」：在原抽屉内切换，不跳路由 [批注 07] */
  function handleOpenLinkedTests(sampleId: string) {
    linkedSampleId.value = sampleId
    sampleDrawer.value = false
    testDrawer.value = true
  }

  /** 切换 Tab 回到顶部，避免停在上一页的滚动位置 */
  watch(activeTab, () => {
    if (scroller.value) scroller.value.scrollTop = 0
  })

  watch(
    patientId,
    () => {
      chatVisible.value = false
      historyVisible.value = false
      sampleDrawer.value = false
      testDrawer.value = false
      linkedSampleId.value = ''
      consentProjectId.value = ''
      void loadAll()
    },
    { immediate: true }
  )

  onMounted(() => {
    const tab = route.query.tab
    if (typeof tab === 'string' && tab) activeTab.value = tab
  })
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

  /* 阶段区：批注 02 新增，不改动上方既有 hero 样式 */
  .dli-stage-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 12px 20px 14px;
    border-top: 1px solid var(--art-gray-200);
  }

  .dli-stage-info {
    flex: 0 1 auto;
    margin-right: auto;
    font-size: 12px;
    color: var(--art-gray-600);
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
