/**
 * DLI 页面说明蓝图 · 新增业务实体类型
 *
 * 事实来源：《DLI页面说明蓝图_V1.0.md》第 3 章 P05/P08/P10/P13/P14/P15/P17/P18
 * 与第 5 章全局约束 G1/G2/G6。字段均来自原文条目或批注要求，未作推断补全。
 *
 * G1 脱敏：本模块所有患者标识统一使用 patientId（系统患者编号 / 研究受试者编号），
 * 不定义姓名、手机号、病历号字段。
 */

/** G2：研究组别，约束 AI 报告 / 预警 / Agent 建议 / 患者消息的使用 [批注 01-2] */
export type ResearchGroup = 'AI辅助诊疗组' | '常规诊疗组'

/** 通用状态 */
export type PublishStatus = '草稿' | '已发布' | '已停用'

/* ------------------------------- P05 评估预警 ------------------------------- */

/** 评估报告类别（内部保留字段） [批注 02-2] */
export type AssessmentCategory =
  | '治疗前风险评估'
  | '治疗中监测预警'
  | '诊断后辅助评估'
  | '治疗建议'
  | '随访建议'

/** 评估阶段：记录本次评估时的阶段，不随患者以后阶段变化 [批注 05] */
export type AssessmentStage = '治疗前' | '治疗中' | '诊断后'

/** 模型用途 [批注 05] */
export type ModelUsage = '早筛预警' | '早诊预警' | '转归预测'

/** 医生意见采纳结果 [批注 05] */
export type ReportAdoption = '采纳' | '修改后采纳' | '不采纳'

export interface ReportOpinion {
  adoption: ReportAdoption
  /** 医生说明：修改或不采纳须写明内容 / 原因 [批注 05] */
  note: string
  doctor: string
  confirmedAt: string
}

/** 评估报告 [批注 02-2][批注 05] */
export interface AssessmentReport {
  id: string
  /** 系统患者编号 / 研究受试者编号，G1 脱敏 */
  patientId: string
  /** 评估阶段（本次评估时阶段） [批注 05] */
  stage: AssessmentStage
  /** 模型用途 [批注 05] */
  modelUsage: ModelUsage
  category: AssessmentCategory
  /** 评估依据 */
  basis: string
  assessedAt: string
  modelVersion: string
  source: '自动评估' | '医生手动评估'
  /** 结果摘要 [批注 05] */
  result: string
  researchGroup: ResearchGroup
  /** 输入资料 [批注 05] */
  inputs: string[]
  /** 依据来源 [批注 05] */
  evidence: string[]
  /** 个体化建议：具体字段以模型接口为准，不统一写成准确率 [批注 05] */
  suggestions: string[]
  /** 医生意见：采纳结果、说明、确认医生、确认时间 [批注 05] */
  opinion?: ReportOpinion
  status: '待核对' | '已确认' | '退回'
  /** 医生终审批注：退回原因等（内部保留） [批注 02-角色] */
  reviewNote?: string
}

/** 预警处理状态 [批注 05] */
export type WarningStatus = '待处理' | '处理中' | '已处理'

/** 预警处置记录 [批注 02-3] */
export interface DispositionRecord {
  id: string
  operator: string
  role: string
  action: string
  createdAt: string
}

/** 预警：关联患者、触发原因、处理状态和处置记录 [批注 02-3][批注 05] */
export interface WarningTicket {
  id: string
  patientId: string
  /** 预警原因 [批注 05] */
  trigger: string
  /** 预警等级（沿用获确认规则） [批注 05] */
  level: '高' | '中' | '低'
  status: WarningStatus
  /** 负责医生 [批注 05] */
  doctor: string
  /** 关联报告编号 [批注 05] */
  relatedReportId?: string
  /** 移动端 / Web 进入同一记录的来源 [批注 02-3] */
  channel: 'Web 评估预警' | '患者详情' | '消息'
  /** 医生确认的干预安排，下发患者端 [批注 02-3] */
  intervention: string
  doctorConfirmed: boolean
  /** 识别结果核对后才能用于评估 [批注 03-3] → G7 */
  sourceVerified: boolean
  /** 医生处理意见 [批注 05] */
  handleNote?: string
  /** 处理结果 [批注 05] */
  handleResult?: string
  /** 发生时间 [批注 05] */
  createdAt: string
  records: DispositionRecord[]
}

