/**
 * DLI Mock 服务层 - 模拟后端接口（延迟 + 筛选 + 分页）
 *
 * 全部页面数据通过本模块获取；函数签名对齐项目 API 规范（fetchXxx），
 * 列表接口返回 Api.Common.PaginatedResponse 结构，可直接对接 useTable。
 */
import { ALERT_LIST, PATIENT_REPORTS } from './alerts'
import { RISK_ASSESSMENTS } from './assessments'
import {
  FOLLOWUP_PLANS,
  FOLLOWUP_TEMPLATES,
  PENDING_PUBLICATIONS,
  PENDING_REVIEWS,
  TODAY_FOLLOWUP_TASKS
} from './followups'
import {
  IMAGING_STUDIES,
  LAB_TRENDS,
  PATIENT_DETAILS,
  PATIENT_LIST,
  PATHOLOGY_REPORTS,
  TIMELINE_EVENTS
} from './patients'
import type {
  DliAlert,
  DliPatient,
  DliPatientDetail,
  FollowupPlan,
  FollowupTemplate,
  ImagingStudy,
  LabTrendSeries,
  PathologyReport,
  PatientReport,
  RiskAssessment,
  TimelineEvent,
  WorkbenchStats
} from './types'

/** 模拟网络延迟 */
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

/** 医生确认留痕记录（审核发布） */
export const CONFIRM_RECORDS: Array<{
  reviewId: string
  action: 'agree' | 'modify' | 'reject'
  opinion: string
  doctor: string
  time: string
}> = []

/** 风险分层展示文案 */
const RISK_LABELS: Record<string, string> = {
  L1: 'L1 极高',
  L2: 'L2 高',
  L3: 'L3 中',
  L4: 'L4 低'
}

/** 患者列表查询参数 */
export interface PatientListParams {
  current: number
  size: number
  keyword?: string
  riskLevel?: string
  medStatus?: string
  groupType?: string
}

/** 预警列表查询参数 */
export interface AlertListParams {
  current: number
  size: number
  keyword?: string
  level?: string
  status?: string
  source?: string
}

/** 分页工具 */
function paginate<T>(list: T[], current: number, size: number) {
  const start = (current - 1) * size
  return {
    records: list.slice(start, start + size),
    current,
    size,
    total: list.length
  }
}

/** 获取工作台统计 */
export async function fetchGetWorkbenchStats(): Promise<WorkbenchStats> {
  await delay(200)
  const distribution = (['L1', 'L2', 'L3', 'L4'] as const).map((level) => ({
    level,
    label: RISK_LABELS[level],
    count: PATIENT_LIST.filter((p) => p.riskLevel === level).length
  }))
  return {
    patientTotal: PATIENT_LIST.length,
    pendingAlertCount: ALERT_LIST.filter((a) => a.status === 'pending').length,
    todayFollowupCount: TODAY_FOLLOWUP_TASKS.length,
    modelVersion: 'DLI-CDSS v2.3.1',
    modelStatus: '运行中（AUC 0.87）',
    riskDistribution: distribution
  }
}

/** 获取最新预警（工作台） */
export async function fetchGetLatestAlerts(limit = 5): Promise<DliAlert[]> {
  await delay(200)
  return [...ALERT_LIST].sort((a, b) => b.occurTime.localeCompare(a.occurTime)).slice(0, limit)
}

/** 获取今日随访任务（工作台） */
export async function fetchGetTodayFollowups() {
  await delay(200)
  return TODAY_FOLLOWUP_TASKS
}

/** 获取患者列表（分页 + 筛选） */
export async function fetchGetPatientList(
  params: PatientListParams
): Promise<Api.Common.PaginatedResponse<DliPatient>> {
  await delay()
  let list = [...PATIENT_LIST]
  if (params.keyword) {
    const kw = params.keyword.toLowerCase()
    list = list.filter(
      (p) => p.name.includes(kw) || p.id.toLowerCase().includes(kw) || p.doctor.includes(kw)
    )
  }
  if (params.riskLevel) list = list.filter((p) => p.riskLevel === params.riskLevel)
  if (params.medStatus) list = list.filter((p) => p.medStatus === params.medStatus)
  if (params.groupType) list = list.filter((p) => p.groupType === params.groupType)
  return paginate(list, params.current, params.size)
}

