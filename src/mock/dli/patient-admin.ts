/**
 * 患者管理 V2 [批注 01-04] - 扩展档案、研究入组、导入导出
 *
 * 设计取舍：PATIENTS 基础结构保持不变（检查管理 / 评估预警 / 样本检测均依赖它），
 * 新增字段统一放在按患者编号关联的 PROFILES 内存表中，刷新与其他 mock 一样复位。
 * 所有页面读写同一份数据，避免组件实例内状态各自隔离。
 */
import { PATIENTS, PATIENT_DETAILS, RESEARCHES } from './data'
import {
  ASSESSMENT_REPORTS,
  RESEARCH_CRITERIA_LISTS,
  appendSystemLog,
  getEffectiveConsentTemplate,
  getEffectiveConsentTemplates,
  getEffectiveCriteriaVersion
} from './blueprint/data'
import type {
  ConsentSignMethod,
  ConsentStatus,
  CriteriaStatus,
  CriterionCheck,
  EnrollCriterion,
  EnrollStatus,
  InitialEntry,
  PatientEnrollment,
  PatientProfile,
  PatientRow,
  PatientStage,
  ResearchProject,
  WarnLevel,
  WebPatient
} from './types'

const delay = (ms = 180) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const today = () => new Date().toISOString().slice(0, 10)

export const INITIAL_ENTRY_OPTIONS: InitialEntry[] = [
  '拟接受高危药物治疗',
  '正在接受高危药物治疗',
  '已确诊DLI'
]
export const STAGE_OPTIONS: PatientStage[] = ['治疗前', '治疗中', '诊断后']
export const ENROLL_STATUS_OPTIONS: EnrollStatus[] = [
  '未申请',
  '待核对',
  '待确认',
  '已入组',
  '不符合',
  '已退出'
]
export const MANAGE_STATUS_OPTIONS: Array<WebPatient['status']> = [
  '待评估',
  '用药中',
  '随访中',
  '已结案'
]
export const CENTER_OPTIONS = ['华东中心', '华北中心', '华南中心', '西南中心']
export const DOCTOR_OPTIONS = ['陈明远', '周雅琴', '刘志远', '孙可欣']

/**
 * 研究项目主数据：直接复用研究管理列表 RESEARCHES，编号与项目详情、入组清单完全同源。
 * 医生在「研究资料 → 入组清单」确认新版本后，患者详情申请入组即取该生效版本。[批注 03/15]
 */
export const PROJECTS: ResearchProject[] = RESEARCHES.map((item) => {
  const isAiControlled = item.groupBy.some((group) => group.includes('AI'))
  return {
    id: item.id,
    name: item.name,
    groups: isAiControlled ? ['AI辅助诊疗组', '常规诊疗组'] : ['观察组', '对照组'],
    criteriaVersion: getEffectiveCriteriaVersion(item.id)
  }
})

export function findProject(id: string): ResearchProject | undefined {
  return PROJECTS.find((item) => item.id === id)
}

/** 入组条件清单 [批注 03/15]：按项目 + 版本，纳入 / 排除分开 */
function makeCriteria(projectId: string, version: string): EnrollCriterion[] {
  return [
    {
      id: `${projectId}-${version}-I1`,
      projectId,
      version,
      type: '纳入条件',
      content: '年龄 ≥ 18 岁，已完成建档并可按方案随访',
      basis: '基础资料 / 随访记录',
      required: true
    },
    {
      id: `${projectId}-${version}-I2`,
      projectId,
      version,
      type: '纳入条件',
      content: '基线肝功能、血常规等必需检查资料完整且已核对归档',
      basis: '检验报告 / 检查资料',
      required: true
    },
    {
      id: `${projectId}-${version}-I3`,
      projectId,
      version,
      type: '纳入条件',
      content: '拟接受或正在接受方案规定的高危药物治疗',
      basis: '用药记录 / 诊疗历程',
      required: true
    },
    {
      id: `${projectId}-${version}-E1`,
      projectId,
      version,
      type: '排除条件',
      content: '既往确诊药物性肝损伤且病情尚未稳定',
      basis: '既往史 / 诊断资料',
      required: false
    },
    {
      id: `${projectId}-${version}-E2`,
      projectId,
      version,
      type: '排除条件',
      content: '妊娠期，或合并严重肝肾功能不全',
      basis: '检验报告 / 病历',
      required: false
    }
  ]
}

type CriteriaListRecord = (typeof RESEARCH_CRITERIA_LISTS)[number]

function criteriaFromList(list: CriteriaListRecord): EnrollCriterion[] {
  return list.items.map((item) => ({
    id: item.id,
    projectId: list.projectId,
    version: list.version,
    type: item.type,
    content: item.content,
    basis: item.basis,
    required: item.type === '纳入条件'
  }))
}

/** 已完成核对保留当时版本：传 version 时优先返回该版本，不传则取医生确认的生效版本 */
function getCriteriaItems(projectId: string, version?: string): EnrollCriterion[] {
  const effectiveVersion = getEffectiveCriteriaVersion(projectId)
  const targetVersion = version || effectiveVersion
  const list = RESEARCH_CRITERIA_LISTS.find(
    (item) => item.projectId === projectId && item.version === targetVersion
  )
  return list ? criteriaFromList(list) : makeCriteria(projectId, targetVersion)
}