/* --------------------------- P05 管理计划表 [批注 05] --------------------------- */

/** 安排类型（用药 / 复查） [批注 05] */
export type PlanType = '用药' | '复查'

/** 发布状态 [批注 05] */
export type PlanPublishStatus = '草稿' | '已发布' | '已取消'

export interface ManagementPlan {
  id: string
  patientId: string
  /** 安排名称 [批注 05] */
  name: string
  type: PlanType
  /** 具体内容 [批注 05] */
  content: string
  /** 执行时间 [批注 05] */
  executeAt: string
  /** 执行要求 [批注 05] */
  requirement: string
  status: PlanPublishStatus
  /** 发布后生成的患者任务编号（同一任务在各入口引用，不重复下发） [批注 05] */
  taskId?: string
  operator: string
  createdAt: string
  publishedAt?: string
}

/* ------------------------------- P10 随访管理 ------------------------------- */

/** 任务状态 [批注 10]：逾期标识另列，不替代任务状态 */
export type FollowupStatus = '待完成' | '已提交待核对' | '待补充' | '已完成' | '已取消'

/** 计划状态 [批注 10] */
export type FollowupPlanStatus = '草稿' | '已发布' | '已完成' | '已取消'

/** 计划来源 [批注 10] */
export type FollowupPlanSource = '医生创建' | '模型建议' | '自动规则'

/** 随访计划 [批注 10] */
export interface FollowupPlan {
  id: string
  patientId: string
  name: string
  /** 负责医生 */
  doctor: string
  /** 计划起止日期 */
  startDate: string
  endDate: string
  status: FollowupPlanStatus
  source: FollowupPlanSource
  /** 计划版本（历史版本保留） */
  version: string
  /** 生效模板 */
  templateId?: string
  publishedAt?: string
  createdAt: string
}

/** 随访模板 [批注 10] */
export interface FollowupTemplate {
  id: string
  name: string
  /** 适用阶段 */
  stage: '治疗前' | '治疗中' | '诊断后'
  /** 模板版本 */
  version: string
  /** 模板状态 */
  status: '草稿' | '已发布' | '已停用'
  /** 适用阶段及任务项目 */
  items: string[]
  /** 相对时点 */
  timePoints: string
  /** 执行要求 */
  requirement: string
  /** 完成方式 */
  completeWay: string
  updatedAt: string
  operator: string
}

/** 随访任务：与自动任务使用同一计划记录 [批注 06-2][批注 10] */
export interface FollowupTask {
  id: string
  planId: string
  patientId: string
  /** 任务名称 */
  title: string
  /** 随访项目 [批注 10] */
  itemName?: string
  /** 计划执行时间 [批注 10] */
  executeAt?: string
  /** 执行要求 [批注 10] */
  requirement?: string
  /** 完成方式（填写反馈 / 上传报告 / 医护记录等） [批注 10] */
  completeWay?: string
  status: FollowupStatus
  /** 逾期标识（另列，不替代任务状态） [批注 10] */
  overdue?: boolean
  type: '自动任务' | '人工随访'
  dueDate: string
  assignee: string
  /** 患者执行结果回到同一计划和患者记录 [批注 06-3] */
  result: string
  resultSource: '患者回传' | '医护补录' | ''
  /** 新建或调整计划由医生确认后下发 [批注 06-3] */
  doctorConfirmed: boolean
  /** 核对：患者反馈内容 / 附件 / 提交时间（只读） [批注 10] */
  feedback?: string
  feedbackAt?: string
  feedbackAttachment?: string
  /** 核对结果与意见 [批注 10] */
  checkResult?: '通过' | '要求补充'
  checkNote?: string
  checkBy?: string
  /** 人工随访：随访时间 / 方式 / 联系结果 / 随访记录 [批注 10] */
  contactAt?: string
  contactWay?: string
  contactResult?: '已联系' | '未联系上'
  /** 变更通知患者并留痕 [批注 06-3] */
  changeLog: Array<{ action: string; operator: string; createdAt: string }>
}

