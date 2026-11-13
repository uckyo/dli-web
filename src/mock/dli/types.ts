/**
 * DLI 疾病智能管理平台 - Web 端领域类型
 *
 * 对应《疾病智能管理平台系统.md》定义的 14 个菜单：
 * 工作台、患者管理、模型管理、智能管理、检查管理、生物样本、
 * 研究管理、个人中心、状态管理、人员管理、平台管理、中心管理、
 * 课题组管理、系统管理。
 *
 * 全部为前端 mock 类型，供 useTable 与服务层复用。
 */

/** Web 端角色编码 */
export type WebRoleCode =
  | 'R_DOCTOR'
  | 'R_ASSISTANT'
  | 'R_NURSE'
  | 'R_PLATFORM'
  | 'R_CENTER'
  | 'R_GROUP'
  | 'R_SYS'

/** 预警等级：高风险 / 中风险 / 低风险 / 未触发 */
export type WarnLevel = 'high' | 'medium' | 'low' | 'none'

/** 患者状态 */
export type PatientStatus = '待评估' | '用药中' | '随访中' | '已结案'

/** 转归预测窗口 */
export type OutcomeWindow = '3个月' | '6个月' | '12个月'

/** 医患对话消息 */
export interface ChatMessage {
  id: string
  from: 'doctor' | 'patient'
  sender: string
  content: string
  time: string
}

/** 诊疗历程事件 */
export interface HistoryEvent {
  id: string
  date: string
  category: '现病史' | '既往史' | '用药' | '检查' | '诊断' | '随访'
  title: string
  detail: string
}

/** 研究入组入口 */
export type EnrollEntry = '拟接受高危药物治疗' | '已确诊 DLI'

/** 知情同意签署状态 */
export interface ConsentState {
  signed: boolean
  version: string
  date: string
}

/** 患者端上报（待医护核对） */
export interface PatientReport {
  id: string
  patientId: string
  type: string
  content: string
  date: string
  status: '待核对' | '已核对' | '已退回'
  reviewer: string
}

/** 安全事件（须医生确认，普通预警不自动转为不良事件） */
export interface SafetyEvent {
  id: string
  patientId: string
  type: string
  level: '轻度' | '中度' | '重度'
  date: string
  confirmed: boolean
  confirmedBy: string
}

/** 患者列表项 */
export interface WebPatient {
  id: string
  /** 身份字段仅存于数据层，页面 / 导出 / 日志不展示（G1） */
  name: string
  gender: '男' | '女'
  age: number
  center: string
  group: 'AI 组' | '常规组'
  status: PatientStatus
  /** 早筛预警 */
  earlyScreen: { level: WarnLevel; score: number }
  /** 早诊预警 */
  earlyDiagnosis: { level: WarnLevel; score: number }
  /** 转归预测 */
  outcome: { window: OutcomeWindow; probability: number; label: string }
  lastUpdate: string
  doctor: string
  /** 研究受试者编号（确认入组后生成） */
  researchNo: string
  /** 入组入口 */
  enrollEntry: EnrollEntry | ''
  /** 入组日期 */
  enrollDate: string
  /** 是否已确认研究入组（建档与入组分离） */
  enrolled: boolean
  /** 知情同意 */
  consent: ConsentState
  /** 安全事件 */
  safetyEvents: SafetyEvent[]
}

/** 患者 360° 详情 */
export interface WebPatientDetail extends WebPatient {
  phone: string
  chiefComplaint: string
  medication: string[]
  conversations: ChatMessage[]
  history: HistoryEvent[]
}

/** 检查分类 */
export type ExamCategory = '影像' | '病理' | '检验' | '病历' | '其他'

/** 检查记录 */
export interface ExamRecord {
  id: string
  patientId: string
  patientName: string
  category: ExamCategory
  item: string
  center: string
  date: string
  /** 检查资料处理状态 [批注 06/07] */
  status: ExamProcessStatus
  /** 资料来源：院内同步 / 授权上传 [批注 06] */
  source: ExamSource
  /** 识别结果是否已核对；核对后才能用于评估 [批注 03-3] */
  verified: boolean
  checkedBy: string
  checkedAt: string
  uploader: string
  uploadedAt: string
  attachment: ExamAttachment
  /** AI 识别字段（检验/病理/病历类）[批注 06] */
  recognitionFields: ExamRecognitionField[]
  /** 核对时的人工修改留痕 [批注 06] */
  modifyRecords: ExamModifyRecord[]
  /** 资料流转日志 */
  logs: ExamLog[]
}

