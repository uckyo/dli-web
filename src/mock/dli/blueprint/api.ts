/**
 * DLI 页面说明蓝图 · 新增业务 Mock 接口
 *
 * 命名与返回结构对齐 src/mock/dli/api.ts：fetchXxx + Api.Common.PaginatedResponse，
 * 可直接对接 useTable / ArtTable。所有变更均为内存态，刷新后恢复初始数据。
 *
 * G1 [批注 01-4]：本模块所有患者相关返回值只含 patientId（系统患者编号 /
 * 研究受试者编号），不含姓名、手机号、病历号。
 * G6 [批注 16-1][批注 16-2]：配置发布、权限变更、恢复操作等均写入留痕数据。
 */
import {
  ANALYSIS_RUNS,
  ASSESSMENT_REPORTS,
  CODE_RULES,
  CONSENT_TEMPLATES,
  FIELD_CONFIG_VERSIONS,
  FOLLOWUP_PLANS,
  FOLLOWUP_TASKS,
  FOLLOWUP_TEMPLATES,
  MANAGEMENT_PLANS,
  PATIENT_FIELDS,
  RESEARCH_CRITERIA_LISTS,
  RESEARCH_PROJECT_DETAILS,
  SYSTEM_LOGS,
  WARNING_TICKETS,
  appendSystemLog,
  createResearchProjectDetailFromRow,
  ensureCriteriaListForProject,
  getEffectiveConsentTemplates,
  getIndicatorMeta
} from './data'
import { PATIENTS, RESEARCHES, CENTERS_DATA } from '@/mock/dli/data'
import type { ResearchItem } from '@/mock/dli/types'
import type {
  AnalysisCondition,
  AnalysisDataRow,
  AnalysisRun,
  AnalysisResult,
  AnalysisSummaryRow,
  AssessmentReport,
  AssessmentStage,
  CodeRule,
  ConsentApproval,
  ConsentTemplate,
  ConsentTemplateInput,
  ConsentTemplateStatus,
  FieldConfigVersion,
  FollowupPlan,
  FollowupPlanStatus,
  FollowupStatus,
  FollowupTemplate,
  FollowupTask,
  LogResult,
  ManagementPlan,
  ModelUsage,
  PatientField,
  PatientResearchRecord,
  ReportAdoption,
  ResearchAnalysisQuery,
  ResearchCriteriaItem,
  ResearchCriteriaList,
  ResearchMaterial,
  ResearchProgress,
  ResearchProgressIssue,
  ResearchProjectDetail,
  ResearchShareSetting,
  SystemLog,
  WarningStatus,
  WarningTicket
} from './types'

const delay = (ms = 240) => new Promise((resolve) => setTimeout(resolve, ms))

function paginate<T>(list: T[], current = 1, size = 10): Api.Common.PaginatedResponse<T> {
  const start = (current - 1) * size
  return { records: list.slice(start, start + size), current, size, total: list.length }
}

interface PageParams {
  current?: number
  size?: number
  keyword?: string
}

const match = (keyword: string | undefined, ...fields: string[]) =>
  !keyword || fields.some((field) => field.includes(keyword.trim()))

/* --------------------------------- P05 评估预警 -------------------------------- */

/** 医生确认状态：已记录医生意见或终审确认 → 已确认 [批注 05] */
function reportConfirmed(item: AssessmentReport): boolean {
  return item.status === '已确认' || !!item.opinion
}

/** 报告筛选：患者编号 / 评估阶段 / 模型用途 / 评估时间范围 / 医生确认状态 [批注 05] */
export interface AssessmentQueryParams extends PageParams {
  patientId?: string
  stage?: AssessmentStage | ''
  modelUsage?: ModelUsage | ''
  /** 评估时间范围（YYYY-MM-DD） */
  timeRange?: string[]
  confirmStatus?: '待确认' | '已确认' | ''
}

export async function fetchGetAssessmentReports(
  params: AssessmentQueryParams
): Promise<Api.Common.PaginatedResponse<AssessmentReport>> {
  await delay()
  let list = [...ASSESSMENT_REPORTS]
  if (params.patientId) list = list.filter((item) => item.patientId.includes(params.patientId!))
  if (params.stage) list = list.filter((item) => item.stage === params.stage)
  if (params.modelUsage) list = list.filter((item) => item.modelUsage === params.modelUsage)
  if (params.timeRange?.length === 2)
    list = list.filter((item) => {
      const date = item.assessedAt.slice(0, 10)
      return date >= params.timeRange![0] && date <= params.timeRange![1]
    })
  if (params.confirmStatus)
    list = list.filter(
      (item) => (reportConfirmed(item) ? '已确认' : '待确认') === params.confirmStatus
    )
  return paginate(list, params.current, params.size)
}

/** 模型信息（发起评估弹窗只读显示模型版本与输入完整性） [批注 05] */
export const MODEL_OPTIONS: Array<{
  usage: ModelUsage
  name: string
  version: string
  requiredInputs: string[]
}> = [
  {
    usage: '早筛预警',
    name: 'DLI-Risk（早筛预警模型）',
    version: 'DLI-Risk v2.3',
    requiredInputs: ['基线影像', '基线检验', '用药史']
  },
  {
    usage: '早诊预警',
    name: 'DLI-Monitor（早诊预警模型）',
    version: 'DLI-Monitor v1.8',
    requiredInputs: ['体征上报', '检验识别结果']
  },
  {
    usage: '转归预测',
    name: 'DLI-Dx（转归预测模型）',
    version: 'DLI-Dx v3.0',
    requiredInputs: ['病理报告', 'HRCT 影像', '随访数据']
  }
]

/** 模型对应的患者档案指标（mock 输入完整性口径） */
const MODEL_PATIENT_KEY: Record<ModelUsage, 'earlyScreen' | 'earlyDiagnosis' | 'outcome'> = {
  早筛预警: 'earlyScreen',
  早诊预警: 'earlyDiagnosis',
  转归预测: 'outcome'
}

/** 输入完整性检查：选择患者与模型后只读展示 [批注 05] */
export async function fetchCheckAssessmentInputs(
  patientId: string,
  modelUsage: ModelUsage
): Promise<{ complete: boolean; missing: string[]; text: string }> {
  await delay(150)
  const model = MODEL_OPTIONS.find((item) => item.usage === modelUsage)
  const patient = PATIENTS.find((item) => item.id === patientId.trim())
  if (!model || !patient) return { complete: false, missing: [], text: '请先填写患者编号与模型' }
  const missing = patient[MODEL_PATIENT_KEY[modelUsage]] ? [] : model.requiredInputs
  return {
    complete: !missing.length,
    missing,
    text: missing.length ? `缺 ${missing.length} 项：${missing.join('、')}` : '输入完整'
  }
}

/**
 * 发起评估：选患者编号 + 模型用途/名称，确认后提交任务 [批注 05]
 * 任务提交后新报告进入列表（等待时显示执行状态）
 */
export async function fetchLaunchAssessment(payload: {
  patientId: string
  modelUsage: ModelUsage
  operator: string
}): Promise<{ inputComplete: string; missing: string[] }> {
  await delay(300)
  const patientId = payload.patientId.trim()
  if (!PATIENTS.some((item) => item.id === patientId)) {
    throw new Error('患者编号不存在，请核对患者列表')
  }
  const model = MODEL_OPTIONS.find((item) => item.usage === payload.modelUsage)
  if (!model) throw new Error('模型不存在')
  const check = await fetchCheckAssessmentInputs(patientId, payload.modelUsage)
  await delay(900)
  const missing = check.missing
  ASSESSMENT_REPORTS.unshift({
    id: `AR-${String(Date.now()).slice(-4)}`,
    patientId,
    stage: '治疗前',
    modelUsage: payload.modelUsage,
    category: payload.modelUsage === '早筛预警' ? '治疗前风险评估' : '治疗中监测预警',
    basis: `${model.name} · 发起评估`,
    assessedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    modelVersion: model.version,
    source: '自动评估',
    result: missing.length ? '输入资料不完整，评估待补充' : '评估完成，待医生确认',
    researchGroup: '常规诊疗组',
    inputs: model.requiredInputs.map(
      (input) => `${input}（${missing.includes(input) ? '缺失' : '已就绪'}）`
    ),
    evidence: missing.length
      ? [`必需输入缺失 ${missing.length} 项：${missing.join('、')}`]
      : ['模型输出已生成，等待医生确认'],
    suggestions: missing.length ? ['补充缺失资料后重新评估'] : ['等待医生确认'],
    status: '待核对'
  })
  appendSystemLog({
    category: '重要数据',
    action: `发起评估（${payload.modelUsage}）`,
    operator: payload.operator,
    role: 'R_DOCTOR',
    scope: '评估预警',
    objectType: '评估报告',
    objectId: ASSESSMENT_REPORTS[0].id,
    target: patientId,
    detail: `模型 ${model.version}；${missing.length ? `输入缺 ${missing.length} 项` : '输入完整'}`
  })
  return { inputComplete: check.text, missing }
}

/** 报告详情单查：完整报告详情页使用 [批注 05] */
export async function fetchGetAssessmentReportById(id: string): Promise<AssessmentReport> {
  await delay(180)
  const item = ASSESSMENT_REPORTS.find((row) => row.id === id)
  if (!item) throw new Error('评估报告不存在')
  return { ...item }
}

