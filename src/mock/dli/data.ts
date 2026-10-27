/**
 * DLI 疾病智能管理平台 - Mock 数据
 *
 * 数据口径对齐《疾病智能管理平台系统.md》：
 * - 患者管理：编号 / 对话 / 诊疗历程 / 状态 / 早筛预警 / 早诊预警 / 转归预测
 * - 检查管理：影像 / 病理 / 检验 / 病历 / 其他
 * - 生物样本：样本管理 / 检测管理
 * - 模型管理：纵向（多时间点）/ 横向（单时间点）
 * - 智能管理：技能 / 知识库 / MCP / LLM / Agent
 */
import type {
  AgentItem,
  AiModel,
  AutomationItem,
  ExamCategory,
  ExamRecord,
  GroupDoctor,
  KnowledgeItem,
  LlmItem,
  McpItem,
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
  WebUserItem
} from './types'

const CENTERS = ['华东中心', '华北中心', '华南中心', '西南中心']

const DOCTORS = ['陈明远', '周雅琴', '刘志远', '孙可欣']

const NAMES = [
  '王建国',
  '李秀英',
  '张伟',
  '刘芳',
  '陈志强',
  '杨丽华',
  '赵国强',
  '黄敏',
  '周文斌',
  '吴淑珍',
  '徐海涛',
  '孙丽娟',
  '马建军',
  '朱慧敏',
  '胡永强',
  '郭晓燕',
  '林志明',
  '何秀芳',
  '高建华',
  '罗春梅',
  '郑国庆',
  '梁小玲',
  '谢国平',
  '韩雪梅'
]

const WARN_LEVELS: WarnLevel[] = ['high', 'medium', 'low', 'none']

/** 生成患者编码 */
const patientId = (index: number): string => `DLI-2026-${String(index + 1).padStart(4, '0')}`

/** 生成日期字符串 */
const day = (offset: number): string => {
  const date = new Date('2026-10-26T09:00:00')
  date.setDate(date.getDate() - offset)
  return date.toISOString().slice(0, 10)
}

/** 患者列表 */
export const PATIENTS: WebPatient[] = NAMES.map((name, index) => {
  const screenLevel = WARN_LEVELS[index % 4]
  const diagnosisLevel = WARN_LEVELS[(index + 1) % 4]
  const statusList: WebPatient['status'][] = ['用药中', '随访中', '待评估', '已结案']
  const windows: Array<'3个月' | '6个月' | '12个月'> = ['3个月', '6个月', '12个月']
  return {
    id: patientId(index),
    name,
    gender: index % 2 === 0 ? '男' : '女',
    age: 42 + (index % 28),
    center: CENTERS[index % CENTERS.length],
    group: index % 3 === 0 ? '常规组' : 'AI 组',
    status: statusList[index % statusList.length],
    earlyScreen: {
      level: screenLevel,
      score: screenLevel === 'none' ? 0 : 48 + ((index * 7) % 50)
    },
    earlyDiagnosis: {
      level: diagnosisLevel,
      score: diagnosisLevel === 'none' ? 0 : 45 + ((index * 11) % 52)
    },
    outcome: {
      window: windows[index % windows.length],
      probability: 0.18 + ((index * 13) % 60) / 100,
      label: index % 3 === 0 ? '好转' : index % 3 === 1 ? '稳定' : '进展风险'
    },
    lastUpdate: day(index % 12),
    doctor: DOCTORS[index % DOCTORS.length]
  }
})