/** 检查资料处理状态 [批注 06/07] */
export type ExamProcessStatus = '待识别' | '识别中' | '识别失败' | '待核对' | '已核对归档'

/** 资料来源 [批注 06] */
export type ExamSource = '院内同步' | '授权上传'

/** 检查附件文件 */
export interface ExamAttachment {
  name: string
  type: string
  size: string
}

/** AI 识别字段：原文 / 提取值 / 单位 / 参考范围 [批注 06] */
export interface ExamRecognitionField {
  name: string
  raw: string
  extracted: string
  unit: string
  range: string
}

/** 核对修改留痕 [批注 06] */
export interface ExamModifyRecord {
  id: string
  field: string
  before: string
  after: string
  operator: string
  time: string
}

/** 检查资料流转日志 */
export interface ExamLog {
  id: string
  action: string
  operator: string
  time: string
  detail: string
}

/** 生物样本库 · 样本 */
export type SampleType = '全血' | '血浆' | '血清' | '组织' | '尿液'
export type SampleStatus = '已入库' | '待入库' | '已出库'

/** 源库同步状态 [批注 07] */
export type SyncStatus = '正常' | '待匹配' | '异常'

/** 同意书状态（批注 03 / 16 / 患者App 共用同一状态）[批注 16] */
export type ConsentStatus =
  | '未发放'
  | '待签署'
  | '已签待核对'
  | '核对通过'
  | '需补充'
  | '已拒绝'
  | '撤回处理中'
  | '已撤回'

/** 样本处理环节（取样 / 处理 / 保存）SOP */
export interface SopStep {
  stage: string
  content: string
}

/** 样本流转记录（六列：时间/类型/数量及单位/起始位置/目标位置/操作者）[批注 07] */
export interface SampleFlowLog {
  time: string
  action: string
  /** 数量及单位 */
  quantity?: number
  unit?: string
  /** 起始位置 */
  from?: string
  /** 目标位置 */
  to?: string
  operator: string
  remark: string
}

/** 生物样本（数据来自样本库，DLI 只读展示） */
export interface SampleRecord {
  /** 样本编号：生物库-中心-患者编号-样本编号 */
  id: string
  name: string
  patientId: string
  center: string
  type: SampleType
  collectedAt: string
  /** 剩余样本量 */
  remaining: number
  /** 剩余量单位 */
  unit: string
  status: SampleStatus
  /** 保存位置 */
  location: string
  /** 样本库中的共享范围 */
  shareLevel: VisibleScope
  /** 入库时间 */
  storedAt: string
  operator: string
  /** 设备及位置 */
  device: string
  /** SOP 名称：详情按源库已有值展示，不在页面补造 [批注 07] */
  sopName: string
  sopVersion: string
  /** 源库系统 */
  sourceSystem: string
  /** 最近同步时间 */
  lastSyncedAt: string
  /** 源库同步状态 [批注 07] */
  syncStatus: SyncStatus
  /** 同步异常／待匹配说明 */
  syncNote: string
  sop: SopStep[]
  flow: SampleFlowLog[]
}

/** 检测类型 */
export type SampleTestType = '蛋白组' | '转录组' | '代谢组' | '基因组'
export type SampleTestStatus = '已完成' | '检测中' | '异常'
export type QcConclusion = '合格' | '不合格' | '待质控'