/* --------------------------- P08 研究管理 / 项目详情 --------------------------- */

/** 共享级别：兼容旧蓝图值，新增批注 08/12 的未共享 / 课题组 / 中心 / 平台 */
export type ResearchShareLevel =
  | '未共享'
  | '项目内共享'
  | '指定内容共享'
  | '课题组'
  | '中心'
  | '平台'

/** 可共享内容：共享不自动开放患者明细、编辑和导出 [批注 12] */
export type ResearchShareContent = '项目概况' | '进度汇总' | '已确认研究结果'

/** 项目共享设置 [批注 12] */
export interface ResearchShareSetting {
  shared: boolean
  level: ResearchShareLevel
  targets: string[]
  contents: ResearchShareContent[]
  actualVisibleScope: string
}

/** 分析条件：兼容旧单指标结构，扩展批注 08 的多指标条件快照 */
export interface AnalysisCondition {
  group: string
  indicator: string
  timeRange: string
  groupBy?: string
  groupValue?: string
  indicators?: string[]
  source?: 'Agent 对话' | '手动查看'
}

/** 分析结果：统计口径、单位、有效数据量、缺失情况 [批注 05-2] */
export interface AnalysisResult {
  condition: AnalysisCondition
  statisticalMethod: string
  unit: string
  validCount: number
  missingCount: number
  value: string
  /** 条件或数据变化时提示重新分析 [批注 05-2] */
  needsRerun: boolean
  savedAt: string
  runId?: string
  status?: '完成' | '失败'
  error?: string
}

/** 数据分析查询 [批注 08] */
export interface ResearchAnalysisQuery {
  groupBy: string
  groupValue: string
  indicators: string[]
  timeRange: string
  mode?: '明细' | '汇总'
}

/** 明细行：所选指标以 indicator_序号 平铺，避免 ElTable 深层 prop 兼容问题 */
export type AnalysisDataRow = Record<string, string> & {
  patientId: string
  researchNo: string
  groupValue: string
  observedAt: string
}

/** 汇总行：统计方式按指标方案，不固定均值 [批注 08] */
export interface AnalysisSummaryRow {
  groupName: string
  indicator: string
  validCount: number
  missingCount: number
  result: string
  unit: string
  statisticalMethod: string
}

/** Agent 分析运行记录：结果卡片进行中 / 完成 / 失败 [批注 08] */
export interface AnalysisRun {
  id: string
  projectId: string
  condition: AnalysisCondition
  status: '进行中' | '完成' | '失败'
  createdAt: string
  finishedAt: string
  error?: string
  result?: AnalysisResult
  saved: boolean
}

/** 指标方案元数据：单位与统计方式 */
export interface IndicatorMeta {
  unit: string
  statisticalMethod: string
}

/** 研究进度：各中心、组别入组与随访进度、终点数据完成情况 [批注 15] */
export interface ResearchProgress {
  center: string
  group: string
  enrolled: number
  target: number
  followupDone: number
  endpointDone: number
  exited?: number
  followupExpected?: number
  endpointExpected?: number
  missingCount?: number
}

/** 研究进度缺失 / 异常核对项 [批注 15] */
export interface ResearchProgressIssue {
  patientId: string
  researchNo: string
  issue: string
  source: string
  status: '待核对' | '已核对'
}

/** 研究终点与安全事件 [批注 05-3] */
export interface ResearchEndpoint {
  name: string
  value: string
  /** 普通预警不能直接当成不良事件，安全事件须医生确认 */
  safetyEventConfirmed: boolean
}

/** 研究方案、伦理、入组清单及评价材料 [批注 15] */
export interface ResearchMaterial {
  id: string
  name: string
  type: '研究方案' | '伦理材料' | '评价材料' | '入组清单'
  version: string
  updatedAt: string
  fileName?: string
  fileSize?: string
  previewNote?: string
  updatedBy?: string
}

