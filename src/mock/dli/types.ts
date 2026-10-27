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

/** 技能 */
export interface SkillItem {
  id: string
  name: string
  type: '工具调用' | '提示词' | '工作流'
  calls: number
  agent: string
  enabled: boolean
}

/** 知识库 */
export interface KnowledgeItem {
  id: string
  name: string
  docs: number
  size: string
  updatedAt: string
  enabled: boolean
}

/** MCP 服务（仅允许下载） */
export interface McpItem {
  id: string
  name: string
  protocol: 'stdio' | 'sse' | 'http'
  version: string
  tools: number
  description: string
}

/** LLM 模型与 Token 余额 */
export interface LlmItem {
  id: string
  name: string
  vendor: string
  balance: number
  used: number
  unit: string
  status: '正常' | '余额预警' | '已停用'
}

/** 智能体 */
export interface AgentItem {
  id: string
  name: string
  role: string
  skills: string[]
  /** 内置智能体不可删除 */
  builtin: boolean
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
  /** 近 7 日趋势 */
  trend: Array<{ date: string; patients: number; alerts: number }>
}