/** 生物样本 · 检测记录 */
export interface SampleTestRecord {
  /** 检测编号：生物库-中心-患者编号-检测编号 */
  id: string
  type: SampleTestType
  item: string
  batch: string
  sampleId: string
  patientId: string
  center: string
  /** 关联样本采集时点 */
  collectedAt: string
  testedAt: string
  status: SampleTestStatus
  qc: QcConclusion
  shareLevel: VisibleScope
  operator: string
  /** 结果录入时间 */
  recordedAt: string
  /** 同批次关联样本 [批注 07] */
  linkedSamples: Array<{
    sampleId: string
    patientId: string
    center: string
    type: SampleType
    collectedAt: string
    role: string
  }>
  /** 检测指标结果 */
  indicators: Array<{ name: string; result: string; unit: string; range: string }>
  sop: SopStep[]
  /** SOP 名称 / 版本 [批注 07] */
  sopName: string
  sopVersion: string
  qcReport: string
  /** 原始数据 */
  dataFile: string
  /** 原始数据规模（GB）[批注 07] */
  dataSizeGb: number
  /** 表达谱 */
  expression: string
  sourceSystem: string
  lastSyncedAt: string
  syncStatus: SyncStatus
  syncNote: string
}

/** 模型所属方向 */
export type ModelField = '早筛预警' | '早诊预警' | '转归预测'

/** 模型方式：纵向 = 多时间点，横向 = 单时间点；空表示待配置 */
export type ModelMode = '纵向' | '横向'

/** AI 模型 */
/** 输入映射：模型输入项 / 系统字段 / 是否必需 / 默认映射 [批注 20] */
export interface ModelInputMapping {
  item: string
  systemField: string
  required: boolean
  /** 可缺省仅指采用约定默认映射 [批注 20] */
  defaultMapping: string
}

export interface AiModel {
  id: string
  name: string
  /** 所属方向（模型用途：早筛预警/早诊预警/转归预测）[批注 20] */
  field: ModelField
  /** 模型版本 [批注 20] */
  version: string
  /** 模型方式：分析模式，纵向/横向；未确定时为空 [批注 20] */
  mode: ModelMode | ''
  /** 评估时间点：纵向多选 / 横向单选，以模型支持范围及方案为准 [批注 20] */
  timePoints: string[]
  /** 输入要求 [批注 20] */
  input: string
  /** 输出项 [批注 20] */
  output: string
  /** 输入映射 [批注 20] */
  inputMappings: ModelInputMapping[]
  /** 模型来源 [批注 20] */
  source: string
  /** 适用范围（接入后启停提示影响的中心/课题组范围）[批注 20] */
  scope: string
  /** 评价结果及来源；未评价不填固定准确率 [批注 20] */
  evaluation: string
  /** 配置版本：配置留版本，停用不删历史报告 [批注 20] */
  configVersion: string
  /** 是否已接入模型服务（接入状态与启用状态分开）[批注 20] */
  connected: boolean
  enabled: boolean
  updatedAt: string
}

/** 资产可见范围 */
export type VisibleScope = '全平台' | '本中心' | '课题组'

/* ---------------- 技能 ---------------- */

export type SkillType = '工具调用' | '提示词' | '工作流'

/** 技能参数 */
export interface SkillParam {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object'
  required: boolean
  defaultValue: string
  description: string
}

/** 技能 */
export interface SkillItem {
  id: string
  name: string
  type: SkillType
  /** 近 30 天调用次数 */
  calls: number
  /** 归属智能体 */
  agent: string
  enabled: boolean
  description: string
  /** 成功率（百分比数值） */
  successRate: number
  /** 平均延迟（ms） */
  avgLatency: number
  version: string
  updatedAt: string
  owner: string
  scope: VisibleScope
  /** 超时时间（秒） */
  timeout: number
  retries: number
  params: SkillParam[]
  /** 工具标识，type=工具调用 时使用 */
  tool?: string
  /** 提示词模板，type=提示词 时使用 */
  prompt?: string
  /** 工作流说明，type=工作流 时使用 */
  workflow?: string
}

/** 技能版本记录 */
export interface SkillVersion {
  version: string
  publishedAt: string
  publisher: string
  note: string
  /** 是否为当前生效版本 */
  active: boolean
}

/** 技能调用记录 */
export interface SkillCallLog {
  id: string
  skillId: string
  calledAt: string
  scene: string
  agent: string
  status: '成功' | '失败' | '超时'
  /** 延迟（ms） */
  latency: number
  tokens: number
  error: string
}

/** 技能趋势点 */
export interface SkillTrendPoint {
  date: string
  calls: number
  failures: number
}