/** 入组清单条目 [批注 15] */
export interface ResearchCriteriaItem {
  id: string
  type: '纳入条件' | '排除条件'
  content: string
  basis: string
  displayOrder: number
}

/** 入组清单版本：医生确认后才供患者详情研究入组使用 [批注 03/15] */
export interface ResearchCriteriaList {
  id: string
  projectId: string
  planVersion: string
  version: string
  status: '草稿' | '已确认' | '已停用'
  items: ResearchCriteriaItem[]
  confirmedBy: string
  confirmedAt: string
  updatedAt: string
}

/** 患者研究记录 · 终点资料 [批注 15] */
export interface PatientEndpointRecord {
  indicator: string
  observedAt: string
  value: string
  unit: string
  source: string
  status: '待核对' | '已核对'
}

/** 患者研究记录 · 安全事件 [批注 15] */
export interface PatientSafetyEvent {
  name: string
  occurredAt: string
  description: string
  source: string
  doctorConfirmed: boolean
}

/** 患者研究记录抽屉数据 [批注 15] */
export interface PatientResearchRecord {
  patientId: string
  projectId: string
  endpoints: PatientEndpointRecord[]
  safetyEvents: PatientSafetyEvent[]
}

/** 研究项目详情：临时分析筛选不改变患者正式入组组别 [批注 05-1] */
export interface ResearchProjectDetail {
  id: string
  /** 与研究管理列表行对应的编号；旧蓝图数据可为空 */
  listId?: string
  name: string
  owner?: string
  center?: string
  planVersion?: string
  criteriaVersion?: string
  /** 正式入组组别，不受临时分析条件影响 */
  officialGroup: string
  shareLevel: ResearchShareLevel
  shareSetting?: ResearchShareSetting
  groupDimensions?: string[]
  groups: string[]
  indicators: string[]
  timeRanges: string[]
  results: AnalysisResult[]
  progress: ResearchProgress[]
  endpoints: ResearchEndpoint[]
  materials: ResearchMaterial[]
  /** G5：共享不自动授予患者明细、编辑和导出权限 */
  shareGrantsPatientDetail: boolean
  shareGrantsEdit: boolean
  shareGrantsExport: boolean
}

/* ------------------------------ P13 知情同意模板 ------------------------------ */

/**
 * 模板内容批准状态 [批注 16]：独立于展示状态，
 * 保证列表「模板状态」列仍是批注规定的草稿 / 已发布 / 已停用三态。
 */
export type ConsentApproval = '未提交' | '待批准' | '已批准'

/** 模板展示状态 [批注 16] */
export type ConsentTemplateStatus = '草稿' | '已发布' | '已停用'

/** 知情同意书模板：项目与中心拆成两个字段，不用含义不明的「范围」列 [批注 16] */
export interface ConsentTemplate {
  id: string
  name: string
  /** 关联研究项目编号；空表示通用模板 */
  projectId: string
  /** 适用中心；空表示全部中心 */
  center: string
  version: string
  /** 模板文件（演示环境只保存文件信息） */
  fileName: string
  fileSize: string
  status: ConsentTemplateStatus
  approval: ConsentApproval
  approvedBy: string
  approvedAt: string
  publishedBy: string
  publishedAt: string
  updatedAt: string
  operator: string
  /** 另存版本时保留历史，不覆盖已签记录 [批注 16] */
  history: Array<{ version: string; updatedAt: string; operator: string; note?: string }>
}

/** 模板维护入参 */
export interface ConsentTemplateInput {
  /** 有 id 且 mode='edit' 时为编辑草稿；有 id 且 mode='newVersion' 时为另存新版本 */
  id?: string
  /** create 新增草稿 / edit 编辑草稿 / newVersion 另存新版本 */
  mode?: 'create' | 'edit' | 'newVersion'
  name: string
  projectId: string
  center: string
  version: string
  fileName: string
  fileSize: string
  operator: string
  role: string
}