export const ENROLL_CRITERIA: EnrollCriterion[] = RESEARCH_CRITERIA_LISTS.flatMap(criteriaFromList)

/* ------------------------------ 扩展档案 ------------------------------ */

const PROFILES = new Map<string, PatientProfile>()

function legacyGroupLabel(group: WebPatient['group']): string {
  return group === 'AI 组' ? 'AI辅助诊疗组' : '常规诊疗组'
}

/** 演示数据按批注 16 覆盖七态，方便在患者详情验证发放 / 核对 / 拒绝 / 撤回全链路 */
const CONSENT_DEMO_CYCLE: ConsentStatus[] = [
  '核对通过',
  '已签待核对',
  '需补充',
  '已拒绝',
  '撤回处理中',
  '已撤回',
  '待签署'
]
const CONSENT_SIGNED_STATES: ConsentStatus[] = [
  '核对通过',
  '已签待核对',
  '需补充',
  '撤回处理中',
  '已撤回'
]

/** 按入组状态给出可演示的同意书状态，已入组不允许出现「未核对通过」的早期态 */
function demoConsentStatus(status: EnrollStatus, seed: number): ConsentStatus {
  if (status === '待核对') return '未发放'
  if (status === '不符合') {
    return (['待签署', '已拒绝', '未发放'] as ConsentStatus[])[seed % 3]
  }
  if (status === '已入组') {
    return (['核对通过', '核对通过', '核对通过', '撤回处理中', '已撤回'] as ConsentStatus[])[
      seed % 5
    ]
  }
  return CONSENT_DEMO_CYCLE[seed % CONSENT_DEMO_CYCLE.length]
}

function buildDefaultEnrollments(patient: WebPatient, index: number): PatientEnrollment[] {
  if (index % 6 === 0) return []
  const count = index % 5 === 0 ? 3 : 2
  const variants: EnrollStatus[] = ['待核对', '待确认', '不符合', '已退出', '已入组', '待核对']
  const list: PatientEnrollment[] = []
  for (let i = 0; i < count; i += 1) {
    const project = PROJECTS[i % PROJECTS.length]
    const status: EnrollStatus =
      i === 0 ? (patient.enrolled ? '已入组' : '待核对') : variants[(index + i) % variants.length]
    const passed = status === '已入组' || status === '待确认' || status === '已退出'
    const criteriaStatus: CriteriaStatus = passed
      ? '符合'
      : status === '不符合'
        ? '不符合'
        : '待核对'
    const consentStatus = demoConsentStatus(status, index + i)
    const notIssued = consentStatus === '未发放'
    const hasSigned = CONSENT_SIGNED_STATES.includes(consentStatus)
    const criteria = getCriteriaItems(project.id, project.criteriaVersion)
    const checks: CriterionCheck[] = passed
      ? criteria.map((item) => ({
          criterionId: item.id,
          met: item.type === '排除条件' ? '否' : '是',
          note: '按已核对资料复核'
        }))
      : status === '不符合'
        ? criteria.map((item, position) => ({
            criterionId: item.id,
            met: position === 1 ? '否' : '是',
            note: position === 1 ? '基线资料缺失，待补充' : ''
          }))
        : []
    const template = getEffectiveConsentTemplate(project.id, patient.center)
    list.push({
      id: `EN-${String(index + 1).padStart(4, '0')}-${i + 1}`,
      patientId: patient.id,
      projectId: project.id,
      criteriaStatus,
      criteriaVersion: getEffectiveCriteriaVersion(project.id),
      checks,
      consentStatus,
      consentTemplateId: notIssued ? '' : (template?.id ?? ''),
      consentTemplateName: notIssued ? '' : (template?.name ?? ''),
      consentVersion: notIssued ? '' : (template?.version ?? ''),
      consentIssuedAt: notIssued ? '' : patient.enrollDate,
      consentDate: hasSigned ? patient.enrollDate : '',
      consentMethod: hasSigned ? 'App签署' : '',
      consentFileName: hasSigned ? '已签署文件（演示）' : '',
      consentCheckedBy: consentStatus === '核对通过' ? '医生' : '',
      consentCheckedAt: consentStatus === '核对通过' ? patient.enrollDate : '',
      consentCheckResult:
        consentStatus === '核对通过' ? '通过' : consentStatus === '需补充' ? '需补充' : undefined,
      consentNote:
        consentStatus === '需补充'
          ? '签署件缺页，请补充后重新上传'
          : consentStatus === '已拒绝'
            ? '受试者拒绝签署'
            : '',
      consentWithdrawReason: ['撤回处理中', '已撤回'].includes(consentStatus)
        ? '受试者申请撤回同意'
        : '',
      status,
      group: i === 0 && patient.enrolled ? legacyGroupLabel(patient.group) : '',
      researchNo: i === 0 && patient.enrolled ? patient.researchNo : '',
      enrollDate: i === 0 && patient.enrolled ? patient.enrollDate : '',
      groupDate: '',
      groupBasis: '',
      exitDate: status === '已退出' ? '2026-10-18' : '',
      exitReason: status === '已退出' ? '受试者主动撤回同意' : '',
      rejectReason: status === '不符合' ? '基线检查资料缺失' : '',
      updatedAt: patient.lastUpdate
    })
  }
  return list
}