/** 技能页 KPI */
export interface SkillOverview {
  total: number
  enabled: number
  calls30d: number
  avgSuccessRate: number
}

/** 技能详情 */
export interface SkillDetail extends SkillItem {
  versions: SkillVersion[]
  logs: SkillCallLog[]
  trend: SkillTrendPoint[]
}

/** 技能新建 / 编辑入参 */
export interface SkillPayload {
  name: string
  type: SkillType
  description: string
  agent: string
  owner: string
  scope: VisibleScope
  timeout: number
  retries: number
  enabled: boolean
  params: SkillParam[]
  tool: string
  prompt: string
  workflow: string
}

/* ---------------- 知识库 ---------------- */

/** 知识库 */
export interface KnowledgeItem {
  id: string
  name: string
  /** 文档数 */
  docs: number
  /** 展示用容量文案 */
  size: string
  updatedAt: string
  enabled: boolean
  /** 容量（字节） */
  sizeBytes: number
  description: string
  maintainer: string
  scope: VisibleScope
  /** 召回命中率（百分比数值） */
  hitRate: number
  /** 近 7 天检索次数 */
  retrievals7d: number
  /** 向量模型 */
  embedding: string
  chunkSize: number
  chunkOverlap: number
  topK: number
  /** 相似度阈值（0-1） */
  scoreThreshold: number
  vectorCount: number
}

export type KnowledgeDocType = 'pdf' | 'docx' | 'md' | 'txt' | 'xlsx'

/** 知识库文档 */
export interface KnowledgeDoc {
  id: string
  knowledgeId: string
  name: string
  type: KnowledgeDocType
  sizeBytes: number
  chunks: number
  status: '已入库' | '解析中' | '解析失败'
  uploader: string
  uploadedAt: string
}

/** 检索命中片段 */
export interface KnowledgeHit {
  id: string
  score: number
  docName: string
  snippet: string
  chunkIndex: number
}

/** 检索测试结果 */
export interface KnowledgeTestResult {
  query: string
  topK: number
  /** 耗时（ms） */
  elapsed: number
  hits: KnowledgeHit[]
}

export type KnowledgeAction = '新建知识库' | '上传文档' | '删除文档' | '调整参数' | '启用' | '停用'

/** 知识库更新日志 */
export interface KnowledgeChangeLog {
  id: string
  action: KnowledgeAction
  target: string
  operator: string
  time: string
  note: string
}

/** 知识库页 KPI */
export interface KnowledgeOverview {
  total: number
  docs: number
  sizeGb: number
  retrievals7d: number
}

/** 知识库详情 */
export interface KnowledgeDetail extends KnowledgeItem {
  documents: KnowledgeDoc[]
  changeLogs: KnowledgeChangeLog[]
}

/** 知识库新建 / 编辑入参 */
export interface KnowledgePayload {
  name: string
  description: string
  maintainer: string
  scope: VisibleScope
  embedding: string
  chunkSize: number
  chunkOverlap: number
  topK: number
  scoreThreshold: number
  enabled: boolean
}

/* ---------------- MCP ---------------- */

export type McpStatus = '在线' | '离线' | '异常'

/** MCP 服务（平台统一维护，仅可查看 / 授权下载） [批注 21] */
export interface McpItem {
  id: string
  name: string
  protocol: 'stdio' | 'sse' | 'http'
  version: string
  /** 工具数 */
  tools: number
  description: string
  /** 服务用途（详情概览展示） [批注 21] */
  purpose: string
  /** 适用范围（详情概览展示） [批注 21] */
  scope: string
  status: McpStatus
  /** 连接延迟（ms） */
  latency: number
  calls30d: number
  /** 最近调用时间（未接入为空串，展示「暂无」） [批注 21] */
  lastCalledAt: string
  updatedAt: string
  maintainer: string
  endpoint: string
  authType: '令牌' | 'OAuth 2.0' | '无'
  lastCheckedAt: string
}

/** MCP 工具 */
export interface McpTool {
  id: string
  mcpId: string
  name: string
  description: string
  calls: number
  /** JSON Schema 文本 */
  schema: string
}