/** 记录意见：采纳结果 + 医生说明，保存后更新确认状态 [批注 05] */
export async function fetchRecordReportOpinion(
  id: string,
  opinion: { adoption: ReportAdoption; note: string; doctor: string }
): Promise<AssessmentReport> {
  await delay(220)
  const item = ASSESSMENT_REPORTS.find((row) => row.id === id)
  if (!item) throw new Error('评估报告不存在')
  if (opinion.adoption !== '采纳' && !opinion.note.trim()) {
    throw new Error('修改后采纳 / 不采纳必须写明内容或原因')
  }
  item.opinion = {
    adoption: opinion.adoption,
    note: opinion.note.trim(),
    doctor: opinion.doctor,
    confirmedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  }
  item.status = '已确认'
  appendSystemLog({
    category: '重要数据',
    action: `记录报告意见（${opinion.adoption}）`,
    operator: opinion.doctor,
    role: 'R_DOCTOR',
    scope: '评估预警',
    objectType: '评估报告',
    objectId: id,
    target: item.patientId,
    detail: opinion.note.trim()
  })
  return { ...item }
}

/** 重新评估：生成新报告，原报告保留 [批注 05] */
export async function fetchRerunAssessment(
  id: string,
  operator: string
): Promise<AssessmentReport> {
  await delay(320)
  const item = ASSESSMENT_REPORTS.find((row) => row.id === id)
  if (!item) throw new Error('评估报告不存在')
  const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  const rerun: AssessmentReport = {
    ...item,
    id: `AR-${String(Date.now()).slice(-4)}`,
    basis: `${item.basis}（重新评估，原报告 ${id} 保留）`,
    assessedAt: now,
    source: '自动评估',
    inputs: item.inputs.map((input) => input.replace('（缺失）', '（已就绪）')),
    evidence: ['重新评估 · 沿用原报告依据来源'],
    suggestions: ['等待医生确认'],
    opinion: undefined,
    reviewNote: undefined,
    status: '待核对'
  }
  ASSESSMENT_REPORTS.unshift(rerun)
  appendSystemLog({
    category: '重要数据',
    action: '重新评估',
    operator,
    role: 'R_DOCTOR',
    scope: '评估预警',
    objectType: '评估报告',
    objectId: rerun.id,
    target: item.patientId,
    detail: `基于报告 ${id} 重新评估；原报告保留`
  })
  return { ...rerun }
}

/** 预警筛选：患者编号 / 等级 / 发生时间范围 / 处理状态 [批注 05] */
export interface WarningQueryParams extends PageParams {
  patientId?: string
  level?: WarningTicket['level'] | ''
  timeRange?: string[]
  status?: WarningStatus | ''
}

export async function fetchGetWarningTickets(
  params: WarningQueryParams
): Promise<Api.Common.PaginatedResponse<WarningTicket>> {
  await delay()
  let list = [...WARNING_TICKETS]
  if (params.patientId) list = list.filter((item) => item.patientId.includes(params.patientId!))
  if (params.level) list = list.filter((item) => item.level === params.level)
  if (params.timeRange?.length === 2)
    list = list.filter((item) => {
      const date = item.createdAt.slice(0, 10)
      return date >= params.timeRange![0] && date <= params.timeRange![1]
    })
  if (params.status) list = list.filter((item) => item.status === params.status)
  return paginate(list, params.current, params.size)
}

/** 医生确认处置：处理意见 + 处理结果 [批注 05] */
export async function fetchHandleWarning(
  id: string,
  input: { note: string; result: string; operator: string }
): Promise<WarningTicket> {
  await delay(300)
  const item = WARNING_TICKETS.find((row) => row.id === id)
  if (!item) throw new Error('预警记录不存在')
  if (!item.sourceVerified) throw new Error('识别结果尚未核对，不能用于评估与处置 [批注 03-3]')
  item.handleNote = input.note.trim()
  item.handleResult = input.result.trim()
  item.intervention = input.result.trim()
  item.doctorConfirmed = true
  item.status = '已处理'
  item.records.push({
    id: `DR-${String(Date.now()).slice(-4)}`,
    operator: input.operator,
    role: '医生',
    action: '医生确认处置',
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  })
  appendSystemLog({
    category: '重要数据',
    action: '预警处理确认',
    operator: input.operator,
    role: 'R_DOCTOR',
    scope: '评估预警',
    objectType: '预警记录',
    objectId: id,
    target: item.patientId,
    detail: `${input.note.trim()}；${input.result.trim()}；预警处理不代表患者任务完成`
  })
  return { ...item }
}

/** 助理 / 护士按授权补跟进记录，医生确认处置 [批注 05] */
export async function fetchRecordWarningFollowup(id: string, action: string): Promise<void> {
  await delay(220)
  const item = WARNING_TICKETS.find((row) => row.id === id)
  if (!item) return
  if (item.status === '待处理') item.status = '处理中'
  item.records.push({
    id: `DR-${String(Date.now()).slice(-4)}`,
    operator: '医护',
    role: '医生助理 / 护士',
    action,
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  })
}

/* --------------------------- P05 管理计划 [批注 05] --------------------------- */

export async function fetchGetManagementPlans(patientId?: string): Promise<ManagementPlan[]> {
  await delay(200)
  const list = patientId
    ? MANAGEMENT_PLANS.filter((item) => item.patientId === patientId)
    : [...MANAGEMENT_PLANS]
  return list.map((item) => ({ ...item }))
}

/** 新增 / 编辑安排：保存为草稿，取消不变更 [批注 05] */
export async function fetchSaveManagementPlan(
  input: Omit<
    ManagementPlan,
    'id' | 'status' | 'taskId' | 'createdAt' | 'publishedAt' | 'operator'
  > & { id?: string; operator: string }
): Promise<ManagementPlan> {
  await delay(260)
  const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  const existing = input.id ? MANAGEMENT_PLANS.find((item) => item.id === input.id) : undefined
  if (existing) {
    if (existing.status !== '草稿') throw new Error('仅草稿可编辑')
    Object.assign(existing, {
      name: input.name,
      type: input.type,
      content: input.content,
      executeAt: input.executeAt,
      requirement: input.requirement,
      operator: input.operator
    })
    return { ...existing }
  }
  const plan: ManagementPlan = {
    id: `MP-${String(Date.now()).slice(-4)}`,
    patientId: input.patientId,
    name: input.name,
    type: input.type,
    content: input.content,
    executeAt: input.executeAt,
    requirement: input.requirement,
    status: '草稿',
    operator: input.operator,
    createdAt: now
  }
  MANAGEMENT_PLANS.unshift(plan)
  return { ...plan }
}

/** 医生发布：生成患者任务，同一任务在各入口引用，不重复下发 [批注 05] */
export async function fetchPublishManagementPlan(
  id: string,
  operator: string
): Promise<ManagementPlan> {
  await delay(280)
  const item = MANAGEMENT_PLANS.find((row) => row.id === id)
  if (!item) throw new Error('管理安排不存在')
  if (item.status !== '草稿') throw new Error('仅草稿可发布')
  item.status = '已发布'
  item.publishedAt = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  item.taskId = `FT-${item.id.replace('MP-', '')}`
  item.operator = operator
  // 生成患者任务：与随访任务同一记录，各入口引用不重复下发
  const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  FOLLOWUP_TASKS.unshift({
    id: item.taskId,
    planId: item.id,
    patientId: item.patientId,
    title: item.name,
    type: '人工随访',
    status: '待完成',
    dueDate: item.executeAt.slice(0, 10),
    assignee: operator,
    result: '',
    resultSource: '',
    doctorConfirmed: true,
    changeLog: [{ action: `管理安排发布生成任务（${item.name}）`, operator, createdAt: now }]
  })
  appendSystemLog({
    category: '重要数据',
    action: '发布管理安排并生成患者任务',
    operator,
    role: 'R_DOCTOR',
    scope: '管理计划',
    objectType: '管理安排',
    objectId: item.id,
    target: item.patientId,
    detail: `已生成患者任务 ${item.taskId}（同一任务在各入口引用，不重复下发）`
  })
  return { ...item }
}

/** 取消安排 [批注 05] */
export async function fetchCancelManagementPlan(id: string): Promise<ManagementPlan> {
  await delay(220)
  const item = MANAGEMENT_PLANS.find((row) => row.id === id)
  if (!item) throw new Error('管理安排不存在')
  if (item.status === '已取消') throw new Error('该安排已取消')
  item.status = '已取消'
  return { ...item }
}

/* --------------------------------- P10 随访管理 -------------------------------- */

export interface FollowupQueryParams extends PageParams {
  status?: FollowupStatus | ''
  planId?: string
}

export async function fetchGetFollowupTasks(
  params: FollowupQueryParams
): Promise<Api.Common.PaginatedResponse<FollowupTask>> {
  await delay()
  let list = [...FOLLOWUP_TASKS]
  if (params.status) list = list.filter((item) => item.status === params.status)
  if (params.planId) list = list.filter((item) => item.planId === params.planId)
  if (params.keyword)
    list = list.filter((item) => match(params.keyword, item.id, item.patientId, item.title))
  return paginate(list, params.current, params.size)
}

/** 计划筛选：状态 / 患者 / 负责医生 / 日期范围 / 含逾期·待核对任务 [批注 10] */
export interface FollowupPlanQueryParams {
  status?: FollowupPlanStatus | ''
  patientId?: string
  doctor?: string
  dateRange?: string[]
  /** 含逾期任务 */
  hasOverdue?: boolean
  /** 含待核对任务 */
  hasPendingCheck?: boolean
}

/** 计划 + 任务完成情况（已完成数 / 总数）[批注 10] */
export type FollowupPlanWithProgress = FollowupPlan & { done: number; total: number }

