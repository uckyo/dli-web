<!-- 患者详情 360° 视图 -->
<template>
  <div class="patient-detail-page art-full-height" v-loading="loading">
    <!-- 患者信息条 -->
    <div class="art-card p-5 mb-5">
      <div class="flex-cb flex-wrap gap-4">
        <div class="flex items-start gap-4">
          <div class="flex-cc size-16 shrink-0 rounded-full bg-g-200 text-g-600">
            <ArtSvgIcon icon="ri:user-heart-line" class="text-4xl" />
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-3">
              <span class="text-2xl font-bold text-g-900">{{ patient?.name || '—' }}</span>
              <span class="text-sm text-g-500">{{ patient?.id || '—' }}</span>
              <ElTag :type="riskMeta?.tagType">{{ riskMeta?.label || '—' }}</ElTag>
              <ElTag :type="groupMeta?.tagType" effect="plain">{{ groupMeta?.label || '—' }}</ElTag>
            </div>
            <div
              class="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3"
            >
              <div class="flex gap-2">
                <span class="shrink-0 text-g-500">性别年龄：</span>
                <span class="text-g-900">{{ sexAgeText }}</span>
              </div>
              <div class="flex gap-2">
                <span class="shrink-0 text-g-500">所属中心：</span>
                <span class="text-g-900">{{ patient?.center || '—' }}</span>
              </div>
              <div class="flex gap-2">
                <span class="shrink-0 text-g-500">入组入口：</span>
                <span class="text-g-900">{{ entryMeta?.label || '—' }}</span>
              </div>
              <div class="flex gap-2">
                <span class="shrink-0 text-g-500">主管医生：</span>
                <span class="text-g-900">{{ patient?.doctor || '—' }}</span>
              </div>
              <div class="flex gap-2">
                <span class="shrink-0 text-g-500">入组日期：</span>
                <span class="text-g-900">{{ patient?.enrollDate || '—' }}</span>
              </div>
              <div class="flex gap-2">
                <span class="shrink-0 text-g-500">诊断：</span>
                <span class="text-g-900">{{ patient?.diagnosis || '—' }}</span>
              </div>
              <div class="flex gap-2">
                <span class="shrink-0 text-g-500">知情同意：</span>
                <ElTag :type="consentMeta?.tagType" size="small">
                  {{ consentMeta?.label || '—' }}
                </ElTag>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton @click="handleBack">返回列表</ElButton>
          <ElButton type="primary" @click="startAssessment">{{ assessmentButtonText }}</ElButton>
          <ElButton @click="router.push('/dli/followup')">下发随访</ElButton>
        </div>
      </div>
    </div>

    <!-- 当前高危用药 -->
    <div class="art-card p-5 mb-5">
      <div class="mb-3 flex-cb">
        <h3 class="text-base font-semibold text-g-900">当前高危用药</h3>
        <span class="text-sm text-g-500">共 {{ medicationCourses.length }} 条</span>
      </div>
      <ElTable :data="medicationCourses" size="small" empty-text="暂无高危用药记录">
        <ElTableColumn prop="drugName" label="药品名称" min-width="140" />
        <ElTableColumn prop="dose" label="剂量" min-width="100" />
        <ElTableColumn prop="route" label="途径" min-width="100" />
        <ElTableColumn prop="frequency" label="频次" min-width="120" />
        <ElTableColumn prop="startDate" label="开始日期" min-width="120" />
      </ElTable>
    </div>

    <!-- 360° 视图 Tab -->
    <div class="art-card p-5">
      <ElTabs v-model="activeTab">
        <ElTabPane label="诊疗时间轴" name="timeline">
          <TimelineTab :events="timeline" />
        </ElTabPane>
        <ElTabPane label="检验检查" name="exam">
          <ExamTab
            :lab-trends="labTrends"
            :imaging-studies="imagingStudies"
            :pathology-reports="pathologyReports"
          />
        </ElTabPane>
        <ElTabPane label="风险评估历史" name="risk">
          <RiskTab :assessments="assessments" />
        </ElTabPane>
        <ElTabPane label="患者上报" name="report">
          <ReportTab :reports="patientReports" />
        </ElTabPane>
      </ElTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchGetImagingStudies,
    fetchGetLabTrends,
    fetchGetPathologyReports,
    fetchGetPatientDetail,
    fetchGetPatientReports,
    fetchGetPatientTimeline,
    fetchGetRiskAssessments
  } from '@/mock/dli/api'
  import type {
    AssessPhase,
    DliPatientDetail,
    ImagingStudy,
    LabTrendSeries,
    PathologyReport,
    PatientReport,
    RiskAssessment,
    TimelineEvent
  } from '@/mock/dli/types'
  import {
    CONSENT_TAG_CONFIG,
    ENTRY_TAG_CONFIG,
    GROUP_TAG_CONFIG,
    RISK_TAG_CONFIG
  } from './modules/constants'
  import TimelineTab from './modules/timeline-tab.vue'
  import ExamTab from './modules/exam-tab.vue'
  import RiskTab from './modules/risk-tab.vue'
  import ReportTab from './modules/report-tab.vue'

  defineOptions({ name: 'DliPatientDetail' })

  const route = useRoute()
  const router = useRouter()

  /** 当前患者 ID */
  const patientId = computed(() => String(route.params.id || ''))
  const activeTab = ref('timeline')
  const loading = ref(false)

  const patient = ref<DliPatientDetail | null>(null)
  const timeline = ref<TimelineEvent[]>([])
  const labTrends = ref<LabTrendSeries[]>([])
  const imagingStudies = ref<ImagingStudy[]>([])
  const pathologyReports = ref<PathologyReport[]>([])
  const assessments = ref<RiskAssessment[]>([])
  const patientReports = ref<PatientReport[]>([])

  /** 高危用药记录 */
  const medicationCourses = computed(() => patient.value?.medicationCourses ?? [])

  /** 风险分层徽章 */
  const riskMeta = computed(() => (patient.value ? RISK_TAG_CONFIG[patient.value.riskLevel] : null))

  /** 入组分组徽章 */
  const groupMeta = computed(() =>
    patient.value ? GROUP_TAG_CONFIG[patient.value.groupType] : null
  )

  /** 入组入口徽章 */
  const entryMeta = computed(() =>
    patient.value ? ENTRY_TAG_CONFIG[patient.value.entryType] : null
  )

  /** 发起评估的默认阶段：已确诊 DLI 直接进入诊断后管理 */
  const assessmentPhase = computed<AssessPhase>(() => {
    if (!patient.value) return 'pre'
    if (patient.value.entryType === 'diagnosed') return 'post'
    return patient.value.medStatus === 'during' ? 'during' : 'pre'
  })

  /** 发起评估按钮文案 */
  const assessmentButtonText = computed(() =>
    assessmentPhase.value === 'post' ? '发起诊断后评估' : '发起评估'
  )

  /** 知情同意徽章 */
  const consentMeta = computed(() =>
    patient.value ? CONSENT_TAG_CONFIG[patient.value.consentStatus] : null
  )

  /** 性别年龄文案 */
  const sexAgeText = computed(() => {
    if (!patient.value) return '—'
    return `${patient.value.sex === 'male' ? '男' : '女'} / ${patient.value.age} 岁`
  })

  /**
   * 并行加载患者 360° 视图全部数据
   */
  const loadDetail = async () => {
    const id = patientId.value
    if (!id) return

    loading.value = true
    try {
      const [
        detail,
        timelineData,
        labData,
        imagingData,
        pathologyData,
        assessmentData,
        reportData
      ] = await Promise.all([
        fetchGetPatientDetail(id),
        fetchGetPatientTimeline(id),
        fetchGetLabTrends(id),
        fetchGetImagingStudies(id),
        fetchGetPathologyReports(id),
        fetchGetRiskAssessments(id),
        fetchGetPatientReports(id)
      ])

      patient.value = detail
      timeline.value = timelineData
      labTrends.value = labData
      imagingStudies.value = imagingData
      pathologyReports.value = pathologyData
      assessments.value = assessmentData
      patientReports.value = reportData
    } catch (error) {
      console.error('加载患者详情失败:', error)
      ElMessage.error('患者详情加载失败，请稍后重试')
    } finally {
      loading.value = false
    }
  }

  /**
   * 返回患者列表
   */
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/dli/patient/list')
    }
  }

  /**
   * 发起评估（携带患者与阶段，进入 CDSS 手动评估入口）
   */
  const startAssessment = () => {
    if (!patient.value) return
    router.push({
      path: '/dli/cdss',
      query: { patientId: patient.value.id, phase: assessmentPhase.value }
    })
  }

  onMounted(loadDetail)

  watch(patientId, () => {
    activeTab.value = 'timeline'
    loadDetail()
  })
</script>