/** MCP 调用记录 */
export interface McpCallLog {
  id: string
  mcpId: string
  calledAt: string
  tool: string
  caller: string
  status: '成功' | '失败'
  latency: number
}

/** MCP 趋势点 */
export interface McpTrendPoint {
  date: string
  calls: number
}

/** MCP 页 KPI */
export interface McpOverview {
  services: number
  tools: number
  online: number
  calls30d: number
}

/** MCP 详情（含只读连接配置） */
export interface McpDetail extends McpItem {
  toolList: McpTool[]
  logs: McpCallLog[]
  trend: McpTrendPoint[]
  /** 超时（秒） */
  timeout: number
  /** 心跳间隔（秒） */
  heartbeat: number
  inspectedAt: string
}

/** 连通性测试结果 */
export interface ConnectivityResult {
  ok: boolean
  status: McpStatus
  latency: number
  checkedAt: string
  message: string
}

/* ---------------- LLM ---------------- */

/** LLM 服务与额度 [批注 22] */
export interface LlmItem {
  id: string
  name: string
  vendor: string
  balance: number
  used: number
  /** 计费 / 额度单位 [批注 22] */
  unit: string
  /** 额度所属组织 [批注 22] */
  quotaOrg: string
  /** 数据更新时间 [批注 22] */
  updatedAt: string
  status: '正常' | '余额预警' | '已停用'
  /** 模型标识 */
  model: string
  /** 上下文窗口（K） */
  contextWindow: number
  todayCalls: number
  todayTokens: number
  /** 本月费用（元） */
  monthCost: number
  /** 输入单价（元/千 Token） */
  priceIn: number
  /** 输出单价（元/千 Token） */
  priceOut: number
  apiKeyMasked: string
  /** 限流（RPM） */
  rateLimit: number
  /** 余额告警阈值（%） */
  alertThreshold: number
  connected: boolean
  avgLatency: number
  lastCheckedAt: string
}

/** LLM 用量趋势点 */
export interface LlmUsagePoint {
  date: string
  calls: number
  tokensIn: number
  tokensOut: number
  cost: number
}

/** 按智能体拆分的调用量 */
export interface LlmAgentUsage {
  agent: string
  calls: number
  /** 占比（百分比数值） */
  share: number
}

/** LLM 分配记录（内部分配额度，非真实购买） [批注 22] */
export interface LlmAllocateRecord {
  id: string
  /** 所属模型 */
  llmId: string
  /** 操作时间 */
  time: string
  /** 分配对象（中心 / 课题组） */
  target: string
  /** 分配数量 */
  amount: number
  /** 额度单位（Token / 万 Token） */
  unit: 'Token' | '万 Token'
  operator: string
  /** 分配说明 */
  note: string
}

/** LLM 页 KPI */
export interface LlmOverview {
  models: number
  todayCalls: number
  todayTokens: number
  monthCost: number
}

/** LLM 详情 */
export interface LlmDetail extends LlmItem {
  trend: LlmUsagePoint[]
  /** 分配记录 [批注 22] */
  allocations: LlmAllocateRecord[]
  agentUsage: LlmAgentUsage[]
}

/* ---------------- 智能体 ---------------- */

/** 智能体（内置智能体不可删除） */
export interface AgentItem {
  id: string
  name: string
  /** 职责 */
  role: string
  skills: string[]
  /** 内置智能体不可删除 */
  builtin: boolean
  enabled: boolean
  description: string
  /** 绑定模型 */
  model: string
  /** 绑定知识库 */
  knowledge: string[]
  /** 今日会话数 */
  sessions: number
  sessions30d: number
  /** 满意度（百分比数值） */
  satisfaction: number
  version: string
  updatedAt: string
  temperature: number
  topP: number
  maxRounds: number
  /** 系统提示词 */
  prompt: string
  /** 兜底 / 转人工策略 */
  fallback: string
  scope: VisibleScope
}

/** 智能体版本 */
export interface AgentVersion {
  version: string
  publishedAt: string
  publisher: string
  note: string
  /** 该版本的系统提示词快照 */
  prompt: string
  active: boolean
}