export async function fetchGetFollowupPlans(
  params: FollowupPlanQueryParams = {}
): Promise<FollowupPlanWithProgress[]> {
  await delay(180)
  let list = [...FOLLOWUP_PLANS]
  if (params.status) list = list.filter((item) => item.status === params.status)
  if (params.patientId) list = list.filter((item) => item.patientId.includes(params.patientId!))
  if (params.doctor) list = list.filter((item) => item.doctor.includes(params.doctor!))
  if (params.dateRange?.length === 2)
    list = list.filter(
      (item) => item.startDate <= params.dateRange![1] && item.endDate >= params.dateRange![0]
    )
  if (params.hasOverdue)
    list = list.filter((item) =>
      FOLLOWUP_TASKS.some((task) => task.planId === item.id && task.overdue)
    )
  if (params.hasPendingCheck)
    list = list.filter((item) =>
      FOLLOWUP_TASKS.some((task) => task.planId === item.id && task.status === '已提交待核对')
    )
  return list.map((item) => ({
    ...item,
    ...followupPlanProgress(item.id)
  }))
}

export async function fetchGetFollowupPlanById(id: string): Promise<FollowupPlan | undefined> {
  await delay(160)
  const plan = FOLLOWUP_PLANS.find((item) => item.id === id)
  return plan ? { ...plan } : undefined
}

/** 保存计划：新建 / 编辑均为草稿（模型或规则产生的计划也先为草稿）[批注 10] */
export async function fetchSaveFollowupPlan(
  input: Omit<FollowupPlan, 'id' | 'status' | 'publishedAt' | 'createdAt' | 'version'> & {
    id?: string
  }
): Promise<FollowupPlan> {
  await delay(260)
  const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  if (input.id) {
    const plan = FOLLOWUP_PLANS.find((item) => item.id === input.id)
    if (!plan) throw new Error('计划不存在')
    if (plan.status !== '草稿') throw new Error('仅草稿计划可编辑；历史版本保留')
    Object.assign(plan, {
      patientId: input.patientId,
      name: input.name,
      doctor: input.doctor,
      startDate: input.startDate,
      endDate: input.endDate,
      source: input.source,
      templateId: input.templateId
    })
    plan.version = plan.version.replace(/（草稿）$/, '') + '（草稿）'
    return { ...plan }
  }
  const plan: FollowupPlan = {
    ...input,
    id: `FP-${String(Date.now()).slice(-4)}`,
    status: '草稿',
    version: 'V1.0（草稿）',
    createdAt: now
  }
  FOLLOWUP_PLANS.unshift(plan)
  return { ...plan }
}

/** 医生确认发布计划：生成患者任务（同一任务在各入口引用），全部取消不能算已完成 [批注 10] */
export async function fetchPublishFollowupPlan(
  id: string,
  operator: string
): Promise<FollowupPlan> {
  await delay(280)
  const plan = FOLLOWUP_PLANS.find((item) => item.id === id)
  if (!plan) throw new Error('计划不存在')
  if (plan.status !== '草稿') throw new Error('仅草稿计划可发布')
  plan.status = '已发布'
  plan.version = plan.version.replace(/（草稿）$/, '')
  plan.publishedAt = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  FOLLOWUP_TASKS.filter((task) => task.planId === id).forEach((task) => {
    task.doctorConfirmed = true
    task.changeLog.push({
      action: '医生确认计划并发布，生成患者任务',
      operator,
      createdAt: plan.publishedAt!
    })
  })
  appendSystemLog({
    category: '重要数据',
    action: '发布随访计划并生成患者任务',
    operator,
    role: 'R_DOCTOR',
    scope: '随访管理',
    objectType: '随访计划',
    objectId: plan.id,
    target: plan.patientId,
    detail: `计划 ${plan.name} 已发布（${plan.version}），患者与家属引用同一任务，家属仅查看`
  })
  return { ...plan }
}

/** 取消计划须确认并停后续提醒，历史版本保留 [批注 10] */
export async function fetchCancelFollowupPlan(id: string, operator: string): Promise<FollowupPlan> {
  await delay(220)
  const plan = FOLLOWUP_PLANS.find((item) => item.id === id)
  if (!plan) throw new Error('计划不存在')
  if (plan.status === '已取消') throw new Error('计划已取消')
  if (plan.status === '已完成') throw new Error('已完成计划不可取消')
  plan.status = '已取消'
  FOLLOWUP_TASKS.filter(
    (task) => task.planId === id && (task.status === '待完成' || task.status === '待补充')
  ).forEach((task) => {
    task.status = '已取消'
    task.result = '计划取消，停止后续提醒'
    task.changeLog.push({ action: '计划取消，停止后续提醒', operator, createdAt: plan.startDate })
  })
  appendSystemLog({
    category: '重要数据',
    action: '取消随访计划',
    operator,
    role: 'R_DOCTOR',
    scope: '随访管理',
    objectType: '随访计划',
    objectId: plan.id,
    target: plan.patientId,
    detail: '已取消并停止后续提醒，历史版本保留'
  })
  return { ...plan }
}

/** 任务完成情况：已完成数 / 总数（全部有效任务完成后计划为已完成，全部取消不能算已完成）[批注 10] */
export function followupPlanProgress(planId: string): { done: number; total: number } {
  const tasks = FOLLOWUP_TASKS.filter((task) => task.planId === planId && task.status !== '已取消')
  return { done: tasks.filter((task) => task.status === '已完成').length, total: tasks.length }
}

/** 计划任务列表（计划页面下部任务表） [批注 10] */
export async function fetchGetFollowupTasksByPlan(planId: string): Promise<FollowupTask[]> {
  await delay(180)
  return FOLLOWUP_TASKS.filter((task) => task.planId === planId).map((item) => ({ ...item }))
}

/** 核对：通过 → 已完成；要求补充 → 待补充且意见必填 [批注 10] */
export async function fetchCheckFollowupTask(
  id: string,
  input: { result: '通过' | '要求补充'; note: string; operator: string }
): Promise<FollowupTask> {
  await delay(240)
  const task = FOLLOWUP_TASKS.find((item) => item.id === id)
  if (!task) throw new Error('随访任务不存在')
  if (input.result === '要求补充' && !input.note.trim()) {
    throw new Error('要求补充时核对意见必填')
  }
  task.checkResult = input.result
  task.checkNote = input.note.trim()
  task.checkBy = input.operator
  task.status = input.result === '通过' ? '已完成' : '待补充'
  task.changeLog.push({
    action: `核对${input.result}${input.note.trim() ? `：${input.note.trim()}` : ''}`,
    operator: input.operator,
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  })
  return { ...task }
}

/** 人工随访：不能仅记录电话就默认所有任务完成 [批注 10] */
export async function fetchManualFollowup(
  id: string,
  input: {
    contactAt: string
    contactWay: string
    contactResult: string
    record: string
    operator: string
  }
): Promise<FollowupTask> {
  await delay(240)
  const task = FOLLOWUP_TASKS.find((item) => item.id === id)
  if (!task) throw new Error('随访任务不存在')
  task.contactAt = input.contactAt
  task.contactWay = input.contactWay
  task.contactResult = input.contactResult as '已联系' | '未联系上'
  task.result = input.record.trim()
  task.resultSource = '医护补录'
  task.status = input.contactResult === '已联系' && input.record.trim() ? '已提交待核对' : '待完成'
  task.changeLog.push({
    action: `人工随访（${input.contactWay} · ${input.contactResult}）：${input.record.trim()}`,
    operator: input.operator,
    createdAt: input.contactAt
  })
  return { ...task }
}

/* ---------------- 随访模板 [批注 10] ---------------- */

export async function fetchGetFollowupTemplates(): Promise<FollowupTemplate[]> {
  await delay(180)
  return [...FOLLOWUP_TEMPLATES]
}

/** 新增 / 编辑模板：获授权医生按方案确认版本，助理／护士可协助草稿 [批注 10] */
export async function fetchSaveFollowupTemplate(
  input: Omit<FollowupTemplate, 'updatedAt' | 'id'> & { id?: string }
): Promise<FollowupTemplate> {
  await delay(240)
  const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  if (input.id) {
    const tpl = FOLLOWUP_TEMPLATES.find((item) => item.id === input.id)
    if (!tpl) throw new Error('模板不存在')
    Object.assign(tpl, { ...input, updatedAt: now })
    return { ...tpl }
  }
  const tpl: FollowupTemplate = {
    ...input,
    id: `FUT-${String(Date.now()).slice(-4)}`,
    updatedAt: now
  }
  FOLLOWUP_TEMPLATES.unshift(tpl)
  return { ...tpl }
}

/** 医生按方案确认模板版本；更新模板不覆盖已发布计划 [批注 10] */
export async function fetchPublishFollowupTemplate(
  id: string,
  operator: string
): Promise<FollowupTemplate> {
  await delay(240)
  const tpl = FOLLOWUP_TEMPLATES.find((item) => item.id === id)
  if (!tpl) throw new Error('模板不存在')
  if (tpl.status !== '草稿') throw new Error('仅草稿模板可发布')
  tpl.status = '已发布'
  tpl.version = tpl.version.replace(/（草稿）$/, '')
  tpl.updatedAt = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  tpl.operator = operator
  appendSystemLog({
    category: '配置变更',
    action: '发布随访模板',
    operator,
    role: 'R_DOCTOR',
    scope: '随访管理',
    objectType: '随访模板',
    objectId: tpl.id,
    target: tpl.name,
    detail: `模板 ${tpl.version} 已发布；更新模板不覆盖已发布计划`
  })
  return { ...tpl }
}