/** 组装患者详情（对话 + 诊疗历程） */
const buildDetail = (patient: WebPatient, index: number): WebPatientDetail => ({
  ...patient,
  phone: `13${(index % 9) + 1}****${String(2000 + index * 13).slice(-4)}`,
  chiefComplaint: index % 2 === 0 ? '咳嗽伴活动后气促 2 周' : '发热 3 天，伴乏力、干咳',
  medication: ['甲泼尼龙片 8mg', '吗替麦考酚酯胶囊 0.5g', '碳酸钙D3片 600mg'],
  conversations: [
    {
      id: `c-${index}-1`,
      from: 'patient',
      sender: patient.name,
      content: '医生，这两天晚上咳嗽得厉害，需要去医院看看吗？',
      time: `${day(1)} 20:12`
    },
    {
      id: `c-${index}-2`,
      from: 'doctor',
      sender: patient.doctor,
      content: '先记录一下体温和血氧，如果血氧低于 93% 或发热超过 38.5℃ 请尽快来院。',
      time: `${day(1)} 20:35`
    },
    {
      id: `c-${index}-3`,
      from: 'patient',
      sender: patient.name,
      content: '今天体温 37.6℃，血氧 95%，咳嗽稍微好一点。',
      time: `${day(0)} 09:05`
    }
  ],
  history: [
    {
      id: `h-${index}-1`,
      date: day(1),
      category: '现病史',
      title: '咳嗽伴活动后气促加重',
      detail: '夜间明显，无咯血，自测血氧 95%。'
    },
    {
      id: `h-${index}-2`,
      date: day(28),
      category: '用药',
      title: '启动高危药物治疗',
      detail: '甲泼尼龙片 8mg qd + 吗替麦考酚酯胶囊 0.5g bid，同步补钙。'
    },
    {
      id: `h-${index}-3`,
      date: day(35),
      category: '检查',
      title: '胸部 HRCT',
      detail: '双肺散在磨玻璃影，建议 3 个月后复查。'
    },
    {
      id: `h-${index}-4`,
      date: day(40),
      category: '既往史',
      title: '类风湿关节炎 6 年',
      detail: '长期口服免疫抑制剂，无吸烟史。'
    },
    {
      id: `h-${index}-5`,
      date: day(60),
      category: '诊断',
      title: '入组 DLI 智能管理',
      detail: `入组 ${patient.group}，主管医生 ${patient.doctor}。`
    }
  ]
})

/** 患者详情字典 */
export const PATIENT_DETAILS: Record<string, WebPatientDetail> = PATIENTS.reduce(
  (acc, patient, index) => {
    acc[patient.id] = buildDetail(patient, index)
    return acc
  },
  {} as Record<string, WebPatientDetail>
)

/** 检查记录 */
export const EXAMS: ExamRecord[] = PATIENTS.slice(0, 16).flatMap((patient, index) => {
  const categories: ExamCategory[] = ['影像', '病理', '检验', '病历', '其他']
  const items: Record<ExamCategory, string> = {
    影像: '胸部 HRCT 平扫',
    病理: '支气管镜活检病理',
    检验: '血常规 + 肝肾功能',
    病历: '门诊病历归档',
    其他: '肺功能检查（FVC/DLCO）'
  }
  const category = categories[index % categories.length]
  return [
    {
      id: `EX-${String(index + 1).padStart(4, '0')}`,
      patientId: patient.id,
      patientName: patient.name,
      category,
      item: items[category],
      center: patient.center,
      date: day(index % 20),
      status: index % 5 === 0 ? '待解析' : index % 7 === 0 ? '解析中' : '已归档'
    }
  ]
})

/** 生物样本 */
export const SAMPLES: SampleRecord[] = PATIENTS.slice(0, 14).map((patient, index) => {
  const types: SampleRecord['type'][] = ['全血', '血浆', '血清', '组织', '尿液']
  return {
    id: `SP-${String(index + 1).padStart(4, '0')}`,
    patientId: patient.id,
    patientName: patient.name,
    type: types[index % types.length],
    collectedAt: day(index % 15),
    location: `${patient.center} B${(index % 3) + 1}-${String((index % 20) + 1).padStart(2, '0')}`,
    status: index % 6 === 0 ? '待入库' : index % 9 === 0 ? '已出库' : '已入库'
  }
})

/** 样本检测记录 */
export const SAMPLE_TESTS: SampleTestRecord[] = SAMPLES.slice(0, 12).map((sample, index) => {
  const items = ['炎症因子谱', '自身抗体检测', '转录组测序', '血药浓度监测']
  return {
    id: `TS-${String(index + 1).padStart(4, '0')}`,
    sampleId: sample.id,
    patientName: sample.patientName,
    item: items[index % items.length],
    result: index % 4 === 1 ? 'IL-6 升高' : index % 4 === 2 ? '未见异常' : '—',
    testedAt: day(index % 10),
    status: index % 5 === 0 ? '检测中' : index % 7 === 0 ? '异常' : '已完成'
  }
})