function defaultProfile(patient: WebPatient, index: number): PatientProfile {
  const initialEntry: InitialEntry =
    patient.enrollEntry === '已确诊 DLI'
      ? '已确诊DLI'
      : index % 3 === 0
        ? '正在接受高危药物治疗'
        : '拟接受高危药物治疗'
  const stage: PatientStage =
    patient.status === '待评估' ? '治疗前' : patient.status === '用药中' ? '治疗中' : '诊断后'
  const diagnosisConfirmed = initialEntry === '已确诊DLI' && stage === '诊断后' && index % 5 !== 2
  return {
    patientId: patient.id,
    initialEntry,
    stage,
    stageConfirmed: index % 7 !== 3,
    diagnosisConfirmed,
    diagnosisDate: initialEntry === '已确诊DLI' ? patient.enrollDate : '',
    diagnosisBasis: initialEntry === '已确诊DLI' ? '影像学及实验室检查综合判定，详见检查资料' : '',
    stageUpdatedAt: patient.lastUpdate,
    stageNote: '',
    enrollments: buildDefaultEnrollments(patient, index)
  }
}

export function getProfile(patientId: string): PatientProfile {
  let profile = PROFILES.get(patientId)
  if (!profile) {
    const index = PATIENTS.findIndex((item) => item.id === patientId)
    const patient = PATIENTS[index]
    if (!patient) throw new Error('患者档案不存在')
    profile = defaultProfile(patient, index < 0 ? 0 : index)
    PROFILES.set(patientId, profile)
  }
  return profile
}

export async function fetchGetPatientProfile(patientId: string): Promise<PatientProfile> {
  await delay()
  return structuredClone(getProfile(patientId))
}

/** 是否存在诊断后辅助评估报告（阶段区「查看诊断后评估」用） */
export function hasDiagnosisReport(patientId: string): boolean {
  return ASSESSMENT_REPORTS.some(
    (item) => item.patientId === patientId && item.category === '诊断后辅助评估'
  )
}

/* ------------------------------ 列表查询 ------------------------------ */

export interface PatientRowQuery {
  current?: number
  size?: number
  keyword?: string
  status?: WebPatient['status'] | ''
  warnLevel?: WarnLevel | ''
  initialEntry?: InitialEntry | ''
  stage?: PatientStage | ''
  projectId?: string
  enrollStatus?: EnrollStatus | ''
  researchGroup?: string
}

function filterPatients(params: PatientRowQuery): WebPatient[] {
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
  if (params.initialEntry) {
    list = list.filter((item) => getProfile(item.id).initialEntry === params.initialEntry)
  }
  if (params.stage) list = list.filter((item) => getProfile(item.id).stage === params.stage)
  if (params.projectId) {
    list = list.filter((item) =>
      getProfile(item.id).enrollments.some((row) => row.projectId === params.projectId)
    )
    if (params.enrollStatus) {
      list = list.filter((item) =>
        getProfile(item.id).enrollments.some(
          (row) => row.projectId === params.projectId && row.status === params.enrollStatus
        )
      )
    }
    if (params.researchGroup) {
      list = list.filter((item) =>
        getProfile(item.id).enrollments.some(
          (row) => row.projectId === params.projectId && row.group === params.researchGroup
        )
      )
    }
  }
  return list
}

function toRow(patient: WebPatient, projectId: string): PatientRow {
  const profile = getProfile(patient.id)
  const enrollment = projectId
    ? profile.enrollments.find((item) => item.projectId === projectId)
    : undefined
  return {
    ...patient,
    initialEntry: profile.initialEntry,
    stage: profile.stage,
    stageConfirmed: profile.stageConfirmed,
    projectCount: profile.enrollments.length,
    projectSelected: Boolean(projectId),
    selectedProjectName: findProject(projectId)?.name ?? '',
    selectedEnrollStatus: enrollment?.status ?? '未申请',
    selectedGroup: enrollment?.group ?? '',
    selectedResearchNo: enrollment?.researchNo ?? ''
  }
}

export async function fetchGetPatientRows(
  params: PatientRowQuery
): Promise<Api.Common.PaginatedResponse<PatientRow>> {
  await delay()
  const list = filterPatients(params).map((item) => toRow(item, params.projectId ?? ''))
  const current = params.current ?? 1
  const size = params.size ?? 10
  return {
    records: list.slice((current - 1) * size, current * size),
    current,
    size,
    total: list.length
  }
}

/** 按当前筛选结果统计导出条数（跨页总数） */
export async function fetchGetExportCount(
  params: PatientRowQuery,
  /** 勾选导出：仅统计已勾选的患者编号 [批注 04] */
  selectedIds: string[] = []
): Promise<number> {
  await delay(80)
  const list = filterPatients(params)
  if (!selectedIds.length) return list.length
  const idSet = new Set(selectedIds)
  return list.filter((patient) => idSet.has(patient.id)).length
}

/* ------------------------------ 建档 / 编辑 / 阶段 ------------------------------ */

export interface ArchiveInput {
  center: string
  doctor: string
  manageStatus: WebPatient['status']
  initialEntry: InitialEntry
  stage: PatientStage
  diagnosisDate: string
  diagnosisBasis: string
}