/** 获取患者详情 */
export async function fetchGetPatientDetail(id: string): Promise<DliPatientDetail> {
  await delay()
  const detail = PATIENT_DETAILS[id]
  if (detail) return detail
  const base = PATIENT_LIST.find((p) => p.id === id)
  if (!base) throw new Error('患者不存在')
  return {
    ...base,
    phone: '138****0000',
    idNoMasked: '————',
    enrollDate: '2026-09-01',
    diagnosis: '高危药物治疗随访中',
    medicationCourses: []
  }
}

/** 新增 / 编辑患者（内存 mock，刷新后恢复） */
export async function fetchSavePatient(data: Partial<DliPatient>): Promise<void> {
  await delay(400)
  const idx = PATIENT_LIST.findIndex((p) => p.id === data.id)
  if (idx >= 0) {
    PATIENT_LIST[idx] = { ...PATIENT_LIST[idx], ...data } as DliPatient
  } else {
    PATIENT_LIST.unshift({
      id: data.id || `DLI-2026-${String(PATIENT_LIST.length + 1).padStart(4, '0')}`,
      name: data.name || '新**',
      sex: data.sex || 'male',
      age: data.age || 50,
      center: data.center || '同济医院',
      groupType: data.groupType || 'ai',
      medStatus: data.medStatus || 'before',
      riskLevel: data.riskLevel || 'L3',
      drugs: data.drugs || [],
      lastAssessTime: '—',
      unreadReports: 0,
      consentStatus: data.consentStatus || 'unsigned',
      doctor: data.doctor || '陈明远'
    })
  }
}

/** 删除患者（内存 mock） */
export async function fetchDeletePatient(id: string): Promise<void> {
  await delay(400)
  const idx = PATIENT_LIST.findIndex((p) => p.id === id)
  if (idx >= 0) PATIENT_LIST.splice(idx, 1)
}

/** 获取患者时间轴 */
export async function fetchGetPatientTimeline(id: string): Promise<TimelineEvent[]> {
  await delay()
  return TIMELINE_EVENTS.filter((e) => e.patientId === id).sort((a, b) =>
    b.time.localeCompare(a.time)
  )
}

/** 获取检验指标趋势 */
export async function fetchGetLabTrends(id: string): Promise<LabTrendSeries[]> {
  await delay()
  return LAB_TRENDS[id] || []
}

/** 获取影像报告 */
export async function fetchGetImagingStudies(id: string): Promise<ImagingStudy[]> {
  await delay()
  return IMAGING_STUDIES.filter((i) => i.patientId === id)
}

/** 获取病理报告 */
export async function fetchGetPathologyReports(id: string): Promise<PathologyReport[]> {
  await delay()
  return PATHOLOGY_REPORTS.filter((p) => p.patientId === id)
}

/** 获取风险评估历史（可按患者过滤） */
export async function fetchGetRiskAssessments(patientId?: string): Promise<RiskAssessment[]> {
  await delay()
  let list = [...RISK_ASSESSMENTS]
  if (patientId) list = list.filter((r) => r.patientId === patientId)
  return list.sort((a, b) => b.assessTime.localeCompare(a.assessTime))
}

/** 医生确认评估建议（采纳 / 修改 / 不采纳，留痕） */
export async function fetchConfirmAssessment(
  assessmentId: string,
  action: 'agree' | 'modify' | 'reject',
  opinion: string
): Promise<void> {
  await delay(400)
  const item = RISK_ASSESSMENTS.find((r) => r.id === assessmentId)
  if (!item) throw new Error('评估报告不存在')
  item.doctorConfirm = {
    action,
    opinion,
    doctor: '当前登录医生',
    time: new Date().toLocaleString('zh-CN', { hour12: false })
  }
}

/** 获取患者上报动态（可按患者过滤） */
export async function fetchGetPatientReports(patientId?: string): Promise<PatientReport[]> {
  await delay()
  let list = [...PATIENT_REPORTS]
  if (patientId) list = list.filter((r) => r.patientId === patientId)
  return list.sort((a, b) => b.reportTime.localeCompare(a.reportTime))
}

