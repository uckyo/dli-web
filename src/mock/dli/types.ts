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

/** 患者列表项 */
export interface WebPatient {
  id: string
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
  status: '已归档' | '待解析' | '解析中'
}

/** 生物样本 */
export interface SampleRecord {
  id: string
  patientId: string
  patientName: string
  type: '全血' | '血浆' | '血清' | '组织' | '尿液'
  collectedAt: string
  location: string
  status: '已入库' | '待入库' | '已出库'
}

/** 样本检测记录 */
export interface SampleTestRecord {
  id: string
  sampleId: string
  patientName: string
  item: string
  result: string
  testedAt: string
  status: '已完成' | '检测中' | '异常'
}

/** 模型方向：纵向 = 多时间点，横向 = 单时间点 */
export type ModelDirection = '纵向' | '横向'

/** AI 模型 */
export interface AiModel {
  id: string
  name: string
  direction: ModelDirection
  /** 纵向多选 / 横向单选的时间点 */
  timePoints: string[]
  /** 输入，可缺省 */
  input: string
  /** 输出 */
  output: string
  enabled: boolean
  accuracy: number
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

/** MCP 服务（平台统一维护，仅可查看 / 测试 / 下载） */
export interface McpItem {
  id: string
  name: string
  protocol: 'stdio' | 'sse' | 'http'
  version: string
  /** 工具数 */
  tools: number
  description: string
  status: McpStatus
  /** 连接延迟（ms） */
  latency: number
  calls30d: number
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

/** LLM 模型与 Token 余额 */
export interface LlmItem {
  id: string
  name: string
  vendor: string
  balance: number
  used: number
  unit: string
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

/** 充值记录 */
export interface LlmRechargeRecord {
  id: string
  amount: number
  tokens: number
  operator: string
  time: string
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
  recharges: LlmRechargeRecord[]
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
