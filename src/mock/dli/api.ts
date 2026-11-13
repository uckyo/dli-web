/**
 * DLI 疾病智能管理平台 - Mock 服务层
 *
 * 全部页面数据经本模块获取；函数签名对齐项目 API 规范（fetchXxx），
 * 列表接口返回 Api.Common.PaginatedResponse 结构，可直接对接 useTable。
 *
 * 说明：Mock 仅做内存态变更，刷新页面后恢复初始数据。
 */
import {
  AGENTS,
  AGENT_SESSIONS,
  AGENT_TRENDS,
  AGENT_VERSIONS,
  CENTER_MAP_DATA,
  CENTERS_DATA,
  AUTOMATION_TASKS,
  EXAM_AUTOMATION,
  EXAMS,
  FOLLOWUP_AUTOMATION,
  GROUP_DOCTORS,
  GROUPS_DATA,
  KNOWLEDGE,
  KNOWLEDGE_DOCS,
  KNOWLEDGE_LOGS,
  LLMS,
  LLM_AGENT_USAGE,
  LLM_ALLOCATES,
  LLM_TRENDS,
  MCP_CONFIG,
  MCP_LOGS,
  MCP_TOOLS,
  MCP_TRENDS,
  MCPS,
  MODELS,
  PATIENTS,
  PATIENT_AUTOMATION,
  PATIENT_DETAILS,
  PATIENT_REPORTS,
  PLATFORMS_DATA,
  RESEARCHES,
  SAMPLES,
  SAMPLE_TESTS,
  SKILLS,
  SKILL_LOGS,
  SKILL_TRENDS,
  SKILL_VERSIONS,
  STAFFS,
  TREND_DATA,
  USERS_DATA
} from './data'
import { WARNING_TICKETS, appendSystemLog } from './blueprint/data'
import type {
  AgentDetail,
  AgentItem,
  AgentOverview,
  AgentPayload,
  AgentSession,
  AiModel,
  AutomationTask,
  AutomationTaskStatus,
  AutomationTaskType,
  ConnectivityResult,
  EnrollEntry,
  ExamAttachment,
  ExamCategory,
  ExamModifyRecord,
  ExamProcessStatus,
  ExamRecognitionField,
  ExamRecord,
  ExamSource,
  GroupDoctor,
  KnowledgeChangeLog,
  KnowledgeDetail,
  KnowledgeDoc,
  KnowledgeItem,
  KnowledgeOverview,
  KnowledgePayload,
  KnowledgeTestResult,
  LlmDetail,
  LlmItem,
  LlmOverview,
  LlmUsagePoint,
  McpDetail,
  McpItem,
  McpOverview,
  OrgItem,
  PlatformItem,
  PatientReport,
  ResearchItem,
  SafetyEvent,
  SampleRecord,
  SampleTestRecord,
  SkillDetail,
  SkillItem,
  SkillOverview,
  SkillPayload,
  StaffItem,
  SyncStatus,
  UserType,
  WarnLevel,
  WebPatient,
  WebPatientDetail,
  WebRoleCode,
  WebUserItem,
  WorkbenchStats
} from './types'

/** 模拟网络延迟 */
const delay = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms))

/** 通用分页 */
function paginate<T>(list: T[], current = 1, size = 10): Api.Common.PaginatedResponse<T> {
  const start = (current - 1) * size
  return {
    records: list.slice(start, start + size),
    current,
    size,
    total: list.length
  }
}

/** 患者列表查询参数 */
export interface PatientQueryParams {
  current?: number
  size?: number
  keyword?: string
  status?: WebPatient['status'] | ''
  warnLevel?: WarnLevel | ''
  enrollEntry?: EnrollEntry | ''
  researchGroup?: WebPatient['group'] | ''
  enrolled?: '' | 'yes' | 'no'
}

/** 检查列表查询参数 */
export interface ExamQueryParams {
  current?: number
  size?: number
  keyword?: string
  category?: ExamCategory | ''
  source?: ExamSource | ''
  status?: ExamProcessStatus | ''
  /** 患者详情页嵌入模式：只返回该患者的检查资料 */
  patientId?: string
}

/** 人员列表查询参数 */
export interface StaffQueryParams {
  current?: number
  size?: number
  keyword?: string
  role?: StaffItem['role']
}

/** 工作台：按角色返回附加指标 */
export async function fetchGetWorkbench(role: WebRoleCode): Promise<WorkbenchStats> {
  await delay(200)

  const statusOrder: WebPatient['status'][] = ['待评估', '用药中', '随访中', '已结案']
  const patientTotal = 231

  /** 把样本量按患者总数放大，保证状态分布与总数一致 */
  const rawStatusCounts = statusOrder.map(
    (status) => PATIENTS.filter((patient) => patient.status === status).length
  )
  const rawStatusTotal = rawStatusCounts.reduce((sum, count) => sum + count, 0) || 1
  let allocated = 0
  const patientStatus = statusOrder.map((status, index) => {
    const count =
      index === statusOrder.length - 1
        ? patientTotal - allocated
        : Math.round((rawStatusCounts[index] / rawStatusTotal) * patientTotal)
    allocated += count
    return { status, count }
  })

  /** 工作台样本 / 检测指标与生物样本库同源，不再硬编码 [批注 07] */
  const stats: WorkbenchStats = {
    patientTotal,
    examTotal: 1864,
    sampleTotal: SAMPLES.length,
    dataVolume: Number(
      (SAMPLE_TESTS.reduce((sum, item) => sum + item.dataSizeGb, 0) / 1000).toFixed(1)
    ),
    earlyScreen: { count: 46, total: 231, accuracy: 0.912 },
    earlyDiagnosis: { count: 28, total: 64, accuracy: 0.883 },
    outcome: [
      { window: '3 个月', count: 38, total: 96, accuracy: 0.861 },
      { window: '6 个月', count: 27, total: 82, accuracy: 0.842 },
      { window: '12 个月', count: 19, total: 53, accuracy: 0.817 }
    ],
    modelCount: MODELS.length,
    agentCount: AGENTS.length,
    researchCount: RESEARCHES.length,
    publicationCount: 26,
    citations: 418,
    influence: 87.6,
    patientStatus,
    trend: TREND_DATA
  }

  if (role === 'R_PLATFORM') {
    stats.platformCount = PLATFORMS_DATA.length
    stats.centerCount = CENTERS_DATA.length
    stats.doctorCount = USERS_DATA.filter((user) => user.type === '医生').length * 13
    stats.centerMap = CENTER_MAP_DATA
  }
  if (role === 'R_CENTER') {
    stats.groupCount = GROUPS_DATA.length
    stats.doctorCount = USERS_DATA.filter((user) => user.type === '医生').length * 4
  }
  if (role === 'R_GROUP') {
    stats.doctorCount = USERS_DATA.filter((user) => user.type === '医生').length
  }
  if (role === 'R_SYS') {
    stats.platformCount = PLATFORMS_DATA.length
    stats.centerCount = CENTERS_DATA.length * PLATFORMS_DATA.length
    stats.doctorCount = USERS_DATA.filter((user) => user.type === '医生').length * 21
    stats.centerMap = CENTER_MAP_DATA
  }
  return stats
}

/** 患者列表（分页 + 筛选，仅按编号类字段检索，G1 脱敏） */
export async function fetchGetPatientList(
  params: PatientQueryParams
): Promise<Api.Common.PaginatedResponse<WebPatient>> {
  await delay()
  let list = [...PATIENTS]
  if (params.keyword) {
    const keyword = params.keyword.trim().toLowerCase()
    list = list.filter(
      (item) =>
        item.id.toLowerCase().includes(keyword) ||
        item.researchNo.toLowerCase().includes(keyword) ||
        item.doctor.includes(keyword)
    )
  }
  if (params.status) list = list.filter((item) => item.status === params.status)
  if (params.warnLevel) {
    list = list.filter(
      (item) =>
        item.earlyScreen.level === params.warnLevel ||
        item.earlyDiagnosis.level === params.warnLevel
    )
  }
  if (params.enrollEntry) list = list.filter((item) => item.enrollEntry === params.enrollEntry)
  if (params.researchGroup) list = list.filter((item) => item.group === params.researchGroup)
  if (params.enrolled === 'yes') list = list.filter((item) => item.enrolled)
  if (params.enrolled === 'no') list = list.filter((item) => !item.enrolled)
  return paginate(list, params.current, params.size)
}

/** 患者详情（含对话与诊疗历程） */
export async function fetchGetPatientDetail(id: string): Promise<WebPatientDetail> {
  await delay()
  const detail = PATIENT_DETAILS[id]
  if (!detail) throw new Error('患者不存在')
  return detail
}

/** 按编号读取患者档案（患者详情独立页面） */
export async function fetchGetPatientById(id: string): Promise<WebPatient> {
  await delay()
  const patient = PATIENTS.find((item) => item.id === id)
  if (!patient) throw new Error('患者档案不存在')
  return patient
}

/* -------------------------------------------------------------------------- */
/* 患者管理：建档 / 入组 / 知情同意 / 上报核对 / 安全事件 / 导入                  */
/* -------------------------------------------------------------------------- */

function requirePatient(id: string): WebPatient {
  const patient = PATIENTS.find((item) => item.id === id)
  if (!patient) throw new Error('患者档案不存在')
  return patient
}

/** 构造一条新档案：只建档，不产生研究入组、不采集身份信息 */
function buildArchive(input: {
  id?: string
  center: string
  doctor: string
  status: WebPatient['status']
  group: WebPatient['group']
}): WebPatient {
  return {
    id: input.id ?? `DLI-2026-${String(PATIENTS.length + 1).padStart(4, '0')}`,
    name: '',
    gender: '男',
    age: 0,
    center: input.center,
    group: input.group,
    status: input.status,
    earlyScreen: { level: 'none', score: 0 },
    earlyDiagnosis: { level: 'none', score: 0 },
    outcome: { window: '3个月', probability: 0, label: '待评估' },
    lastUpdate: todayStr(),
    doctor: input.doctor,
    researchNo: '',
    enrollEntry: '',
    enrollDate: '',
    enrolled: false,
    consent: { signed: false, version: '', date: '' },
    safetyEvents: []
  }
}

function attachDetail(patient: WebPatient): void {
  PATIENT_DETAILS[patient.id] = {
    ...patient,
    phone: '',
    chiefComplaint: '',
    medication: [],
    conversations: [],
    history: []
  }
}

/** 新建患者档案（建档与研究入组分离） */
export async function fetchCreatePatientArchive(input: {
  center: string
  doctor: string
  status: WebPatient['status']
  group: WebPatient['group']
}): Promise<WebPatient> {
  await delay()
  if (!input.center.trim() || !input.doctor.trim()) throw new Error('所属中心与主管医生不能为空')
  const patient = buildArchive(input)
  PATIENTS.unshift(patient)
  attachDetail(patient)
  return patient
}