/** AI 模型 */
export const MODELS: AiModel[] = [
  {
    id: 'M-001',
    name: '早筛风险预测模型',
    direction: '纵向',
    timePoints: ['T0 基线', 'T1 用药 1 月', 'T2 用药 3 月'],
    input: '结构化病历 + 检验 + 影像组学',
    output: '早筛风险概率、关键风险因素',
    enabled: true,
    accuracy: 0.91,
    updatedAt: '2026-10-20'
  },
  {
    id: 'M-002',
    name: '早诊辅助诊断模型',
    direction: '横向',
    timePoints: ['T1 首次异常'],
    input: '胸部 HRCT + 炎症指标',
    output: 'DLI 可能性、鉴别诊断提示',
    enabled: true,
    accuracy: 0.88,
    updatedAt: '2026-10-18'
  },
  {
    id: 'M-003',
    name: '转归预测模型',
    direction: '纵向',
    timePoints: ['T0 基线', 'T2 用药 3 月', 'T3 用药 6 月'],
    input: '时序检验 + 用药依从性',
    output: '3/6/12 个月转归分层',
    enabled: true,
    accuracy: 0.84,
    updatedAt: '2026-10-15'
  },
  {
    id: 'M-004',
    name: '随访风险分层模型',
    direction: '横向',
    timePoints: ['T3 用药 6 月'],
    input: '',
    output: '随访频次建议',
    enabled: false,
    accuracy: 0.79,
    updatedAt: '2026-09-30'
  }
]

/** 技能 */
export const SKILLS: SkillItem[] = [
  {
    id: 'S-01',
    name: '影像组学特征提取',
    type: '工具调用',
    calls: 1286,
    agent: '早诊报告Agent',
    enabled: true
  },
  {
    id: 'S-02',
    name: '检验指标趋势分析',
    type: '工作流',
    calls: 964,
    agent: '虚拟医生Agent',
    enabled: true
  },
  {
    id: 'S-03',
    name: '指南条款检索',
    type: '工具调用',
    calls: 742,
    agent: '虚拟医生Agent',
    enabled: true
  },
  {
    id: 'S-04',
    name: '随访计划生成',
    type: '提示词',
    calls: 518,
    agent: '随访Agent',
    enabled: true
  },
  {
    id: 'S-05',
    name: '结构化病历解析',
    type: '工具调用',
    calls: 431,
    agent: '早筛报告Agent',
    enabled: false
  }
]

/** 知识库 */
export const KNOWLEDGE: KnowledgeItem[] = [
  {
    id: 'K-01',
    name: 'DLI 诊疗指南库',
    docs: 128,
    size: '86 MB',
    updatedAt: '2026-10-22',
    enabled: true
  },
  {
    id: 'K-02',
    name: '高危药物说明书库',
    docs: 342,
    size: '210 MB',
    updatedAt: '2026-10-19',
    enabled: true
  },
  {
    id: 'K-03',
    name: '多中心病例库',
    docs: 1896,
    size: '4.2 GB',
    updatedAt: '2026-10-24',
    enabled: true
  },
  {
    id: 'K-04',
    name: '检验指标参考区间',
    docs: 76,
    size: '12 MB',
    updatedAt: '2026-09-12',
    enabled: false
  }
]

/** MCP 服务（仅可下载） */
export const MCPS: McpItem[] = [
  {
    id: 'MP-01',
    name: 'HIS 对接服务',
    protocol: 'http',
    version: '1.4.0',
    tools: 6,
    description: '患者主索引与就诊记录读取'
  },
  {
    id: 'MP-02',
    name: 'PACS 影像服务',
    protocol: 'sse',
    version: '2.0.1',
    tools: 4,
    description: 'DICOM 影像拉取与序列解析'
  },
  {
    id: 'MP-03',
    name: 'LIS 检验服务',
    protocol: 'http',
    version: '1.2.2',
    tools: 5,
    description: '检验结果同步与参考区间查询'
  },
  {
    id: 'MP-04',
    name: '病理系统服务',
    protocol: 'stdio',
    version: '0.9.6',
    tools: 3,
    description: '病理报告文本与切片索引'
  }
]