export async function fetchSaveFollowupTask(payload: {
  planId: string
  patientId: string
  title: string
  type: FollowupTask['type']
  dueDate: string
}): Promise<void> {
  await delay(300)
  FOLLOWUP_TASKS.unshift({
    id: `FT-${String(Date.now()).slice(-4)}`,
    ...payload,
    status: '待完成',
    assignee: '待分配',
    result: '',
    resultSource: '',
    doctorConfirmed: false,
    changeLog: [
      { action: '手动新建任务', operator: '医护', createdAt: new Date().toISOString().slice(0, 10) }
    ]
  })
}

export async function fetchCancelFollowupTask(id: string): Promise<void> {
  await delay(220)
  const task = FOLLOWUP_TASKS.find((item) => item.id === id)
  if (!task) return
  task.changeLog.push({
    action: '取消任务',
    operator: '医生',
    createdAt: new Date().toISOString().slice(0, 10)
  })
  task.status = '已取消'
}

/** 患者执行结果回到同一计划和患者记录，医护可补录人工随访结果 [批注 06-2][批注 06-3] */
export async function fetchRecordFollowupResult(
  id: string,
  result: string,
  source: '患者回传' | '医护补录'
): Promise<void> {
  await delay(240)
  const task = FOLLOWUP_TASKS.find((item) => item.id === id)
  if (!task) return
  task.result = result
  task.resultSource = source
  task.status = '已提交待核对'
  task.changeLog.push({
    action: `记录${source}结果，待核对`,
    operator: source === '医护补录' ? '医护' : '患者端',
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  })
}

/* ------------------------------ P08 研究项目详情 ------------------------------ */

export async function fetchGetResearchProjectDetails(): Promise<ResearchProjectDetail[]> {
  await delay(220)
  return [...RESEARCH_PROJECT_DETAILS]
}

export async function fetchGetResearchProjectDetail(
  id: string
): Promise<ResearchProjectDetail | undefined> {
  await delay(200)
  return RESEARCH_PROJECT_DETAILS.find((item) => item.id === id)
}

/** 临时分析筛选不改变患者正式入组组别 [批注 05-1] */
export async function fetchRunProjectAnalysis(
  id: string,
  condition: AnalysisCondition
): Promise<ResearchProjectDetail['results'][number]> {
  await delay(420)
  const project = RESEARCH_PROJECT_DETAILS.find((item) => item.id === id)
  if (!project) throw new Error('研究项目不存在')
  const result = {
    condition,
    statisticalMethod: '按方案统计口径',
    unit: condition.indicator.includes('率') ? '%' : '例',
    validCount: 180,
    missingCount: 6,
    value: (70 + Math.round(Math.random() * 10)).toFixed(1),
    needsRerun: false,
    savedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  }
  project.results.unshift(result)
  return result
}

/** 条件或数据变化时提示重新分析 [批注 05-2] */
export async function fetchMarkAnalysisStale(id: string): Promise<void> {
  await delay(160)
  const project = RESEARCH_PROJECT_DETAILS.find((item) => item.id === id)
  project?.results.forEach((row) => (row.needsRerun = true))
}

/** G5：共享不自动授予患者明细、编辑和导出权限 [批注 08-2] */
export async function fetchUpdateResearchShare(
  id: string,
  level: ResearchProjectDetail['shareLevel']
): Promise<void> {
  await delay(260)
  const project = RESEARCH_PROJECT_DETAILS.find((item) => item.id === id)
  if (!project) return
  project.shareLevel = level
  project.shareGrantsPatientDetail = false
  project.shareGrantsEdit = false
  project.shareGrantsExport = false
}

/* ------------------------------ P13 知情同意 ------------------------------ */

/** 有模板维护权的角色：平台/中心/系统管理员；临床角色只发放与核对 [批注 16] */
const TEMPLATE_ROLES = ['R_PLATFORM', 'R_CENTER', 'R_SYS']
/** 批准与发布只归平台/系统管理员 [批注 16] */
const TEMPLATE_PUBLISH_ROLES = ['R_PLATFORM', 'R_SYS']

const templateToday = () => new Date().toISOString().slice(0, 10)
const templateNow = () => new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')

function requireTemplateRole(role: string, action: string, publish = false): void {
  const allowed = publish ? TEMPLATE_PUBLISH_ROLES : TEMPLATE_ROLES
  if (!allowed.includes(role)) {
    throw new Error(publish ? `仅平台/系统管理员可${action}` : `仅平台/中心/系统管理员可${action}`)
  }
}

function findConsentTemplate(id: string): ConsentTemplate {
  const item = CONSENT_TEMPLATES.find((row) => row.id === id)
  if (!item) throw new Error('知情同意书模板不存在')
  return item
}

function logTemplateAction(
  action: string,
  item: ConsentTemplate,
  operator: string,
  role: string,
  detail: string
): void {
  appendSystemLog({
    category: '配置变更',
    action,
    operator: operator || roleName(role),
    role,
    scope: item.center || '全部中心',
    target: `${item.name} ${item.version}`,
    detail
  })
}

export interface ConsentTemplateQueryParams extends PageParams {
  projectId?: string
  center?: string
  status?: ConsentTemplateStatus | ''
  approval?: ConsentApproval | ''
  /** 只取已发布且已批准的生效版本 */
  effectiveOnly?: boolean
}

/** 模板列表：表列「模板名称 / 关联研究项目 / 适用中心 / 模板版本 / 模板状态 / 操作」[批注 16] */
export async function fetchGetConsentTemplates(
  params: ConsentTemplateQueryParams = {}
): Promise<Api.Common.PaginatedResponse<ConsentTemplate>> {
  await delay()
  let list = [...CONSENT_TEMPLATES]
  if (params.projectId) list = list.filter((item) => item.projectId === params.projectId)
  if (params.center) {
    list = list.filter((item) => !item.center || item.center === params.center)
  }
  if (params.status) list = list.filter((item) => item.status === params.status)
  if (params.approval) list = list.filter((item) => item.approval === params.approval)
  if (params.effectiveOnly) {
    list = list.filter((item) => item.status === '已发布' && item.approval === '已批准')
  }
  if (params.keyword) {
    list = list.filter((item) =>
      match(params.keyword, item.name, item.projectId, item.center, item.version)
    )
  }
  return paginate(list, params.current, params.size)
}

/** 模板弹窗选项：关联研究项目与适用中心分别独立 [批注 16] */
export async function fetchGetConsentTemplateOptions(): Promise<{
  projects: Array<{ id: string; name: string; center: string }>
  centers: string[]
}> {
  await delay(120)
  return {
    projects: RESEARCHES.map((item) => ({ id: item.id, name: item.name, center: item.center })),
    centers: CENTERS_DATA.map((item) => item.name)
  }
}

/** 新增/编辑草稿、另存新版本；保存一律回到「草稿 + 未提交」，不覆盖已签记录 [批注 16] */
export async function fetchSaveConsentTemplate(
  input: ConsentTemplateInput
): Promise<ConsentTemplate> {
  await delay(280)
  requireTemplateRole(input.role, '维护知情同意书模板')
  if (!input.name.trim() || !input.version.trim() || !input.fileName.trim()) {
    throw new Error('模板名称、模板版本、模板文件不能为空')
  }
  const mode = input.mode ?? (input.id ? 'edit' : 'create')
  const operator = input.operator || roleName(input.role)
  if (input.role === 'R_CENTER' && !input.center) {
    throw new Error('中心管理员只能维护本中心的同意书模板')
  }

  if (mode === 'edit') {
    const item = findConsentTemplate(input.id ?? '')
    if (item.status !== '草稿') {
      throw new Error('已发布或已停用的模板不可直接修改，请另存新版本')
    }
    const versionTaken = CONSENT_TEMPLATES.some(
      (row) =>
        row.id !== item.id &&
        row.projectId === input.projectId &&
        row.center === input.center &&
        row.version === input.version.trim()
    )
    if (versionTaken) throw new Error('同一研究项目与适用中心下已存在相同模板版本')
    item.name = input.name.trim()
    item.projectId = input.projectId
    item.center = input.center
    item.version = input.version.trim()
    item.fileName = input.fileName.trim()
    item.fileSize = input.fileSize
    item.status = '草稿'
    item.approval = '未提交'
    item.updatedAt = templateToday()
    item.operator = operator
    logTemplateAction(
      '编辑知情同意书草稿',
      item,
      operator,
      input.role,
      '修改草稿内容，批准状态重置为未提交'
    )
    return item
  }

  const duplicated = CONSENT_TEMPLATES.some(
    (row) =>
      row.projectId === input.projectId &&
      row.center === input.center &&
      row.version === input.version.trim()
  )
  if (duplicated) {
    throw new Error('同一研究项目与适用中心下已存在相同模板版本，请调整版本号')
  }

  const base = mode === 'newVersion' ? findConsentTemplate(input.id ?? '') : undefined
  const item: ConsentTemplate = {
    id: `CT-${String(Date.now()).slice(-6)}`,
    name: input.name.trim(),
    projectId: input.projectId,
    center: input.center,
    version: input.version.trim(),
    fileName: input.fileName.trim(),
    fileSize: input.fileSize,
    status: '草稿',
    approval: '未提交',
    approvedBy: '',
    approvedAt: '',
    publishedBy: '',
    publishedAt: '',
    updatedAt: templateToday(),
    operator,
    history: base
      ? [
          ...base.history,
          {
            version: base.version,
            updatedAt: templateToday(),
            operator,
            note: `由 ${base.version} 另存新版本，原版本及已签记录保留`
          }
        ]
      : []
  }
  CONSENT_TEMPLATES.unshift(item)
  logTemplateAction(
    mode === 'newVersion' ? '另存知情同意书新版本' : '新增知情同意书草稿',
    item,
    operator,
    input.role,
    mode === 'newVersion' ? '基于已有模板另存新版本，旧版本不覆盖' : '新建模板草稿，等待提交批准'
  )
  return item
}