/** 入组条件核对项 */
export interface EnrollCheckItem {
  label: string
  passed: boolean
  detail: string
}

/** 同步核对逻辑（供核对与确认入组共用） */
function checkEnrollment(id: string, entry: EnrollEntry): EnrollCheckItem[] {
  const patient = requirePatient(id)
  const baseline = EXAMS.filter(
    (item) => item.patientId === id && item.status === '已核对归档'
  ).length
  return [
    { label: '患者档案已建立', passed: Boolean(patient.id), detail: patient.id },
    {
      label: '入组入口符合方案',
      passed: entry === '拟接受高危药物治疗' || entry === '已确诊 DLI',
      detail: entry
    },
    {
      label: '知情同意已签署',
      passed: patient.consent.signed,
      detail: patient.consent.signed
        ? `${patient.consent.version} · ${patient.consent.date}`
        : '未签署'
    },
    {
      label: '未重复入组',
      passed: !patient.enrolled,
      detail: patient.enrolled ? `已入组 ${patient.researchNo}` : '未入组'
    },
    {
      label: '主管医生与中心已登记',
      passed: Boolean(patient.doctor && patient.center),
      detail: `${patient.center} · ${patient.doctor}`
    },
    {
      label: '基线检查资料已归档',
      passed: baseline > 0,
      detail: baseline > 0 ? `${baseline} 份已归档` : '缺少已归档资料'
    }
  ]
}

/** 核对入组条件 */
export async function fetchCheckEnrollEligibility(
  id: string,
  entry: EnrollEntry
): Promise<EnrollCheckItem[]> {
  await delay()
  return checkEnrollment(id, entry)
}

/** 补录基线检查资料（核对不通过时可在入组弹窗内补齐） */
export async function fetchAddBaselineExam(patientId: string): Promise<ExamRecord> {
  await delay()
  const patient = requirePatient(patientId)
  const record: ExamRecord = {
    id: `EX-${Date.now()}`,
    patientId,
    patientName: '',
    category: '检验',
    item: '基线血常规',
    center: patient.center,
    date: todayStr(),
    status: '已核对归档',
    source: '院内同步',
    verified: true,
    checkedBy: '医护',
    checkedAt: todayStr(),
    uploader: '院内系统同步',
    uploadedAt: todayStr(),
    attachment: { name: `基线血常规_${patientId}.pdf`, type: 'PDF 报告', size: '1.0 MB' },
    recognitionFields: [
      { name: '白细胞计数', raw: 'WBC 6.8', extracted: '6.8', unit: '×10⁹/L', range: '3.5–9.5' }
    ],
    modifyRecords: [],
    logs: [
      {
        id: `EL-${Date.now()}`,
        action: '补录基线资料',
        operator: '医护',
        time: todayStr(),
        detail: '入组核对时补录'
      }
    ]
  }
  EXAMS.unshift(record)
  return record
}

/** 签署知情同意 */
export async function fetchSignConsent(id: string, version: string): Promise<WebPatient> {
  await delay()
  const patient = requirePatient(id)
  patient.consent = { signed: true, version, date: todayStr() }
  return patient
}

/** 确认研究入组：条件全部通过才写入，生成研究受试者编号 */
export async function fetchConfirmEnrollment(input: {
  id: string
  entry: EnrollEntry
  group: WebPatient['group']
}): Promise<WebPatient> {
  await delay()
  const patient = requirePatient(input.id)
  const failed = checkEnrollment(input.id, input.entry).filter((item) => !item.passed)
  if (failed.length)
    throw new Error(`入组条件未通过：${failed.map((item) => item.label).join('、')}`)
  const seq = PATIENTS.filter((item) => item.researchNo).length + 1
  patient.enrolled = true
  patient.enrollEntry = input.entry
  patient.enrollDate = todayStr()
  patient.group = input.group
  patient.researchNo = `RS-2026-${String(seq).padStart(4, '0')}`
  patient.lastUpdate = todayStr()
  return patient
}

/** 待核对上报列表 */
export async function fetchGetPatientReports(patientId: string): Promise<PatientReport[]> {
  await delay()
  return PATIENT_REPORTS.filter((item) => item.patientId === patientId).map((item) => ({ ...item }))
}

/** 核对 / 退回患者端上报 */
export async function fetchReviewPatientReport(
  reportId: string,
  action: '已核对' | '已退回',
  reviewer: string
): Promise<PatientReport> {
  await delay()
  const report = PATIENT_REPORTS.find((item) => item.id === reportId)
  if (!report) throw new Error('上报记录不存在')
  if (report.status !== '待核对') throw new Error('该上报已处理，不能重复核对')
  report.status = action
  report.reviewer = reviewer
  return { ...report }
}

/** 关联检查记录 */
export async function fetchGetPatientLinkedRecords(patientId: string): Promise<ExamRecord[]> {
  await delay()
  return EXAMS.filter((item) => item.patientId === patientId).map((item) => ({ ...item }))
}

/** 关联样本记录（与 P07 生物样本库同源，按患者编号匹配） */
export async function fetchGetPatientSamples(patientId: string): Promise<SampleRecord[]> {
  await delay()
  return SAMPLES.filter((item) => item.patientId === patientId).map((item) => ({ ...item }))
}

/** 关联检测记录（与 P07 检测管理同源）：只保留该患者有权查看的样本-患者对应关系 [批注 07] */
export async function fetchGetPatientSampleTests(patientId: string): Promise<SampleTestRecord[]> {
  await delay()
  return SAMPLE_TESTS.map((item) => scopeTestToPatient(item, patientId)).filter(
    (item): item is SampleTestRecord => Boolean(item)
  )
}

/** 核对关联记录：更新原记录状态，不重复建档 */
export async function fetchVerifyLinkedRecord(recordId: string): Promise<ExamRecord> {
  await delay()
  const record = EXAMS.find((item) => item.id === recordId)
  if (!record) throw new Error('关联记录不存在')
  if (record.status === '已核对归档') throw new Error('该记录已归档，无需重复核对')
  record.status = '已核对归档'
  record.verified = true
  return { ...record }
}

/** 登记安全事件（普通预警不自动转为不良事件，须医生确认） */
export async function fetchAddSafetyEvent(
  patientId: string,
  input: { type: string; level: SafetyEvent['level'] }
): Promise<SafetyEvent> {
  await delay()
  const patient = requirePatient(patientId)
  if (!input.type.trim()) throw new Error('请选择安全事件类型')
  const event: SafetyEvent = {
    id: `SE-${Date.now()}`,
    patientId,
    type: input.type,
    level: input.level,
    date: todayStr(),
    confirmed: false,
    confirmedBy: ''
  }
  patient.safetyEvents.unshift(event)
  return event
}

/** 医生确认安全事件 */
export async function fetchConfirmSafetyEvent(
  patientId: string,
  eventId: string,
  doctor: string
): Promise<SafetyEvent> {
  await delay()
  const patient = requirePatient(patientId)
  const event = patient.safetyEvents.find((item) => item.id === eventId)
  if (!event) throw new Error('安全事件不存在')
  if (event.confirmed) throw new Error('该事件已确认')
  event.confirmed = true
  event.confirmedBy = doctor
  return { ...event }
}

/** 安全事件列表 */
export async function fetchGetPatientSafetyEvents(patientId: string): Promise<SafetyEvent[]> {
  await delay()
  return requirePatient(patientId).safetyEvents.map((item) => ({ ...item }))
}

/** 导入行与预览结果 */
export interface PatientImportRow {
  id: string
  researchNo: string
  center: string
  doctor: string
  status: string
  enrollEntry: string
}
export interface PatientImportPreview extends PatientImportRow {
  result: '新增' | '重复' | '错误'
  reason: string
}

/** 导入预览：格式校验 + 按患者编号匹配去重 */
export async function fetchPreviewPatientImport(
  rows: PatientImportRow[]
): Promise<PatientImportPreview[]> {
  await delay()
  const seen = new Set<string>()
  const validStatus: string[] = ['待评估', '用药中', '随访中', '已结案']
  return rows.map((row) => {
    const id = row.id.trim()
    if (!/^DLI-\d{4}-\d{4}$/.test(id)) {
      return { ...row, id, result: '错误', reason: '患者编号格式应为 DLI-YYYY-NNNN' }
    }
    if (seen.has(id)) return { ...row, id, result: '重复', reason: '本次导入内编号重复' }
    if (PATIENTS.some((item) => item.id === id)) {
      return { ...row, id, result: '重复', reason: '系统已存在该患者编号' }
    }
    if (!row.center.trim() || !row.doctor.trim()) {
      return { ...row, id, result: '错误', reason: '所属中心或主管医生为空' }
    }
    if (!validStatus.includes(row.status)) {
      return { ...row, id, result: '错误', reason: '状态不在可选范围内' }
    }
    seen.add(id)
    return { ...row, id, result: '新增', reason: '可导入' }
  })
}

/** 提交导入：新增可导出行；重复行仅在勾选覆盖时更新 */
export async function fetchSubmitPatientImport(
  rows: PatientImportPreview[],
  overwrite: boolean
): Promise<{ created: number; updated: number; skipped: number }> {
  await delay()
  let created = 0
  let updated = 0
  let skipped = 0
  for (const row of rows) {
    if (row.result === '新增') {
      const patient = buildArchive({
        id: row.id,
        center: row.center,
        doctor: row.doctor,
        status: row.status as WebPatient['status'],
        group: 'AI 组'
      })
      PATIENTS.unshift(patient)
      attachDetail(patient)
      created += 1
    } else if (row.result === '重复' && overwrite) {
      const patient = PATIENTS.find((item) => item.id === row.id)
      if (patient) {
        patient.center = row.center || patient.center
        patient.doctor = row.doctor || patient.doctor
        patient.lastUpdate = todayStr()
        updated += 1
      } else {
        skipped += 1
      }
    } else {
      skipped += 1
    }
  }
  return { created, updated, skipped }
}

/** 检查列表（按分类） */
export async function fetchGetExamList(
  params: ExamQueryParams
): Promise<Api.Common.PaginatedResponse<ExamRecord>> {
  await delay()
  let list = EXAMS.filter((item) => !params.category || item.category === params.category)
  if (params.patientId) list = list.filter((item) => item.patientId === params.patientId)
  if (params.source) list = list.filter((item) => item.source === params.source)
  if (params.status) list = list.filter((item) => item.status === params.status)
  if (params.keyword) {
    const keyword = params.keyword.trim().toLowerCase()
    list = list.filter(
      (item) =>
        item.patientName.includes(keyword) ||
        item.id.toLowerCase().includes(keyword) ||
        item.item.includes(keyword)
    )
  }
  return paginate(list, params.current, params.size)
}