/** 智能体会话记录 */
export interface AgentSession {
  id: string
  agentId: string
  patient: string
  doctor: string
  channel: 'APP' | 'Web' | '微信'
  /** 对话轮次 */
  rounds: number
  /** 时长（分钟） */
  duration: number
  /** 满意度（百分比数值） */
  satisfaction: number
  status: '已结束' | '进行中' | '转人工'
  startedAt: string
}

/** 智能体趋势点 */
export interface AgentTrendPoint {
  date: string
  sessions: number
}

/** 智能体页 KPI */
export interface AgentOverview {
  total: number
  enabled: number
  todaySessions: number
  avgSatisfaction: number
}

/** 智能体详情 */
export interface AgentDetail extends AgentItem {
  versions: AgentVersion[]
  sessionList: AgentSession[]
  trend: AgentTrendPoint[]
}

/** 智能体新建 / 编辑入参 */
export interface AgentPayload {
  name: string
  role: string
  description: string
  model: string
  knowledge: string[]
  skills: string[]
  scope: VisibleScope
  temperature: number
  topP: number
  maxRounds: number
  prompt: string
  fallback: string
  enabled: boolean
}

/** 研究指标 */
export interface ResearchItem {
  id: string
  name: string
  owner: string
  center: string
  groupBy: string[]
  indicators: string[]
  members: number
  shared: boolean
  shareLevel: '平台' | '中心' | '课题组'
  /** 共享内容 [批注 08] */
  shareContents?: ResearchShareContentValue[]
  shareTargets?: string[]
  /** 实际可见范围说明 */
  actualVisibleScope?: string
  /** 项目详情编号 */
  detailId?: string
  status: '进行中' | '已结题'
  updatedAt: string
}

/** 研究 Agent 对话消息 */
export interface ResearchChatMessage {
  id: string
  from: 'agent' | 'user'
  content: string
  time: string
}

/** 助理 / 护士 */
export interface StaffItem {
  id: string
  name: string
  role: '助理' | '护士'
  doctor: string
  phone: string
  patients: number
  status: '在职' | '停用'
}

/** 自动化配置项 */
export interface AutomationItem {
  key: string
  label: string
  description: string
  enabled: boolean
}

/** 组织（中心 / 课题组） */
export interface OrgItem {
  id: string
  name: string
  parent: string
  leader: string
  members: number
  status: '运行中' | '已停用'
  createdAt: string
}

/** 平台列表项（系统管理） */
export interface PlatformItem {
  id: string
  name: string
  centers: number
  users: number
  status: '运行中' | '已暂停'
  createdAt: string
}

/** 用户类型（各级用户管理） */
export type UserType =
  | '平台负责人'
  | '中心负责人'
  | '课题组负责人'
  | '医生'
  | '医生助理'
  | '护士'
  | '患者'
  | '患者家属'

/** 课题组医生（课题组管理端） */
export interface GroupDoctor {
  id: string
  name: string
  title: string
  org: string
  patients: number
  status: '在职' | '停用'
}

/** 管理端用户 */
export interface WebUserItem {
  id: string
  name: string
  type: UserType
  org: string
  phone: string
  status: '正常' | '待激活' | '已停用'
  createdAt: string
}

/** 工作台统计 */
export interface WorkbenchStats {
  patientTotal: number
  examTotal: number
  sampleTotal: number
  /** 检测数据量（TB） */
  dataVolume: number
  /** 早筛预警 */
  earlyScreen: { count: number; total: number; accuracy: number }
  /** 早诊预警 */
  earlyDiagnosis: { count: number; total: number; accuracy: number }
  /** 转归预测，按窗口拆分 */
  outcome: Array<{ window: string; count: number; total: number; accuracy: number }>
  modelCount: number
  agentCount: number
  researchCount: number
  publicationCount: number
  citations: number
  influence: number
  /** 角色附加指标 */
  platformCount?: number
  centerCount?: number
  groupCount?: number
  doctorCount?: number
  /** 中心地图分布（平台 / 系统管理端） */
  centerMap?: Array<{ name: string; value: number }>
  /** 在管患者状态分布 */
  patientStatus: Array<{ status: string; count: number }>
  /** 近 7 日趋势 */
  trend: Array<{ date: string; patients: number; alerts: number }>
}

/* ---------------- 状态管理 · 自动化执行记录 [批注 09] ---------------- */