/** 提交批准：草稿 → 待批准 [批注 16] */
export async function fetchSubmitConsentTemplateApproval(
  id: string,
  operator: string,
  role: string
): Promise<void> {
  await delay(240)
  requireTemplateRole(role, '提交知情同意书批准')
  const item = findConsentTemplate(id)
  if (item.status !== '草稿') throw new Error('仅草稿模板可提交批准')
  if (item.approval === '待批准') throw new Error('该模板已在批准流程中')
  item.approval = '待批准'
  item.updatedAt = templateToday()
  item.operator = operator || roleName(role)
  logTemplateAction('提交知情同意书批准', item, operator, role, '草稿提交平台管理员批准')
}

/** 确认批准：仅平台/系统管理员；批准后才能发布 [批注 16] */
export async function fetchApproveConsentTemplate(
  id: string,
  operator: string,
  role: string
): Promise<void> {
  await delay(260)
  requireTemplateRole(role, '确认批准知情同意书', true)
  const item = findConsentTemplate(id)
  if (item.status !== '草稿') throw new Error('仅草稿模板可执行批准')
  if (item.approval !== '待批准') throw new Error('该模板未处于待批准状态')
  item.approval = '已批准'
  item.approvedBy = operator || roleName(role)
  item.approvedAt = templateNow()
  item.updatedAt = templateToday()
  item.operator = operator || roleName(role)
  logTemplateAction('确认批准知情同意书', item, operator, role, '内容确认已批准，可进入发布')
}

/** 发布：必须已批准；同项目+中心仅保留一个生效版本 [批注 16] */
export async function fetchPublishConsentTemplate(
  id: string,
  operator: string,
  role: string
): Promise<void> {
  await delay(300)
  requireTemplateRole(role, '发布知情同意书', true)
  const item = findConsentTemplate(id)
  if (item.status === '已发布') throw new Error('该模板已发布')
  if (item.approval !== '已批准') throw new Error('模板内容未获批准，不能发布')
  CONSENT_TEMPLATES.forEach((row) => {
    if (
      row.id !== item.id &&
      row.status === '已发布' &&
      row.projectId === item.projectId &&
      row.center === item.center
    ) {
      row.status = '已停用'
      row.updatedAt = templateToday()
      row.operator = operator || roleName(role)
      row.history.push({
        version: row.version,
        updatedAt: templateToday(),
        operator: operator || roleName(role),
        note: '新版发布，自动停用旧生效版本'
      })
    }
  })
  item.status = '已发布'
  item.publishedBy = operator || roleName(role)
  item.publishedAt = templateNow()
  item.updatedAt = templateToday()
  item.operator = operator || roleName(role)
  item.history.push({
    version: item.version,
    updatedAt: templateToday(),
    operator: operator || roleName(role),
    note: '批准通过后发布为生效版本'
  })
  logTemplateAction(
    '发布知情同意书',
    item,
    operator,
    role,
    '发布生效版本，同项目同中心旧版本自动停用'
  )
}

/** 停用生效版本 [批注 16] */
export async function fetchStopConsentTemplate(
  id: string,
  operator: string,
  role: string
): Promise<void> {
  await delay(260)
  requireTemplateRole(role, '停用知情同意书', true)
  const item = findConsentTemplate(id)
  if (item.status !== '已发布') throw new Error('仅已发布模板可停用')
  item.status = '已停用'
  item.updatedAt = templateToday()
  item.operator = operator || roleName(role)
  item.history.push({
    version: item.version,
    updatedAt: templateToday(),
    operator: operator || roleName(role),
    note: '停用生效版本'
  })
  logTemplateAction('停用知情同意书', item, operator, role, '停用后不再允许发放')
}

/** 患者详情发放时按项目 + 中心取生效模板；仅已发布且已批准 [批注 16] */
export async function fetchGetEffectiveConsentTemplates(
  projectId: string,
  center = ''
): Promise<ConsentTemplate[]> {
  await delay(160)
  return getEffectiveConsentTemplates(projectId, center)
}

/* ------------------------------ P17 患者字段配置 [批注 17] ------------------------------ */

export interface PatientFieldQueryParams extends PageParams {
  keyword?: string
  status?: PatientField['status'] | ''
  scopeType?: PatientField['scopeType'] | ''
}

/** 字段表：列名「字段名称/字段代码/字段类型/适用范围/是否必填/是否列表显示/是否支持筛选/配置状态/配置版本/操作」[批注 17] */
export async function fetchGetPatientFields(
  params: PatientFieldQueryParams
): Promise<Api.Common.PaginatedResponse<PatientField>> {
  await delay()
  let list = [...PATIENT_FIELDS]
  if (params.status) list = list.filter((item) => item.status === params.status)
  if (params.scopeType) list = list.filter((item) => item.scopeType === params.scopeType)
  if (params.keyword)
    list = list.filter((item) =>
      match(params.keyword, item.name, item.code, item.scopeName, item.scopeType)
    )
  return paginate(list, params.current, params.size)
}

export async function fetchGetFieldConfigVersions(): Promise<FieldConfigVersion[]> {
  await delay(180)
  return [...FIELD_CONFIG_VERSIONS]
}

/** 敏感边界：不能通过自定义字段重新展示患者姓名、手机号、病历号 [批注 17] */
function assertFieldPrivacy(name: string, code: string): void {
  const hit = [name, code].find((text) => /姓名|手机|电话|病历号|病历番|住院号|门诊号/.test(text))
  if (hit)
    throw new Error(`「${hit}」涉及患者姓名、手机号、病历号等敏感信息，不能通过自定义字段重新展示`)
}

/** 保存字段：新增存草稿；已使用（已发布）代码不能改义或直接改类型 [批注 17] */
export async function fetchSavePatientField(payload: {
  id?: string
  name: string
  code: string
  type: PatientField['type']
  unit: string
  options: string[]
  required: boolean
  validation: string
  listVisible: boolean
  filterable: boolean
  order: number
  scopeType: PatientField['scopeType']
  scopeName: string
  operator: string
}): Promise<PatientField> {
  await delay(300)
  assertFieldPrivacy(payload.name, payload.code)
  if (payload.id) {
    const item = PATIENT_FIELDS.find((row) => row.id === payload.id)
    if (!item) throw new Error('字段不存在')
    if (item.systemLocked && (item.code !== payload.code || item.type !== payload.type))
      throw new Error('系统统一字段（患者编号、研究分组、模型必需字段）不得改义或修改类型')
    if (item.status === '已发布' && (item.code !== payload.code || item.type !== payload.type))
      throw new Error('已使用的字段代码不能改义或直接修改类型，请新建字段并停用旧字段')
    Object.assign(item, {
      ...payload,
      id: item.id,
      // 已发布字段编辑其他配置保持已发布；草稿/待发布保存后维持原状态
      status: item.status,
      systemLocked: item.systemLocked,
      updatedAt: nowText(),
      operator: payload.operator
    })
    return item
  }
  const created: PatientField = {
    id: `PF-${String(PATIENT_FIELDS.length + 1).padStart(3, '0')}-${Date.now() % 1000}`,
    name: payload.name,
    code: payload.code,
    type: payload.type,
    unit: payload.unit,
    options: payload.options,
    required: payload.required,
    validation: payload.validation,
    listVisible: payload.listVisible,
    filterable: payload.filterable,
    order: payload.order,
    scopeType: payload.scopeType,
    scopeName: payload.scopeName,
    status: '草稿',
    version: 'V1.0',
    systemLocked: false,
    updatedAt: nowText(),
    operator: payload.operator
  }
  PATIENT_FIELDS.push(created)
  return created
}

/** 中心／课题组管理员把草稿提交平台，平台按「待发布」筛选核对后发布 [批注 17] */
export async function fetchSubmitFieldConfig(id: string, operator: string): Promise<PatientField> {
  await delay(220)
  const item = PATIENT_FIELDS.find((row) => row.id === id)
  if (!item) throw new Error('字段不存在')
  if (item.status !== '草稿') throw new Error('仅草稿配置可提交平台')
  item.status = '待发布'
  item.updatedAt = nowText()
  item.operator = operator
  appendSystemLog({
    category: '配置变更',
    action: '提交患者字段配置',
    operator,
    role: 'R_CENTER',
    scope: item.scopeName || '全平台',
    objectType: '患者字段配置',
    objectId: item.id,
    target: `${item.name}（${item.code}）`,
    detail: '草稿提交平台，等待平台核对范围后发布'
  })
  return item
}

function nowText(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ')
}

/** 平台发布：仅「待发布」可发布；成功刷新版本和状态，患者表单、导入模板及 App 使用适用版本 [批注 17] */
export async function fetchPublishFieldConfig(id: string, operator: string): Promise<PatientField> {
  await delay(320)
  const item = PATIENT_FIELDS.find((row) => row.id === id)
  if (!item) throw new Error('字段不存在')
  if (item.status !== '待发布') throw new Error('仅「待发布」状态的配置可发布，可在状态筛选中查找')
  const prev = FIELD_CONFIG_VERSIONS[0]?.version ?? 'V1.4'
  const minor = Number(prev.slice(1).split('.')[1] ?? '4') + 1
  const version = `${prev.split('.')[0]}.${minor}`
  item.status = '已发布'
  item.version = version
  item.updatedAt = nowText()
  item.operator = operator
  FIELD_CONFIG_VERSIONS.unshift({
    version,
    publishedAt: nowText(),
    operator,
    appliesTo: ['患者表单', '导入模板', 'Web', 'App'],
    note: `发布字段「${item.name}」，适用范围：${item.scopeType}${item.scopeName ? '·' + item.scopeName : ''}`
  })
  appendSystemLog({
    category: '配置变更',
    action: '发布患者字段配置',
    operator,
    role: 'R_PLATFORM',
    scope: '全平台',
    objectType: '患者字段配置',
    objectId: item.id,
    target: `${item.name} ${version}`,
    detail: `患者表单、导入模板及 App 使用适用版本；各中心扩展不覆盖统一定义`,
    beforeContent: `状态：${item.status}，版本：${prev}`,
    afterContent: `状态：已发布，版本：${version}`
  })
  return item
}