function assertArchive(input: ArchiveInput): void {
  if (!input.center.trim()) throw new Error('所属中心不能为空')
  if (!input.doctor.trim()) throw new Error('负责医生不能为空')
  if (!INITIAL_ENTRY_OPTIONS.includes(input.initialEntry)) throw new Error('初始入口无效')
  if (!STAGE_OPTIONS.includes(input.stage)) throw new Error('当前阶段无效')
  if (!MANAGE_STATUS_OPTIONS.includes(input.manageStatus)) throw new Error('管理状态无效')
}

function nextPatientId(): string {
  let seq = PATIENTS.length + 1
  while (PATIENTS.some((item) => item.id === `DLI-2026-${String(seq).padStart(4, '0')}`)) {
    seq += 1
  }
  return `DLI-2026-${String(seq).padStart(4, '0')}`
}

function attachEmptyDetail(patient: WebPatient): void {
  PATIENT_DETAILS[patient.id] = {
    ...patient,
    phone: '',
    chiefComplaint: '',
    medication: [],
    conversations: [],
    history: []
  }
}

function appendHistory(
  patientId: string,
  category: '诊断' | '随访' | '检查',
  title: string,
  detail: string
) {
  const detailRecord = PATIENT_DETAILS[patientId]
  if (!detailRecord) return
  detailRecord.history.unshift({
    id: `HE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: today(),
    category,
    title,
    detail
  })
}

export async function fetchCreatePatientV2(input: ArchiveInput): Promise<WebPatient> {
  await delay()
  assertArchive(input)
  const patient: WebPatient = {
    id: nextPatientId(),
    name: '',
    gender: '男',
    age: 0,
    center: input.center,
    group: 'AI 组',
    status: input.manageStatus,
    earlyScreen: { level: 'none', score: 0 },
    earlyDiagnosis: { level: 'none', score: 0 },
    outcome: { window: '3个月', probability: 0, label: '待评估' },
    lastUpdate: today(),
    doctor: input.doctor,
    researchNo: '',
    enrollEntry: '',
    enrollDate: '',
    enrolled: false,
    consent: { signed: false, version: '', date: '' },
    safetyEvents: []
  }
  PATIENTS.unshift(patient)
  attachEmptyDetail(patient)
  PROFILES.set(patient.id, {
    patientId: patient.id,
    initialEntry: input.initialEntry,
    stage: input.stage,
    stageConfirmed: false,
    diagnosisConfirmed: false,
    diagnosisDate: input.diagnosisDate,
    diagnosisBasis: input.diagnosisBasis,
    stageUpdatedAt: today(),
    stageNote: '',
    enrollments: []
  })
  return patient
}

export async function fetchUpdatePatientBasic(
  patientId: string,
  input: ArchiveInput
): Promise<PatientProfile> {
  await delay()
  assertArchive(input)
  const patient = PATIENTS.find((item) => item.id === patientId)
  if (!patient) throw new Error('患者档案不存在')
  patient.center = input.center
  patient.doctor = input.doctor
  patient.status = input.manageStatus
  patient.lastUpdate = today()
  const profile = getProfile(patientId)
  profile.initialEntry = input.initialEntry
  profile.diagnosisDate = input.diagnosisDate
  profile.diagnosisBasis = input.diagnosisBasis
  return structuredClone(profile)
}

export interface StageUpdateInput {
  stage: PatientStage
  effectiveAt: string
  note: string
}

/** 更新阶段：仅医生可确认；写入诊疗历程，保留初始入口 [批注 02] */
export async function fetchUpdatePatientStage(
  patientId: string,
  input: StageUpdateInput,
  role: string
): Promise<PatientProfile> {
  await delay()
  if (role !== 'R_DOCTOR') throw new Error('仅医生可确认阶段调整')
  if (!STAGE_OPTIONS.includes(input.stage)) throw new Error('调整后阶段无效')
  if (!input.effectiveAt.trim()) throw new Error('阶段生效时间不能为空')
  if (!input.note.trim()) throw new Error('调整说明不能为空')
  const profile = getProfile(patientId)
  profile.stage = input.stage
  profile.stageConfirmed = true
  profile.stageUpdatedAt = input.effectiveAt
  profile.stageNote = input.note
  if (input.stage === '诊断后') profile.diagnosisConfirmed = true
  appendHistory(
    patientId,
    '诊断',
    `阶段更新为${input.stage}`,
    `生效时间 ${input.effectiveAt}；${input.note}；初始入口保持不变：${profile.initialEntry}`
  )
  return structuredClone(profile)
}

/** 医生确认诊断结论（助理 / 护士录入的「已确诊」不自动成为已确认结论） */
export async function fetchConfirmDiagnosis(
  patientId: string,
  role: string
): Promise<PatientProfile> {
  await delay()
  if (role !== 'R_DOCTOR') throw new Error('仅医生可确认诊断')
  const profile = getProfile(patientId)
  if (profile.initialEntry !== '已确诊DLI') throw new Error('初始入口不是已确诊DLI')
  profile.diagnosisConfirmed = true
  profile.stageConfirmed = true
  appendHistory(patientId, '诊断', '医生确认诊断', `诊断日期 ${profile.diagnosisDate || today()}`)
  return structuredClone(profile)
}

/* ------------------------------ 研究入组 [批注 03] ------------------------------ */

function requireEnrollment(patientId: string, enrollmentId: string): PatientEnrollment {
  const enrollment = getProfile(patientId).enrollments.find((item) => item.id === enrollmentId)
  if (!enrollment) throw new Error('项目入组记录不存在')
  return enrollment
}

export async function fetchGetEnrollments(patientId: string): Promise<PatientEnrollment[]> {
  await delay()
  return structuredClone(getProfile(patientId).enrollments)
}

export async function fetchGetEnrollCriteria(
  projectId: string,
  version?: string
): Promise<EnrollCriterion[]> {
  await delay(60)
  return getCriteriaItems(projectId, version)
}

/** 申请入组：只增加一条待核对记录，不等于入组 */
export async function fetchApplyEnrollment(
  patientId: string,
  projectId: string,
  role: string
): Promise<PatientEnrollment> {
  await delay()
  if (!['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role)) {
    throw new Error('临床角色才可申请入组')
  }
  const project = findProject(projectId)
  if (!project) throw new Error('研究项目不存在')
  const profile = getProfile(patientId)
  if (profile.enrollments.some((item) => item.projectId === projectId)) {
    throw new Error('该项目已有入组记录，请勿重复申请')
  }
  const enrollment: PatientEnrollment = {
    id: `EN-${patientId.slice(-4)}-${Date.now()}`,
    patientId,
    projectId,
    criteriaStatus: '待核对',
    criteriaVersion: getEffectiveCriteriaVersion(projectId),
    checks: [],
    consentStatus: '未发放',
    consentTemplateId: '',
    consentTemplateName: '',
    consentVersion: '',
    consentIssuedAt: '',
    consentDate: '',
    consentMethod: '',
    consentFileName: '',
    consentNote: '',
    consentCheckedBy: '',
    consentCheckedAt: '',
    consentWithdrawReason: '',
    status: '待核对',
    group: '',
    researchNo: '',
    enrollDate: '',
    groupDate: '',
    groupBasis: '',
    exitDate: '',
    exitReason: '',
    rejectReason: '',
    updatedAt: today()
  }
  profile.enrollments.push(enrollment)
  return structuredClone(enrollment)
}

/** 保存条件核对：助理 / 护士填表，医生最终复核；不直接完成入组 */
export async function fetchSaveCriteriaCheck(
  patientId: string,
  enrollmentId: string,
  checks: CriterionCheck[],
  role: string
): Promise<PatientEnrollment> {
  await delay()
  if (!['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role)) {
    throw new Error('临床角色才可核对条件')
  }
  const enrollment = requireEnrollment(patientId, enrollmentId)
  if (['已入组', '已退出'].includes(enrollment.status)) {
    throw new Error('当前状态不允许修改核对结果')
  }
  const criteria = getCriteriaItems(enrollment.projectId, enrollment.criteriaVersion)
  const missing = criteria.filter((item) => !checks.some((check) => check.criterionId === item.id))
  if (missing.length) throw new Error('存在未核对的条件，请逐条填写')
  const pending = checks.filter((item) => item.met === '待确认')
  const unmetRequired = criteria.filter(
    (item) => item.required && checks.find((check) => check.criterionId === item.id)?.met !== '是'
  )
  const excluded = criteria.filter(
    (item) =>
      item.type === '排除条件' &&
      checks.find((check) => check.criterionId === item.id)?.met === '是'
  )
  enrollment.checks = structuredClone(checks)
  enrollment.updatedAt = today()
  if (pending.length) {
    enrollment.criteriaStatus = '待核对'
    enrollment.rejectReason = `有 ${pending.length} 条条件待确认，缺资料保持待核对`
  } else if (unmetRequired.length || excluded.length) {
    enrollment.criteriaStatus = '不符合'
    enrollment.status = '不符合'
    enrollment.rejectReason = [
      ...unmetRequired.map((item) => `必需纳入条件未满足：${item.content}`),
      ...excluded.map((item) => `触发排除条件：${item.content}`)
    ].join('；')
  } else {
    enrollment.criteriaStatus = '符合'
    enrollment.rejectReason = ''
    enrollment.status = enrollment.consentStatus === '核对通过' ? '待确认' : '待核对'
  }
  return structuredClone(enrollment)
}

/** 知情同意动作 [批注 16]：发放、签署、核对、拒绝、撤回 */
export type ConsentAction = '发放' | '签署' | '核对' | '拒绝' | '申请撤回' | '完成撤回'

export interface ConsentActionInput {
  templateId?: string
  signDate?: string
  method?: ConsentSignMethod
  fileName?: string
  note?: string
  reason?: string
  result?: '通过' | '需补充'
}

/** 知情同意：未发放 → 待签署 → 已签待核对 → 核对通过；支持需补充 / 已拒绝 / 撤回 */
export async function fetchSetConsent(
  patientId: string,
  enrollmentId: string,
  action: ConsentAction,
  role: string,
  input: ConsentActionInput = {}
): Promise<PatientEnrollment> {
  await delay()
  if (!['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role)) {
    throw new Error('临床角色才可办理知情同意')
  }
  if (action === '完成撤回' && role !== 'R_DOCTOR') {
    throw new Error('仅医生可完成撤回处理')
  }
  const enrollment = requireEnrollment(patientId, enrollmentId)
  const patient = PATIENTS.find((item) => item.id === patientId)
  const center = patient?.center ?? ''
  /** 发放只认当前项目 + 患者所属中心的生效版本（已发布且已批准）[批注 16] */
  const effectiveTemplates = getEffectiveConsentTemplates(enrollment.projectId, center)
  const template = input.templateId
    ? effectiveTemplates.find((item) => item.id === input.templateId)
    : (effectiveTemplates[0] ?? getEffectiveConsentTemplate(enrollment.projectId, center))
  const defaultMethod: ConsentSignMethod = 'App签署'

  if (action === '发放') {
    if (!['未发放', '需补充', '已拒绝'].includes(enrollment.consentStatus)) {
      throw new Error('当前状态不可发放同意书')
    }
    if (!effectiveTemplates.length) {
      throw new Error('该项目暂无生效模板，请先由平台管理员批准并发布')
    }
    if (!template) {
      throw new Error('所选模板不是该研究项目与中心的生效版本，请重新选择')
    }
    enrollment.consentStatus = '待签署'
    enrollment.consentTemplateId = template.id
    enrollment.consentTemplateName = template.name
    enrollment.consentVersion = template.version
    enrollment.consentIssuedAt = today()
    enrollment.consentDate = ''
    enrollment.consentMethod = ''
    enrollment.consentFileName = ''
    enrollment.consentNote = ''
    enrollment.consentCheckResult = undefined
    enrollment.consentWithdrawReason = ''
  } else if (action === '签署') {
    if (!['待签署', '需补充'].includes(enrollment.consentStatus)) {
      throw new Error('请先发放同意书或等待补充资料')
    }
    if (!input.signDate?.trim() || !input.fileName?.trim()) {
      throw new Error('签署日期与签署文件不能为空')
    }
    enrollment.consentStatus = '已签待核对'
    enrollment.consentDate = input.signDate
    enrollment.consentMethod = input.method || defaultMethod
    enrollment.consentFileName = input.fileName
    enrollment.consentNote = input.note ?? ''
  } else if (action === '核对') {
    if (enrollment.consentStatus !== '已签待核对') {
      throw new Error('当前没有待核对的签署记录')
    }
    if (input.result === '需补充') {
      if (!input.note?.trim()) throw new Error('需补充时必须填写核对意见')
      enrollment.consentStatus = '需补充'
      enrollment.consentNote = input.note
      enrollment.consentCheckResult = '需补充'
      if (enrollment.status === '待确认') enrollment.status = '待核对'
    } else {
      enrollment.consentStatus = '核对通过'
      enrollment.consentNote = input.note ?? ''
      enrollment.consentCheckResult = '通过'
      enrollment.consentCheckedBy = role === 'R_DOCTOR' ? '医生' : '医护'
      enrollment.consentCheckedAt = today()
      if (enrollment.criteriaStatus === '符合' && enrollment.status === '待核对') {
        enrollment.status = '待确认'
      }
    }
  } else if (action === '拒绝') {
    if (!['待签署', '已签待核对', '需补充'].includes(enrollment.consentStatus)) {
      throw new Error('当前状态不可登记拒绝')
    }
    enrollment.consentStatus = '已拒绝'
    enrollment.consentNote = input.note ?? '受试者拒绝签署'
    if (enrollment.status === '待确认') enrollment.status = '待核对'
  } else if (action === '申请撤回') {
    if (!['核对通过', '已签待核对'].includes(enrollment.consentStatus)) {
      throw new Error('仅已签署记录可申请撤回')
    }
    if (!input.reason?.trim()) throw new Error('撤回原因不能为空')
    enrollment.consentStatus = '撤回处理中'
    enrollment.consentWithdrawReason = input.reason
    if (enrollment.status === '待确认') enrollment.status = '待核对'
  } else {
    if (enrollment.consentStatus !== '撤回处理中') {
      throw new Error('当前没有待处理的撤回申请')
    }
    enrollment.consentStatus = '已撤回'
    enrollment.consentNote = input.note ?? '医生已完成撤回处理并记录结果'
    enrollment.consentCheckedBy = '医生'
    enrollment.consentCheckedAt = today()
    if (enrollment.status === '待确认') enrollment.status = '待核对'
  }

  enrollment.updatedAt = today()
  appendSystemLog({
    category: '重要数据',
    action: `知情同意${action}`,
    operator: role,
    role,
    scope: '患者知情同意',
    target: `${patientId} / ${enrollment.projectId}`,
    detail: `${enrollment.consentStatus} · 模板版本 ${enrollment.consentVersion || '—'}${
      action === '发放' ? ' · 已通知患者待签' : ''
    }`
  })
  return structuredClone(enrollment)
}

/** 确认入组：仅医生，条件与同意书均通过才可用 */
export async function fetchConfirmEnrollmentV2(
  patientId: string,
  enrollmentId: string,
  role: string
): Promise<PatientEnrollment> {
  await delay()
  if (role !== 'R_DOCTOR') throw new Error('仅医生可确认入组')
  const enrollment = requireEnrollment(patientId, enrollmentId)
  const gaps: string[] = []
  if (enrollment.criteriaStatus !== '符合') gaps.push('条件核对未通过')
  if (enrollment.consentStatus !== '核对通过') gaps.push('知情同意未核对通过')
  if (enrollment.status !== '待确认') gaps.push('当前状态不是待确认')
  if (gaps.length) throw new Error(`无法确认入组，缺项：${gaps.join('、')}`)
  const seq = PATIENTS.filter((item) => item.researchNo).length + 1
  enrollment.status = '已入组'
  enrollment.researchNo = `RS-2026-${String(seq).padStart(4, '0')}`
  enrollment.enrollDate = today()
  enrollment.updatedAt = today()
  enrollment.rejectReason = ''
  const patient = PATIENTS.find((item) => item.id === patientId)
  if (patient) {
    patient.enrolled = true
    patient.researchNo = enrollment.researchNo
    patient.enrollDate = enrollment.enrollDate
    patient.consent = {
      signed: true,
      version: enrollment.consentVersion,
      date: enrollment.consentDate
    }
    patient.lastUpdate = today()
  }
  appendHistory(
    patientId,
    '随访',
    '确认研究入组',
    `项目 ${enrollment.projectId}；受试者编号 ${enrollment.researchNo}`
  )
  return structuredClone(enrollment)
}

export interface GroupInput {
  group: string
  groupDate: string
  groupBasis: string
}

/** 登记分组：方案分配结果，不允许普通编辑改组 */
export async function fetchRegisterGroup(
  patientId: string,
  enrollmentId: string,
  input: GroupInput,
  role: string
): Promise<PatientEnrollment> {
  await delay()
  if (role !== 'R_DOCTOR') throw new Error('仅医生可登记分组')
  const enrollment = requireEnrollment(patientId, enrollmentId)
  if (enrollment.status !== '已入组') throw new Error('仅已入组记录可登记分组')
  const project = findProject(enrollment.projectId)
  if (!project?.groups.includes(input.group)) throw new Error('研究组别不在该方案范围内')
  if (!input.groupDate.trim() || !input.groupBasis.trim()) {
    throw new Error('分组日期与分组依据不能为空')
  }
  enrollment.group = input.group
  enrollment.groupDate = input.groupDate
  enrollment.groupBasis = input.groupBasis
  enrollment.updatedAt = today()
  const patient = PATIENTS.find((item) => item.id === patientId)
  if (patient) patient.group = input.group === '常规诊疗组' ? '常规组' : 'AI 组'
  return structuredClone(enrollment)
}

export interface ExitInput {
  exitDate: string
  exitReason: string
}

/** 退出研究：保留记录，不自动终止临床管理 */
export async function fetchExitEnrollment(
  patientId: string,
  enrollmentId: string,
  input: ExitInput,
  role: string
): Promise<PatientEnrollment> {
  await delay()
  if (role !== 'R_DOCTOR') throw new Error('仅医生可办理退出研究')
  const enrollment = requireEnrollment(patientId, enrollmentId)
  if (enrollment.status !== '已入组') throw new Error('仅已入组记录可退出研究')
  if (!input.exitDate.trim() || !input.exitReason.trim()) {
    throw new Error('退出日期与退出原因不能为空')
  }
  enrollment.status = '已退出'
  enrollment.exitDate = input.exitDate
  enrollment.exitReason = input.exitReason
  enrollment.updatedAt = today()
  appendHistory(
    patientId,
    '随访',
    '退出研究',
    `${input.exitDate}；${input.exitReason}；临床管理继续`
  )
  return structuredClone(enrollment)
}

/* ------------------------------ 导入 / 导出 [批注 04] ------------------------------ */

export interface TemplateField {
  key: string
  label: string
  required: boolean
}

/** 模板与导出字段：与已发布字段版本一致，不含姓名 / 手机号 / 病历号 */
export const TEMPLATE_FIELDS: TemplateField[] = [
  { key: 'patientId', label: '患者编号', required: false },
  { key: 'center', label: '所属中心', required: true },
  { key: 'doctor', label: '负责医生', required: true },
  { key: 'manageStatus', label: '管理状态', required: true },
  { key: 'initialEntry', label: '初始入口', required: true },
  { key: 'stage', label: '当前阶段', required: true },
  { key: 'diagnosisDate', label: '诊断日期', required: false },
  { key: 'diagnosisBasis', label: '诊断依据', required: false }
]

export const EXPORT_FIELDS: TemplateField[] = [
  { key: 'id', label: '患者编号', required: true },
  { key: 'initialEntry', label: '初始入口', required: true },
  { key: 'stage', label: '当前阶段', required: true },
  { key: 'center', label: '所属中心', required: false },
  { key: 'doctor', label: '负责医生', required: false },
  { key: 'status', label: '管理状态', required: false },
  { key: 'projectCount', label: '关联项目数', required: false },
  { key: 'researchNo', label: '研究受试者编号', required: false },
  { key: 'lastUpdate', label: '最近更新时间', required: false }
]

function csvCell(value: string): string {
  const text = value ?? ''
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function buildTemplateCsv(): string {
  const header = TEMPLATE_FIELDS.map((item) => csvCell(item.label)).join(',')
  const sample = ['', '华东中心', '陈明远', '待评估', '拟接受高危药物治疗', '治疗前', '', ''].join(
    ','
  )
  return `\uFEFF${header}\n${sample}\n`
}

export interface ImportRow {
  lineNo: number
  patientId: string
  center: string
  doctor: string
  manageStatus: string
  initialEntry: string
  stage: string
  diagnosisDate: string
  diagnosisBasis: string
}

export interface ImportPreviewRow extends ImportRow {
  result: '通过' | '不通过'
  reason: string
}

/** 预览校验：缺值 / 格式错误 / 重复 / 匹配冲突 */
export async function fetchPreviewImportV2(rows: ImportRow[]): Promise<ImportPreviewRow[]> {
  await delay(120)
  const seen = new Set<string>()
  return rows.map((row) => {
    const id = row.patientId.trim()
    const reasons: string[] = []
    if (!row.center.trim()) reasons.push('所属中心缺值')
    if (!row.doctor.trim()) reasons.push('负责医生缺值')
    if (!MANAGE_STATUS_OPTIONS.includes(row.manageStatus.trim() as WebPatient['status'])) {
      reasons.push('管理状态格式错误')
    }
    if (!INITIAL_ENTRY_OPTIONS.includes(row.initialEntry.trim() as InitialEntry)) {
      reasons.push('初始入口格式错误')
    }
    if (!STAGE_OPTIONS.includes(row.stage.trim() as PatientStage)) {
      reasons.push('当前阶段格式错误')
    }
    if (row.diagnosisDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(row.diagnosisDate.trim())) {
      reasons.push('诊断日期格式错误')
    }
    if (id) {
      if (!/^DLI-\d{4}-\d{4}$/.test(id)) reasons.push('患者编号格式错误')
      else if (seen.has(id)) reasons.push('本次文件内编号重复')
      else if (PATIENTS.some((item) => item.id === id)) reasons.push('与已有记录匹配冲突')
      seen.add(id)
    }
    return {
      ...row,
      patientId: id,
      result: reasons.length ? '不通过' : '通过',
      reason: reasons.length ? reasons.join('；') : '校验通过，可导入'
    }
  })
}

export interface ImportSubmitResult {
  created: number
  failed: number
  errors: Array<{ lineNo: number; reason: string }>
  ids: string[]
}

const IMPORT_BATCHES = new Set<string>()

/** 确认保存：只写通过校验的行，不覆盖已有，重复提交不重复建档 */
export async function fetchSubmitImportV2(
  rows: ImportPreviewRow[],
  role: string
): Promise<ImportSubmitResult> {
  await delay()
  if (!['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role)) {
    throw new Error('当前角色无导入权限')
  }
  const passed = rows.filter((row) => row.result === '通过')
  const signature = passed
    .map((row) =>
      [
        row.lineNo,
        row.patientId,
        row.center,
        row.doctor,
        row.manageStatus,
        row.initialEntry,
        row.stage,
        row.diagnosisDate,
        row.diagnosisBasis
      ].join('|')
    )
    .join('//')
  const result: ImportSubmitResult = { created: 0, failed: 0, errors: [], ids: [] }
  if (signature && IMPORT_BATCHES.has(signature)) {
    result.errors.push({ lineNo: 0, reason: '该批次已提交，未重复建档' })
    return result
  }
  for (const row of passed) {
    if (row.patientId && PATIENTS.some((item) => item.id === row.patientId)) {
      result.failed += 1
      result.errors.push({ lineNo: row.lineNo, reason: '保存时检测到重复，已跳过' })
      continue
    }
    try {
      const input: ArchiveInput = {
        center: row.center.trim(),
        doctor: row.doctor.trim(),
        manageStatus: row.manageStatus.trim() as WebPatient['status'],
        initialEntry: row.initialEntry.trim() as InitialEntry,
        stage: row.stage.trim() as PatientStage,
        diagnosisDate: row.diagnosisDate.trim(),
        diagnosisBasis: row.diagnosisBasis.trim()
      }
      assertArchive(input)
      const patient = await fetchCreatePatientV2(input)
      result.created += 1
      result.ids.push(patient.id)
    } catch (error) {
      result.failed += 1
      result.errors.push({
        lineNo: row.lineNo,
        reason: error instanceof Error ? error.message : '保存失败'
      })
    }
  }
  if (signature) IMPORT_BATCHES.add(signature)
  return result
}

/** 导出 CSV：按授权字段与当前筛选结果生成，字段白名单杜绝敏感信息 */
export function buildExportCsv(
  params: PatientRowQuery,
  fieldKeys: string[],
  /** 勾选导出：仅导出已勾选记录 [批注 04] */
  selectedIds: string[] = []
): string {
  const fields = EXPORT_FIELDS.filter((item) => item.required || fieldKeys.includes(item.key))
  const header = fields.map((item) => csvCell(item.label)).join(',')
  const all = filterPatients(params)
  const list = selectedIds.length
    ? all.filter((patient) => new Set(selectedIds).has(patient.id))
    : all
  const lines = list.map((patient) => {
    const row = toRow(patient, params.projectId ?? '')
    return fields
      .map((field) => csvCell(String(row[field.key as keyof PatientRow] ?? '')))
      .join(',')
  })
  return `\uFEFF${header}\n${lines.join('\n')}\n`
}