export type AutomationTaskType = '资料同步' | '识别解析' | '模型评估' | '随访草稿生成'

export type AutomationTaskStatus = '待执行' | '执行中' | '执行成功' | '执行失败' | '待补资料'

export interface AutomationTask {
  id: string
  patientId: string
  type: AutomationTaskType
  /** 触发时间 */
  triggeredAt: string
  /** 触发来源：自动 / 人工 */
  triggerSource: '自动' | '人工'
  status: AutomationTaskStatus
  /** 失败／缺项说明 */
  note: string
  /** 来源记录（关联原检查/患者记录描述） */
  sourceRecord: string
  /** 输入资料 */
  inputs: string[]
  /** 模型／规则版本 */
  modelVersion: string
  /** 关联结果说明 */
  relatedResult: string
  /** 可跳转的关联报告编号 */
  relatedReportId?: string
}

/* ---------------- 患者管理 V2 · 档案 / 研究入组 [批注 01-04 / 03] ---------------- */

/** 初始入口 [批注 02] */
export type InitialEntry = '拟接受高危药物治疗' | '正在接受高危药物治疗' | '已确诊DLI'

/** 当前阶段 [批注 02] */
export type PatientStage = '治疗前' | '治疗中' | '诊断后'

/** 研究入组状态 [批注 03] */
export type EnrollStatus = '未申请' | '待核对' | '待确认' | '已入组' | '不符合' | '已退出'

/** 入组条件核对结论 [批注 03] */
export type CriteriaStatus = '符合' | '不符合' | '待核对'

/** 同意书签署方式 [批注 16] */
export type ConsentSignMethod = 'App签署' | '纸质签署'

/** 研究共享内容 [批注 08] */
export type ResearchShareContentValue = '项目概况' | '进度汇总' | '已确认研究结果'

/** 入组条件清单条目 [批注 03/15] */
export interface EnrollCriterion {
  id: string
  projectId: string
  version: string
  type: '纳入条件' | '排除条件'
  content: string
  basis: string
  required: boolean
}

/** 入组条件逐项核对 [批注 03] */
export interface CriterionCheck {
  criterionId: string
  met: '是' | '否' | '待确认'
  note: string
}

/** 研究项目主数据（与 RESEARCHES 同源）[批注 03/15] */
export interface ResearchProject {
  id: string
  name: string
  groups: string[]
  criteriaVersion: string
}

/** 患者研究入组记录 [批注 03] */
export interface PatientEnrollment {
  id: string
  patientId: string
  projectId: string
  criteriaStatus: CriteriaStatus
  criteriaVersion: string
  checks: CriterionCheck[]
  /** 同意书状态（与批注 16 同一枚举值）[批注 03] */
  consentStatus: ConsentStatus
  consentTemplateId: string
  consentTemplateName: string
  consentVersion: string
  consentIssuedAt: string
  consentDate: string
  consentMethod: ConsentSignMethod | ''
  consentFileName: string
  consentCheckedBy: string
  consentCheckedAt: string
  consentCheckResult?: '通过' | '需补充'
  consentNote: string
  consentWithdrawReason: string
  status: EnrollStatus
  group: string
  researchNo: string
  enrollDate: string
  groupDate: string
  groupBasis: string
  exitDate: string
  exitReason: string
  rejectReason: string
  updatedAt: string
}

/** 患者扩展档案 [批注 01-04 / 02] */
export interface PatientProfile {
  patientId: string
  initialEntry: InitialEntry
  stage: PatientStage
  stageConfirmed: boolean
  diagnosisConfirmed: boolean
  diagnosisDate: string
  diagnosisBasis: string
  stageUpdatedAt: string
  stageNote: string
  enrollments: PatientEnrollment[]
}

/** 患者管理 V2 列表行（含档案 / 入组扩展列）[批注 01-04] */
export interface PatientRow extends WebPatient {
  initialEntry: InitialEntry
  stage: PatientStage
  stageConfirmed: boolean
  projectCount: number
  projectSelected: boolean
  selectedProjectName: string
  selectedEnrollStatus: EnrollStatus
  selectedGroup: string
  selectedResearchNo: string
}