/** 停用保留历史；已停用可重新启用回到已发布 [批注 17] */
export async function fetchTogglePatientField(id: string, operator: string): Promise<PatientField> {
  await delay(200)
  const item = PATIENT_FIELDS.find((row) => row.id === id)
  if (!item) throw new Error('字段不存在')
  if (item.systemLocked) throw new Error('系统统一字段不可停用')
  if (item.status === '已发布') {
    item.status = '已停用'
  } else if (item.status === '已停用') {
    item.status = '已发布'
  } else {
    throw new Error('仅已发布／已停用字段可执行停用或启用')
  }
  item.updatedAt = nowText()
  item.operator = operator
  appendSystemLog({
    category: '配置变更',
    action: item.status === '已停用' ? '停用患者字段' : '启用患者字段',
    operator,
    role: 'R_PLATFORM',
    scope: item.scopeName || '全平台',
    objectType: '患者字段配置',
    objectId: item.id,
    target: item.name,
    detail: item.status === '已停用' ? '停用保留历史，历史数据不变' : '重新启用回到已发布'
  })
  return item
}

/* ------------------------------ P18 编码规则配置 [批注 18] ------------------------------ */

export interface CodeRuleQueryParams extends PageParams {
  keyword?: string
  target?: CodeRule['target'] | ''
  status?: CodeRule['status'] | ''
}

/** 规则表 5 列：编号类型/适用范围/规则版本/规则状态/操作 [批注 18] */
export async function fetchGetCodeRules(
  params: CodeRuleQueryParams
): Promise<Api.Common.PaginatedResponse<CodeRule>> {
  await delay()
  let list = [...CODE_RULES]
  if (params.target) list = list.filter((item) => item.target === params.target)
  if (params.status) list = list.filter((item) => item.status === params.status)
  if (params.keyword)
    list = list.filter((item) =>
      match(params.keyword, item.id, item.prefix, item.version, item.effectiveScope)
    )
  return paginate(list, params.current, params.size)
}

function currentPeriod(dateFormat: CodeRule['dateFormat']): string {
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return dateFormat === 'YYYYMM' ? `${year}${month}` : year
}

/** 按规则段生成只读编号预览 [批注 18] */
export function codeRulePreview(rule: {
  prefix: string
  centerCode: string
  projectCode: string
  dateFormat: CodeRule['dateFormat']
  serialDigits: number
}): string {
  const seq = '1'.padStart(Math.max(1, rule.serialDigits), '0')
  return [rule.prefix, rule.centerCode, rule.projectCode, currentPeriod(rule.dateFormat), seq]
    .filter(Boolean)
    .join('-')
}

/** 编辑弹窗内「编号预览」：只读生成值，不落库 [批注 18] */
export async function fetchPreviewCodeRule(rule: {
  prefix: string
  centerCode: string
  projectCode: string
  dateFormat: CodeRule['dateFormat']
  serialDigits: number
}): Promise<string> {
  await delay(160)
  return codeRulePreview(rule)
}

/** 保存草稿；各编号类型仅开放适用段，系统患者编号不开放项目代码段 [批注 18] */
export async function fetchSaveCodeRule(payload: {
  id?: string
  target: CodeRule['target']
  prefix: string
  centerCode: string
  projectCode: string
  dateFormat: CodeRule['dateFormat']
  serialDigits: number
  resetCycle: CodeRule['resetCycle']
  effectiveScope: string
  operator: string
}): Promise<CodeRule> {
  await delay(280)
  const normalized: typeof payload = {
    ...payload,
    // 系统患者编号不开放项目代码段
    projectCode: payload.target === '系统患者编号' ? '' : payload.projectCode
  }
  if (payload.id) {
    const item = CODE_RULES.find((row) => row.id === payload.id)
    if (!item) throw new Error('规则不存在')
    if (item.status !== '草稿') throw new Error('仅草稿规则可编辑；如需调整请新建规则版本')
    Object.assign(item, {
      ...normalized,
      id: item.id,
      status: item.status,
      version: item.version,
      operator: payload.operator,
      updatedAt: nowText()
    })
    return item
  }
  const created: CodeRule = {
    id: `CD-${String(CODE_RULES.length + 1).padStart(3, '0')}-${Date.now() % 1000}`,
    target: normalized.target,
    prefix: normalized.prefix,
    centerCode: normalized.centerCode,
    projectCode: normalized.projectCode,
    dateFormat: normalized.dateFormat,
    serialDigits: normalized.serialDigits,
    resetCycle: normalized.resetCycle,
    effectiveScope: normalized.effectiveScope || '待确认适用范围',
    status: '草稿',
    version: 'V1.0（草稿）',
    operator: payload.operator,
    updatedAt: nowText(),
    note: '校验并发布通过后更新规则版本'
  }
  CODE_RULES.push(created)
  return created
}

export interface CodeRuleValidateIssue {
  field: string
  reason: string
}

/** 校验并发布：检查格式和唯一性约束，失败显示原因并阻止发布；成功更新规则版本 [批注 18] */
export async function fetchValidateAndPublishCodeRule(
  id: string,
  operator: string,
  role: string
): Promise<CodeRule> {
  await delay(360)
  const item = CODE_RULES.find((row) => row.id === id)
  if (!item) throw new Error('规则不存在')
  if (item.status !== '草稿') throw new Error('仅草稿规则可校验并发布')

  const issues: CodeRuleValidateIssue[] = []
  if (!/^[A-Za-z0-9]{1,8}$/.test(item.prefix))
    issues.push({ field: '编号前缀', reason: '前缀须为 1~8 位字母或数字' })
  if (!item.centerCode) issues.push({ field: '中心代码段', reason: '中心代码段不能为空' })
  if (item.target === '研究受试者编号' && !item.projectCode)
    issues.push({ field: '项目代码段', reason: '研究受试者编号按项目唯一，必须填写项目代码段' })
  if (item.serialDigits < 2 || item.serialDigits > 8)
    issues.push({ field: '流水号位数', reason: '流水号位数须在 2~8 位之间' })
  if (item.resetCycle === '按月' && item.dateFormat === 'YYYY')
    issues.push({
      field: '日期格式',
      reason: '流水按月重置但日期格式仅含年份，跨月会生成重号，请改用 YYYYMM'
    })
  if (item.resetCycle === '按日')
    issues.push({
      field: '流水重置周期',
      reason: '日期格式不含日段，按日重置会生成重号，请选择按月／按年或不重置'
    })

  // 与已发布规则的唯一性冲突：同编号类型下已发布规则占用相同前缀+段组合
  const conflict = CODE_RULES.find(
    (row) =>
      row.id !== item.id &&
      row.status === '已发布' &&
      row.target === item.target &&
      row.prefix === item.prefix &&
      row.centerCode === item.centerCode &&
      row.projectCode === item.projectCode
  )
  if (conflict)
    issues.push({
      field: '唯一性',
      reason: `与已发布规则 ${conflict.id}（${conflict.version}）的前缀与代码段组合冲突，会造成重号`
    })

  if (issues.length)
    throw new Error(
      `校验未通过，已阻止发布：${issues.map((i) => `【${i.field}】${i.reason}`).join('；')}`
    )

  const prevVersion = item.version
  item.status = '已发布'
  item.version = item.version.replace('（草稿）', '')
  item.updatedAt = nowText()
  item.operator = operator
  item.note = '新版本只作用于新编号，不改历史关联；编号不包含姓名、手机号、病历号'
  appendSystemLog({
    category: '配置变更',
    action: '校验并发布编码规则',
    operator: operator || roleName(role),
    role,
    scope: '全平台',
    objectType: '编码规则',
    objectId: item.id,
    target: `${item.target} ${item.version}`,
    detail: '格式与唯一性校验通过；建档生成患者编号，正式研究入组生成受试者编号，两者不混用',
    beforeContent: `版本：${prevVersion}（草稿）`,
    afterContent: `版本：${item.version}（已发布，仅作用于后续新编号）`
  })
  return item
}

/** 停用保留历史，历史编号关联不变 [批注 18] */
export async function fetchToggleCodeRule(
  id: string,
  operator: string,
  role: string
): Promise<CodeRule> {
  await delay(200)
  const item = CODE_RULES.find((row) => row.id === id)
  if (!item) throw new Error('规则不存在')
  if (item.status === '已发布') {
    item.status = '已停用'
    item.note = '停用保留历史，历史编号关联不变'
  } else if (item.status === '已停用') {
    item.status = '已发布'
  } else {
    throw new Error('仅已发布／已停用规则可停用或启用')
  }
  item.updatedAt = nowText()
  item.operator = operator
  appendSystemLog({
    category: '配置变更',
    action: item.status === '已停用' ? '停用编码规则' : '启用编码规则',
    operator: operator || roleName(role),
    role,
    scope: '全平台',
    objectType: '编码规则',
    objectId: item.id,
    target: `${item.target} ${item.version}`,
    detail:
      item.status === '已停用' ? '停用保留历史，历史编号关联不变' : '重新启用，仅作用于后续新编号'
  })
  return item
}

/* -------------------------------- P18 系统日志 -------------------------------- */