/** 获取预警列表（分页 + 筛选） */
export async function fetchGetAlertList(
  params: AlertListParams
): Promise<Api.Common.PaginatedResponse<DliAlert>> {
  await delay()
  let list = [...ALERT_LIST]
  if (params.keyword) {
    const kw = params.keyword.toLowerCase()
    list = list.filter(
      (a) =>
        a.patientName.includes(kw) || a.ruleName.includes(kw) || a.id.toLowerCase().includes(kw)
    )
  }
  if (params.level) list = list.filter((a) => a.level === params.level)
  if (params.status) list = list.filter((a) => a.status === params.status)
  if (params.source) list = list.filter((a) => a.source === params.source)
  list.sort((a, b) => b.occurTime.localeCompare(a.occurTime))
  return paginate(list, params.current, params.size)
}

/** 预警处置（标记处理 / 升级 / 转随访） */
export async function fetchHandleAlert(
  alertId: string,
  action: 'mark' | 'escalate' | 'followup',
  opinion: string
): Promise<void> {
  await delay(400)
  const alert = ALERT_LIST.find((a) => a.id === alertId)
  if (!alert) throw new Error('预警不存在')
  const statusMap = { mark: 'handled', escalate: 'escalated', followup: 'handled' } as const
  alert.status = statusMap[action]
  alert.handleRecord = {
    action,
    opinion,
    handler: '当前登录医生',
    handleTime: new Date().toLocaleString('zh-CN', { hour12: false })
  }
}

/** 获取随访模板 */
export async function fetchGetFollowupTemplates(): Promise<FollowupTemplate[]> {
  await delay(200)
  return FOLLOWUP_TEMPLATES
}

/** 随访计划查询参数 */
export interface FollowupPlanListParams {
  current: number
  size: number
  keyword?: string
  status?: string
}

/** 获取随访计划列表（分页） */
export async function fetchGetFollowupPlans(
  params: FollowupPlanListParams
): Promise<Api.Common.PaginatedResponse<FollowupPlan>> {
  await delay()
  let list = [...FOLLOWUP_PLANS]
  if (params.keyword) {
    const kw = params.keyword.toLowerCase()
    list = list.filter(
      (p) =>
        p.patientName.includes(kw) || p.templateName.includes(kw) || p.id.toLowerCase().includes(kw)
    )
  }
  if (params.status) list = list.filter((p) => p.status === params.status)
  return paginate(list, params.current, params.size)
}

/** 下发随访计划（发布至患者端） */
export async function fetchPublishFollowupPlan(planId: string): Promise<void> {
  await delay(400)
  const plan = FOLLOWUP_PLANS.find((p) => p.id === planId)
  if (!plan) throw new Error('计划不存在')
  plan.status = 'published'
}

/** 获取待确认建议（审核发布） */
export async function fetchGetPendingReviews() {
  await delay(200)
  return PENDING_REVIEWS
}

/** 医生确认建议（采纳 / 修改 / 不采纳），确认记录留痕 */
export async function fetchConfirmReview(
  reviewId: string,
  action: 'agree' | 'modify' | 'reject',
  opinion: string
): Promise<void> {
  await delay(400)
  const idx = PENDING_REVIEWS.findIndex((r) => r.id === reviewId)
  if (idx >= 0) {
    CONFIRM_RECORDS.push({
      reviewId,
      action,
      opinion,
      doctor: '当前登录医生',
      time: new Date().toLocaleString('zh-CN', { hour12: false })
    })
    PENDING_REVIEWS.splice(idx, 1)
  }
}

/** 获取待发布项（审核发布） */
export async function fetchGetPendingPublications() {
  await delay(200)
  return PENDING_PUBLICATIONS
}

/** 发布确认（推送至患者端） */
export async function fetchPublishItem(publishId: string): Promise<void> {
  await delay(400)
  const idx = PENDING_PUBLICATIONS.findIndex((p) => p.id === publishId)
  if (idx >= 0) PENDING_PUBLICATIONS.splice(idx, 1)
}