/** LLM 服务 */
export const LLMS: LlmItem[] = [
  {
    id: 'L-01',
    name: 'Qwen-Max',
    vendor: '阿里云百炼',
    balance: 864200,
    used: 135800,
    unit: 'tokens',
    status: '正常'
  },
  {
    id: 'L-02',
    name: 'DeepSeek-V3',
    vendor: '深度求索',
    balance: 92150,
    used: 307850,
    unit: 'tokens',
    status: '余额预警'
  },
  {
    id: 'L-03',
    name: 'GLM-4-Plus',
    vendor: '智谱 AI',
    balance: 0,
    used: 200000,
    unit: 'tokens',
    status: '已停用'
  }
]

/** 智能体（内置 5 个不可删除） */
export const AGENTS: AgentItem[] = [
  {
    id: 'A-01',
    name: '虚拟医生Agent',
    role: '医患对话与问诊引导',
    skills: ['检验指标趋势分析', '指南条款检索'],
    builtin: true,
    enabled: true
  },
  {
    id: 'A-02',
    name: '早筛报告Agent',
    role: '生成早筛风险评估报告',
    skills: ['结构化病历解析', '指南条款检索'],
    builtin: true,
    enabled: true
  },
  {
    id: 'A-03',
    name: '早诊报告Agent',
    role: '生成早诊与鉴别诊断报告',
    skills: ['影像组学特征提取', '指南条款检索'],
    builtin: true,
    enabled: true
  },
  {
    id: 'A-04',
    name: '转归预测报告Agent',
    role: '生成 3/6/12 月转归预测报告',
    skills: ['检验指标趋势分析'],
    builtin: true,
    enabled: true
  },
  {
    id: 'A-05',
    name: '随访Agent',
    role: '随访计划生成与执行跟进',
    skills: ['随访计划生成'],
    builtin: true,
    enabled: true
  },
  {
    id: 'A-06',
    name: '科研数据整理Agent',
    role: '按分组与指标导出研究数据集',
    skills: ['结构化病历解析'],
    builtin: false,
    enabled: true
  }
]

/** 研究项目 */
export const RESEARCHES: ResearchItem[] = [
  {
    id: 'R-2026-001',
    name: '激素联合免疫抑制剂 DLI 转归研究',
    owner: '陈明远',
    center: '华东中心',
    groupBy: ['年龄分层', '用药方案'],
    indicators: ['HRCT 磨玻璃影变化', 'FVC 下降率', 'IL-6 水平'],
    members: 6,
    shared: true,
    shareLevel: '平台',
    status: '进行中',
    updatedAt: '2026-10-24'
  },
  {
    id: 'R-2026-002',
    name: 'AI 早筛模型多中心验证',
    owner: '周雅琴',
    center: '华北中心',
    groupBy: ['中心', 'AI/常规组'],
    indicators: ['早筛灵敏度', '早筛特异度', 'AUC'],
    members: 11,
    shared: true,
    shareLevel: '中心',
    status: '进行中',
    updatedAt: '2026-10-21'
  },
  {
    id: 'R-2026-003',
    name: '生物样本炎症因子谱分析',
    owner: '刘志远',
    center: '华南中心',
    groupBy: ['样本类型'],
    indicators: ['IL-6', 'TNF-α', 'CRP'],
    members: 4,
    shared: false,
    shareLevel: '课题组',
    status: '进行中',
    updatedAt: '2026-10-12'
  },
  {
    id: 'R-2025-018',
    name: '智能随访依从性干预研究',
    owner: '孙可欣',
    center: '西南中心',
    groupBy: ['随访方式'],
    indicators: ['随访完成率', '失访率'],
    members: 8,
    shared: true,
    shareLevel: '平台',
    status: '已结题',
    updatedAt: '2026-06-30'
  }
]