/** 系统日志查询：按操作时间范围 / 操作者 / 对象类型 / 执行结果检索 [批注 23] */
export interface SystemLogQueryParams extends PageParams {
  /** 操作时间范围（YYYY-MM-DD） */
  timeRange?: string[]
  /** 操作者（模糊匹配） */
  operator?: string
  /** 业务对象类型 */
  objectType?: string
  /** 执行结果 */
  result?: LogResult | ''
  /** 授权范围前缀（多端复用同一列表时限制可见范围，空则不过滤） [源 #135] */
  scopes?: string[]
}

function logWithinTime(createdAt: string, range: string[]): boolean {
  const date = createdAt.slice(0, 10)
  return date >= range[0] && date <= range[1]
}

export async function fetchGetSystemLogs(
  params: SystemLogQueryParams
): Promise<Api.Common.PaginatedResponse<SystemLog>> {
  await delay()
  let list = [...SYSTEM_LOGS]
  if (params.scopes?.length)
    list = list.filter((item) => params.scopes!.some((s) => item.scope.startsWith(s)))
  if (params.timeRange?.length === 2)
    list = list.filter((item) => logWithinTime(item.createdAt, params.timeRange!))
  if (params.operator) list = list.filter((item) => item.operator.includes(params.operator!))
  if (params.objectType) list = list.filter((item) => (item.objectType ?? '') === params.objectType)
  if (params.result) list = list.filter((item) => item.result === params.result)
  if (params.keyword)
    list = list.filter((item) =>
      match(params.keyword, item.id, item.action, item.objectId ?? '', item.target, item.operator)
    )
  return paginate(list, params.current, params.size)
}

/* ---------------- 研究项目主链路扩展接口 [批注 08/12/15] ---------------- */

const CLINICAL_ROLES = ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE']
const nowStr = () => new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')

function roleName(role: string): string {
  const map: Record<string, string> = {
    R_DOCTOR: '医生',
    R_ASSISTANT: '医生助理',
    R_NURSE: '护士',
    R_PLATFORM: '平台管理员',
    R_CENTER: '中心管理员',
    R_GROUP: '课题组管理员',
    R_SYS: '系统管理员'
  }
  return map[role] ?? '系统'
}

function findProjectDetail(id: string): ResearchProjectDetail | undefined {
  return RESEARCH_PROJECT_DETAILS.find((item) => item.id === id || item.listId === id)
}

function requireProjectDetail(id: string): ResearchProjectDetail {
  const project = findProjectDetail(id)
  if (!project) throw new Error('研究项目详情不存在')
  return project
}

function conditionToQuery(condition: AnalysisCondition): ResearchAnalysisQuery {
  return {
    groupBy: condition.groupBy ?? '研究组别',
    groupValue: (condition.groupValue ?? condition.group) || '全部入组',
    indicators: condition.indicators ?? (condition.indicator ? [condition.indicator] : []),
    timeRange: condition.timeRange || '全研究周期'
  }
}

function buildAnalysisRows(
  project: ResearchProjectDetail,
  query: ResearchAnalysisQuery
): AnalysisDataRow[] {
  const indicators = query.indicators.length ? query.indicators : project.indicators.slice(0, 1)
  if (!indicators.length || !PATIENTS.length) return []
  const dayOffset = query.timeRange.includes('30') ? 20 : query.timeRange.includes('90') ? 60 : 180
  const groupValue = query.groupValue || '全部入组'
  return Array.from({ length: indicators.length > 2 ? 12 : 8 }, (_, index) => {
    const patient = PATIENTS[index % PATIENTS.length] ?? PATIENTS[0]
    const observedAt = new Date(Date.now() - (dayOffset + index) * 86400000)
      .toISOString()
      .slice(0, 10)
    const row: Record<string, string> = {
      patientId: patient?.id ?? `DLI-2026-${String(index + 1).padStart(4, '0')}`,
      researchNo: patient?.researchNo || `RS-2026-${String(index + 1).padStart(4, '0')}`,
      groupValue,
      observedAt
    }
    indicators.forEach((indicator, indicatorIndex) => {
      const meta = getIndicatorMeta(indicator)
      row[`indicator_${indicatorIndex}`] =
        index % 7 === 6 ? '' : `${(20 + index * 2.3 + indicatorIndex * 5).toFixed(1)}${meta.unit}`
    })
    return row as AnalysisDataRow
  })
}

function buildAnalysisSummary(
  query: ResearchAnalysisQuery,
  detail: AnalysisDataRow[]
): AnalysisSummaryRow[] {
  const indicators = query.indicators
  return indicators.map((indicator, index) => {
    const key = `indicator_${index}`
    const validCount = detail.filter((row) => row[key]).length
    const meta = getIndicatorMeta(indicator)
    return {
      groupName: query.groupValue || '全部入组',
      indicator,
      validCount,
      missingCount: detail.length - validCount,
      result: `${(70 + index * 3 + (validCount % 5)).toFixed(1)}`,
      unit: meta.unit,
      statisticalMethod: meta.statisticalMethod
    }
  })
}

function buildAnalysisResult(
  project: ResearchProjectDetail,
  condition: AnalysisCondition,
  runId: string
): AnalysisResult {
  const query = conditionToQuery(condition)
  const detail = buildAnalysisRows(project, query)
  const summary = buildAnalysisSummary(query, detail)
  const first = summary[0]
  return {
    condition: { ...condition, source: 'Agent 对话' },
    statisticalMethod: first?.statisticalMethod ?? '按方案统计口径',
    unit: first?.unit ?? '',
    validCount: first?.validCount ?? 0,
    missingCount: first?.missingCount ?? 0,
    value: first?.result ?? '',
    needsRerun: false,
    savedAt: nowStr(),
    runId,
    status: '完成'
  }
}

/** 列表行进入详情时，确保同一项目详情存在；新建研究也可直接使用 */
export async function fetchEnsureResearchProjectDetail(
  row: ResearchItem
): Promise<ResearchProjectDetail> {
  await delay(120)
  const existing = findProjectDetail(row.id)
  if (existing) return existing
  const created = createResearchProjectDetailFromRow(row)
  RESEARCH_PROJECT_DETAILS.push(created)
  return created
}

/** 按研究管理列表编号读取项目详情 */
export async function fetchGetResearchProjectDetailByResearchId(
  id: string
): Promise<ResearchProjectDetail | undefined> {
  await delay(120)
  const project = findProjectDetail(id)
  return project ? structuredClone(project) : undefined
}

/** 数据分析：临时筛选不修改正式入组 [批注 08] */
export async function fetchGetResearchAnalysisData(
  projectId: string,
  query: ResearchAnalysisQuery
): Promise<{ detail: AnalysisDataRow[]; summary: AnalysisSummaryRow[] }> {
  await delay(220)
  const project = findProjectDetail(projectId)
  if (!project) return { detail: [], summary: [] }
  const indicators = query.indicators.length ? query.indicators : project.indicators.slice(0, 1)
  const normalized = { ...query, indicators }
  const detail = buildAnalysisRows(project, normalized)
  const summary = buildAnalysisSummary(normalized, detail)
  return { detail, summary }
}

/** 已保存到数据分析页签的研究结果 */
export async function fetchGetResearchResults(projectId: string): Promise<AnalysisResult[]> {
  await delay(120)
  return [...requireProjectDetail(projectId).results]
}

/** Agent 结果卡片：创建进行中记录 */
export async function fetchCreateAnalysisRun(
  projectId: string,
  condition: AnalysisCondition
): Promise<AnalysisRun> {
  await delay(120)
  const project = requireProjectDetail(projectId)
  const run: AnalysisRun = {
    id: `RUN-${String(Date.now()).slice(-6)}`,
    projectId,
    condition: { ...condition, source: condition.source ?? 'Agent 对话' },
    status: '进行中',
    createdAt: nowStr(),
    finishedAt: '',
    saved: false
  }
  ANALYSIS_RUNS.unshift(run)
  appendSystemLog({
    category: '重要数据',
    action: '发起研究 Agent 分析',
    operator: roleName('R_DOCTOR'),
    role: 'R_DOCTOR',
    scope: project.center ?? '项目范围',
    target: project.id,
    detail: `条件 ${conditionToQuery(condition).groupValue} / ${conditionToQuery(condition).indicators.join('、')}`
  })
  return { ...run }
}

/** Agent 结果卡片：轮询/刷新状态；无数据不生成结论 [批注 08] */
export async function fetchRefreshAnalysisRun(runId: string): Promise<AnalysisRun> {
  await delay(160)
  const run = ANALYSIS_RUNS.find((item) => item.id === runId)
  if (!run) throw new Error('分析任务不存在')
  if (run.status === '进行中') {
    const project = requireProjectDetail(run.projectId)
    const query = conditionToQuery(run.condition)
    const detail = buildAnalysisRows(project, query)
    if (!detail.length) {
      run.status = '失败'
      run.error = '当前筛选无数据，未生成结论'
    } else {
      run.status = '完成'
      run.result = buildAnalysisResult(project, run.condition, run.id)
    }
    run.finishedAt = nowStr()
    appendSystemLog({
      category: '重要数据',
      action: run.status === '完成' ? '研究 Agent 分析完成' : '研究 Agent 分析失败',
      operator: roleName('R_DOCTOR'),
      role: 'R_DOCTOR',
      scope: project.center ?? '项目范围',
      target: project.id,
      detail: run.error ?? '结果可查看并保存到数据分析页签'
    })
  }
  return structuredClone(run)
}