/* ---------------- 检查资料共享领域：检查管理与患者详情引用同一份 EXAMS [批注 03-1] ---------------- */

const examNowStr = () => new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
const examId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`

function requireExam(id: string): ExamRecord {
  const record = EXAMS.find((item) => item.id === id)
  if (!record) throw new Error('资料不存在')
  return record
}

function addExamLog(record: ExamRecord, action: string, operator: string, detail = '') {
  record.logs.push({ id: examId('EL'), action, operator, time: examNowStr(), detail })
}

/** 只有报告图片 / PDF 类按需识别；影像原图走影像查看入口 [批注 03-3] */
const REPORT_CATEGORIES: ExamCategory[] = ['病理', '检验', '病历']
export function isReportExam(category: ExamCategory): boolean {
  return REPORT_CATEGORIES.includes(category)
}

export interface ExamUploadPayload {
  patientId: string
  category: ExamCategory
  item: string
  center: string
  date: string
  attachment: ExamAttachment
  operator: string
}

/** 授权上传：直接写入共享数据源，两个入口立即可见 [批注 03-1] */
export async function fetchCreateExamUpload(payload: ExamUploadPayload): Promise<ExamRecord> {
  await delay()
  const patient = requirePatient(payload.patientId)
  const record: ExamRecord = {
    id: examId('EX'),
    patientId: payload.patientId,
    patientName: patient.name,
    category: payload.category,
    item: payload.item,
    center: payload.center,
    date: payload.date,
    // 影像类无需识别，直接进入人工核对；报告类先待识别
    status: isReportExam(payload.category) ? '待识别' : '待核对',
    source: '授权上传',
    verified: false,
    checkedBy: '',
    checkedAt: '',
    uploader: payload.operator,
    uploadedAt: examNowStr(),
    attachment: payload.attachment,
    recognitionFields: [],
    modifyRecords: [],
    logs: []
  }
  addExamLog(
    record,
    '授权上传',
    payload.operator,
    `${payload.attachment.name} · ${payload.category}`
  )
  EXAMS.unshift(record)
  return { ...record }
}

/** 资料详情：附件 + 上传 / 核对记录，已有字段复用 [批注 03-2] */
export async function fetchGetExamDetail(id: string): Promise<ExamRecord> {
  await delay(120)
  return { ...requireExam(id) }
}

/** 重试识别：失败后重新识别，不补造缺失字段值 [批注 03-3] */
export async function fetchRetryExamRecognition(id: string, operator: string): Promise<ExamRecord> {
  await delay(400)
  const record = requireExam(id)
  if (!isReportExam(record.category)) throw new Error('影像原图不参与字段识别，请使用影像查看入口')
  record.status = '待核对'
  addExamLog(record, '重试识别', operator, '识别完成，等待人工核对')
  return { ...record }
}

/** 人工录入：仅留痕，字段由医护自行填写，缺失值不自动填充 [批注 03-3] */
export async function fetchManualExamEntry(id: string, operator: string): Promise<ExamRecord> {
  await delay(120)
  const record = requireExam(id)
  addExamLog(record, '人工录入', operator, '切换人工录入模式')
  return { ...record }
}

export interface ExamConfirmPayload {
  fields: ExamRecognitionField[]
  modifyRecords: ExamModifyRecord[]
  operator: string
}

/**
 * 确认核对完成：写回共享数据 + 联动预警 sourceVerified
 * 识别结果核对后才能用于评估 [批注 03-3 / G7]
 */
export async function fetchConfirmExamRecognition(
  id: string,
  payload: ExamConfirmPayload
): Promise<ExamRecord> {
  await delay()
  const record = requireExam(id)
  if (record.verified) throw new Error('该资料已核对，无需重复操作')
  if (isReportExam(record.category)) {
    const missing = payload.fields.filter((field) => !field.extracted.trim() || !field.raw.trim())
    if (missing.length || payload.fields.length === 0) {
      throw new Error('存在未核对的识别字段，请重试识别或人工录入，不得补造缺失内容')
    }
  }
  record.recognitionFields = payload.fields
  record.modifyRecords = payload.modifyRecords
  record.verified = true
  record.checkedBy = payload.operator
  record.checkedAt = examNowStr()
  record.status = '已核对归档'
  addExamLog(record, '核对完成', payload.operator, '识别结果已核对，可用于评估')

  // 同一患者因识别未核对而暂缓的预警，核对后同步放行 [批注 03-3]
  const linked = WARNING_TICKETS.filter(
    (item) =>
      item.patientId === record.patientId &&
      !item.sourceVerified &&
      item.trigger.includes('识别结果未核对')
  )
  for (const warning of linked) {
    warning.sourceVerified = true
    warning.records.push({
      id: examId('DR'),
      operator: payload.operator,
      role: '医护',
      action: `检查资料 ${record.id} 识别结果已核对，可用于评估`,
      createdAt: examNowStr()
    })
    addExamLog(record, '核对结果同步预警', payload.operator, warning.id)
  }
  return { ...record }
}

/* -------------------------------------------------------------------------- */
/* P07 生物样本 · 样本管理 / 检测管理 [批注 07]                                 */
/* -------------------------------------------------------------------------- */

/** 样本列表查询参数 */
export interface SampleQueryParams {
  current?: number
  size?: number
  keyword?: string
  sampleId?: string
  patientId?: string
  center?: string
  type?: SampleRecord['type'] | ''
  collectDateRange?: string[] | ''
  status?: SampleRecord['status'] | ''
  syncStatus?: SyncStatus | ''
}

/** 检测列表查询参数 */
export interface SampleTestQueryParams {
  current?: number
  size?: number
  keyword?: string
  testId?: string
  /** 样本管理「关联检测」跳转带入 */
  sampleId?: string
  patientId?: string
  type?: SampleTestRecord['type'] | ''
  batch?: string
  testDateRange?: string[] | ''
  status?: SampleTestRecord['status'] | ''
}

function matchKeyword(value: string, keyword: string): boolean {
  return value.toLowerCase().includes(keyword.trim().toLowerCase())
}

/** 日期范围筛选：valueFormat=YYYY-MM-DD，与 YYYY-MM-DD HH:mm 的前 10 位比较 */
function withinDateRange(value: string, range?: string[] | ''): boolean {
  if (!Array.isArray(range) || range.length < 2 || !range[0] || !range[1]) return true
  const date = value.slice(0, 10)
  return date >= range[0] && date <= range[1]
}

/** 患者详情嵌入模式：批次内只保留该患者的样本，不把其他患者带出来 [批注 07] */
function scopeTestToPatient(
  record: SampleTestRecord,
  patientId: string
): SampleTestRecord | undefined {
  const links = record.linkedSamples.filter((item) => item.patientId === patientId)
  if (!links.length) return undefined
  return {
    ...record,
    linkedSamples: links.map((item) => ({ ...item })),
    sampleId: links[0].sampleId,
    patientId
  }
}

/** 生物样本列表 */
export async function fetchGetSampleList(
  params: SampleQueryParams
): Promise<Api.Common.PaginatedResponse<SampleRecord>> {
  await delay()
  let list = [...SAMPLES]
  const { patientId, sampleId, center, type, status, syncStatus, collectDateRange, keyword } =
    params
  if (patientId) list = list.filter((item) => item.patientId === patientId)
  if (sampleId) list = list.filter((item) => matchKeyword(item.id, sampleId))
  if (center) list = list.filter((item) => item.center === center)
  if (type) list = list.filter((item) => item.type === type)
  if (status) list = list.filter((item) => item.status === status)
  if (syncStatus) list = list.filter((item) => item.syncStatus === syncStatus)
  list = list.filter((item) => withinDateRange(item.collectedAt, collectDateRange))
  if (keyword) {
    list = list.filter(
      (item) =>
        matchKeyword(item.id, keyword) ||
        matchKeyword(item.name, keyword) ||
        matchKeyword(item.patientId, keyword)
    )
  }
  return paginate(
    list.map((item) => ({ ...item })),
    params.current,
    params.size
  )
}

/** 按编号读取样本（检测详情关联样本） */
export async function fetchGetSampleById(id: string): Promise<SampleRecord | undefined> {
  await delay(120)
  const sample = SAMPLES.find((item) => item.id === id)
  return sample ? { ...sample } : undefined
}

/** 样本检测列表 */
export async function fetchGetSampleTestList(
  params: SampleTestQueryParams
): Promise<Api.Common.PaginatedResponse<SampleTestRecord>> {
  await delay()
  let list = [...SAMPLE_TESTS]
  const { patientId, testId, sampleId, type, batch, testDateRange, status, keyword } = params
  if (patientId) {
    list = list
      .map((item) => scopeTestToPatient(item, patientId))
      .filter((item): item is SampleTestRecord => Boolean(item))
  }
  if (testId) list = list.filter((item) => matchKeyword(item.id, testId))
  if (sampleId) {
    list = list.filter(
      (item) =>
        matchKeyword(item.sampleId, sampleId) ||
        item.linkedSamples.some((link) => matchKeyword(link.sampleId, sampleId))
    )
  }
  if (type) list = list.filter((item) => item.type === type)
  if (batch) list = list.filter((item) => matchKeyword(item.batch, batch))
  if (status) list = list.filter((item) => item.status === status)
  list = list.filter((item) => withinDateRange(item.testedAt, testDateRange))
  if (keyword) {
    list = list.filter(
      (item) =>
        matchKeyword(item.id, keyword) ||
        matchKeyword(item.item, keyword) ||
        matchKeyword(item.batch, keyword) ||
        matchKeyword(item.sampleId, keyword) ||
        item.linkedSamples.some((link) => matchKeyword(link.sampleId, keyword))
    )
  }
  return paginate(
    list.map((item) => ({
      ...item,
      linkedSamples: item.linkedSamples.map((link) => ({ ...link }))
    })),
    params.current,
    params.size
  )
}

/** 按编号读取检测记录（同步处理后刷新详情用） */
export async function fetchGetSampleTestById(id: string): Promise<SampleTestRecord | undefined> {
  await delay(120)
  const record = SAMPLE_TESTS.find((item) => item.id === id)
  return record
    ? { ...record, linkedSamples: record.linkedSamples.map((link) => ({ ...link })) }
    : undefined
}

/** 同步故障处理动作：仅系统管理员可用，处理后状态恢复「正常」并写系统日志 [批注 07] */
export type SampleSyncAction = '标记已核对' | '重新同步'

export async function fetchHandleSampleSync(input: {
  kind: 'sample' | 'test'
  id: string
  action: SampleSyncAction
  operator: string
  role: string
  note?: string
}): Promise<SampleRecord | SampleTestRecord> {
  await delay(180)
  if (input.role !== 'R_SYS') throw new Error('仅系统管理员可处理源库同步故障')
  const target: SampleRecord | SampleTestRecord | undefined =
    input.kind === 'sample'
      ? SAMPLES.find((item) => item.id === input.id)
      : SAMPLE_TESTS.find((item) => item.id === input.id)
  if (!target) throw new Error('同步记录不存在')
  if (target.syncStatus === '正常') throw new Error('该记录同步状态正常，无需处理')
  if (input.action === '标记已核对' && !input.note?.trim()) {
    throw new Error('标记已核对需填写核对说明')
  }
  const before = target.syncStatus
  target.syncStatus = '正常'
  target.lastSyncedAt = examNowStr()
  target.syncNote =
    input.action === '重新同步'
      ? `已重新从源库同步（原状态：${before}）`
      : `已人工核对：${input.note?.trim() ?? ''}`
  appendSystemLog({
    category: '重要数据',
    action: `生物样本同步${input.action}`,
    operator: input.operator,
    role: input.role,
    scope: input.kind === 'sample' ? '样本管理' : '检测管理',
    target: input.id,
    detail: `${before} → 正常；${target.syncNote}；未自动写入评估或研究数据`
  })
  return { ...target }
}

/** 模型列表 */
export async function fetchGetModels(): Promise<AiModel[]> {
  await delay(180)
  return [...MODELS]
}

/** 启停模型：未接入不可启用；接入后操作提示影响的中心/课题组范围 [批注 20] */
export async function fetchToggleModel(
  id: string,
  enabled: boolean,
  role = 'R_PLATFORM'
): Promise<void> {
  await delay(150)
  const model = MODELS.find((item) => item.id === id)
  if (!model) return
  if (enabled && !model.connected) throw new Error('模型未接入，不可启用')
  if (role !== 'R_PLATFORM') throw new Error('仅平台管理员及获明确授权的角色可配置模型')
  model.enabled = enabled
  appendSystemLog({
    category: '配置变更',
    action: enabled ? '启用模型' : '停用模型',
    operator: '平台管理员',
    role,
    scope: '全平台',
    objectType: '模型配置',
    objectId: model.id,
    target: `${model.name} ${model.version}`,
    detail: enabled
      ? `启用后影响范围：${model.scope || '全部适用中心/课题组'}；Web 与 App 使用同一接入状态`
      : '停用不删历史报告，仅停止新评估'
  })
}

/** 新建模型：接入状态默认未接入，现阶段仅完成 UI 占位 [批注 20] */
export async function fetchCreateModel(payload: Omit<AiModel, 'id' | 'updatedAt'>): Promise<void> {
  await delay(300)
  const nextId =
    MODELS.reduce((max, item) => Math.max(max, Number(item.id.split('-')[1]) || 0), 0) + 1
  const created: AiModel = {
    ...payload,
    id: `M-${String(nextId).padStart(3, '0')}`,
    connected: payload.connected ?? false,
    enabled: payload.connected && payload.enabled ? payload.enabled : false,
    configVersion: 'V1.0',
    updatedAt: new Date().toISOString().slice(0, 10)
  }
  MODELS.unshift(created)
  appendSystemLog({
    category: '配置变更',
    action: '新建模型',
    operator: '平台管理员',
    role: 'R_PLATFORM',
    scope: '全平台',
    objectType: '模型配置',
    objectId: created.id,
    target: `${created.name} ${created.version}`,
    detail: `用途：${created.field}；接入状态：${created.connected ? '已接入' : '未接入'}`
  })
}

/** 保存模型配置：必需输入项不能缺省；配置留版本 [批注 20] */
export async function fetchSaveModel(payload: AiModel): Promise<void> {
  await delay(300)
  const missing = (payload.inputMappings ?? []).filter(
    (row) => row.required && !row.systemField.trim()
  )
  if (missing.length)
    throw new Error(
      `模型必需输入项「${missing.map((row) => row.item).join('、')}」未映射系统字段，不能保存`
    )
  const index = MODELS.findIndex((item) => item.id === payload.id)
  if (index > -1) {
    const prev = MODELS[index]
    const versionBumped = bumpConfigVersion(prev.configVersion)
    MODELS[index] = { ...payload, configVersion: versionBumped }
    appendSystemLog({
      category: '配置变更',
      action: '更新模型配置',
      operator: '平台管理员',
      role: 'R_PLATFORM',
      scope: '全平台',
      objectType: '模型配置',
      objectId: payload.id,
      target: `${payload.name} ${payload.version}`,
      detail: `配置版本 ${prev.configVersion} → ${versionBumped}；停用不删历史报告`,
      beforeContent: `配置版本：${prev.configVersion}`,
      afterContent: `配置版本：${versionBumped}`
    })
    return
  }
  MODELS.unshift({ ...payload, configVersion: 'V1.0' })
}

function bumpConfigVersion(version: string): string {
  const match = version.match(/^V(\d+)\.(\d+)$/)
  if (!match) return 'V1.1'
  return `V${match[1]}.${Number(match[2]) + 1}`
}

/* ------------------------------ 智能管理 ------------------------------ */

const todayStr = () => new Date().toISOString().slice(0, 10)

function formatSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  return `${Math.max(1, Math.round(bytes / 1024 / 1024))} MB`
}

/** 智能管理聚合数据（兼容旧调用） */
export async function fetchGetIntelligence() {
  await delay(200)
  return {
    skills: [...SKILLS] as SkillItem[],
    knowledge: [...KNOWLEDGE],
    mcps: [...MCPS],
    llms: [...LLMS],
    agents: [...AGENTS]
  }
}

/* ---------------- 技能 ---------------- */

export interface SkillQueryParams {
  current?: number
  size?: number
  keyword?: string
  type?: SkillItem['type'] | ''
  agent?: string
  enabled?: boolean | ''
}

/** 技能列表 */
export async function fetchGetSkillList(
  params: SkillQueryParams
): Promise<Api.Common.PaginatedResponse<SkillItem>> {
  await delay()
  let list = [...SKILLS]
  if (params.keyword) {
    const keyword = params.keyword.trim().toLowerCase()
    list = list.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.id.toLowerCase().includes(keyword) ||
        item.description.includes(keyword)
    )
  }
  if (params.type) list = list.filter((item) => item.type === params.type)
  if (params.agent) list = list.filter((item) => item.agent === params.agent)
  if (params.enabled !== '' && params.enabled !== undefined) {
    list = list.filter((item) => item.enabled === params.enabled)
  }
  return paginate(list, params.current, params.size)
}

/** 技能 KPI */
export async function fetchGetSkillOverview(): Promise<SkillOverview> {
  await delay(160)
  const calls30d = SKILLS.reduce((sum, item) => sum + item.calls, 0)
  const avgSuccessRate =
    SKILLS.length > 0 ? SKILLS.reduce((sum, item) => sum + item.successRate, 0) / SKILLS.length : 0
  return {
    total: SKILLS.length,
    enabled: SKILLS.filter((item) => item.enabled).length,
    calls30d,
    avgSuccessRate: Math.round(avgSuccessRate * 10) / 10
  }
}

/** 技能详情 */
export async function fetchGetSkillDetail(id: string): Promise<SkillDetail> {
  await delay(200)
  const skill = SKILLS.find((item) => item.id === id)
  if (!skill) throw new Error('技能不存在')
  return {
    ...skill,
    versions: [...(SKILL_VERSIONS[id] ?? [])],
    logs: SKILL_LOGS.filter((log) => log.skillId === id).sort((a, b) =>
      b.calledAt.localeCompare(a.calledAt)
    ),
    trend: [...(SKILL_TRENDS[id] ?? [])]
  }
}

function buildSkill(id: string, payload: SkillPayload): SkillItem {
  return {
    id,
    name: payload.name,
    type: payload.type,
    calls: 0,
    agent: payload.agent,
    enabled: payload.enabled,
    description: payload.description,
    successRate: 100,
    avgLatency: 0,
    version: 'v1.0.0',
    updatedAt: todayStr(),
    owner: payload.owner,
    scope: payload.scope,
    timeout: payload.timeout,
    retries: payload.retries,
    params: payload.params,
    tool: payload.tool || undefined,
    prompt: payload.prompt || undefined,
    workflow: payload.workflow || undefined
  }
}

/** 新建技能 */
export async function fetchCreateSkill(payload: SkillPayload): Promise<void> {
  await delay(320)
  const id = `S-${String(SKILLS.length + 1).padStart(2, '0')}`
  SKILLS.unshift(buildSkill(id, payload))
  SKILL_VERSIONS[id] = [
    {
      version: 'v1.0.0',
      publishedAt: `${todayStr()} 10:00`,
      publisher: payload.owner,
      note: '初始版本上线',
      active: true
    }
  ]
  SKILL_TRENDS[id] = []
}

/** 编辑技能 */
export async function fetchUpdateSkill(id: string, payload: SkillPayload): Promise<void> {
  await delay(320)
  const index = SKILLS.findIndex((item) => item.id === id)
  if (index === -1) return
  SKILLS[index] = {
    ...buildSkill(id, payload),
    calls: SKILLS[index].calls,
    successRate: SKILLS[index].successRate,
    avgLatency: SKILLS[index].avgLatency,
    version: SKILLS[index].version,
    updatedAt: todayStr()
  }
}

/** 启停技能 */
export async function fetchToggleSkill(id: string, enabled: boolean): Promise<void> {
  await delay(180)
  const skill = SKILLS.find((item) => item.id === id)
  if (skill) {
    skill.enabled = enabled
    skill.updatedAt = todayStr()
  }
}

/** 删除技能 */
export async function fetchDeleteSkill(id: string): Promise<void> {
  await delay(220)
  const index = SKILLS.findIndex((item) => item.id === id)
  if (index > -1) SKILLS.splice(index, 1)
  delete SKILL_VERSIONS[id]
  const logIndexes = SKILL_LOGS.map((log, i) => (log.skillId === id ? i : -1)).filter((i) => i > -1)
  logIndexes.reverse().forEach((i) => SKILL_LOGS.splice(i, 1))
  delete SKILL_TRENDS[id]
}

/** 发布技能新版本 */
export async function fetchPublishSkillVersion(
  id: string,
  payload: { version: string; note: string; publisher?: string }
): Promise<void> {
  await delay(300)
  const skill = SKILLS.find((item) => item.id === id)
  if (!skill) return
  const versions = SKILL_VERSIONS[id] ?? []
  versions.forEach((item) => (item.active = false))
  versions.unshift({
    version: payload.version,
    publishedAt: `${todayStr()} 15:00`,
    publisher: payload.publisher || skill.owner,
    note: payload.note,
    active: true
  })
  SKILL_VERSIONS[id] = versions
  skill.version = payload.version
  skill.updatedAt = todayStr()
}

/** 测试技能连通性 */
export async function fetchTestSkill(
  id: string
): Promise<{ ok: boolean; latency: number; message: string }> {
  await delay(500)
  const skill = SKILLS.find((item) => item.id === id)
  if (!skill) return { ok: false, latency: 0, message: '技能不存在' }
  if (!skill.enabled) return { ok: false, latency: 0, message: '技能已停用，请先启用后再测试' }
  const latency = Math.round(skill.avgLatency * (0.85 + Math.random() * 0.3))
  return { ok: true, latency, message: `调用成功，返回结构校验通过（耗时 ${latency}ms）` }
}

/* ---------------- 知识库 ---------------- */

export interface KnowledgeQueryParams {
  current?: number
  size?: number
  keyword?: string
  scope?: KnowledgeItem['scope'] | ''
  enabled?: boolean | ''
}

function syncKnowledgeStats(kb: KnowledgeItem): void {
  const docs = KNOWLEDGE_DOCS.filter((doc) => doc.knowledgeId === kb.id)
  const totalSize = docs.reduce((sum, doc) => sum + doc.sizeBytes, 0)
  kb.docs = docs.length
  kb.sizeBytes = totalSize
  kb.size = formatSize(totalSize)
  kb.vectorCount = docs.reduce((sum, doc) => sum + doc.chunks, 0)
}

function appendKnowledgeLog(log: Omit<KnowledgeChangeLog, 'id' | 'time'>): void {
  KNOWLEDGE_LOGS.unshift({
    ...log,
    id: `KL-${Date.now()}`,
    time: `${todayStr()} ${new Date().toTimeString().slice(0, 5)}`
  })
}

/** 知识库列表 */
export async function fetchGetKnowledgeList(
  params: KnowledgeQueryParams
): Promise<Api.Common.PaginatedResponse<KnowledgeItem>> {
  await delay()
  let list = [...KNOWLEDGE]
  if (params.keyword) {
    const keyword = params.keyword.trim().toLowerCase()
    list = list.filter(
      (item) => item.name.toLowerCase().includes(keyword) || item.description.includes(keyword)
    )
  }
  if (params.scope) list = list.filter((item) => item.scope === params.scope)
  if (params.enabled !== '' && params.enabled !== undefined) {
    list = list.filter((item) => item.enabled === params.enabled)
  }
  return paginate(list, params.current, params.size)
}

/** 知识库 KPI */
export async function fetchGetKnowledgeOverview(): Promise<KnowledgeOverview> {
  await delay(160)
  const sizeBytes = KNOWLEDGE.reduce((sum, item) => sum + item.sizeBytes, 0)
  return {
    total: KNOWLEDGE.length,
    docs: KNOWLEDGE.reduce((sum, item) => sum + item.docs, 0),
    sizeGb: Math.round((sizeBytes / 1024 ** 3) * 100) / 100,
    retrievals7d: KNOWLEDGE.reduce((sum, item) => sum + item.retrievals7d, 0)
  }
}

/** 知识库详情 */
export async function fetchGetKnowledgeDetail(id: string): Promise<KnowledgeDetail> {
  await delay(200)
  const kb = KNOWLEDGE.find((item) => item.id === id)
  if (!kb) throw new Error('知识库不存在')
  return {
    ...kb,
    documents: KNOWLEDGE_DOCS.filter((doc) => doc.knowledgeId === id).sort((a, b) =>
      b.uploadedAt.localeCompare(a.uploadedAt)
    ),
    changeLogs: KNOWLEDGE_LOGS.filter((log) => log.target === kb.name)
  }
}

/** 知识库文档分页 */
export async function fetchGetKnowledgeDocs(params: {
  knowledgeId: string
  current?: number
  size?: number
  keyword?: string
}): Promise<Api.Common.PaginatedResponse<KnowledgeDoc>> {
  await delay(180)
  let list = KNOWLEDGE_DOCS.filter((doc) => doc.knowledgeId === params.knowledgeId)
  if (params.keyword) {
    const keyword = params.keyword.trim().toLowerCase()
    list = list.filter((doc) => doc.name.toLowerCase().includes(keyword))
  }
  list = [...list].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  return paginate(list, params.current, params.size)
}

/** 新建知识库 */
export async function fetchCreateKnowledge(payload: KnowledgePayload): Promise<void> {
  await delay(320)
  const id = `K-${String(KNOWLEDGE.length + 1).padStart(2, '0')}`
  KNOWLEDGE.unshift({
    id,
    name: payload.name,
    docs: 0,
    size: '0 MB',
    updatedAt: todayStr(),
    enabled: payload.enabled,
    sizeBytes: 0,
    description: payload.description,
    maintainer: payload.maintainer,
    scope: payload.scope,
    hitRate: 0,
    retrievals7d: 0,
    embedding: payload.embedding,
    chunkSize: payload.chunkSize,
    chunkOverlap: payload.chunkOverlap,
    topK: payload.topK,
    scoreThreshold: payload.scoreThreshold,
    vectorCount: 0
  })
  appendKnowledgeLog({
    action: '新建知识库',
    target: payload.name,
    operator: payload.maintainer,
    note: '完成初始配置，等待导入文档'
  })
}

/** 编辑知识库 */
export async function fetchUpdateKnowledge(id: string, payload: KnowledgePayload): Promise<void> {
  await delay(320)
  const kb = KNOWLEDGE.find((item) => item.id === id)
  if (!kb) return
  Object.assign(kb, payload, { updatedAt: todayStr() })
  appendKnowledgeLog({
    action: '调整参数',
    target: kb.name,
    operator: payload.maintainer,
    note: `chunkSize ${payload.chunkSize}，topK ${payload.topK}，阈值 ${payload.scoreThreshold}`
  })
}

/** 启停知识库 */
export async function fetchToggleKnowledge(id: string, enabled: boolean): Promise<void> {
  await delay(200)
  const kb = KNOWLEDGE.find((item) => item.id === id)
  if (!kb) return
  kb.enabled = enabled
  kb.updatedAt = todayStr()
  appendKnowledgeLog({
    action: enabled ? '启用' : '停用',
    target: kb.name,
    operator: kb.maintainer,
    note: enabled ? '恢复检索服务' : '暂停检索服务'
  })
}

/** 删除知识库（同时移除文档与日志） */
export async function fetchDeleteKnowledge(id: string): Promise<void> {
  await delay(240)
  const index = KNOWLEDGE.findIndex((item) => item.id === id)
  if (index === -1) return
  const [removed] = KNOWLEDGE.splice(index, 1)
  const docIndexes = KNOWLEDGE_DOCS.map((doc, i) => (doc.knowledgeId === id ? i : -1))
    .filter((i) => i > -1)
    .reverse()
  docIndexes.forEach((i) => KNOWLEDGE_DOCS.splice(i, 1))
  const logIndexes = KNOWLEDGE_LOGS.map((log, i) => (log.target === removed.name ? i : -1))
    .filter((i) => i > -1)
    .reverse()
  logIndexes.forEach((i) => KNOWLEDGE_LOGS.splice(i, 1))
}

/** 上传知识库文档（演示，不读取真实文件） */
export async function fetchUploadKnowledgeDoc(
  knowledgeId: string,
  payload: { name: string; type: KnowledgeDoc['type']; sizeBytes: number; uploader: string }
): Promise<void> {
  await delay(400)
  const kb = KNOWLEDGE.find((item) => item.id === knowledgeId)
  if (!kb) return
  KNOWLEDGE_DOCS.push({
    id: `${knowledgeId}-D${String(KNOWLEDGE_DOCS.filter((doc) => doc.knowledgeId === knowledgeId).length + 1).padStart(3, '0')}-${Date.now() % 1000}`,
    knowledgeId,
    name: payload.name,
    type: payload.type,
    sizeBytes: payload.sizeBytes,
    chunks: Math.max(1, Math.round((payload.sizeBytes / 1024 / 1024) * 16)),
    status: '已入库',
    uploader: payload.uploader,
    uploadedAt: `${todayStr()} ${new Date().toTimeString().slice(0, 5)}`
  })
  syncKnowledgeStats(kb)
  kb.updatedAt = todayStr()
  appendKnowledgeLog({
    action: '上传文档',
    target: kb.name,
    operator: payload.uploader,
    note: `上传「${payload.name}」并完成切片入库`
  })
}

/** 删除知识库文档 */
export async function fetchDeleteKnowledgeDoc(id: string): Promise<void> {
  await delay(220)
  const index = KNOWLEDGE_DOCS.findIndex((doc) => doc.id === id)
  if (index === -1) return
  const [removed] = KNOWLEDGE_DOCS.splice(index, 1)
  const kb = KNOWLEDGE.find((item) => item.id === removed.knowledgeId)
  if (!kb) return
  syncKnowledgeStats(kb)
  kb.updatedAt = todayStr()
  appendKnowledgeLog({
    action: '删除文档',
    target: kb.name,
    operator: removed.uploader,
    note: `移除「${removed.name}」并重建索引`
  })
}

/** 知识库检索测试 */
export async function fetchTestKnowledge(
  id: string,
  query: string,
  topK: number
): Promise<KnowledgeTestResult> {
  await delay(600)
  const kb = KNOWLEDGE.find((item) => item.id === id)
  const docs = KNOWLEDGE_DOCS.filter((doc) => doc.knowledgeId === id && doc.status === '已入库')
  if (!kb || !kb.enabled || !query.trim() || docs.length === 0) {
    return { query, topK, elapsed: 0, hits: [] }
  }
  const offset = query.length % docs.length
  const count = Math.min(topK, docs.length, 5)
  const hits = Array.from({ length: count }, (_, i) => {
    const doc = docs[(offset + i * 3) % docs.length]
    return {
      id: `${doc.id}-H${i + 1}`,
      score: Math.round((0.93 - i * 0.045) * 1000) / 1000,
      docName: doc.name,
      snippet: `${doc.name}：该片段为检索命中的知识库内容摘要，用于演示召回排序、相似度得分与引用出处。`,
      chunkIndex: (offset + i * 3) % Math.max(1, doc.chunks)
    }
  })
  return { query, topK, elapsed: 180 + Math.round(Math.random() * 220), hits }
}

/** 知识库更新日志 */
export async function fetchGetKnowledgeLogs(id?: string): Promise<KnowledgeChangeLog[]> {
  await delay(160)
  if (!id) return [...KNOWLEDGE_LOGS]
  const kb = KNOWLEDGE.find((item) => item.id === id)
  if (!kb) return []
  return KNOWLEDGE_LOGS.filter((log) => log.target === kb.name)
}

/* ---------------- MCP（只读） ---------------- */

export interface McpQueryParams {
  current?: number
  size?: number
  keyword?: string
  protocol?: McpItem['protocol'] | ''
  status?: McpItem['status'] | ''
}

/** MCP 服务列表 */
export async function fetchGetMcpList(
  params: McpQueryParams
): Promise<Api.Common.PaginatedResponse<McpItem>> {
  await delay()
  let list = [...MCPS]
  if (params.keyword) {
    const keyword = params.keyword.trim().toLowerCase()
    list = list.filter(
      (item) => item.name.toLowerCase().includes(keyword) || item.description.includes(keyword)
    )
  }
  if (params.protocol) list = list.filter((item) => item.protocol === params.protocol)
  if (params.status) list = list.filter((item) => item.status === params.status)
  return paginate(list, params.current, params.size)
}

/** MCP KPI */
export async function fetchGetMcpOverview(): Promise<McpOverview> {
  await delay(160)
  return {
    services: MCPS.length,
    tools: MCPS.reduce((sum, item) => sum + item.tools, 0),
    online: MCPS.filter((item) => item.status === '在线').length,
    calls30d: MCPS.reduce((sum, item) => sum + item.calls30d, 0)
  }
}

/** MCP 详情 */
export async function fetchGetMcpDetail(id: string): Promise<McpDetail> {
  await delay(200)
  const mcp = MCPS.find((item) => item.id === id)
  if (!mcp) throw new Error('MCP 服务不存在')
  const config = MCP_CONFIG[id] ?? { timeout: 30, heartbeat: 15, inspectedAt: '每日 02:00' }
  return {
    ...mcp,
    toolList: MCP_TOOLS.filter((tool) => tool.mcpId === id),
    logs: MCP_LOGS.filter((log) => log.mcpId === id).sort((a, b) =>
      b.calledAt.localeCompare(a.calledAt)
    ),
    trend: [...(MCP_TRENDS[id] ?? [])],
    timeout: config.timeout,
    heartbeat: config.heartbeat,
    inspectedAt: config.inspectedAt
  }
}

/** MCP 连通性测试（回写状态与延迟） */
export async function fetchTestMcp(id: string): Promise<ConnectivityResult> {
  await delay(700)
  const mcp = MCPS.find((item) => item.id === id)
  if (!mcp) {
    return { ok: false, status: '离线', latency: 0, checkedAt: '', message: 'MCP 服务不存在' }
  }
  const checkedAt = `${todayStr()} ${new Date().toTimeString().slice(0, 5)}`
  if (mcp.id === 'MP-04') {
    mcp.status = '离线'
    mcp.latency = 0
    mcp.lastCheckedAt = checkedAt
    return {
      ok: false,
      status: '离线',
      latency: 0,
      checkedAt,
      message: '连接超时：无法建立 stdio 管道，请检查病理系统服务进程'
    }
  }
  const latency = Math.round(80 + Math.random() * 140)
  mcp.status = '在线'
  mcp.latency = latency
  mcp.lastCheckedAt = checkedAt
  return {
    ok: true,
    status: '在线',
    latency,
    checkedAt,
    message: `握手成功，工具列表校验通过（${latency}ms）`
  }
}

/* ---------------- LLM ---------------- */

export interface LlmQueryParams {
  keyword?: string
  vendor?: string
  status?: LlmItem['status'] | ''
}

/** LLM 模型列表（数量固定，不分页） */
export async function fetchGetLlmList(params: LlmQueryParams = {}): Promise<LlmItem[]> {
  await delay(200)
  let list = [...LLMS]
  if (params.keyword) {
    const keyword = params.keyword.trim().toLowerCase()
    list = list.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) || item.model.toLowerCase().includes(keyword)
    )
  }
  if (params.vendor) list = list.filter((item) => item.vendor === params.vendor)
  if (params.status) list = list.filter((item) => item.status === params.status)
  return list
}

/** LLM KPI */
export async function fetchGetLlmOverview(): Promise<LlmOverview> {
  await delay(160)
  return {
    models: LLMS.length,
    todayCalls: LLMS.reduce((sum, item) => sum + item.todayCalls, 0),
    todayTokens: LLMS.reduce((sum, item) => sum + item.todayTokens, 0),
    monthCost: Math.round(LLMS.reduce((sum, item) => sum + item.monthCost, 0) * 100) / 100
  }
}

/** LLM 详情 */
export async function fetchGetLlmDetail(id: string): Promise<LlmDetail> {
  await delay(200)
  const llm = LLMS.find((item) => item.id === id)
  if (!llm) throw new Error('模型不存在')
  return {
    ...llm,
    trend: [...(LLM_TRENDS[id] ?? [])],
    allocations: LLM_ALLOCATES.filter((record) => record.llmId === id),
    agentUsage: [...(LLM_AGENT_USAGE[id] ?? [])]
  }
}

/** 全部模型近 30 天汇总用量 */
export async function fetchGetLlmUsageTrend(): Promise<LlmUsagePoint[]> {
  await delay(220)
  const dates = LLM_TRENDS[LLMS[0]?.id]?.map((point) => point.date) ?? []
  return dates.map((date, index) => {
    const dayPoints = LLMS.map((llm) => LLM_TRENDS[llm.id]?.[index]).filter(
      (point): point is LlmUsagePoint => Boolean(point)
    )
    return {
      date,
      calls: dayPoints.reduce((sum, point) => sum + point.calls, 0),
      tokensIn: dayPoints.reduce((sum, point) => sum + point.tokensIn, 0),
      tokensOut: dayPoints.reduce((sum, point) => sum + point.tokensOut, 0),
      cost: Math.round(dayPoints.reduce((sum, point) => sum + point.cost, 0) * 100) / 100
    }
  })
}

/** 启停 LLM（仅授权管理员 [批注 22]） */
export async function fetchToggleLlm(
  id: string,
  enabled: boolean,
  role = 'R_PLATFORM'
): Promise<void> {
  await delay(200)
  if (role !== 'R_PLATFORM' && role !== 'R_SYS') {
    throw new Error('仅明确获授权的管理员可启停模型服务')
  }
  const llm = LLMS.find((item) => item.id === id)
  if (!llm) return
  llm.status = enabled ? (llm.balance < 120000 ? '余额预警' : '正常') : '已停用'
  llm.connected = enabled
  llm.lastCheckedAt = `${todayStr()} ${new Date().toTimeString().slice(0, 5)}`
  appendSystemLog({
    category: '配置变更',
    action: enabled ? '启用模型服务' : '停用模型服务',
    operator: '当前管理员',
    role,
    scope: '全平台',
    objectType: '模型服务',
    objectId: llm.id,
    target: llm.name,
    detail: `影响范围：依赖「${llm.name}」的全部智能体${enabled ? '恢复可用' : '将不可用'}；剩余额度 ${llm.balance} ${llm.unit}`
  })
}

/** 内部分配额度（非真实购买 [批注 22]） */
export interface LlmAllocatePayload {
  target: string
  amount: number
  unit: 'Token' | '万 Token'
  note: string
  role?: string
}

export async function fetchAllocateLlmQuota(
  id: string,
  payload: LlmAllocatePayload
): Promise<void> {
  await delay(360)
  const role = payload.role ?? 'R_PLATFORM'
  if (role !== 'R_PLATFORM' && role !== 'R_SYS') {
    throw new Error('仅明确获授权的管理员可分配模型额度')
  }
  const llm = LLMS.find((item) => item.id === id)
  if (!llm) throw new Error('模型不存在')
  const amount = Math.round(payload.amount * 100) / 100
  if (!payload.target.trim()) throw new Error('请填写分配对象')
  if (!(amount > 0)) throw new Error('分配数量必须大于 0')
  const tokens = payload.unit === '万 Token' ? Math.round(amount * 10000) : Math.round(amount)
  llm.balance += tokens
  if (llm.status !== '已停用') llm.status = '正常'
  llm.updatedAt = `${todayStr()} ${new Date().toTimeString().slice(0, 5)}`
  LLM_ALLOCATES.unshift({
    id: `LA-${Date.now()}`,
    llmId: id,
    time: llm.updatedAt,
    target: payload.target.trim(),
    amount,
    unit: payload.unit,
    operator: role === 'R_SYS' ? '系统管理员' : '平台管理员',
    note: payload.note.trim()
  })
  appendSystemLog({
    category: '配置变更',
    action: '分配模型额度',
    operator: role === 'R_SYS' ? '系统管理员' : '平台管理员',
    role,
    scope: '全平台',
    objectType: '模型服务',
    objectId: llm.id,
    target: llm.name,
    detail: `分配对象「${payload.target.trim()}」，数量 ${amount} ${payload.unit}；${payload.note.trim() || '无说明'}`
  })
}

/** 更新 LLM 参数与告警阈值 */
export async function fetchUpdateLlm(
  id: string,
  payload: Partial<Pick<LlmItem, 'rateLimit' | 'alertThreshold' | 'priceIn' | 'priceOut'>>
): Promise<void> {
  await delay(280)
  const llm = LLMS.find((item) => item.id === id)
  if (llm) Object.assign(llm, payload)
}

/** 测试 LLM 连通性 */
export async function fetchTestLlm(
  id: string
): Promise<{ ok: boolean; latency: number; message: string }> {
  await delay(600)
  const llm = LLMS.find((item) => item.id === id)
  if (!llm) return { ok: false, latency: 0, message: '模型不存在' }
  if (llm.status === '已停用') {
    return { ok: false, latency: 0, message: '模型已停用，请先启用后再测试' }
  }
  const latency = Math.round(llm.avgLatency * (0.85 + Math.random() * 0.3))
  llm.lastCheckedAt = `${todayStr()} ${new Date().toTimeString().slice(0, 5)}`
  return { ok: true, latency, message: `对话接口连通，首 Token 耗时 ${latency}ms` }
}

/* ---------------- 智能体 ---------------- */

export interface AgentQueryParams {
  current?: number
  size?: number
  keyword?: string
  builtin?: boolean | ''
  enabled?: boolean | ''
}

/** 智能体列表 */
export async function fetchGetAgentList(
  params: AgentQueryParams
): Promise<Api.Common.PaginatedResponse<AgentItem>> {
  await delay()
  let list = [...AGENTS]
  if (params.keyword) {
    const keyword = params.keyword.trim().toLowerCase()
    list = list.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.role.includes(keyword) ||
        item.model.toLowerCase().includes(keyword)
    )
  }
  if (params.builtin !== '' && params.builtin !== undefined) {
    list = list.filter((item) => item.builtin === params.builtin)
  }
  if (params.enabled !== '' && params.enabled !== undefined) {
    list = list.filter((item) => item.enabled === params.enabled)
  }
  return paginate(list, params.current, params.size)
}

/** 智能体 KPI */
export async function fetchGetAgentOverview(): Promise<AgentOverview> {
  await delay(160)
  return {
    total: AGENTS.length,
    enabled: AGENTS.filter((item) => item.enabled).length,
    todaySessions: AGENTS.reduce((sum, item) => sum + item.sessions, 0),
    avgSatisfaction:
      AGENTS.length > 0
        ? Math.round(
            (AGENTS.reduce((sum, item) => sum + item.satisfaction, 0) / AGENTS.length) * 10
          ) / 10
        : 0
  }
}

/** 智能体详情 */
export async function fetchGetAgentDetail(id: string): Promise<AgentDetail> {
  await delay(200)
  const agent = AGENTS.find((item) => item.id === id)
  if (!agent) throw new Error('智能体不存在')
  return {
    ...agent,
    versions: [...(AGENT_VERSIONS[id] ?? [])],
    sessionList: AGENT_SESSIONS.filter((session) => session.agentId === id).sort((a, b) =>
      b.startedAt.localeCompare(a.startedAt)
    ),
    trend: [...(AGENT_TRENDS[id] ?? [])]
  }
}

/** 新建智能体 */
export async function fetchCreateAgent(payload: AgentPayload): Promise<void> {
  await delay(340)
  const id = `A-${String(AGENTS.length + 1).padStart(2, '0')}`
  AGENTS.push({
    ...payload,
    id,
    builtin: false,
    sessions: 0,
    sessions30d: 0,
    satisfaction: 0,
    version: 'v1.0.0',
    updatedAt: todayStr()
  })
  AGENT_VERSIONS[id] = [
    {
      version: 'v1.0.0',
      publishedAt: `${todayStr()} 10:00`,
      publisher: '当前管理员',
      note: '初始版本发布',
      prompt: payload.prompt,
      active: true
    }
  ]
  AGENT_TRENDS[id] = []
}

/** 编辑智能体 */
export async function fetchUpdateAgent(id: string, payload: AgentPayload): Promise<void> {
  await delay(340)
  const agent = AGENTS.find((item) => item.id === id)
  if (!agent) return
  Object.assign(agent, payload, { updatedAt: todayStr() })
}

/** 启停智能体（内置与自建均生效） */
export async function fetchToggleAgent(id: string, enabled: boolean): Promise<void> {
  await delay(180)
  const agent = AGENTS.find((item) => item.id === id)
  if (agent) {
    agent.enabled = enabled
    agent.updatedAt = todayStr()
  }
}

/** 删除智能体（内置不可删，返回是否删除成功） */
export async function fetchDeleteAgent(id: string): Promise<boolean> {
  await delay(220)
  const index = AGENTS.findIndex((item) => item.id === id)
  if (index === -1) return false
  if (AGENTS[index].builtin) return false
  AGENTS.splice(index, 1)
  delete AGENT_VERSIONS[id]
  const sessionIndexes = AGENT_SESSIONS.map((session, i) =>
    session.agentId === id ? i : -1
  ).filter((i) => i > -1)
  sessionIndexes.reverse().forEach((i) => AGENT_SESSIONS.splice(i, 1))
  delete AGENT_TRENDS[id]
  return true
}

/** 克隆智能体 */
export async function fetchCloneAgent(id: string): Promise<void> {
  await delay(320)
  const agent = AGENTS.find((item) => item.id === id)
  if (!agent) return
  const newId = `A-${String(AGENTS.length + 1).padStart(2, '0')}`
  AGENTS.push({
    ...agent,
    id: newId,
    name: `${agent.name} 副本`,
    builtin: false,
    enabled: false,
    sessions: 0,
    sessions30d: 0,
    satisfaction: 0,
    version: 'v1.0.0',
    updatedAt: todayStr()
  })
  AGENT_VERSIONS[newId] = [
    {
      version: 'v1.0.0',
      publishedAt: `${todayStr()} 10:30`,
      publisher: '当前管理员',
      note: `克隆自 ${agent.name} ${agent.version}`,
      prompt: agent.prompt,
      active: true
    }
  ]
  AGENT_TRENDS[newId] = []
}

/** 发布智能体新版本 */
export async function fetchPublishAgentVersion(
  id: string,
  payload: { version: string; note: string; prompt?: string }
): Promise<void> {
  await delay(320)
  const agent = AGENTS.find((item) => item.id === id)
  if (!agent) return
  const versions = AGENT_VERSIONS[id] ?? []
  versions.forEach((item) => (item.active = false))
  versions.unshift({
    version: payload.version,
    publishedAt: `${todayStr()} 15:00`,
    publisher: '当前管理员',
    note: payload.note,
    prompt: payload.prompt || agent.prompt,
    active: true
  })
  AGENT_VERSIONS[id] = versions
  agent.version = payload.version
  if (payload.prompt) agent.prompt = payload.prompt
  agent.updatedAt = todayStr()
}

/** 回滚到指定版本 */
export async function fetchRollbackAgentVersion(id: string, version: string): Promise<void> {
  await delay(320)
  const agent = AGENTS.find((item) => item.id === id)
  const versions = AGENT_VERSIONS[id] ?? []
  const target = versions.find((item) => item.version === version)
  if (!agent || !target) return
  versions.forEach((item) => (item.active = item.version === version))
  agent.version = target.version
  agent.prompt = target.prompt
  agent.updatedAt = todayStr()
}

/** 智能体会话记录 */
export async function fetchGetAgentSessions(params: {
  agentId: string
  current?: number
  size?: number
  status?: AgentSession['status'] | ''
  keyword?: string
}): Promise<Api.Common.PaginatedResponse<AgentSession>> {
  await delay(180)
  let list = AGENT_SESSIONS.filter((session) => session.agentId === params.agentId)
  if (params.status) list = list.filter((session) => session.status === params.status)
  if (params.keyword) {
    const keyword = params.keyword.trim()
    list = list.filter(
      (session) =>
        session.patient.includes(keyword) ||
        session.doctor.includes(keyword) ||
        session.id.includes(keyword)
    )
  }
  list = [...list].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  return paginate(list, params.current, params.size)
}

/** 研究项目列表 */
export async function fetchGetResearchList(params: {
  current?: number
  size?: number
  keyword?: string
  /** 仅查看共享项目（管理端）；本人创建 / 本组织授权项目即使未共享也可见 */
  onlyShared?: boolean
  viewerName?: string
  viewerOrg?: string
  status?: ResearchItem['status'] | ''
  shareLevel?: ResearchItem['shareLevel'] | ''
}): Promise<Api.Common.PaginatedResponse<ResearchItem>> {
  await delay()
  let list = [...RESEARCHES]
  if (params.onlyShared) {
    const org = params.viewerOrg?.split(' · ')[0] ?? ''
    list = list.filter(
      (item) =>
        item.shared || item.owner === params.viewerName || (org.length > 0 && item.center === org)
    )
  }
  if (params.status) list = list.filter((item) => item.status === params.status)
  if (params.shareLevel) {
    list = list.filter((item) => item.shared && item.shareLevel === params.shareLevel)
  }
  if (params.keyword) {
    const keyword = params.keyword.trim()
    list = list.filter(
      (item) =>
        item.name.includes(keyword) || item.owner.includes(keyword) || item.id.includes(keyword)
    )
  }
  return paginate(list, params.current, params.size)
}

/** 按研究编号读取列表行，供项目详情顶部与共享弹窗复用 */
export async function fetchGetResearchById(id: string): Promise<ResearchItem | undefined> {
  await delay(80)
  const research = RESEARCHES.find((item) => item.id === id)
  return research ? structuredClone(research) : undefined
}

/** 新建研究项目 */
export async function fetchCreateResearch(
  payload: Pick<
    ResearchItem,
    'name' | 'groupBy' | 'indicators' | 'shared' | 'shareLevel' | 'owner' | 'center'
  >
): Promise<void> {
  await delay(400)
  const id = `R-2026-${String(RESEARCHES.length + 4).padStart(3, '0')}`
  RESEARCHES.unshift({
    ...payload,
    id,
    shareTargets: [payload.center],
    shareContents: payload.shared ? ['项目概况', '进度汇总'] : [],
    actualVisibleScope: payload.shared
      ? `${payload.shareLevel}内可见项目概况 / 进度汇总`
      : '仅项目成员可见',
    detailId: id,
    members: 1,
    status: '进行中',
    updatedAt: new Date().toISOString().slice(0, 10)
  })
}

/** 更新研究共享设置（旧接口，保留兼容） */
export async function fetchUpdateResearchShare(
  id: string,
  shared: boolean,
  shareLevel: ResearchItem['shareLevel']
): Promise<void> {
  await delay(200)
  const research = RESEARCHES.find((item) => item.id === id)
  if (research) {
    research.shared = shared
    research.shareLevel = shareLevel
    research.updatedAt = new Date().toISOString().slice(0, 10)
  }
}

export interface ResearchShareInput {
  shared: boolean
  shareLevel: ResearchItem['shareLevel']
  shareTargets: string[]
  shareContents: NonNullable<ResearchItem['shareContents']>
  actualVisibleScope: string
  operator: string
  role: string
}

/** 更新研究共享设置并留痕 [批注 12]：保存关闭共享才收回访问 */
export async function fetchUpdateResearchShareV2(
  id: string,
  input: ResearchShareInput
): Promise<ResearchItem> {
  await delay(240)
  const research = RESEARCHES.find((item) => item.id === id)
  if (!research) throw new Error('研究项目不存在')
  research.shared = input.shared
  research.shareLevel = input.shareLevel
  research.shareTargets = [...input.shareTargets]
  research.shareContents = [...input.shareContents]
  research.actualVisibleScope = input.actualVisibleScope
  research.updatedAt = new Date().toISOString().slice(0, 10)
  appendSystemLog({
    category: '权限变更',
    action: input.shared ? '更新研究共享设置' : '取消研究共享',
    operator: input.operator,
    role: input.role,
    scope: research.center,
    target: research.id,
    detail: input.actualVisibleScope
  })
  return structuredClone(research)
}

/** 人员列表 */
export async function fetchGetStaffList(
  params: StaffQueryParams
): Promise<Api.Common.PaginatedResponse<StaffItem>> {
  await delay()
  let list = STAFFS.filter((item) => item.role === params.role)
  if (params.keyword) {
    const keyword = params.keyword.trim()
    list = list.filter((item) => item.name.includes(keyword) || item.doctor.includes(keyword))
  }
  return paginate(list, params.current, params.size)
}

/** 启停人员 */
export async function fetchToggleStaff(id: string, status: StaffItem['status']): Promise<void> {
  await delay(180)
  const staff = STAFFS.find((item) => item.id === id)
  if (staff) staff.status = status
}

/** 新增人员 */
export async function fetchAddStaff(payload: Omit<StaffItem, 'id'>): Promise<void> {
  await delay(300)
  STAFFS.push({ ...payload, id: `U-${1000 + STAFFS.length + 1}` })
}

/** 自动化配置 */
export async function fetchGetAutomation() {
  await delay(180)
  return {
    patient: [...PATIENT_AUTOMATION],
    exam: [...EXAM_AUTOMATION],
    followup: [...FOLLOWUP_AUTOMATION]
  }
}

/* ---------------- 状态管理 · 执行记录 [批注 09] ---------------- */

/** 执行记录筛选：患者编号 / 任务类型 / 触发时间范围 / 执行状态 [批注 09] */
export interface AutomationTaskQueryParams {
  patientId?: string
  type?: AutomationTaskType | ''
  timeRange?: string[]
  status?: AutomationTaskStatus | ''
}

export async function fetchGetAutomationTasks(
  params: AutomationTaskQueryParams = {}
): Promise<AutomationTask[]> {
  await delay(220)
  let list = [...AUTOMATION_TASKS]
  if (params.patientId) list = list.filter((item) => item.patientId.includes(params.patientId!))
  if (params.type) list = list.filter((item) => item.type === params.type)
  if (params.timeRange?.length === 2)
    list = list.filter((item) => {
      const date = item.triggeredAt.slice(0, 10)
      return date >= params.timeRange![0] && date <= params.timeRange![1]
    })
  if (params.status) list = list.filter((item) => item.status === params.status)
  return list.map((item) => ({ ...item, inputs: [...item.inputs] }))
}

/** 医生确认重新评估：待补资料 / 执行失败 → 执行中，同一来源记录版本不重复调用 [批注 09] */
export async function fetchRerunAutomationTask(
  id: string,
  operator: string
): Promise<AutomationTask> {
  await delay(260)
  const item = AUTOMATION_TASKS.find((row) => row.id === id)
  if (!item) throw new Error('执行记录不存在')
  if (item.status === '执行成功' || item.status === '执行中') {
    throw new Error('该任务已成功或正在执行，无需重新评估')
  }
  item.status = '执行中'
  item.note = ''
  item.relatedResult = `${item.relatedResult}；医生已确认重新评估`
  appendSystemLog({
    category: '重要数据',
    action: '确认重新评估（执行记录）',
    operator,
    role: 'R_DOCTOR',
    scope: '状态管理',
    objectType: '执行记录',
    objectId: id,
    target: item.patientId,
    detail: `来源记录：${item.sourceRecord}；同一来源记录版本不重复调用`
  })
  return { ...item, inputs: [...item.inputs] }
}

/** 补充资料：待补资料 → 执行中（前端同时跳原检查或患者记录）[批注 09] */
export async function fetchSupplementAutomationTask(id: string): Promise<AutomationTask> {
  await delay(200)
  const item = AUTOMATION_TASKS.find((row) => row.id === id)
  if (!item) throw new Error('执行记录不存在')
  if (item.status !== '待补资料') throw new Error('仅待补资料任务可补充')
  item.status = '执行中'
  item.note = '资料已补充，重新进入执行队列'
  return { ...item, inputs: [...item.inputs] }
}

/* ------------------------------ 管理端：中心 / 课题组 ------------------------------ */

/** 组织保存参数（中心 / 课题组共用） */
export type OrgPayload = Pick<OrgItem, 'name' | 'leader' | 'parent' | 'status'> & {
  id?: string
}

/** 中心列表（平台管理端） */
export async function fetchGetCenters(): Promise<OrgItem[]> {
  await delay(180)
  return [...CENTERS_DATA]
}

/** 新增 / 编辑中心（平台管理端，可删除） */
export async function fetchSaveCenter(payload: OrgPayload): Promise<void> {
  await delay(300)
  const index = CENTERS_DATA.findIndex((item) => item.id === payload.id)
  if (index > -1) {
    CENTERS_DATA[index] = { ...CENTERS_DATA[index], ...payload }
    return
  }
  CENTERS_DATA.push({
    id: `C-${String(CENTERS_DATA.length + 1).padStart(3, '0')}`,
    name: payload.name,
    leader: payload.leader,
    parent: payload.parent || 'DLI 智能管理平台',
    members: 0,
    status: payload.status,
    createdAt: new Date().toISOString().slice(0, 10)
  })
}

/** 删除中心（平台管理端） */
export async function fetchDeleteCenter(id: string): Promise<void> {
  await delay(250)
  const index = CENTERS_DATA.findIndex((item) => item.id === id)
  if (index > -1) CENTERS_DATA.splice(index, 1)
}

/** 课题组列表（中心管理端） */
export async function fetchGetGroups(): Promise<OrgItem[]> {
  await delay(180)
  return [...GROUPS_DATA]
}

/** 新增 / 编辑课题组（中心管理端，不可删除） */
export async function fetchSaveGroup(payload: OrgPayload): Promise<void> {
  await delay(300)
  const index = GROUPS_DATA.findIndex((item) => item.id === payload.id)
  if (index > -1) {
    GROUPS_DATA[index] = { ...GROUPS_DATA[index], ...payload }
    return
  }
  GROUPS_DATA.push({
    id: `G-${String(GROUPS_DATA.length + 1).padStart(3, '0')}`,
    name: payload.name,
    leader: payload.leader,
    parent: payload.parent || '华东中心',
    members: 0,
    status: payload.status,
    createdAt: new Date().toISOString().slice(0, 10)
  })
}

/* ------------------------------ 管理端：平台 / 系统 ------------------------------ */

/** 平台列表（系统管理端） */
export async function fetchGetPlatforms(): Promise<PlatformItem[]> {
  await delay(180)
  return [...PLATFORMS_DATA]
}

/** 暂停 / 恢复平台服务（系统管理端） */
export async function fetchTogglePlatformService(
  id: string,
  status: PlatformItem['status']
): Promise<void> {
  await delay(250)
  const platform = PLATFORMS_DATA.find((item) => item.id === id)
  if (platform) platform.status = status
}

/** 保存基础配置（平台 / 系统管理端，演示） */
export async function fetchSaveBaseConfig(payload: Record<string, unknown>): Promise<void> {
  await delay(300)
  void payload
}

/* ------------------------------ 管理端：用户 ------------------------------ */

/** 用户列表查询参数 */
export interface UserQueryParams {
  current?: number
  size?: number
  keyword?: string
  type?: UserType | ''
  /** 当前管理端可管理的用户类型 */
  types?: UserType[]
}

/** 管理端用户列表 */
export async function fetchGetUserList(
  params: UserQueryParams
): Promise<Api.Common.PaginatedResponse<WebUserItem>> {
  await delay()
  let list = [...USERS_DATA]
  if (params.types?.length) list = list.filter((item) => params.types!.includes(item.type))
  if (params.type) list = list.filter((item) => item.type === params.type)
  if (params.keyword) {
    const keyword = params.keyword.trim()
    list = list.filter(
      (item) =>
        item.name.includes(keyword) || item.phone.includes(keyword) || item.org.includes(keyword)
    )
  }
  return paginate(list, params.current, params.size)
}

/** 新增用户 [批注 19] */
export async function fetchAddUser(payload: Omit<WebUserItem, 'id' | 'createdAt'>): Promise<void> {
  await delay(300)
  USERS_DATA.push({
    ...payload,
    id: `MU-${9000 + USERS_DATA.length}`,
    createdAt: new Date().toISOString().slice(0, 10)
  })
  appendSystemLog({
    category: '权限变更',
    action: '新增用户',
    operator: '当前管理员',
    role: 'R_PLATFORM',
    scope: '全平台',
    objectType: '用户账号',
    objectId: payload.phone,
    target: `${payload.type} ${payload.phone}`,
    detail: '新增账号，待激活后可登录'
  })
}

/** 启用 / 停用用户：停用终止会话并保留历史 [批注 19] */
export async function fetchToggleUser(id: string, status: WebUserItem['status']): Promise<void> {
  await delay(200)
  const user = USERS_DATA.find((item) => item.id === id)
  if (user) {
    user.status = status
    appendSystemLog({
      category: '权限变更',
      action: status === '已停用' ? '停用用户账号' : '启用用户账号',
      operator: '当前管理员',
      role: 'R_PLATFORM',
      scope: '全平台',
      objectType: '用户账号',
      objectId: user.id,
      target: `${user.type} ${user.id}`,
      detail: status === '已停用' ? '停用终止会话并保留历史，接口执行同样权限' : '账号恢复登录'
    })
  }
}

/** 删除用户（仅平台管理端可调用）[批注 19] */
export async function fetchDeleteUser(id: string): Promise<void> {
  await delay(250)
  const index = USERS_DATA.findIndex((item) => item.id === id)
  if (index > -1) {
    const [removed] = USERS_DATA.splice(index, 1)
    appendSystemLog({
      category: '权限变更',
      action: '删除用户账号',
      operator: '当前管理员',
      role: 'R_PLATFORM',
      scope: '全平台',
      objectType: '用户账号',
      objectId: id,
      target: `${removed.type} ${id}`,
      detail: '有业务记录的账号以停用保留关联，删除仅限无业务记录账号'
    })
  }
}

/* ------------------------------ 管理端：课题组医生 ------------------------------ */

/** 课题组医生列表 */
export async function fetchGetGroupDoctors(params: {
  current?: number
  size?: number
  keyword?: string
}): Promise<Api.Common.PaginatedResponse<GroupDoctor>> {
  await delay()
  let list = [...GROUP_DOCTORS]
  if (params.keyword) {
    const keyword = params.keyword.trim()
    list = list.filter((item) => item.name.includes(keyword) || item.org.includes(keyword))
  }
  return paginate(list, params.current, params.size)
}

/** 启停课题组医生 */
export async function fetchToggleGroupDoctor(
  id: string,
  status: GroupDoctor['status']
): Promise<void> {
  await delay(200)
  const doctor = GROUP_DOCTORS.find((item) => item.id === id)
  if (doctor) doctor.status = status
}

/** 新增课题组医生 */
export async function fetchAddGroupDoctor(
  payload: Pick<GroupDoctor, 'name' | 'title' | 'org'>
): Promise<void> {
  await delay(300)
  const nextId =
    GROUP_DOCTORS.reduce((max, item) => Math.max(max, Number(item.id.split('-')[1]) || 0), 0) + 1
  GROUP_DOCTORS.unshift({
    ...payload,
    id: `GD-${String(nextId).padStart(3, '0')}`,
    patients: 0,
    status: '在职'
  })
}