/** 助理 / 护士 */
export const STAFFS: StaffItem[] = [
  {
    id: 'U-1001',
    name: '李晓彤',
    role: '助理',
    doctor: '陈明远',
    phone: '138****3201',
    patients: 46,
    status: '在职'
  },
  {
    id: 'U-1002',
    name: '赵佳怡',
    role: '助理',
    doctor: '周雅琴',
    phone: '139****7742',
    patients: 38,
    status: '在职'
  },
  {
    id: 'U-1003',
    name: '王丽',
    role: '护士',
    doctor: '陈明远',
    phone: '137****5580',
    patients: 52,
    status: '在职'
  },
  {
    id: 'U-1004',
    name: '孙倩',
    role: '护士',
    doctor: '刘志远',
    phone: '135****9163',
    patients: 41,
    status: '在职'
  },
  {
    id: 'U-1005',
    name: '陈晓峰',
    role: '助理',
    doctor: '孙可欣',
    phone: '136****4408',
    patients: 12,
    status: '停用'
  }
]

/** 患者自动化 */
export const PATIENT_AUTOMATION: AutomationItem[] = [
  {
    key: 'autoEnroll',
    label: '自动入组',
    description: '符合高危药物条件的患者自动进入 DLI 管理队列',
    enabled: true
  },
  {
    key: 'autoArchive',
    label: '自动建档',
    description: 'HIS 新增患者自动创建 DLI 档案并分配主管医生',
    enabled: true
  },
  {
    key: 'autoScreen',
    label: '自动触发早筛',
    description: '建档后自动调用早筛模型生成风险评估',
    enabled: true
  }
]

/** 检查自动化 */
export const EXAM_AUTOMATION: AutomationItem[] = [
  {
    key: 'autoCollect',
    label: '自动采集',
    description: '定时从 PACS / LIS 拉取患者检查与检验数据',
    enabled: true
  },
  {
    key: 'autoParse',
    label: '自动解析',
    description: '影像与病理报告自动结构化解析并归档',
    enabled: true
  },
  {
    key: 'autoAlert',
    label: '异常自动提示',
    description: '解析到关键异常指标时自动标记并通知主管医生',
    enabled: false
  }
]

/** 智能随访 */
export const FOLLOWUP_AUTOMATION: AutomationItem[] = [
  {
    key: 'autoPlan',
    label: '自动生成随访计划',
    description: '按诊断后 1/3/6/12 月节点自动生成随访任务',
    enabled: true
  },
  {
    key: 'autoNotify',
    label: '自动推送提醒',
    description: '随访到期前 3 天自动提醒患者与家属',
    enabled: true
  },
  {
    key: 'autoEscalate',
    label: '失访自动升级',
    description: '逾期 7 天未完成自动通知主管医生',
    enabled: true
  }
]

/** 中心（平台管理端维护，可删除） */
export const CENTERS_DATA: OrgItem[] = CENTERS.map((name, index) => ({
  id: `C-${String(index + 1).padStart(3, '0')}`,
  name,
  parent: 'DLI 智能管理平台',
  leader: DOCTORS[index % DOCTORS.length],
  members: 86 + index * 12,
  status: index === 3 ? '已停用' : '运行中',
  createdAt: day(120 - index * 10)
}))

/** 课题组（中心管理端维护） */
export const GROUPS_DATA: OrgItem[] = [
  {
    id: 'G-001',
    name: '呼吸影像课题组',
    parent: '华东中心',
    leader: '周雅琴',
    members: 14,
    status: '运行中',
    createdAt: day(96)
  },
  {
    id: 'G-002',
    name: '免疫药理课题组',
    parent: '华东中心',
    leader: '刘志远',
    members: 9,
    status: '运行中',
    createdAt: day(88)
  },
  {
    id: 'G-003',
    name: '临床随访课题组',
    parent: '华北中心',
    leader: '孙可欣',
    members: 11,
    status: '运行中',
    createdAt: day(75)
  },
  {
    id: 'G-004',
    name: '分子诊断课题组',
    parent: '华南中心',
    leader: '陈明远',
    members: 7,
    status: '已停用',
    createdAt: day(64)
  }
]

