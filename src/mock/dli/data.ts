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
  AgentSession,
  AgentTrendPoint,
  AgentVersion,
  AiModel,
  AutomationItem,
  ExamCategory,
  ExamRecord,
  GroupDoctor,
  KnowledgeChangeLog,
  KnowledgeDoc,
  KnowledgeItem,
  LlmAgentUsage,
  LlmItem,
  LlmRechargeRecord,
  LlmUsagePoint,
  McpCallLog,
  McpItem,
  McpTool,
  McpTrendPoint,
  OrgItem,
  PlatformItem,
  ResearchItem,
  SampleFlowLog,
  SampleRecord,
  SampleTestRecord,
  SkillCallLog,
  SkillItem,
  SkillTrendPoint,
  SkillVersion,
  StaffItem,
  UserType,
  VisibleScope,
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
const CENTER_CODE: Record<string, string> = {
  华东中心: 'HD',
  华北中心: 'HB',
  华南中心: 'HN',
  西南中心: 'XN'
}

const SAMPLE_TYPES: SampleRecord['type'][] = ['全血', '血浆', '血清', '组织', '尿液']

export const SAMPLES: SampleRecord[] = Array.from({ length: 14 }, (_, index) => {
  const patient = PATIENTS[Math.floor(index / 2)]
  const type = SAMPLE_TYPES[index % SAMPLE_TYPES.length]
  const collectDate = day(index % 15)
  const collectTime = `${String(8 + (index % 8)).padStart(2, '0')}:${index % 2 === 0 ? '20' : '45'}`
  const storedAt = `${collectDate} ${String(11 + (index % 6)).padStart(2, '0')}:10`
  const isTissue = type === '组织'
  const status: SampleRecord['status'] =
    index % 6 === 0 ? '待入库' : index % 9 === 0 ? '已出库' : '已入库'
  const location = `${patient.center} B${(index % 3) + 1}-${String((index % 20) + 1).padStart(2, '0')}`
  const operator = DOCTORS[index % DOCTORS.length]
  const flow: SampleFlowLog[] = [
    {
      time: `${collectDate} ${collectTime}`,
      action: '样本采集',
      operator,
      remark: `${patient.center} · ${type}采集`
    },
    {
      time: `${collectDate} 10:05`,
      action: '样本处理',
      operator,
      remark: isTissue ? '组织切块后编号保存' : '离心分装并标记管号'
    }
  ]
  if (status !== '待入库') {
    flow.push({ time: storedAt, action: '样本入库', operator, remark: `存入 ${location}` })
  }
  if (status === '已出库') {
    flow.push({
      time: `${day(index % 8)} 09:40`,
      action: '样本出库',
      operator,
      remark: '出库用于检测'
    })
  }
  return {
    id: `BIO-${CENTER_CODE[patient.center]}-${patient.id}-${String((index % 2) + 1).padStart(3, '0')}`,
    name: `${type}样本`,
    patientId: patient.id,
    center: patient.center,
    type,
    collectedAt: `${collectDate} ${collectTime}`,
    remaining: isTissue ? 1 + (index % 2) : Number((1.5 + (index % 4) * 0.5).toFixed(1)),
    unit: isTissue ? '块' : 'mL',
    status,
    location,
    shareLevel: (['全平台', '本中心', '课题组'] as VisibleScope[])[index % 3],
    storedAt,
    operator,
    device: isTissue
      ? `液氮罐 LN-${(index % 4) + 1} · ${location}`
      : `超低温冰箱 -80℃ · ${location}`,
    sop: [
      {
        stage: '取样',
        content: isTissue
          ? '手术/活检取材后 30 分钟内置于冻存管'
          : `按 ${type} 采集 SOP 采集，采集量 4 mL`
      },
      {
        stage: '处理',
        content: isTissue ? 'OCT 包埋后速冻' : '3000 rpm 离心 10 分钟，分装 2 管'
      },
      {
        stage: '保存',
        content: isTissue ? '-196℃ 液氮保存' : '-80℃ 超低温冰箱保存'
      }
    ],
    flow
  }
})

const TEST_TYPES: SampleTestRecord['type'][] = ['蛋白组', '转录组', '代谢组', '基因组']

const TEST_ITEMS: Record<SampleTestRecord['type'], string> = {
  蛋白组: '炎症因子谱',
  转录组: '转录组测序',
  代谢组: '血药浓度监测',
  基因组: '甲基化检测'
}

const TEST_DATA_EXT: Record<SampleTestRecord['type'], string> = {
  蛋白组: 'mzML',
  转录组: 'fastq.gz',
  代谢组: 'mzML',
  基因组: 'idat'
}

/** 样本检测记录 */
export const SAMPLE_TESTS: SampleTestRecord[] = SAMPLES.slice(0, 12).map((sample, index) => {
  const type = TEST_TYPES[index % TEST_TYPES.length]
  const item = TEST_ITEMS[type]
  const status: SampleTestRecord['status'] =
    index % 5 === 0 ? '检测中' : index % 7 === 0 ? '异常' : '已完成'
  const testDate = day(index % 10)
  const testedAt = `${testDate} ${String(9 + (index % 8)).padStart(2, '0')}:${index % 2 === 0 ? '15' : '40'}`
  const id = `BIO-${CENTER_CODE[sample.center]}-${sample.patientId}-D${String(index + 1).padStart(3, '0')}`
  return {
    id,
    type,
    item,
    batch: `B2026-${String(Math.floor(index / 4) + 1).padStart(2, '0')}`,
    sampleId: sample.id,
    patientId: sample.patientId,
    center: sample.center,
    collectedAt: sample.collectedAt,
    testedAt,
    status,
    qc: status === '异常' ? '不合格' : status === '检测中' ? '待质控' : '合格',
    shareLevel: sample.shareLevel,
    operator: DOCTORS[(index + 1) % DOCTORS.length],
    recordedAt: `${testDate} ${String(15 + (index % 4)).padStart(2, '0')}:30`,
    sop: [
      {
        stage: '前处理',
        content: type === '转录组' ? '总 RNA 提取并构建文库' : '样本裂解并提取蛋白/代谢物'
      },
      {
        stage: '上机',
        content: type === '基因组' ? '甲基化芯片扫描' : '质谱/测序平台上机检测'
      },
      { stage: '分析', content: '质控过滤后进行定量与差异分析' }
    ],
    qcReport: `QC-${String(index + 1).padStart(4, '0')}`,
    dataFile: `${id}_raw.${TEST_DATA_EXT[type]}`,
    expression: `${item}表达谱 · ${12 + index} 个特征 × 24 个样本`
  }
})

/** AI 模型：按早筛预警 / 早诊预警 / 转归预测三个方向占位，接入情况以模型服务为准 */
export const MODELS: AiModel[] = [
  {
    id: 'M-001',
    name: '早筛预警模型',
    field: '早筛预警',
    mode: '',
    timePoints: [],
    input: '',
    output: '',
    connected: false,
    enabled: false,
    updatedAt: '2026-10-26'
  },
  {
    id: 'M-002',
    name: '早诊预警模型',
    field: '早诊预警',
    mode: '',
    timePoints: [],
    input: '',
    output: '',
    connected: false,
    enabled: false,
    updatedAt: '2026-10-26'
  },
  {
    id: 'M-003',
    name: '转归预测模型',
    field: '转归预测',
    mode: '',
    timePoints: [],
    input: '',
    output: '',
    connected: false,
    enabled: false,
    updatedAt: '2026-10-26'
  }
]

/* ---------------- 智能管理 · 生成辅助 ---------------- */

/** 固定基准日，保证趋势与日志数据在多次加载间保持一致 */
const BASE_DATE = '2026-10-26'
const BASE_DAY = new Date(`${BASE_DATE}T00:00:00`)

