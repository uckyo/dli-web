<!-- DLI 患者详情独立页面 [批注 01/02]：顶部概览卡片（含档案信息）+ 四页签 -->
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

    <!-- 患者概览：吸顶常驻，切换 Tab 或滚动都不丢失；基础资料已并入本卡片，不重复展示 -->
    <section class="dli-hero">
      <div class="dli-hero-main">
        <div class="dli-avatar"><ArtSvgIcon icon="ri:user-3-line" /></div>
        <div class="dli-hero-id">
          <div class="dli-hero-title">
            <h1>{{ patient?.id ?? patientId }}</h1>
            <ElTag v-if="profile" effect="light" :type="stagePending ? 'warning' : 'primary'">
              当前阶段 {{ stagePending ? '诊断后（待确认）' : profile.stage }}
            </ElTag>
            <ElTag v-if="patient" effect="plain" :type="STATUS_TAG[patient.status]">
              {{ patient.status }}
            </ElTag>
            <ElTag v-if="profile" effect="plain">{{ profile.initialEntry }}</ElTag>
          </div>
          <p class="dli-hero-sub">
            <template v-if="profile?.initialEntry === '已确诊DLI'">
              诊断日期 {{ profile?.diagnosisDate || '—' }}
              <span class="dli-dot">·</span>
              诊断依据 {{ profile?.diagnosisBasis || '—' }}
            </template>
            <template v-else>非「已确诊DLI」入口，无诊断结论信息</template>
          </p>
        </div>
        <div class="dli-hero-actions">
          <!-- 仅「已确诊DLI + 诊断后 + 未确认」且当前为医生时出现 -->
          <ElButton
            v-if="canConfirmDiagnosis"
            type="primary"
            plain
            :loading="confirmBusy"
            @click="confirmDiagnosis"
          >
            确认诊断
          </ElButton>
          <ElButton v-if="diagnosisReady" @click="goPostDiagnosisAssessment">
            查看诊断后评估
          </ElButton>
          <ElButton
            v-if="diagnosisReady && isClinical"
            type="primary"
            plain
            @click="goCreateFollowup"
          >
            制定随访
          </ElButton>
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

      <div v-if="patient" class="dli-metrics">
        <div v-for="item in metrics" :key="item.label" class="dli-metric">
          <span class="dli-metric-label">{{ item.label }}</span>
          <span class="dli-metric-value" :title="item.value">{{ item.value }}</span>
        </div>
      </div>
    </section>

    <ElCard class="dli-card art-table-card dli-tab-card" shadow="never">
      <ElTabs v-model="activeTab" class="dli-tabs">
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

        <ElTabPane label="上报" name="report">
          <ReportPanel :key="`report-${patientId}`" :patient-id="patientId" />
        </ElTabPane>
      </ElTabs>
    </ElCard>

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
    ElDrawer,
    ElDropdown,
    ElDropdownItem,
    ElDropdownMenu,
    ElMessage,
    ElTabPane,
    ElTabs,
    ElTag
  } from 'element-plus'
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { fetchGetPatientById } from '@/mock/dli/api'
  import { fetchConfirmDiagnosis, fetchGetPatientProfile } from '@/mock/dli/patient-admin'
  import type { PatientProfile, WebPatient } from '@/mock/dli/types'
  import { useUserStore } from '@/store/modules/user'
  import ExamView from '@/views/dli/exam/index.vue'
  import SampleRecordView from '@/views/dli/sample/record/index.vue'
  import SampleTestView from '@/views/dli/sample/test/index.vue'
  import ChatDrawer from './modules/chat-drawer.vue'
  import HistoryDrawer from './modules/history-drawer.vue'
  import ManagementPanel from './modules/management-panel.vue'
  import EnrollmentPanel from './modules/enrollment-panel.vue'
  import ConsentPanel from './modules/consent-panel.vue'
  import ReportPanel from './modules/report-panel.vue'

  defineOptions({ name: 'DliPatientDetail' })

  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()

  /** 基础资料已并入顶部卡片，默认落在检查资料；「上报」为患者端上报的独立页签 */
  const TAB_NAMES = ['exam', 'plan', 'enrollment', 'consent', 'report']
  const patientId = computed(() => String(route.params.id ?? ''))
  const activeTab = ref('exam')
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

  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const isDoctor = computed(() => role.value === 'R_DOCTOR')
  const canManage = computed(() => ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role.value))

  const STATUS_TAG: Record<WebPatient['status'], 'success' | 'primary' | 'info' | 'warning'> = {
    待评估: 'warning',
    用药中: 'primary',
    随访中: 'success',
    已结案: 'info'
  }

  /**
   * 「诊断后」是否待医生确认。
   * 只有初始入口为「已确诊DLI」才有这个状态，其他入口不出现待确认。
   */
  const stagePending = computed(() => {
    const p = profile.value
    if (!p) return false
    return p.initialEntry === '已确诊DLI' && p.stage === '诊断后' && !p.diagnosisConfirmed
  })

  /** 仅医生可确认，且必须是「已确诊DLI + 诊断后 + 未确认」 */
  const canConfirmDiagnosis = computed(() => stagePending.value && isDoctor.value)
  const isClinical = computed(() => ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role.value))
  /** 医生已确认「已确诊DLI + 诊断后」，才出现诊断后评估与制定随访入口 */
  const diagnosisReady = computed(() => {
    const p = profile.value
    return !!p && p.initialEntry === '已确诊DLI' && p.stage === '诊断后' && p.diagnosisConfirmed
  })
  const confirmBusy = ref(false)

  /** 概览指标：身份字段按 G1 不展示；当前阶段 / 管理状态 / 初始入口已在标题标签里，这里不再重复 */
  const metrics = computed(() => {
    const p = patient.value
    if (!p) return []
    return [
      { label: '所属中心', value: p.center },
      { label: '主管医生', value: p.doctor },
      { label: '入组状态', value: p.enrolled ? '已入组' : '仅建档' },
      { label: '关联项目', value: `${profile.value?.enrollments.length ?? 0} 个` },
      {
        label: '知情同意',
        value: p.consent.signed ? p.consent.version : '未签署'
      },
      { label: '最近更新', value: p.lastUpdate }
    ]
  })

  /** 医生确认诊断：确认后阶段与诊断同时生效 */
  async function confirmDiagnosis() {
    confirmBusy.value = true
    try {
      await fetchConfirmDiagnosis(patientId.value, role.value)
      await loadAll()
      ElMessage.success('已确认诊断，阶段生效')
    } catch (error) {
      showError(error)
    } finally {
      confirmBusy.value = false
    }
  }

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

  /** 从研究入组行内「办理知情同意」切页签并带项目 */
  function goConsent(projectId: string) {
    consentProjectId.value = projectId
    activeTab.value = 'consent'
  }

  /** 医生确认诊断后：查看诊断后评估报告 [批注 02] */
  function goPostDiagnosisAssessment() {
    void router.push({
      name: 'DliAssessmentReports',
      query: { patientId: patientId.value, stage: '诊断后' }
    })
  }

  /** 医生确认诊断后：制定随访并带入患者编号 [批注 02/10] */
  function goCreateFollowup() {
    void router.push({
      name: 'DliFollowupPlans',
      query: { patientId: patientId.value }
    })
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
    // 基础资料页签已合并到顶部卡片，旧链接带 basic 时回落到检查资料
    if (typeof tab === 'string' && TAB_NAMES.includes(tab)) activeTab.value = tab
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

  /* 阶段区样式已随顶部「阶段 · 更新阶段」条移除 [批注 02 调整] */

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
