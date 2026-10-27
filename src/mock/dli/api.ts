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
  CENTER_MAP_DATA,
  CENTERS_DATA,
  EXAM_AUTOMATION,
  EXAMS,
  FOLLOWUP_AUTOMATION,
  GROUP_DOCTORS,
  GROUPS_DATA,
  KNOWLEDGE,
  LLMS,
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
  STAFFS,
  TREND_DATA,
  USERS_DATA
} from './data'
import type {
  AiModel,
  ExamCategory,
  ExamRecord,
  GroupDoctor,
  OrgItem,
  PlatformItem,
  ResearchItem,
  SampleRecord,
  SampleTestRecord,
  SkillItem,
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

  const stats: WorkbenchStats = {
    patientTotal: 231,
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
    const keyword = params.keyword.trim()
    list = list.filter(
      (item) => item.patientName.includes(keyword) || item.id.toLowerCase().includes(keyword)
    )
  }
  return paginate(list, params.current, params.size)
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
    const keyword = params.keyword.trim()
    list = list.filter(
      (item) => item.patientName.includes(keyword) || item.sampleId.toLowerCase().includes(keyword)
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

/** 智能管理聚合数据 */
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

/** 启停智能体 */
export async function fetchToggleAgent(id: string, enabled: boolean): Promise<void> {
  await delay(150)
  const agent = AGENTS.find((item) => item.id === id)
  if (agent && agent.builtin) agent.enabled = enabled
}

/** 删除自定义智能体（内置不可删） */
export async function fetchDeleteAgent(id: string): Promise<void> {
  await delay(200)
  const index = AGENTS.findIndex((item) => item.id === id)
  if (index > -1 && !AGENTS[index].builtin) AGENTS.splice(index, 1)
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