/** 平台（系统管理端维护） */
export const PLATFORMS_DATA: PlatformItem[] = [
  {
    id: 'P-01',
    name: 'DLI 智能管理平台',
    centers: 4,
    users: 386,
    status: '运行中',
    createdAt: day(180)
  },
  {
    id: 'P-02',
    name: '区域呼吸疾病平台',
    centers: 2,
    users: 96,
    status: '运行中',
    createdAt: day(92)
  },
  {
    id: 'P-03',
    name: '临床试验协作平台',
    centers: 1,
    users: 34,
    status: '已暂停',
    createdAt: day(60)
  }
]

/** 管理端用户（覆盖 8 类用户，含平台负责人） */
const PLATFORM_USER: WebUserItem = {
  id: 'MU-0001',
  name: '张启明',
  type: '平台负责人',
  org: 'DLI 智能管理平台',
  phone: '138****0001',
  status: '正常',
  createdAt: day(400)
}

const USER_TYPES: UserType[] = [
  '中心负责人',
  '课题组负责人',
  '医生',
  '医生助理',
  '护士',
  '患者',
  '患者家属'
]

const USER_NAMES = [
  ['陈明远', '周雅琴'],
  ['刘志远', '孙可欣', '赵佳怡'],
  ['陈明远', '周雅琴', '刘志远', '孙可欣'],
  ['李晓彤', '赵佳怡', '陈晓峰'],
  ['王丽', '孙倩'],
  ['王建国', '李秀英', '张伟'],
  ['王芳', '陈志强', '李娜']
]

export const USERS_DATA: WebUserItem[] = [
  PLATFORM_USER,
  ...USER_TYPES.flatMap((type, typeIndex) =>
    USER_NAMES[typeIndex].map(
      (name, index): WebUserItem => ({
        id: `MU-${typeIndex + 1}${String(index + 1).padStart(2, '0')}`,
        name,
        type,
        org:
          typeIndex < 2
            ? CENTERS_DATA[index % CENTERS_DATA.length].name
            : GROUPS_DATA[index % GROUPS_DATA.length].name,
        phone: `13${(index % 9) + 1}****${String(3000 + typeIndex * 100 + index * 7).slice(-4)}`,
        status:
          index === USER_NAMES[typeIndex].length - 1 && typeIndex % 2 === 0 ? '待激活' : '正常',
        createdAt: day(30 + typeIndex * 5 + index)
      })
    )
  )
]

/** 课题组医生（课题组管理端维护） */
export const GROUP_DOCTORS: GroupDoctor[] = [
  {
    id: 'GD-001',
    name: '周雅琴',
    title: '主任医师',
    org: '呼吸影像课题组',
    patients: 68,
    status: '在职'
  },
  {
    id: 'GD-002',
    name: '刘志远',
    title: '副主任医师',
    org: '免疫药理课题组',
    patients: 54,
    status: '在职'
  },
  {
    id: 'GD-003',
    name: '孙可欣',
    title: '主治医师',
    org: '呼吸影像课题组',
    patients: 41,
    status: '在职'
  },
  {
    id: 'GD-004',
    name: '陈明远',
    title: '主任医师',
    org: '临床随访课题组',
    patients: 86,
    status: '在职'
  },
  {
    id: 'GD-005',
    name: '赵佳怡',
    title: '住院医师',
    org: '免疫药理课题组',
    patients: 23,
    status: '停用'
  }
]

/** 中心在中国地图上的分布（平台 / 系统管理端） */
export const CENTER_MAP_DATA = [
  { name: '北京市', value: 1 },
  { name: '上海市', value: 1 },
  { name: '广东省', value: 1 },
  { name: '四川省', value: 1 }
]

/** 近 7 日趋势 */
export const TREND_DATA = [
  { date: '10-20', patients: 186, alerts: 22 },
  { date: '10-21', patients: 193, alerts: 18 },
  { date: '10-22', patients: 201, alerts: 27 },
  { date: '10-23', patients: 208, alerts: 21 },
  { date: '10-24', patients: 216, alerts: 25 },
  { date: '10-25', patients: 224, alerts: 19 },
  { date: '10-26', patients: 231, alerts: 16 }
]
