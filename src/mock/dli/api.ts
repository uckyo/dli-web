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
  LLM_RECHARGES,
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
import type {
  AgentDetail,
  AgentItem,
  AgentOverview,
  AgentPayload,
  AgentSession,
  AiModel,
  ConnectivityResult,
  ExamCategory,
  ExamRecord,
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
  ResearchItem,
  SampleRecord,
  SampleTestRecord,
  SkillDetail,
  SkillItem,
  SkillOverview,
  SkillPayload,
  StaffItem,
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
}

/** 检查列表查询参数 */
export interface ExamQueryParams {
  current?: number
  size?: number
  keyword?: string
  category?: ExamCategory | ''
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

  const stats: WorkbenchStats = {
    patientTotal,
    examTotal: 1864,
    sampleTotal: 742,
    dataVolume: 126.8,
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

/** 患者列表（分页 + 筛选） */
export async function fetchGetPatientList(
  params: PatientQueryParams
): Promise<Api.Common.PaginatedResponse<WebPatient>> {
  await delay()
  let list = [...PATIENTS]
  if (params.keyword) {
    const keyword = params.keyword.trim().toLowerCase()
    list = list.filter(
      (item) =>
        item.name.includes(keyword) ||
        item.id.toLowerCase().includes(keyword) ||
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
  return paginate(list, params.current, params.size)
}

/** 患者详情（含对话与诊疗历程） */
export async function fetchGetPatientDetail(id: string): Promise<WebPatientDetail> {
  await delay()
  const detail = PATIENT_DETAILS[id]
  if (!detail) throw new Error('患者不存在')
  return detail
}

/** 检查列表（按分类） */
export async function fetchGetExamList(
  params: ExamQueryParams
): Promise<Api.Common.PaginatedResponse<ExamRecord>> {
  await delay()
  let list = EXAMS.filter((item) => !params.category || item.category === params.category)
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

/** 生物样本列表 */
export async function fetchGetSampleList(params: {
  current?: number
  size?: number
  keyword?: string
}): Promise<Api.Common.PaginatedResponse<SampleRecord>> {
  await delay()
  let list = [...SAMPLES]
  if (params.keyword) {
    const keyword = params.keyword.trim().toLowerCase()
    list = list.filter(
      (item) =>
        item.id.toLowerCase().includes(keyword) ||
        item.name.includes(keyword) ||
        item.patientId.toLowerCase().includes(keyword)
    )
  }
  return paginate(list, params.current, params.size)
}

/** 按编号读取样本（检测详情关联样本） */
export async function fetchGetSampleById(id: string): Promise<SampleRecord | undefined> {
  await delay(120)
  return SAMPLES.find((item) => item.id === id)
}

/** 样本检测列表 */
export async function fetchGetSampleTestList(params: {
  current?: number
  size?: number
  keyword?: string
}): Promise<Api.Common.PaginatedResponse<SampleTestRecord>> {
  await delay()
  let list = [...SAMPLE_TESTS]
  if (params.keyword) {
    const keyword = params.keyword.trim().toLowerCase()
    list = list.filter(
      (item) =>
        item.id.toLowerCase().includes(keyword) ||
        item.item.includes(keyword) ||
        item.sampleId.toLowerCase().includes(keyword) ||
        item.patientId.toLowerCase().includes(keyword)
    )
  }
  return paginate(list, params.current, params.size)
}

/** 模型列表 */
export async function fetchGetModels(): Promise<AiModel[]> {
  await delay(180)
  return [...MODELS]
}

/** 启停模型 */
export async function fetchToggleModel(id: string, enabled: boolean): Promise<void> {
  await delay(150)
  const model = MODELS.find((item) => item.id === id)
  if (model) model.enabled = enabled
}

/** 保存模型 */
export async function fetchSaveModel(payload: AiModel): Promise<void> {
  await delay(300)
  const index = MODELS.findIndex((item) => item.id === payload.id)
  if (index > -1) {
    MODELS[index] = payload
    return
  }
  MODELS.unshift(payload)
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
    recharges: LLM_RECHARGES.filter((record) => record.note.includes(llm.name)),
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

/** 启停 LLM */
export async function fetchToggleLlm(id: string, enabled: boolean): Promise<void> {
  await delay(200)
  const llm = LLMS.find((item) => item.id === id)
  if (!llm) return
  llm.status = enabled ? (llm.balance < 120000 ? '余额预警' : '正常') : '已停用'
  llm.connected = enabled
  llm.lastCheckedAt = `${todayStr()} ${new Date().toTimeString().slice(0, 5)}`
}

/** 充值（金额按输入单价换算为 Token） */
export async function fetchRechargeLlm(id: string, amount: number, note = ''): Promise<number> {
  await delay(360)
  const llm = LLMS.find((item) => item.id === id)
  if (!llm) return 0
  const tokens = Math.round((amount / Math.max(llm.priceIn, 0.0001)) * 1000)
  llm.balance += tokens
  if (llm.status !== '已停用') llm.status = '正常'
  LLM_RECHARGES.unshift({
    id: `LR-${Date.now()}`,
    amount,
    tokens,
    operator: '当前管理员',
    time: `${todayStr()} ${new Date().toTimeString().slice(0, 5)}`,
    note: note ? `${llm.name} · ${note}` : `${llm.name} 充值`
  })
  return tokens
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
  /** 仅查看共享项目（管理端） */
  onlyShared?: boolean
}): Promise<Api.Common.PaginatedResponse<ResearchItem>> {
  await delay()
  let list = [...RESEARCHES]
  if (params.onlyShared) list = list.filter((item) => item.shared)
  if (params.keyword) {
    const keyword = params.keyword.trim()
    list = list.filter(
      (item) =>
        item.name.includes(keyword) || item.owner.includes(keyword) || item.id.includes(keyword)
    )
  }
  return paginate(list, params.current, params.size)
}

/** 新建研究项目 */
export async function fetchCreateResearch(
  payload: Pick<
    ResearchItem,
    'name' | 'groupBy' | 'indicators' | 'shared' | 'shareLevel' | 'owner' | 'center'
  >
): Promise<void> {
  await delay(400)
  RESEARCHES.unshift({
    ...payload,
    id: `R-2026-${String(RESEARCHES.length + 4).padStart(3, '0')}`,
    members: 1,
    status: '进行中',
    updatedAt: new Date().toISOString().slice(0, 10)
  })
}

/** 更新研究共享设置 */
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

/** 新增用户 */
export async function fetchAddUser(payload: Omit<WebUserItem, 'id' | 'createdAt'>): Promise<void> {
  await delay(300)
  USERS_DATA.push({
    ...payload,
    id: `MU-${9000 + USERS_DATA.length}`,
    createdAt: new Date().toISOString().slice(0, 10)
  })
}

/** 启用 / 停用用户 */
export async function fetchToggleUser(id: string, status: WebUserItem['status']): Promise<void> {
  await delay(200)
  const user = USERS_DATA.find((item) => item.id === id)
  if (user) user.status = status
}

/** 删除用户（仅平台管理端可调用） */
export async function fetchDeleteUser(id: string): Promise<void> {
  await delay(250)
  const index = USERS_DATA.findIndex((item) => item.id === id)
  if (index > -1) USERS_DATA.splice(index, 1)
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