/** 把 Agent 完成结果保存到数据分析页签 */
export async function fetchSaveAnalysisRun(runId: string): Promise<AnalysisResult> {
  await delay(180)
  const run = ANALYSIS_RUNS.find((item) => item.id === runId)
  if (!run) throw new Error('分析任务不存在')
  if (run.status !== '完成' || !run.result) throw new Error('仅完成的分析结果可保存')
  const project = requireProjectDetail(run.projectId)
  if (!run.saved) {
    const saved: AnalysisResult = { ...run.result, savedAt: nowStr(), runId: run.id }
    project.results.unshift(saved)
    run.saved = true
    appendSystemLog({
      category: '重要数据',
      action: '保存研究分析结果',
      operator: roleName('R_DOCTOR'),
      role: 'R_DOCTOR',
      scope: project.center ?? '项目范围',
      target: project.id,
      detail: '结果已写入数据分析页签'
    })
    return { ...saved }
  }
  return { ...run.result }
}

export async function fetchGetAnalysisRuns(projectId: string): Promise<AnalysisRun[]> {
  await delay(100)
  return ANALYSIS_RUNS.filter((item) => item.projectId === projectId).map((item) =>
    structuredClone(item)
  )
}

/** 研究进度：按中心 / 组别筛选，只读管理员只看汇总 [批注 15] */
export async function fetchGetResearchProgress(
  projectId: string,
  filters: { timeRange?: string; center?: string; group?: string } = {}
): Promise<ResearchProgress[]> {
  await delay(180)
  let list = [...requireProjectDetail(projectId).progress]
  if (filters.center) list = list.filter((item) => item.center === filters.center)
  if (filters.group) list = list.filter((item) => item.group === filters.group)
  return list
}

/** 缺失 / 异常核对抽屉 */
export async function fetchGetProgressIssues(
  projectId: string,
  center: string,
  group: string
): Promise<ResearchProgressIssue[]> {
  await delay(160)
  const project = requireProjectDetail(projectId)
  const row = project.progress.find((item) => item.center === center && item.group === group)
  const count = Math.min(row?.missingCount ?? 4, 6)
  return Array.from({ length: count }, (_, index) => {
    const patient = PATIENTS[(index + 3) % PATIENTS.length] ?? PATIENTS[0]
    return {
      patientId: patient?.id ?? `DLI-2026-${String(index + 4).padStart(4, '0')}`,
      researchNo: patient?.researchNo || `RS-2026-${String(index + 4).padStart(4, '0')}`,
      issue: index % 2 === 0 ? '终点指标缺失' : '随访完成记录异常',
      source: index % 2 === 0 ? '检查资料 / 终点记录' : '随访任务 / 患者反馈',
      status: index % 3 === 0 ? '已核对' : '待核对'
    }
  })
}

/** 患者研究记录抽屉：终点资料 / 安全事件 [批注 15] */
export async function fetchGetPatientResearchRecord(
  projectId: string,
  patientId: string
): Promise<PatientResearchRecord> {
  await delay(160)
  const project = requireProjectDetail(projectId)
  const endpoints = project.indicators.slice(0, 4).map((indicator, index) => {
    const meta = getIndicatorMeta(indicator)
    return {
      indicator,
      observedAt: `2026-${String(3 + index).padStart(2, '0')}-${String(6 + index).padStart(2, '0')}`,
      value: `${(30 + index * 7).toFixed(1)}`,
      unit: meta.unit,
      source: index % 2 === 0 ? '检验报告' : '影像 / 随访记录',
      status: index % 3 === 0 ? ('待核对' as const) : ('已核对' as const)
    }
  })
  const safetyEvents = [
    {
      name: '肝功能异常',
      occurredAt: '2026-08-12',
      description: '轻度转氨酶升高，已按方案复评',
      source: '检验报告 EX-0013',
      doctorConfirmed: true
    },
    {
      name: '随访逾期',
      occurredAt: '2026-09-20',
      description: '随访反馈待补充，未自动判定为不良事件',
      source: '随访任务记录',
      doctorConfirmed: false
    }
  ]
  return { patientId, projectId, endpoints, safetyEvents }
}

/** 研究资料表 */
export async function fetchGetResearchMaterials(projectId: string): Promise<ResearchMaterial[]> {
  await delay(140)
  return [...requireProjectDetail(projectId).materials]
}

export interface ResearchMaterialInput {
  id?: string
  name: string
  type: ResearchMaterial['type']
  version: string
  fileName: string
  fileSize: string
}

/** 上传 / 更新研究资料：演示环境只保存文件信息，不接真实文件服务 */
export async function fetchSaveResearchMaterial(
  projectId: string,
  input: ResearchMaterialInput,
  role: string
): Promise<ResearchMaterial> {
  await delay(220)
  if (!CLINICAL_ROLES.includes(role)) throw new Error('管理员共享查看不默认获得上传权')
  const project = requireProjectDetail(projectId)
  if (!input.name.trim() || !input.version.trim() || !input.fileName.trim()) {
    throw new Error('资料名称、版本和资料文件不能为空')
  }
  if (input.id) {
    const item = project.materials.find((row) => row.id === input.id)
    if (!item) throw new Error('研究资料不存在')
    Object.assign(item, input, {
      id: item.id,
      updatedAt: nowStr(),
      updatedBy: roleName(role),
      previewNote: '演示环境仅展示文件信息，不存真实文件'
    })
    appendSystemLog({
      category: '重要数据',
      action: '更新研究资料',
      operator: roleName(role),
      role,
      scope: project.center ?? '项目范围',
      target: project.id,
      detail: `${item.name} ${item.version}`
    })
    return { ...item }
  }
  const item: ResearchMaterial = {
    ...input,
    id: `RM-${String(Date.now()).slice(-6)}`,
    updatedAt: nowStr(),
    updatedBy: roleName(role),
    previewNote: '演示环境仅展示文件信息，不存真实文件'
  }
  project.materials.unshift(item)
  appendSystemLog({
    category: '重要数据',
    action: '上传研究资料',
    operator: roleName(role),
    role,
    scope: project.center ?? '项目范围',
    target: project.id,
    detail: `${item.name} ${item.version}`
  })
  return { ...item }
}

/** 入组清单版本列表 */
export async function fetchGetCriteriaLists(projectId: string): Promise<ResearchCriteriaList[]> {
  await delay(120)
  ensureCriteriaListForProject(projectId)
  return RESEARCH_CRITERIA_LISTS.filter((item) => item.projectId === projectId).map((item) =>
    structuredClone(item)
  )
}

/** 保存清单草稿：上传文件或 Agent 文字不会自动成为生效规则 */
export async function fetchSaveCriteriaList(
  projectId: string,
  items: ResearchCriteriaItem[],
  role: string
): Promise<ResearchCriteriaList> {
  await delay(240)
  if (!CLINICAL_ROLES.includes(role)) throw new Error('仅临床项目成员可维护入组清单')
  if (!items.length) throw new Error('入组清单至少需要一条条件')
  const version = `V1.${RESEARCH_CRITERIA_LISTS.filter((item) => item.projectId === projectId).length}`
  const list: ResearchCriteriaList = {
    id: `CL-${projectId}-${version}`,
    projectId,
    planVersion: 'V1.0',
    version,
    status: '草稿',
    items: items.map((item, index) => ({ ...item, displayOrder: index + 1 })),
    confirmedBy: '',
    confirmedAt: '',
    updatedAt: nowStr()
  }
  RESEARCH_CRITERIA_LISTS.push(list)
  appendSystemLog({
    category: '配置变更',
    action: '保存入组清单草稿',
    operator: roleName(role),
    role,
    scope: '项目范围',
    target: projectId,
    detail: `${list.version} 待医生确认`
  })
  return structuredClone(list)
}

/** 医生确认清单：确认后供患者详情研究入组使用，已完成核对保留当时版本 */
export async function fetchConfirmCriteriaList(
  projectId: string,
  version: string,
  role: string
): Promise<ResearchCriteriaList> {
  await delay(240)
  if (role !== 'R_DOCTOR') throw new Error('仅医生可确认入组清单')
  const list = RESEARCH_CRITERIA_LISTS.find(
    (item) => item.projectId === projectId && item.version === version
  )
  if (!list) throw new Error('入组清单版本不存在')
  RESEARCH_CRITERIA_LISTS.filter(
    (item) => item.projectId === projectId && item.status === '已确认'
  ).forEach((item) => (item.status = '已停用'))
  list.status = '已确认'
  list.confirmedBy = roleName(role)
  list.confirmedAt = nowStr()
  const project = findProjectDetail(projectId)
  if (project) project.criteriaVersion = list.version
  appendSystemLog({
    category: '配置变更',
    action: '确认入组清单版本',
    operator: roleName(role),
    role,
    scope: '项目范围',
    target: projectId,
    detail: `${list.version} 已生效；已完成核对保留当时版本`
  })
  return structuredClone(list)
}

/** 项目详情共享设置：同步蓝图详情，不自动授予患者明细 / 编辑 / 导出 */
export async function fetchUpdateResearchProjectShare(
  projectId: string,
  setting: ResearchShareSetting,
  role: string
): Promise<void> {
  await delay(180)
  if (!CLINICAL_ROLES.includes(role)) throw new Error('管理员共享视图只读')
  const project = requireProjectDetail(projectId)
  project.shareLevel = setting.shared ? setting.level : '未共享'
  project.shareSetting = structuredClone(setting)
  project.shareGrantsPatientDetail = false
  project.shareGrantsEdit = false
  project.shareGrantsExport = false
  appendSystemLog({
    category: '权限变更',
    action: setting.shared ? '更新研究共享设置' : '取消研究共享',
    operator: roleName(role),
    role,
    scope: project.center ?? '项目范围',
    target: project.id,
    detail: setting.actualVisibleScope
  })
}
