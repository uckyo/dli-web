/**
 * DLI 医患双端智能诊疗平台 - Mock 领域类型定义
 *
 * 对应《DLI 医患双端应用产品设计文档》§4 数据结构设计（ER 模型）。
 * 全部为前端 mock 类型，供医生端页面开发使用。
 */

/** 风险分层：L1 极高 / L2 高 / L3 中 / L4 低 */
export type RiskLevel = 'L1' | 'L2' | 'L3' | 'L4'

/** 用药状态：用药前 / 用药中 / 诊断后 */
export type MedStatus = 'before' | 'during' | 'after'

/** 入组分组：AI 组 / 常规组 */
export type GroupType = 'ai' | 'routine'

/** 知情同意状态 */
export type ConsentStatus = 'signed' | 'unsigned' | 'withdrawn'

/** 预警等级：红 / 橙 / 黄 */
export type AlertLevel = 'red' | 'orange' | 'yellow'

/** 预警来源 */
export type AlertSource = 'system' | 'patient'

/** 预警状态：待处理 / 已处理 / 已升级 */
export type AlertStatus = 'pending' | 'handled' | 'escalated'

/** 评估阶段：治疗前 / 治疗中 / 诊断后 */
export type AssessPhase = 'pre' | 'during' | 'post'

/** 医生确认动作：采纳 / 修改 / 不采纳 */
export type ConfirmAction = 'agree' | 'modify' | 'reject'

/** 高危用药记录 */
export interface MedicationCourse {
  drugName: string
  dose: string
  route: string
  frequency: string
  startDate: string
  endDate?: string
}

/** 患者列表项 */
export interface DliPatient {
  id: string
  /** 脱敏姓名，如「王**」 */
  name: string
  sex: 'male' | 'female'
  age: number
  center: string
  groupType: GroupType
  medStatus: MedStatus
  riskLevel: RiskLevel
  drugs: string[]
  lastAssessTime: string
  unreadReports: number
  consentStatus: ConsentStatus
  doctor: string
}

/** 患者详情（360° 视图聚合） */
export interface DliPatientDetail extends DliPatient {
  phone: string
  idNoMasked: string
  enrollDate: string
  diagnosis: string
  medicationCourses: MedicationCourse[]
}

/** 诊疗时间轴事件 */
export interface TimelineEvent {
  id: string
  patientId: string
  /** 事件类型：用药 / 检测 / 预警 / 上报 / 评估 */
  type: 'medication' | 'lab' | 'alert' | 'report' | 'assess'
  title: string
  content: string
  time: string
}

/** 检验指标趋势序列 */
export interface LabTrendSeries {
  /** 指标编码 */
  itemCode: string
  /** 指标名称 */
  itemName: string
  unit: string
  refRange: string
  /** 时间点（MM-DD） */
  dates: string[]
  values: number[]
}

/** 影像报告 */
export interface ImagingStudy {
  id: string
  patientId: string
  modality: 'HRCT' | 'X-Ray' | 'PET-CT'
  studyDate: string
  pacsUid: string
  reportText: string
  conclusion: string
}

/** 病理报告 */
export interface PathologyReport {
  id: string
  patientId: string
  sampleDate: string
  sampleType: string
  reportText: string
}

/** 可追溯依据条目 */
export interface TraceabilityItem {
  sourceType: 'guideline' | 'literature' | 'case' | 'model'
  title: string
  excerpt: string
}

/** CDSS 风险评估报告 */
export interface RiskAssessment {
  id: string
  patientId: string
  patientName: string
  phase: AssessPhase
  modelVersion: string
  score: number
  riskLevel: RiskLevel
  riskFactors: Array<{ factor: string; weight: string }>
  suggestions: Array<{ type: string; content: string }>
  traceability: TraceabilityItem[]
  assessTime: string
  /** 医生确认记录（未确认为 null） */
  doctorConfirm: {
    action: ConfirmAction
    opinion: string
    doctor: string
    time: string
  } | null
}

/** 患者上报（症状 / 体征 / 日记） */
export interface PatientReport {
  id: string
  patientId: string
  patientName: string
  reportType: 'symptom' | 'vital' | 'diary'
  symptoms: Array<{ name: string; level: string }>
  vitals: { temp?: string; spo2?: string; hr?: string }
  diaryText?: string
  /** AI 预判：normal 正常宣教 / abnormal 异常推送医生 */
  aiTriage: 'normal' | 'abnormal'
  reportTime: string
  read: boolean
}

/** 预警 */
export interface DliAlert {
  id: string
  patientId: string
  patientName: string
  level: AlertLevel
  source: AlertSource
  /** 触发规则名称 */
  ruleName: string
  /** 原始触发数据摘要 */
  triggerData: string
  status: AlertStatus
  occurTime: string
  /** 响应时限（SLA） */
  deadline: string
  /** 处置记录（未处置为 null） */
  handleRecord: {
    action: 'mark' | 'escalate' | 'followup'
    opinion: string
    handler: string
    handleTime: string
  } | null
}

/** 随访模板 */
export interface FollowupTemplate {
  id: string
  name: string
  /** 时点：诊断后 1/3/6/12 月 */
  timePoint: string
  items: Array<{ name: string; type: 'exam' | 'lab' | 'questionnaire' }>
  description: string
  enabled: boolean
}

/** 随访任务实例 */
export interface FollowupTask {
  id: string
  planId: string
  patientId: string
  patientName: string
  itemName: string
  dueDate: string
  status: 'pending' | 'done' | 'overdue'
  result?: string
}

/** 随访计划 */
export interface FollowupPlan {
  id: string
  patientId: string
  patientName: string
  templateName: string
  startTime: string
  endTime: string
  status: 'draft' | 'published' | 'recycling' | 'finished'
  progress: number
  tasks: FollowupTask[]
}

/** 审核发布 - 待确认建议 */
export interface PendingReview {
  id: string
  patientId: string
  patientName: string
  phase: AssessPhase
  content: string
  modelVersion: string
  submitTime: string
}

/** 工作台统计 */
export interface WorkbenchStats {
  patientTotal: number
  pendingAlertCount: number
  todayFollowupCount: number
  modelVersion: string
  modelStatus: string
  /** 风险分层分布 */
  riskDistribution: Array<{ level: RiskLevel; label: string; count: number }>
}