/** 确定性伪随机（LCG），避免每次刷新数据漂移 */
function seeded(seed: number) {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** 相对基准日偏移 days 天的时间（YYYY-MM-DD HH:mm） */
function shiftDate(days: number, hour = 9, minute = 0): string {
  const date = new Date(BASE_DAY)
  date.setDate(date.getDate() + days)
  date.setHours(hour, minute, 0, 0)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** 相对基准日偏移 days 天的日期（YYYY-MM-DD） */
function dateOnly(days: number): string {
  return shiftDate(days).slice(0, 10)
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  return `${Math.max(1, Math.round(bytes / 1024 / 1024))} MB`
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/** MCP 工具 JSON Schema 文本 */
function toolSchema(name: string, description: string, props: Record<string, [string, string]>) {
  return JSON.stringify(
    {
      name,
      description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(props).map(([key, [type, desc]]) => [key, { type, description: desc }])
        ),
        required: Object.keys(props).slice(0, 1)
      }
    },
    null,
    2
  )
}

/* ---------------- 技能 ---------------- */

/** 技能 */
export const SKILLS: SkillItem[] = [
  {
    id: 'S-01',
    name: '影像组学特征提取',
    type: '工具调用',
    calls: 1286,
    agent: '早诊报告Agent',
    enabled: true,
    description: '从 HRCT 序列中提取磨玻璃影体积、实变比例等影像组学特征',
    successRate: 96.4,
    avgLatency: 860,
    version: 'v3.2.0',
    updatedAt: '2026-10-22',
    owner: '周雅琴',
    scope: '全平台',
    timeout: 60,
    retries: 2,
    tool: 'dli.imaging.radiomics.extract',
    params: [
      {
        name: 'patientId',
        type: 'string',
        required: true,
        defaultValue: '',
        description: '患者编号'
      },
      {
        name: 'seriesUid',
        type: 'string',
        required: true,
        defaultValue: '',
        description: 'HRCT 序列 UID'
      },
      {
        name: 'roiMode',
        type: 'string',
        required: false,
        defaultValue: 'auto',
        description: 'ROI 方式：auto / manual'
      }
    ]
  },
  {
    id: 'S-02',
    name: '检验指标趋势分析',
    type: '工作流',
    calls: 964,
    agent: '虚拟医生Agent',
    enabled: true,
    description: '按时间轴聚合检验指标，输出趋势判断与异常提示',
    successRate: 98.1,
    avgLatency: 640,
    version: 'v2.4.0',
    updatedAt: '2026-10-20',
    owner: '陈明远',
    scope: '全平台',
    timeout: 45,
    retries: 1,
    workflow: '拉取检验记录 → 指标标准化 → 趋势拟合 → 异常区间标注',
    params: [
      {
        name: 'patientId',
        type: 'string',
        required: true,
        defaultValue: '',
        description: '患者编号'
      },
      {
        name: 'window',
        type: 'string',
        required: false,
        defaultValue: '6m',
        description: '分析窗口：3m / 6m / 12m'
      }
    ]
  },
  {
    id: 'S-03',
    name: '指南条款检索',
    type: '工具调用',
    calls: 742,
    agent: '虚拟医生Agent',
    enabled: true,
    description: '在诊疗指南知识库中检索条款原文并返回引用出处',
    successRate: 97.2,
    avgLatency: 420,
    version: 'v1.9.3',
    updatedAt: '2026-10-18',
    owner: '陈明远',
    scope: '全平台',
    timeout: 20,
    retries: 2,
    tool: 'dli.kb.guideline.search',
    params: [
      { name: 'query', type: 'string', required: true, defaultValue: '', description: '检索语句' },
      {
        name: 'topK',
        type: 'number',
        required: false,
        defaultValue: '5',
        description: '返回条款数'
      }
    ]
  },
  {
    id: 'S-04',
    name: '随访计划生成',
    type: '提示词',
    calls: 518,
    agent: '随访Agent',
    enabled: true,
    description: '依据风险分层生成 3/6/12 月随访节点与检查项目',
    successRate: 95.8,
    avgLatency: 1120,
    version: 'v1.5.0',
    updatedAt: '2026-10-16',
    owner: '孙可欣',
    scope: '全平台',
    timeout: 30,
    retries: 1,
    prompt:
      '你是 DLI 随访规划助手。请根据患者的风险分层、最近一次肺功能与用药方案，生成 3/6/12 月随访计划，包含随访节点、必查项目与预警条件。输出表格，不要编造未提供的检查结果。',
    params: [
      {
        name: 'riskLevel',
        type: 'string',
        required: true,
        defaultValue: '中风险',
        description: '风险分层'
      },
      {
        name: 'medication',
        type: 'string',
        required: false,
        defaultValue: '',
        description: '当前用药方案'
      }
    ]
  },
  {
    id: 'S-05',
    name: '结构化病历解析',
    type: '工具调用',
    calls: 431,
    agent: '早筛报告Agent',
    enabled: false,
    description: '将自由文本病历解析为结构化字段，供早筛评估使用',
    successRate: 91.6,
    avgLatency: 1380,
    version: 'v1.3.2',
    updatedAt: '2026-09-28',
    owner: '刘志远',
    scope: '本中心',
    timeout: 90,
    retries: 3,
    tool: 'dli.nlp.emr.structure',
    params: [
      {
        name: 'recordId',
        type: 'string',
        required: true,
        defaultValue: '',
        description: '病历记录编号'
      },
      {
        name: 'schema',
        type: 'object',
        required: false,
        defaultValue: '{}',
        description: '目标字段结构'
      }
    ]
  },
  {
    id: 'S-06',
    name: '用药禁忌校验',
    type: '工具调用',
    calls: 388,
    agent: '虚拟医生Agent',
    enabled: true,
    description: '结合说明书知识库校验用药禁忌与相互作用',
    successRate: 99.1,
    avgLatency: 380,
    version: 'v2.1.0',
    updatedAt: '2026-10-23',
    owner: '周雅琴',
    scope: '全平台',
    timeout: 20,
    retries: 2,
    tool: 'dli.pharma.contraindication.check',
    params: [
      {
        name: 'patientId',
        type: 'string',
        required: true,
        defaultValue: '',
        description: '患者编号'
      },
      {
        name: 'drugs',
        type: 'object',
        required: true,
        defaultValue: '[]',
        description: '待校验药品列表'
      }
    ]
  },
  {
    id: 'S-07',
    name: 'HRCT 病灶分割',
    type: '工具调用',
    calls: 326,
    agent: '早诊报告Agent',
    enabled: true,
    description: '对 HRCT 序列执行病灶自动分割，输出体积与位置信息',
    successRate: 94.7,
    avgLatency: 2360,
    version: 'v1.2.1',
    updatedAt: '2026-10-11',
    owner: '周雅琴',
    scope: '全平台',
    timeout: 120,
    retries: 1,
    tool: 'dli.imaging.lesion.segment',
    params: [
      {
        name: 'seriesUid',
        type: 'string',
        required: true,
        defaultValue: '',
        description: 'HRCT 序列 UID'
      },
      {
        name: 'modelVersion',
        type: 'string',
        required: false,
        defaultValue: 'lung-seg-2.1',
        description: '分割模型版本'
      }
    ]
  },
  {
    id: 'S-08',
    name: '肺功能报告解读',
    type: '提示词',
    calls: 274,
    agent: '早筛报告Agent',
    enabled: true,
    description: '将肺功能原始指标转写为结构化解读结论',
    successRate: 96.9,
    avgLatency: 980,
    version: 'v1.1.4',
    updatedAt: '2026-10-08',
    owner: '孙可欣',
    scope: '全平台',
    timeout: 30,
    retries: 1,
    prompt:
      '你是呼吸科报告解读助手。请基于 FVC、FEV1、DLCO 等指标判断通气功能障碍类型与程度，输出结论、依据与随访建议；指标缺失时明确说明，不得推测。',
    params: [
      {
        name: 'reportId',
        type: 'string',
        required: true,
        defaultValue: '',
        description: '肺功能报告编号'
      }
    ]
  },
  {
    id: 'S-09',
    name: '科研数据集脱敏导出',
    type: '工作流',
    calls: 86,
    agent: '科研数据整理Agent',
    enabled: true,
    description: '按研究分组导出脱敏数据集，自动移除直接标识符',
    successRate: 100,
    avgLatency: 1860,
    version: 'v1.0.3',
    updatedAt: '2026-10-02',
    owner: '刘志远',
    scope: '课题组',
    timeout: 180,
    retries: 1,
    workflow: '选择队列 → 字段映射 → 标识符脱敏 → 生成数据集包 → 审计留痕',
    params: [
      {
        name: 'researchId',
        type: 'string',
        required: true,
        defaultValue: '',
        description: '研究项目编号'
      },
      {
        name: 'groupBy',
        type: 'string',
        required: false,
        defaultValue: '',
        description: '分组字段'
      }
    ]
  },
  {
    id: 'S-10',
    name: '不良反应上报',
    type: '提示词',
    calls: 64,
    agent: '随访Agent',
    enabled: true,
    description: '将患者反馈的不良反应整理为上报表单草稿',
    successRate: 93.8,
    avgLatency: 1240,
    version: 'v1.0.1',
    updatedAt: '2026-09-30',
    owner: '李晓彤',
    scope: '全平台',
    timeout: 30,
    retries: 1,
    prompt:
      '你是药物警戒助手。请将患者描述的不良反应整理为上报草稿，包含发生时间、症状、严重程度、疑似药品与处理措施。信息不足时列出待补充项，不得自行判定因果关系。',
    params: [
      {
        name: 'patientId',
        type: 'string',
        required: true,
        defaultValue: '',
        description: '患者编号'
      },
      {
        name: 'feedback',
        type: 'string',
        required: true,
        defaultValue: '',
        description: '患者反馈原文'
      }
    ]
  }
]

/** 技能版本记录 */
export const SKILL_VERSIONS: Record<string, SkillVersion[]> = {}
SKILLS.forEach((skill, index) => {
  const [major, minor] = skill.version.slice(1).split('.').map(Number)
  const versions: SkillVersion[] = [
    {
      version: skill.version,
      publishedAt: shiftDate(-(index % 5) - 2, 10, 20),
      publisher: skill.owner,
      note: '优化参数校验与失败重试，补充中文错误提示',
      active: true
    },
    {
      version: `v${major}.${Math.max(minor - 1, 0)}.0`,
      publishedAt: shiftDate(-42 - index, 15, 10),
      publisher: skill.owner,
      note: '补充超时熔断与调用日志埋点',
      active: false
    }
  ]
  if (index % 3 === 0) {
    versions.push({
      version: `v${major}.0.0`,
      publishedAt: shiftDate(-160 - index, 9, 30),
      publisher: '平台管理员',
      note: '初始版本上线',
      active: false
    })
  }
  SKILL_VERSIONS[skill.id] = versions
})

/** 技能调用记录 */
export const SKILL_LOGS: SkillCallLog[] = []
SKILLS.forEach((skill, index) => {
  const rand = seeded(3100 + index)
  const scenes = ['门诊问诊', '早筛评估', '早诊报告生成', '随访执行', '科研导出', '患者教育']
  for (let i = 0; i < 6; i++) {
    const failed = rand() < (skill.successRate >= 97 ? 0.06 : 0.18)
    const status: SkillCallLog['status'] = failed ? (rand() > 0.55 ? '超时' : '失败') : '成功'
    SKILL_LOGS.push({
      id: `${skill.id}-LOG${String(i + 1).padStart(2, '0')}`,
      skillId: skill.id,
      calledAt: shiftDate(-i - (index % 3), 8 + i, (i * 11) % 60),
      scene: scenes[(index + i) % scenes.length],
      agent: skill.agent,
      status,
      latency: Math.round(skill.avgLatency * (0.7 + rand() * 0.7)),
      tokens: 800 + Math.round(rand() * 3200),
      error:
        status === '成功'
          ? ''
          : status === '超时'
            ? `执行超过 ${skill.timeout}s 超时上限`
            : '上游返回字段缺失：patientId'
    })
  }
})

/** 技能近 7 日趋势 */
export const SKILL_TRENDS: Record<string, SkillTrendPoint[]> = {}
SKILLS.forEach((skill, index) => {
  const rand = seeded(4100 + index)
  SKILL_TRENDS[skill.id] = Array.from({ length: 7 }, (_, i) => {
    const calls = Math.round((skill.calls / 30) * (0.7 + rand() * 0.8))
    const failures = Math.max(0, Math.round(calls * ((100 - skill.successRate) / 100)))
    return { date: dateOnly(i - 6), calls, failures }
  })
})

/* ---------------- 知识库 ---------------- */

/** 知识库（容量与向量数在文档生成后同步） */
export const KNOWLEDGE: KnowledgeItem[] = [
  {
    id: 'K-01',
    name: 'DLI 诊疗指南库',
    docs: 96,
    size: '0 MB',
    updatedAt: '2026-10-22',
    enabled: true,
    sizeBytes: 0,
    description: '国内外 DLI 诊疗指南、专家共识与临床路径原文',
    maintainer: '陈明远',
    scope: '全平台',
    hitRate: 91.2,
    retrievals7d: 4820,
    embedding: 'bge-large-zh-v1.5',
    chunkSize: 800,
    chunkOverlap: 120,
    topK: 5,
    scoreThreshold: 0.72,
    vectorCount: 0
  },
  {
    id: 'K-02',
    name: '高危药物说明书库',
    docs: 128,
    size: '0 MB',
    updatedAt: '2026-10-19',
    enabled: true,
    sizeBytes: 0,
    description: '糖皮质激素、免疫抑制剂等高风险药品说明书与用药须知',
    maintainer: '周雅琴',
    scope: '全平台',
    hitRate: 88.6,
    retrievals7d: 3120,
    embedding: 'bge-large-zh-v1.5',
    chunkSize: 600,
    chunkOverlap: 80,
    topK: 4,
    scoreThreshold: 0.68,
    vectorCount: 0
  },
  {
    id: 'K-03',
    name: '多中心病例库',
    docs: 42,
    size: '0 MB',
    updatedAt: '2026-10-24',
    enabled: true,
    sizeBytes: 0,
    description: '四中心脱敏病例、随访记录与标注数据集合',
    maintainer: '刘志远',
    scope: '本中心',
    hitRate: 84.3,
    retrievals7d: 1460,
    embedding: 'bge-m3',
    chunkSize: 1200,
    chunkOverlap: 200,
    topK: 6,
    scoreThreshold: 0.65,
    vectorCount: 0
  },
  {
    id: 'K-04',
    name: '检验指标参考区间',
    docs: 18,
    size: '0 MB',
    updatedAt: '2026-09-12',
    enabled: false,
    sizeBytes: 0,
    description: '血常规、炎症因子、肺功能等指标的中心参考区间',
    maintainer: '孙可欣',
    scope: '全平台',
    hitRate: 93.1,
    retrievals7d: 980,
    embedding: 'bge-large-zh-v1.5',
    chunkSize: 500,
    chunkOverlap: 60,
    topK: 4,
    scoreThreshold: 0.75,
    vectorCount: 0
  },
  {
    id: 'K-05',
    name: '影像诊断共识库',
    docs: 21,
    size: '0 MB',
    updatedAt: '2026-10-15',
    enabled: true,
    sizeBytes: 0,
    description: 'HRCT 影像判读共识、分型图谱与典型征象说明',
    maintainer: '周雅琴',
    scope: '全平台',
    hitRate: 87.5,
    retrievals7d: 1260,
    embedding: 'bge-m3',
    chunkSize: 900,
    chunkOverlap: 150,
    topK: 5,
    scoreThreshold: 0.7,
    vectorCount: 0
  },
  {
    id: 'K-06',
    name: '患者教育材料库',
    docs: 9,
    size: '0 MB',
    updatedAt: '2026-10-06',
    enabled: true,
    sizeBytes: 0,
    description: '面向患者与家属的疾病科普、用药与康复指导材料',
    maintainer: '李晓彤',
    scope: '全平台',
    hitRate: 82.4,
    retrievals7d: 640,
    embedding: 'bge-small-zh-v1.5',
    chunkSize: 400,
    chunkOverlap: 50,
    topK: 3,
    scoreThreshold: 0.62,
    vectorCount: 0
  }
]

/** 知识库文档主题池 */
const KB_DOC_POOL: Record<string, { topics: string[]; uploaders: string[] }> = {
  'K-01': {
    topics: [
      'DLI 诊疗指南',
      '间质性肺病诊治共识',
      '糖皮质激素应用规范',
      '免疫抑制剂用药路径',
      '早筛高危人群管理规范',
      '转归评估量表说明',
      '多学科会诊流程',
      '肺功能检查操作规范'
    ],
    uploaders: ['陈明远', '周雅琴']
  },
  'K-02': {
    topics: [
      '甲氨蝶呤片说明书',
      '环磷酰胺注射液说明书',
      '泼尼松片说明书',
      '他克莫司胶囊说明书',
      '吗替麦考酚酯说明书',
      '生物制剂用药须知'
    ],
    uploaders: ['周雅琴', '陈明远']
  },
  'K-03': {
    topics: ['DLI 病例数据集', '多中心随访数据', '标注影像序列', '结构化病历导出'],
    uploaders: ['刘志远']
  },
  'K-04': {
    topics: ['血常规参考区间', '炎症因子参考区间', '肺功能指标参考区间', '肝肾功能参考区间'],
    uploaders: ['孙可欣']
  },
  'K-05': {
    topics: ['HRCT 影像诊断共识', 'ILD 影像分型图谱', '磨玻璃影判读规范', '影像随访对比要点'],
    uploaders: ['周雅琴']
  },
  'K-06': {
    topics: ['DLI 患者手册', '用药注意事项', '呼吸康复训练指南', '随访日程说明'],
    uploaders: ['李晓彤']
  }
}

/** 知识库文档（按各库文档数生成，共 314 条） */
export const KNOWLEDGE_DOCS: KnowledgeDoc[] = []
KNOWLEDGE.forEach((kb, kbIndex) => {
  const pool = KB_DOC_POOL[kb.id]
  const rand = seeded(5200 + kbIndex)
  for (let i = 0; i < kb.docs; i++) {
    const ext: KnowledgeDoc['type'] =
      i % 9 === 0 ? 'docx' : i % 13 === 0 ? 'md' : i % 17 === 0 ? 'xlsx' : 'pdf'
    const sizeMB = round1(0.4 + rand() * 5.2)
    const status: KnowledgeDoc['status'] =
      i % 37 === 0 ? '解析失败' : i % 29 === 0 ? '解析中' : '已入库'
    KNOWLEDGE_DOCS.push({
      id: `${kb.id}-D${String(i + 1).padStart(3, '0')}`,
      knowledgeId: kb.id,
      name: `${pool.topics[i % pool.topics.length]}·${pad2((i % 90) + 1)}.${ext}`,
      type: ext,
      sizeBytes: Math.round(sizeMB * 1024 * 1024),
      chunks: Math.round(sizeMB * 16),
      status,
      uploader: pool.uploaders[i % pool.uploaders.length],
      uploadedAt: shiftDate(-Math.floor(rand() * 150) - 1, 9 + (i % 9), (i * 7) % 60)
    })
  }
})

/** 同步知识库容量与向量数，保持与文档明细自洽 */
KNOWLEDGE.forEach((kb) => {
  const docs = KNOWLEDGE_DOCS.filter((doc) => doc.knowledgeId === kb.id)
  const sizeBytes = docs.reduce((sum, doc) => sum + doc.sizeBytes, 0)
  kb.sizeBytes = sizeBytes
  kb.size = formatBytes(sizeBytes)
  kb.vectorCount = docs.reduce((sum, doc) => sum + doc.chunks, 0)
})

/** 知识库更新日志 */
export const KNOWLEDGE_LOGS: KnowledgeChangeLog[] = [
  {
    id: 'KL-01',
    action: '上传文档',
    target: '多中心病例库',
    operator: '刘志远',
    time: shiftDate(-1, 16, 40),
    note: '新增 6 份标注病例数据集'
  },
  {
    id: 'KL-02',
    action: '调整参数',
    target: 'DLI 诊疗指南库',
    operator: '陈明远',
    time: shiftDate(-2, 11, 5),
    note: 'chunkSize 600 → 800，提升长条款完整度'
  },
  {
    id: 'KL-03',
    action: '上传文档',
    target: '影像诊断共识库',
    operator: '周雅琴',
    time: shiftDate(-3, 14, 22),
    note: '补充 2026 版 HRCT 判读共识'
  },
  {
    id: 'KL-04',
    action: '删除文档',
    target: '高危药物说明书库',
    operator: '周雅琴',
    time: shiftDate(-4, 10, 18),
    note: '移除 3 份过期说明书'
  },
  {
    id: 'KL-05',
    action: '调整参数',
    target: '患者教育材料库',
    operator: '李晓彤',
    time: shiftDate(-5, 15, 46),
    note: 'topK 5 → 3，避免召回过多科普段落'
  },
  {
    id: 'KL-06',
    action: '上传文档',
    target: 'DLI 诊疗指南库',
    operator: '陈明远',
    time: shiftDate(-6, 9, 12),
    note: '上传 4 份 DLI 多学科会诊流程'
  },
  {
    id: 'KL-07',
    action: '启用',
    target: '多中心病例库',
    operator: '刘志远',
    time: shiftDate(-8, 17, 30),
    note: '完成脱敏复核后恢复启用'
  },
  {
    id: 'KL-08',
    action: '调整参数',
    target: '多中心病例库',
    operator: '刘志远',
    time: shiftDate(-9, 10, 2),
    note: 'scoreThreshold 0.6 → 0.65'
  },
  {
    id: 'KL-09',
    action: '上传文档',
    target: '检验指标参考区间',
    operator: '孙可欣',
    time: shiftDate(-11, 13, 25),
    note: '更新炎症因子参考区间'
  },
  {
    id: 'KL-10',
    action: '停用',
    target: '检验指标参考区间',
    operator: '孙可欣',
    time: shiftDate(-12, 16, 8),
    note: '等待中心检验科确认新参考区间'
  },
  {
    id: 'KL-11',
    action: '上传文档',
    target: '高危药物说明书库',
    operator: '周雅琴',
    time: shiftDate(-14, 9, 54),
    note: '新增生物制剂用药须知 8 份'
  },
  {
    id: 'KL-12',
    action: '删除文档',
    target: '患者教育材料库',
    operator: '李晓彤',
    time: shiftDate(-16, 11, 16),
    note: '合并重复的康复指导材料'
  },
  {
    id: 'KL-13',
    action: '调整参数',
    target: '影像诊断共识库',
    operator: '周雅琴',
    time: shiftDate(-19, 14, 38),
    note: '切换 embedding 为 bge-m3 并重建索引'
  },
  {
    id: 'KL-14',
    action: '上传文档',
    target: '多中心病例库',
    operator: '刘志远',
    time: shiftDate(-22, 10, 47),
    note: '导入西南中心 12 月随访数据'
  },
  {
    id: 'KL-15',
    action: '新建知识库',
    target: '患者教育材料库',
    operator: '李晓彤',
    time: shiftDate(-26, 15, 20),
    note: '面向患者与家属的科普材料库'
  },
  {
    id: 'KL-16',
    action: '调整参数',
    target: 'DLI 诊疗指南库',
    operator: '陈明远',
    time: shiftDate(-31, 9, 40),
    note: '启用混合检索并调整权重'
  },
  {
    id: 'KL-17',
    action: '上传文档',
    target: '影像诊断共识库',
    operator: '周雅琴',
    time: shiftDate(-36, 16, 12),
    note: '上传磨玻璃影判读规范图谱'
  },
  {
    id: 'KL-18',
    action: '新建知识库',
    target: '影像诊断共识库',
    operator: '周雅琴',
    time: shiftDate(-42, 11, 5),
    note: '完成初始文档导入与索引构建'
  }
]

/* ---------------- MCP ---------------- */

/** MCP 服务（平台统一维护，仅可查看 / 测试 / 下载） */
export const MCPS: McpItem[] = [
  {
    id: 'MP-01',
    name: 'HIS 对接服务',
    protocol: 'http',
    version: '1.4.0',
    tools: 6,
    description: '患者主索引与就诊记录读取',
    status: '在线',
    latency: 86,
    calls30d: 4820,
    updatedAt: '2026-10-18',
    maintainer: '平台运维组',
    endpoint: 'https://his.dli.internal/mcp',
    authType: '令牌',
    lastCheckedAt: shiftDate(0, 8, 30)
  },
  {
    id: 'MP-02',
    name: 'PACS 影像服务',
    protocol: 'sse',
    version: '2.0.1',
    tools: 4,
    description: 'DICOM 影像拉取与序列解析',
    status: '在线',
    latency: 152,
    calls30d: 3160,
    updatedAt: '2026-10-21',
    maintainer: '平台运维组',
    endpoint: 'https://pacs.dli.internal/mcp/sse',
    authType: 'OAuth 2.0',
    lastCheckedAt: shiftDate(0, 8, 32)
  },
  {
    id: 'MP-03',
    name: 'LIS 检验服务',
    protocol: 'http',
    version: '1.2.2',
    tools: 5,
    description: '检验结果同步与参考区间查询',
    status: '在线',
    latency: 104,
    calls30d: 2640,
    updatedAt: '2026-10-12',
    maintainer: '平台运维组',
    endpoint: 'https://lis.dli.internal/mcp',
    authType: '令牌',
    lastCheckedAt: shiftDate(0, 8, 34)
  },
  {
    id: 'MP-04',
    name: '病理系统服务',
    protocol: 'stdio',
    version: '0.9.6',
    tools: 3,
    description: '病理报告文本与切片索引',
    status: '离线',
    latency: 0,
    calls30d: 0,
    updatedAt: '2026-09-30',
    maintainer: '平台运维组',
    endpoint: 'stdio://path-svc',
    authType: '无',
    lastCheckedAt: shiftDate(-3, 18, 10)
  },
  {
    id: 'MP-05',
    name: '随访消息网关',
    protocol: 'sse',
    version: '1.0.3',
    tools: 4,
    description: '随访提醒下发与患者回复回收',
    status: '异常',
    latency: 980,
    calls30d: 1240,
    updatedAt: '2026-10-24',
    maintainer: '平台运维组',
    endpoint: 'https://msg.dli.internal/mcp/sse',
    authType: '令牌',
    lastCheckedAt: shiftDate(0, 8, 36)
  }
]

/** MCP 工具清单（共 22 个） */
export const MCP_TOOLS: McpTool[] = [
  {
    id: 'MP-01-T01',
    mcpId: 'MP-01',
    name: 'his.patient.get',
    description: '按患者编号读取主索引信息',
    calls: 1420,
    schema: toolSchema('his.patient.get', '读取患者主索引', {
      patientId: ['string', '患者编号'],
      withContacts: ['boolean', '是否返回联系人']
    })
  },
  {
    id: 'MP-01-T02',
    mcpId: 'MP-01',
    name: 'his.visit.list',
    description: '查询患者就诊记录列表',
    calls: 986,
    schema: toolSchema('his.visit.list', '查询就诊记录', {
      patientId: ['string', '患者编号'],
      limit: ['number', '返回条数']
    })
  },
  {
    id: 'MP-01-T03',
    mcpId: 'MP-01',
    name: 'his.diagnosis.list',
    description: '读取患者诊断列表与诊断时间',
    calls: 742,
    schema: toolSchema('his.diagnosis.list', '读取诊断列表', { patientId: ['string', '患者编号'] })
  },
  {
    id: 'MP-01-T04',
    mcpId: 'MP-01',
    name: 'his.order.list',
    description: '查询医嘱与用药明细',
    calls: 658,
    schema: toolSchema('his.order.list', '查询医嘱明细', {
      patientId: ['string', '患者编号'],
      status: ['string', '医嘱状态']
    })
  },
  {
    id: 'MP-01-T05',
    mcpId: 'MP-01',
    name: 'his.lab.list',
    description: '读取检验申请单列表',
    calls: 534,
    schema: toolSchema('his.lab.list', '读取检验申请单', { patientId: ['string', '患者编号'] })
  },
  {
    id: 'MP-01-T06',
    mcpId: 'MP-01',
    name: 'his.token.refresh',
    description: '刷新服务访问令牌',
    calls: 480,
    schema: toolSchema('his.token.refresh', '刷新访问令牌', { appId: ['string', '应用标识'] })
  },
  {
    id: 'MP-02-T01',
    mcpId: 'MP-02',
    name: 'pacs.series.list',
    description: '查询患者影像序列',
    calls: 1120,
    schema: toolSchema('pacs.series.list', '查询影像序列', {
      patientId: ['string', '患者编号'],
      modality: ['string', '检查类型']
    })
  },
  {
    id: 'MP-02-T02',
    mcpId: 'MP-02',
    name: 'pacs.dicom.pull',
    description: '按序列 UID 拉取 DICOM 影像',
    calls: 864,
    schema: toolSchema('pacs.dicom.pull', '拉取 DICOM 影像', { seriesUid: ['string', '序列 UID'] })
  },
  {
    id: 'MP-02-T03',
    mcpId: 'MP-02',
    name: 'pacs.report.read',
    description: '读取影像报告正文',
    calls: 720,
    schema: toolSchema('pacs.report.read', '读取影像报告', { accessionNo: ['string', '检查号'] })
  },
  {
    id: 'MP-02-T04',
    mcpId: 'MP-02',
    name: 'pacs.study.search',
    description: '按患者与日期检索检查记录',
    calls: 456,
    schema: toolSchema('pacs.study.search', '检索检查记录', {
      patientId: ['string', '患者编号'],
      dateRange: ['string', '日期范围']
    })
  },
  {
    id: 'MP-03-T01',
    mcpId: 'MP-03',
    name: 'lis.result.query',
    description: '查询患者检验结果',
    calls: 1024,
    schema: toolSchema('lis.result.query', '查询检验结果', {
      patientId: ['string', '患者编号'],
      itemCode: ['string', '项目编码']
    })
  },
  {
    id: 'MP-03-T02',
    mcpId: 'MP-03',
    name: 'lis.reference.range',
    description: '读取检验项目参考区间',
    calls: 586,
    schema: toolSchema('lis.reference.range', '读取参考区间', { itemCode: ['string', '项目编码'] })
  },
  {
    id: 'MP-03-T03',
    mcpId: 'MP-03',
    name: 'lis.item.search',
    description: '按关键词检索检验项目',
    calls: 398,
    schema: toolSchema('lis.item.search', '检索检验项目', { keyword: ['string', '检索关键词'] })
  },
  {
    id: 'MP-03-T04',
    mcpId: 'MP-03',
    name: 'lis.critical.list',
    description: '读取危急值列表',
    calls: 326,
    schema: toolSchema('lis.critical.list', '读取危急值', { date: ['string', '日期'] })
  },
  {
    id: 'MP-03-T05',
    mcpId: 'MP-03',
    name: 'lis.report.sync',
    description: '同步检验报告至平台',
    calls: 306,
    schema: toolSchema('lis.report.sync', '同步检验报告', { reportId: ['string', '报告编号'] })
  },
  {
    id: 'MP-04-T01',
    mcpId: 'MP-04',
    name: 'path.report.read',
    description: '读取病理报告正文',
    calls: 0,
    schema: toolSchema('path.report.read', '读取病理报告', { reportId: ['string', '报告编号'] })
  },
  {
    id: 'MP-04-T02',
    mcpId: 'MP-04',
    name: 'path.slide.index',
    description: '读取患者的切片索引',
    calls: 0,
    schema: toolSchema('path.slide.index', '读取切片索引', { patientId: ['string', '患者编号'] })
  },
  {
    id: 'MP-04-T03',
    mcpId: 'MP-04',
    name: 'path.stain.list',
    description: '读取染色类型列表',
    calls: 0,
    schema: toolSchema('path.stain.list', '读取染色类型', { patientId: ['string', '患者编号'] })
  },
  {
    id: 'MP-05-T01',
    mcpId: 'MP-05',
    name: 'followup.plan.push',
    description: '向患者下发随访计划',
    calls: 468,
    schema: toolSchema('followup.plan.push', '下发随访计划', {
      patientId: ['string', '患者编号'],
      planId: ['string', '随访计划编号']
    })
  },
  {
    id: 'MP-05-T02',
    mcpId: 'MP-05',
    name: 'followup.message.send',
    description: '发送随访提醒消息',
    calls: 402,
    schema: toolSchema('followup.message.send', '发送随访提醒', {
      patientId: ['string', '患者编号'],
      templateId: ['string', '消息模板编号']
    })
  },
  {
    id: 'MP-05-T03',
    mcpId: 'MP-05',
    name: 'followup.reply.list',
    description: '回收患者回复',
    calls: 258,
    schema: toolSchema('followup.reply.list', '回收患者回复', {
      planId: ['string', '随访计划编号']
    })
  },
  {
    id: 'MP-05-T04',
    mcpId: 'MP-05',
    name: 'followup.optout.apply',
    description: '登记患者退订申请',
    calls: 112,
    schema: toolSchema('followup.optout.apply', '登记退订申请', {
      patientId: ['string', '患者编号']
    })
  }
]

/** MCP 调用记录 */
export const MCP_LOGS: McpCallLog[] = []
MCPS.forEach((mcp, index) => {
  const rand = seeded(6200 + index)
  const tools = MCP_TOOLS.filter((tool) => tool.mcpId === mcp.id)
  if (!tools.length) return
  const callers = ['虚拟医生Agent', '早诊报告Agent', '随访Agent', '早筛报告Agent']
  for (let i = 0; i < 8; i++) {
    const tool = tools[i % tools.length]
    const ok = mcp.status === '在线' ? rand() > 0.06 : false
    MCP_LOGS.push({
      id: `${mcp.id}-LOG${String(i + 1).padStart(2, '0')}`,
      mcpId: mcp.id,
      calledAt: shiftDate(-Math.floor(i / 3), 9 + i, (i * 13) % 60),
      tool: tool.name,
      caller: callers[(index + i) % callers.length],
      status: ok ? '成功' : '失败',
      latency: mcp.status === '在线' ? Math.round(mcp.latency * (0.7 + rand() * 0.6)) : 0
    })
  }
})

/** MCP 近 14 日调用趋势 */
export const MCP_TRENDS: Record<string, McpTrendPoint[]> = {}
MCPS.forEach((mcp, index) => {
  const rand = seeded(7200 + index)
  MCP_TRENDS[mcp.id] = Array.from({ length: 14 }, (_, i) => ({
    date: dateOnly(i - 13),
    calls: mcp.status === '在线' ? Math.round((mcp.calls30d / 30) * (0.6 + rand() * 0.9)) : 0
  }))
})

/** MCP 只读连接配置 */
export const MCP_CONFIG: Record<
  string,
  { timeout: number; heartbeat: number; inspectedAt: string }
> = {
  'MP-01': { timeout: 30, heartbeat: 15, inspectedAt: '每日 02:00' },
  'MP-02': { timeout: 60, heartbeat: 30, inspectedAt: '每日 02:10' },
  'MP-03': { timeout: 30, heartbeat: 15, inspectedAt: '每日 02:20' },
  'MP-04': { timeout: 30, heartbeat: 20, inspectedAt: '每周一 02:30' },
  'MP-05': { timeout: 30, heartbeat: 15, inspectedAt: '每日 02:40' }
}

/* ---------------- LLM ---------------- */

/** LLM 服务 */
export const LLMS: LlmItem[] = [
  {
    id: 'L-01',
    name: 'Qwen-Max',
    vendor: '阿里云百炼',
    balance: 864200,
    used: 135800,
    unit: 'tokens',
    status: '正常',
    model: 'qwen-max-2026-08',
    contextWindow: 128,
    todayCalls: 0,
    todayTokens: 0,
    monthCost: 0,
    priceIn: 0.02,
    priceOut: 0.06,
    apiKeyMasked: 'sk-qwen-****-8f2a',
    rateLimit: 600,
    alertThreshold: 20,
    connected: true,
    avgLatency: 1380,
    lastCheckedAt: shiftDate(0, 8, 40)
  },
  {
    id: 'L-02',
    name: 'DeepSeek-V3',
    vendor: '深度求索',
    balance: 92150,
    used: 307850,
    unit: 'tokens',
    status: '余额预警',
    model: 'deepseek-chat-v3.2',
    contextWindow: 64,
    todayCalls: 0,
    todayTokens: 0,
    monthCost: 0,
    priceIn: 0.001,
    priceOut: 0.002,
    apiKeyMasked: 'sk-ds-****-31c7',
    rateLimit: 300,
    alertThreshold: 25,
    connected: true,
    avgLatency: 960,
    lastCheckedAt: shiftDate(0, 8, 42)
  },
  {
    id: 'L-03',
    name: 'GLM-4-Plus',
    vendor: '智谱 AI',
    balance: 0,
    used: 200000,
    unit: 'tokens',
    status: '已停用',
    model: 'glm-4-plus',
    contextWindow: 128,
    todayCalls: 0,
    todayTokens: 0,
    monthCost: 0,
    priceIn: 0.05,
    priceOut: 0.05,
    apiKeyMasked: 'sk-glm-****-5b90',
    rateLimit: 200,
    alertThreshold: 20,
    connected: false,
    avgLatency: 0,
    lastCheckedAt: shiftDate(-21, 17, 20)
  },
  {
    id: 'L-04',
    name: 'ERNIE-4.0-Turbo',
    vendor: '百度智能云',
    balance: 512000,
    used: 88600,
    unit: 'tokens',
    status: '正常',
    model: 'ernie-4.0-turbo-8k',
    contextWindow: 8,
    todayCalls: 0,
    todayTokens: 0,
    monthCost: 0,
    priceIn: 0.03,
    priceOut: 0.09,
    apiKeyMasked: 'sk-ernie-****-7d41',
    rateLimit: 240,
    alertThreshold: 20,
    connected: true,
    avgLatency: 1120,
    lastCheckedAt: shiftDate(0, 8, 44)
  },
  {
    id: 'L-05',
    name: 'Doubao-Pro-128K',
    vendor: '火山引擎',
    balance: 268400,
    used: 131600,
    unit: 'tokens',
    status: '正常',
    model: 'doubao-pro-128k',
    contextWindow: 128,
    todayCalls: 0,
    todayTokens: 0,
    monthCost: 0,
    priceIn: 0.0008,
    priceOut: 0.002,
    apiKeyMasked: 'ak-doubao-****-9e12',
    rateLimit: 500,
    alertThreshold: 20,
    connected: true,
    avgLatency: 820,
    lastCheckedAt: shiftDate(0, 8, 46)
  }
]

/** LLM 近 30 日用量趋势 */
export const LLM_TRENDS: Record<string, LlmUsagePoint[]> = {}
LLMS.forEach((llm, index) => {
  const rand = seeded(8200 + index)
  const baseCalls = llm.status === '已停用' ? 0 : 180 + index * 60
  const trend = Array.from({ length: 30 }, (_, i) => {
    const calls = baseCalls === 0 ? 0 : Math.round(baseCalls * (0.65 + rand() * 0.7))
    const tokensIn = Math.round(calls * (860 + rand() * 940))
    const tokensOut = Math.round(tokensIn * (0.3 + rand() * 0.2))
    const cost =
      Math.round(((tokensIn / 1000) * llm.priceIn + (tokensOut / 1000) * llm.priceOut) * 100) / 100
    return { date: dateOnly(i - 29), calls, tokensIn, tokensOut, cost }
  })
  LLM_TRENDS[llm.id] = trend

  const last = trend[trend.length - 1]
  llm.todayCalls = last.calls
  llm.todayTokens = last.tokensIn + last.tokensOut
  llm.monthCost = Math.round(trend.reduce((sum, point) => sum + point.cost, 0) * 100) / 100
})

/** LLM 按智能体拆分 */
export const LLM_AGENT_USAGE: Record<string, LlmAgentUsage[]> = {}
const LLM_AGENT_SPLIT = [
  { agent: '虚拟医生Agent', share: 38 },
  { agent: '早筛报告Agent', share: 24 },
  { agent: '早诊报告Agent', share: 18 },
  { agent: '转归预测报告Agent', share: 12 },
  { agent: '随访Agent', share: 8 }
]
LLMS.forEach((llm) => {
  LLM_AGENT_USAGE[llm.id] = LLM_AGENT_SPLIT.map((item) => ({
    agent: item.agent,
    calls: Math.round((llm.todayCalls * item.share) / 100),
    share: item.share
  }))
})

/** LLM 充值记录 */
export const LLM_RECHARGES: LlmRechargeRecord[] = [
  {
    id: 'LR-01',
    amount: 2000,
    tokens: 100000000,
    operator: '系统管理员',
    time: shiftDate(-2, 10, 12),
    note: 'Qwen-Max 季度额度补充'
  },
  {
    id: 'LR-02',
    amount: 500,
    tokens: 500000000,
    operator: '系统管理员',
    time: shiftDate(-4, 15, 36),
    note: 'DeepSeek-V3 按量计费充值'
  },
  {
    id: 'LR-03',
    amount: 800,
    tokens: 26666666,
    operator: '平台管理员',
    time: shiftDate(-7, 9, 18),
    note: 'ERNIE-4.0-Turbo 首批额度'
  },
  {
    id: 'LR-04',
    amount: 1000,
    tokens: 500000000,
    operator: '系统管理员',
    time: shiftDate(-11, 14, 2),
    note: 'Doubao-Pro-128K 充值'
  },
  {
    id: 'LR-05',
    amount: 300,
    tokens: 15000000,
    operator: '平台管理员',
    time: shiftDate(-16, 16, 44),
    note: 'Qwen-Max 临时补量'
  },
  {
    id: 'LR-06',
    amount: 500,
    tokens: 500000000,
    operator: '系统管理员',
    time: shiftDate(-23, 11, 8),
    note: 'DeepSeek-V3 续费'
  },
  {
    id: 'LR-07',
    amount: 600,
    tokens: 12000000,
    operator: '平台管理员',
    time: shiftDate(-29, 9, 55),
    note: 'GLM-4-Plus 停用前结余退回'
  },
  {
    id: 'LR-08',
    amount: 1200,
    tokens: 60000000,
    operator: '系统管理员',
    time: shiftDate(-36, 15, 30),
    note: 'Qwen-Max 年度框架合同首付款'
  }
]

/* ---------------- 智能体 ---------------- */

/** 智能体（内置 5 个不可删除） */
export const AGENTS: AgentItem[] = [
  {
    id: 'A-01',
    name: '虚拟医生Agent',
    role: '医患对话与问诊引导',
    skills: ['检验指标趋势分析', '指南条款检索', '用药禁忌校验'],
    builtin: true,
    enabled: true,
    description: '面向患者的 AI 问诊入口，负责症状采集、用药提醒与转人工判断',
    model: 'Qwen-Max',
    knowledge: ['DLI 诊疗指南库', '高危药物说明书库'],
    sessions: 386,
    sessions30d: 8420,
    satisfaction: 92.4,
    version: 'v2.3.1',
    updatedAt: '2026-10-24',
    temperature: 0.4,
    topP: 0.9,
    maxRounds: 12,
    prompt:
      '你是 DLI 疾病智能管理平台的虚拟医生助手。请用简洁、共情的中文与患者交流，围绕症状、用药与随访情况提问；涉及诊断结论时必须引用指南条款，不得作出确诊判断；遇到危急症状立即建议线下就诊并转人工。',
    fallback: '连续 2 轮未识别意图，或出现呼吸困难加重、咯血等危急关键词时转人工',
    scope: '全平台'
  },
  {
    id: 'A-02',
    name: '早筛报告Agent',
    role: '生成早筛风险评估报告',
    skills: ['结构化病历解析', '指南条款检索'],
    builtin: true,
    enabled: true,
    description: '汇总病历、影像与检验数据，输出早筛风险分层与依据',
    model: 'DeepSeek-V3',
    knowledge: ['DLI 诊疗指南库', '影像诊断共识库'],
    sessions: 142,
    sessions30d: 3120,
    satisfaction: 94.1,
    version: 'v1.8.2',
    updatedAt: '2026-10-22',
    temperature: 0.2,
    topP: 0.8,
    maxRounds: 6,
    prompt:
      '你是 DLI 早筛评估助手。请基于结构化病历、HRCT 报告与检验指标，依据指南给出高危 / 中危 / 低危分层及理由。缺失关键指标时标注「数据不足」，不得推测；输出结论与引用条款。',
    fallback: '关键指标缺失或置信度低于 0.6 时提示医生复核',
    scope: '全平台'
  },
  {
    id: 'A-03',
    name: '早诊报告Agent',
    role: '生成早诊与鉴别诊断报告',
    skills: ['影像组学特征提取', '指南条款检索', 'HRCT 病灶分割'],
    builtin: true,
    enabled: true,
    description: '结合影像组学特征与临床资料生成早诊与鉴别诊断建议',
    model: 'Qwen-Max',
    knowledge: ['DLI 诊疗指南库', '影像诊断共识库'],
    sessions: 98,
    sessions30d: 2140,
    satisfaction: 93.6,
    version: 'v2.0.1',
    updatedAt: '2026-10-20',
    temperature: 0.3,
    topP: 0.85,
    maxRounds: 8,
    prompt:
      '你是 DLI 早诊报告助手。请整合 HRCT 影像组学特征、病理与检验结果，按「影像表现—鉴别诊断—建议检查」三段式输出，明确标注不确定项，所有结论需可回溯到指南或共识条款。',
    fallback: '影像质量不达标或缺少病理结果时输出待补充清单',
    scope: '全平台'
  },
  {
    id: 'A-04',
    name: '转归预测报告Agent',
    role: '生成 3/6/12 月转归预测报告',
    skills: ['检验指标趋势分析'],
    builtin: true,
    enabled: true,
    description: '基于纵向指标与用药方案输出多时间点转归概率',
    model: 'ERNIE-4.0-Turbo',
    knowledge: ['多中心病例库', '检验指标参考区间'],
    sessions: 63,
    sessions30d: 1460,
    satisfaction: 90.8,
    version: 'v1.4.0',
    updatedAt: '2026-10-18',
    temperature: 0.2,
    topP: 0.8,
    maxRounds: 5,
    prompt:
      '你是 DLI 转归预测助手。请根据纵向检验指标、用药方案与随访记录，输出 3/6/12 月转归概率与关键影响因素。概率仅作参考，必须提示由主治医生结合临床判断。',
    fallback: '纵向数据少于 2 个时间点时不出具概率，仅输出数据完整性说明',
    scope: '全平台'
  },
  {
    id: 'A-05',
    name: '随访Agent',
    role: '随访计划生成与执行跟进',
    skills: ['随访计划生成', '指南条款检索'],
    builtin: true,
    enabled: true,
    description: '生成个体化随访计划，跟进执行并识别失访风险',
    model: 'Doubao-Pro-128K',
    knowledge: ['患者教育材料库'],
    sessions: 221,
    sessions30d: 4860,
    satisfaction: 95.2,
    version: 'v1.6.3',
    updatedAt: '2026-10-23',
    temperature: 0.5,
    topP: 0.9,
    maxRounds: 10,
    prompt:
      '你是 DLI 随访助手。请依据风险分层生成随访节点与必查项目，用患者能理解的语言提醒注意事项；发现患者连续未回复时标记失访风险并建议护士介入。',
    fallback: '连续 2 次提醒未回复时标记失访风险并转护士',
    scope: '全平台'
  },
  {
    id: 'A-06',
    name: '科研数据整理Agent',
    role: '按分组与指标导出研究数据集',
    skills: ['结构化病历解析', '科研数据集脱敏导出'],
    builtin: false,
    enabled: true,
    description: '面向课题组的数据整理助手，按研究方案导出脱敏数据集',
    model: 'DeepSeek-V3',
    knowledge: ['多中心病例库'],
    sessions: 12,
    sessions30d: 320,
    satisfaction: 88.5,
    version: 'v1.1.0',
    updatedAt: '2026-10-12',
    temperature: 0.1,
    topP: 0.7,
    maxRounds: 6,
    prompt:
      '你是科研数据整理助手。请严格按照研究方案的入排标准筛选病例，按指定分组与指标生成数据集，导出前执行脱敏校验并列出字段映射表。不得输出可识别个人身份的信息。',
    fallback: '入排标准缺失或涉及跨中心数据时提示课题组长确认',
    scope: '课题组'
  },
  {
    id: 'A-07',
    name: '患者教育Agent',
    role: '疾病科普与用药指导',
    skills: ['指南条款检索', '不良反应上报'],
    builtin: false,
    enabled: true,
    description: '面向患者家属的科普问答助手，回答疾病与康复相关问题',
    model: 'Doubao-Pro-128K',
    knowledge: ['患者教育材料库'],
    sessions: 34,
    sessions30d: 760,
    satisfaction: 91.7,
    version: 'v1.0.2',
    updatedAt: '2026-10-09',
    temperature: 0.6,
    topP: 0.9,
    maxRounds: 8,
    prompt:
      '你是患者教育助手。请用通俗语言解释疾病知识、用药注意事项与康复训练方法，回答需来自患者教育材料库；不得给出诊断或调整用药的建议，遇到疑问引导咨询主治医生。',
    fallback: '问题超出科普范围或涉及用药调整时引导至主治医生',
    scope: '全平台'
  },
  {
    id: 'A-08',
    name: '影像质控Agent',
    role: '影像质量检查与重拍提示',
    skills: ['影像质量评分', '结构化病历解析'],
    builtin: false,
    enabled: true,
    description: '上传影像后自动评估扫描质量，提示呼气相、伪影等问题',
    model: 'Qwen-Max',
    knowledge: ['影像诊断共识库'],
    sessions: 121,
    sessions30d: 2680,
    satisfaction: 90.8,
    version: 'v1.2.4',
    updatedAt: '2026-10-20',
    temperature: 0.2,
    topP: 0.85,
    maxRounds: 6,
    prompt:
      '你是影像质控助手。请依据影像诊断共识库评估上传胸部 HRCT 的扫描质量，指出伪影、呼气相、层厚不合规等问题并给出重拍建议；不得基于低质量影像给出诊断结论。',
    fallback: '影像质量无法判定时转影像科人工复核',
    scope: '全平台'
  },
  {
    id: 'A-09',
    name: '用药安全Agent',
    role: '相互作用与禁忌校验',
    skills: ['用药禁忌校验', '指南条款检索'],
    builtin: false,
    enabled: true,
    description: '处方提交前校验药物相互作用、肝肾功能禁忌与剂量区间',
    model: 'DeepSeek-V3',
    knowledge: ['高危药物说明书库', 'DLI 诊疗指南库'],
    sessions: 203,
    sessions30d: 4120,
    satisfaction: 95.2,
    version: 'v2.1.0',
    updatedAt: '2026-10-23',
    temperature: 0.1,
    topP: 0.8,
    maxRounds: 8,
    prompt:
      '你是用药安全校验助手。请逐条核对处方药物与患者当前用药、肝肾功能、过敏史之间的相互作用与禁忌，输出风险等级与替代方案建议；仅作提示，最终处方由医生确认。',
    fallback: '涉及超说明书用药或高风险冲突时立即提示医生并转药师审核',
    scope: '全平台'
  },
  {
    id: 'A-10',
    name: '病理报告解读Agent',
    role: '病理报告结构化与解读',
    skills: ['结构化病历解析', '指南条款检索'],
    builtin: false,
    enabled: true,
    description: '把病理报告转为结构化字段，并对照诊断标准给出解读要点',
    model: 'ERNIE-4.0-Turbo',
    knowledge: ['影像诊断共识库', 'DLI 诊疗指南库'],
    sessions: 76,
    sessions30d: 1540,
    satisfaction: 92.1,
    version: 'v1.3.1',
    updatedAt: '2026-10-14',
    temperature: 0.2,
    topP: 0.9,
    maxRounds: 6,
    prompt:
      '你是病理报告解读助手。请将病理报告拆解为部位、分型、分级、免疫组化等结构化字段，并对照诊断共识标注关键结论；不得替代病理科医师出具诊断意见。',
    fallback: '报告缺失关键字段时提示补录或联系病理科',
    scope: '全平台'
  },
  {
    id: 'A-11',
    name: '样本管理Agent',
    role: '生物样本流转与库存提醒',
    skills: ['样本流转登记', '随访任务生成'],
    builtin: false,
    enabled: true,
    description: '跟踪样本采集、入库、出库与冻融次数，异常温度自动告警',
    model: 'Doubao-Pro-128K',
    knowledge: ['检验指标参考区间'],
    sessions: 58,
    sessions30d: 1180,
    satisfaction: 89.6,
    version: 'v1.0.8',
    updatedAt: '2026-10-08',
    temperature: 0.3,
    topP: 0.9,
    maxRounds: 8,
    prompt:
      '你是样本管理助手。请记录样本采集、入库、出库与冻融信息，核对库存余量与效期，发现温度异常或超期未处理时立即告警并给出处置步骤。',
    fallback: '冷链异常或样本丢失时升级至样本库管理员',
    scope: '全平台'
  },
  {
    id: 'A-12',
    name: '数据质控Agent',
    role: '病例数据完整性与一致性检查',
    skills: ['结构化病历解析', '检验指标趋势分析'],
    builtin: false,
    enabled: true,
    description: '按质控规则扫描病例缺失项、逻辑冲突与单位错误',
    model: 'DeepSeek-V3',
    knowledge: ['多中心病例库', '检验指标参考区间'],
    sessions: 145,
    sessions30d: 3020,
    satisfaction: 93.4,
    version: 'v1.5.2',
    updatedAt: '2026-10-18',
    temperature: 0.1,
    topP: 0.8,
    maxRounds: 10,
    prompt:
      '你是数据质控助手。请按质控规则检查病例数据的必填缺失、时间逻辑冲突、检验单位与参考区间错误，输出问题清单与定位字段；不得擅自修改原始数据。',
    fallback: '涉及跨中心数据口径差异时提交质控小组确认',
    scope: '全平台'
  },
  {
    id: 'A-13',
    name: '临床研究助理Agent',
    role: '研究方案执行与入排筛选',
    skills: ['指南条款检索', '统计分析脚本生成'],
    builtin: false,
    enabled: true,
    description: '按研究方案筛选候选病例，生成随访计划与质控清单',
    model: 'Qwen-Max',
    knowledge: ['多中心病例库', 'DLI 诊疗指南库'],
    sessions: 42,
    sessions30d: 860,
    satisfaction: 91.2,
    version: 'v1.1.5',
    updatedAt: '2026-10-16',
    temperature: 0.3,
    topP: 0.9,
    maxRounds: 12,
    prompt:
      '你是临床研究助理。请严格按研究方案的入排标准筛选候选病例，生成随访计划与质控清单，标注每条候选的命中依据；不得在未获授权时导出原始数据。',
    fallback: '方案条款冲突或涉及跨中心数据时提示课题组长确认',
    scope: '课题组'
  },
  {
    id: 'A-14',
    name: '多学科会诊Agent',
    role: '会诊资料汇总与意见整理',
    skills: ['结构化病历解析', '指南条款检索', '影像质量评分'],
    builtin: false,
    enabled: true,
    description: '汇总影像、病理、检验与用药信息，生成会诊摘要',
    model: 'Qwen-Max',
    knowledge: ['DLI 诊疗指南库', '影像诊断共识库', '多中心病例库'],
    sessions: 31,
    sessions30d: 640,
    satisfaction: 93.8,
    version: 'v1.0.4',
    updatedAt: '2026-10-13',
    temperature: 0.3,
    topP: 0.9,
    maxRounds: 10,
    prompt:
      '你是多学科会诊助手。请汇总患者影像、病理、检验与用药信息，按学科维度生成会诊摘要与待明确问题清单；不得替会诊专家给出结论。',
    fallback: '关键资料缺失时列出补充清单并通知会诊召集人',
    scope: '本中心'
  },
  {
    id: 'A-15',
    name: '指南更新追踪Agent',
    role: '诊疗指南版本追踪与差异比对',
    skills: ['指南条款检索', '文献摘要生成'],
    builtin: false,
    enabled: true,
    description: '监测指南更新，比对条款差异并提示受影响的模型与流程',
    model: 'DeepSeek-V3',
    knowledge: ['DLI 诊疗指南库', '患者教育材料库'],
    sessions: 18,
    sessions30d: 380,
    satisfaction: 90.4,
    version: 'v0.9.6',
    updatedAt: '2026-10-05',
    temperature: 0.2,
    topP: 0.9,
    maxRounds: 8,
    prompt:
      '你是指南追踪助手。请比对指南新旧版本的差异条款，标注变更类型与循证等级，并列出受影响的模型、量表与随访流程；引用需给出条款编号。',
    fallback: '指南来源不可信或版本冲突时提示人工核对原文',
    scope: '全平台'
  },
  {
    id: 'A-16',
    name: '随访依从性Agent',
    role: '随访提醒与失访干预',
    skills: ['随访任务生成', '用药禁忌校验'],
    builtin: false,
    enabled: true,
    description: '按风险分层推送随访提醒，识别失访风险并生成干预建议',
    model: 'Doubao-Pro-128K',
    knowledge: ['患者教育材料库', 'DLI 诊疗指南库'],
    sessions: 167,
    sessions30d: 3540,
    satisfaction: 92.6,
    version: 'v1.4.7',
    updatedAt: '2026-10-21',
    temperature: 0.4,
    topP: 0.9,
    maxRounds: 8,
    prompt:
      '你是随访依从性助手。请根据风险分层生成随访提醒与干预话术，识别连续未回复或多次改期的失访风险，并给出升级路径；涉及用药调整时引导咨询主治医生。',
    fallback: '连续 3 次未响应或出现危急症状时转人工随访',
    scope: '全平台'
  },
  {
    id: 'A-17',
    name: '科研统计Agent',
    role: '统计方法与结果解读',
    skills: ['统计分析脚本生成', '文献摘要生成'],
    builtin: false,
    enabled: true,
    description: '根据研究设计推荐统计方法，生成可复现的分析脚本',
    model: 'DeepSeek-V3',
    knowledge: ['多中心病例库'],
    sessions: 26,
    sessions30d: 520,
    satisfaction: 89.9,
    version: 'v1.0.1',
    updatedAt: '2026-09-29',
    temperature: 0.2,
    topP: 0.9,
    maxRounds: 12,
    prompt:
      '你是科研统计助手。请根据研究设计与数据类型推荐统计方法，生成可复现的分析脚本并说明假设检验前提；结论需标注置信区间与样本量限制。',
    fallback: '样本量不足或设计缺陷时提示咨询统计学家',
    scope: '课题组'
  },
  {
    id: 'A-18',
    name: '运营分析Agent',
    role: '中心运营指标解读',
    skills: ['统计分析脚本生成', '随访任务生成'],
    builtin: false,
    enabled: true,
    description: '解读各中心入组、随访与预警指标，给出运营改进建议',
    model: 'ERNIE-4.0-Turbo',
    knowledge: ['多中心病例库'],
    sessions: 39,
    sessions30d: 780,
    satisfaction: 90.1,
    version: 'v1.0.3',
    updatedAt: '2026-10-10',
    temperature: 0.4,
    topP: 0.9,
    maxRounds: 8,
    prompt:
      '你是运营分析助手。请基于各中心入组、随访完成率与预警处理时长等指标，指出异常波动与瓶颈环节，给出可执行的改进建议；不得推断患者个人情况。',
    fallback: '指标口径不一致时提示先由数据组对齐定义',
    scope: '全平台'
  }
]

/** 智能体版本记录 */
export const AGENT_VERSIONS: Record<string, AgentVersion[]> = {}
AGENTS.forEach((agent, index) => {
  const [major, minor] = agent.version.slice(1).split('.').map(Number)
  const versions: AgentVersion[] = [
    {
      version: agent.version,
      publishedAt: shiftDate(-(index % 6) - 2, 11, 30),
      publisher: index === 0 ? '陈明远' : agent.builtin ? '平台管理员' : '刘志远',
      note: '调整提示词中的转人工条件，补充引用要求',
      prompt: agent.prompt,
      active: true
    },
    {
      version: `v${major}.${Math.max(minor - 1, 0)}.0`,
      publishedAt: shiftDate(-48 - index * 2, 14, 10),
      publisher: '平台管理员',
      note: '优化多轮上下文压缩策略，降低 Token 消耗',
      prompt: `${agent.prompt.slice(0, 40)}……（历史版本提示词快照）`,
      active: false
    }
  ]
  if (index % 2 === 0 && versions.every((item) => item.version !== `v${major}.0.0`)) {
    versions.push({
      version: `v${major}.0.0`,
      publishedAt: shiftDate(-180 - index * 3, 10, 0),
      publisher: '平台管理员',
      note: '初始版本发布',
      prompt: `${agent.prompt.slice(0, 28)}……（初始版本提示词快照）`,
      active: false
    })
  }
  AGENT_VERSIONS[agent.id] = versions
})

/** 智能体会话记录 */
export const AGENT_SESSIONS: AgentSession[] = []
AGENTS.forEach((agent, index) => {
  const rand = seeded(9200 + index)
  for (let i = 0; i < 9; i++) {
    const status: AgentSession['status'] =
      i === 1 ? '进行中' : agent.satisfaction < 90 && i === 4 ? '转人工' : '已结束'
    AGENT_SESSIONS.push({
      id: `${agent.id}-S${String(i + 1).padStart(3, '0')}`,
      agentId: agent.id,
      patient: NAMES[(index * 3 + i) % NAMES.length],
      doctor: DOCTORS[(index + i) % DOCTORS.length],
      channel: (['APP', 'Web', '微信'] as const)[(index + i) % 3],
      rounds: 4 + Math.round(rand() * 12),
      duration: 3 + Math.round(rand() * 27),
      satisfaction: Math.min(100, Math.round(agent.satisfaction + rand() * 8 - 4)),
      status,
      startedAt: shiftDate(-(i % 3), 8 + i, (i * 9) % 60)
    })
  }
})

/** 智能体近 7 日会话趋势 */
export const AGENT_TRENDS: Record<string, AgentTrendPoint[]> = {}
AGENTS.forEach((agent, index) => {
  const rand = seeded(10200 + index)
  AGENT_TRENDS[agent.id] = Array.from({ length: 7 }, (_, i) => ({
    date: dateOnly(i - 6),
    sessions: Math.round((agent.sessions30d / 30) * (0.7 + rand() * 0.6))
  }))
})

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
  },
  {
    id: 'R-2026-005',
    name: '多模态影像组学早诊价值研究',
    owner: '陈明远',
    center: '华东中心',
    groupBy: ['影像征象', 'AI/常规组'],
    indicators: ['AUC', '早诊灵敏度', '影像组学评分'],
    members: 9,
    shared: true,
    shareLevel: '平台',
    status: '进行中',
    updatedAt: '2026-10-23'
  },
  {
    id: 'R-2026-006',
    name: '激素减量方案安全性比较研究',
    owner: '周雅琴',
    center: '华北中心',
    groupBy: ['减量速度', '年龄分层'],
    indicators: ['急性加重率', '激素累积剂量', '骨密度变化'],
    members: 7,
    shared: true,
    shareLevel: '中心',
    status: '进行中',
    updatedAt: '2026-10-20'
  },
  {
    id: 'R-2026-007',
    name: 'DLI 患者疲劳症状干预研究',
    owner: '刘志远',
    center: '华南中心',
    groupBy: ['干预方式'],
    indicators: ['疲劳量表评分', '6MWT 距离'],
    members: 5,
    shared: false,
    shareLevel: '课题组',
    status: '进行中',
    updatedAt: '2026-10-18'
  },
  {
    id: 'R-2026-008',
    name: '免疫抑制剂血药浓度监测研究',
    owner: '孙可欣',
    center: '西南中心',
    groupBy: ['药物种类', '基因型'],
    indicators: ['血药浓度', '肝肾功能', '不良反应率'],
    members: 6,
    shared: true,
    shareLevel: '中心',
    status: '进行中',
    updatedAt: '2026-10-15'
  },
  {
    id: 'R-2026-009',
    name: '夜间低氧与疾病进展相关性研究',
    owner: '陈明远',
    center: '华东中心',
    groupBy: ['低氧分级'],
    indicators: ['夜间血氧饱和度', 'FVC 下降率', '急性加重次数'],
    members: 10,
    shared: true,
    shareLevel: '平台',
    status: '进行中',
    updatedAt: '2026-10-12'
  },
  {
    id: 'R-2026-010',
    name: 'AI 随访语音助手可用性研究',
    owner: '周雅琴',
    center: '华北中心',
    groupBy: ['随访场景'],
    indicators: ['随访完成率', '患者满意度', '转人工率'],
    members: 8,
    shared: false,
    shareLevel: '课题组',
    status: '进行中',
    updatedAt: '2026-10-08'
  },
  {
    id: 'R-2026-011',
    name: '康复训练依从性与转归研究',
    owner: '刘志远',
    center: '华南中心',
    groupBy: ['训练频次', '年龄分层'],
    indicators: ['训练依从率', 'FVC 变化', '转归分层'],
    members: 7,
    shared: true,
    shareLevel: '中心',
    status: '进行中',
    updatedAt: '2026-09-30'
  },
  {
    id: 'R-2025-012',
    name: '多中心生物样本库建设与质控研究',
    owner: '孙可欣',
    center: '西南中心',
    groupBy: ['中心', '样本类型'],
    indicators: ['样本合格率', '冻融次数', '库容利用率'],
    members: 12,
    shared: true,
    shareLevel: '平台',
    status: '已结题',
    updatedAt: '2026-05-22'
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
  { date: '10-21', patients: 179, alerts: 31 },
  { date: '10-22', patients: 207, alerts: 17 },
  { date: '10-23', patients: 198, alerts: 28 },
  { date: '10-24', patients: 221, alerts: 19 },
  { date: '10-25', patients: 213, alerts: 26 },
  { date: '10-26', patients: 231, alerts: 16 }
]