/* ------------------------------ P17 患者字段配置 [批注 17] ------------------------------ */

/** 字段类型：文本／数字／日期／单选／多选等支持类型 [批注 17] */
export type FieldType = '文本' | '数字' | '日期' | '单选' | '多选'

/** 适用范围：平台统一／指定中心／指定课题组 [批注 17] */
export type FieldScopeType = '平台统一' | '指定中心' | '指定课题组'

/** 配置状态四态：草稿／待发布／已发布／已停用 [批注 17] */
export type FieldConfigStatus = '草稿' | '待发布' | '已发布' | '已停用'

export interface PatientField {
  id: string
  name: string
  code: string
  type: FieldType
  /** 选择类型时填写可选值 [批注 17] */
  options: string[]
  unit: string
  required: boolean
  /** 校验规则 [批注 17] */
  validation: string
  /** 是否列表显示；表单专用字段不自动塞入列表 [批注 17] */
  listVisible: boolean
  /** 是否支持筛选 [批注 17] */
  filterable: boolean
  /** 显示顺序 [批注 17] */
  order: number
  scopeType: FieldScopeType
  /** 指定中心／课题组名称；平台统一为空 [批注 17] */
  scopeName: string
  status: FieldConfigStatus
  version: string
  /** 系统患者编号、研究分组、模型必需字段保持统一，不得改义或删除 [批注 17] */
  systemLocked: boolean
  updatedAt: string
  operator: string
}

export interface FieldConfigVersion {
  version: string
  publishedAt: string
  operator: string
  /** 患者表单、导入模板及 App 使用适用版本 [批注 17] */
  appliesTo: Array<'患者表单' | '导入模板' | 'Web' | 'App'>
  note: string
}

/* ------------------------------ P18 编码规则配置 [批注 18] ------------------------------ */

/** 编号类型：系统患者编号（系统内唯一）／研究受试者编号（按项目唯一）[批注 18] */
export type CodeTarget = '系统患者编号' | '研究受试者编号'

export interface CodeRule {
  id: string
  target: CodeTarget
  /** 编号前缀 [批注 18] */
  prefix: string
  /** 中心代码段 [批注 18] */
  centerCode: string
  /** 项目代码段：仅研究受试者编号开放 [批注 18] */
  projectCode: string
  /** 日期格式 [批注 18] */
  dateFormat: 'YYYY' | 'YYYYMM'
  /** 流水号位数 [批注 18] */
  serialDigits: number
  /** 流水重置周期 [批注 18] */
  resetCycle: '不重置' | '按日' | '按月' | '按年'
  /** 适用范围 [批注 18] */
  effectiveScope: string
  status: PublishStatus
  /** 规则版本 [批注 18] */
  version: string
  operator: string
  updatedAt: string
  /** 新版本只作用于新编号，不改历史关联 [批注 18] */
  note: string
}

/* -------------------------------- P18 系统日志 -------------------------------- */

/** 重要数据、权限、导入导出和配置变更留痕 [批注 16-1] */
export type LogCategory = '重要数据' | '权限变更' | '导入导出' | '配置变更'

/** 执行结果（成功 / 失败）[批注 23] */
export type LogResult = '成功' | '失败'

export interface SystemLog {
  id: string
  category: LogCategory
  action: string
  operator: string
  role: string
  /** 按授权范围查询 [源 #135] */
  scope: string
  /** 业务对象类型（如：患者字段配置 / 编码规则 / 评估报告） [批注 23] */
  objectType?: string
  /** 业务对象编号 [批注 23] */
  objectId?: string
  /** 兼容旧留痕调用的对象描述，新代码用 objectType + objectId */
  target: string
  /** G1：患者相关日志脱敏，不记录密码或验证码 */
  detail: string
  /** 执行结果（成功 / 失败），未记录时按成功处理 [批注 23] */
  result: LogResult
  /** 变更前内容 [批注 23] */
  beforeContent?: string
  /** 变更后内容 [批注 23] */
  afterContent?: string
  /** 失败原因 [批注 23] */
  failureReason?: string
  createdAt: string
}
