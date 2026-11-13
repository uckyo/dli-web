/**
 * DLI 页面说明蓝图 · 新增业务 Mock 数据
 *
 * 数据仅用于原型演示，均为内存态。患者标识一律使用系统患者编号或
 * 研究受试者编号，不含姓名 / 手机号 / 病历号（G1 [批注 01-4]）。
 */
import type { ResearchItem } from '@/mock/dli/types'
import type {
  AnalysisRun,
  AssessmentReport,
  CodeRule,
  ConsentTemplate,
  FieldConfigVersion,
  FollowupPlan,
  FollowupTask,
  FollowupTemplate,
  IndicatorMeta,
  LogResult,
  ManagementPlan,
  PatientField,
  ResearchCriteriaItem,
  ResearchCriteriaList,
  ResearchProjectDetail,
  ResearchShareContent,
  ResearchShareSetting,
  SystemLog,
  WarningTicket
} from './types'

const pid = (n: number) => `DLI-2026-${String(n).padStart(4, '0')}`
const nowStr = () => new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')

/* --------------------------------- P05 评估报告 -------------------------------- */

export const ASSESSMENT_REPORTS: AssessmentReport[] = [
  {
    id: 'AR-0001',
    patientId: pid(12),
    stage: '治疗前',
    modelUsage: '早筛预警',
    category: '治疗前风险评估',
    basis: '基线影像 + 肝功能检验 + 用药史',
    assessedAt: '2026-11-08 09:12',
    modelVersion: 'DLI-Risk v2.3',
    source: '自动评估',
    result: '中风险，建议治疗前复查',
    researchGroup: 'AI辅助诊疗组',
    inputs: ['基线胸腹部 CT（识别已核对）', '肝功能检验（识别已核对）', '用药史（系统记录）'],
    evidence: ['基线影像早筛模型评分 0.62', '肝功能指标 ALT 轻度升高', '既往用药暴露史'],
    suggestions: ['治疗前 1 周内复查肝功能', '按原方案入组，治疗中加密体征监测'],
    opinion: {
      adoption: '采纳',
      note: '与临床判断一致，按建议执行',
      doctor: '李医生',
      confirmedAt: '2026-11-08 10:02'
    },
    status: '已确认'
  },
  {
    id: 'AR-0002',
    patientId: pid(5),
    stage: '治疗中',
    modelUsage: '早诊预警',
    category: '治疗中监测预警',
    basis: '连续 3 次体征上报 + 检验识别结果',
    assessedAt: '2026-11-08 14:36',
    modelVersion: 'DLI-Monitor v1.8',
    source: '自动评估',
    result: '指标上行，建议医生复核',
    researchGroup: 'AI辅助诊疗组',
    inputs: ['连续 3 次患者体征上报', '检验识别结果（已核对）'],
    evidence: ['体征上行趋势连续 3 个时点', '早诊预警模型评分 0.71'],
    suggestions: ['医生复核预警', '必要时 3 日内复查'],
    status: '待核对'
  },
  {
    id: 'AR-0003',
    patientId: pid(18),
    stage: '诊断后',
    modelUsage: '转归预测',
    category: '诊断后辅助评估',
    basis: '病理报告 + HRCT 影像',
    assessedAt: '2026-11-07 16:20',
    modelVersion: 'DLI-Dx v3.0',
    source: '医生手动评估',
    result: '支持诊断，需补充随访数据',
    researchGroup: '常规诊疗组',
    inputs: ['病理报告（识别已核对）', 'HRCT 影像'],
    evidence: ['转归预测模型输出 12 个月风险 0.48', '病理分级 G2'],
    suggestions: ['补充 2 次随访数据后重评', '维持当前治疗方案'],
    opinion: {
      adoption: '修改后采纳',
      note: '随访间隔由 4 周调整为 2 周，其余采纳',
      doctor: '李医生',
      confirmedAt: '2026-11-07 17:05'
    },
    status: '已确认'
  },
  {
    id: 'AR-0004',
    patientId: pid(23),
    stage: '治疗中',
    modelUsage: '转归预测',
    category: '随访建议',
    basis: '随访计划执行反馈',
    assessedAt: '2026-11-06 10:05',
    modelVersion: 'DLI-Follow v1.2',
    source: '自动评估',
    result: '建议 4 周后复查',
    researchGroup: '常规诊疗组',
    inputs: ['随访计划执行反馈', '最近一次复查结果'],
    evidence: ['转归预测窗口稳定', '无新发异常指标'],
    suggestions: ['4 周后复查', '继续当前随访频率'],
    status: '待核对'
  },
  {
    id: 'AR-0005',
    patientId: pid(16),
    stage: '治疗前',
    modelUsage: '早筛预警',
    category: '治疗前风险评估',
    basis: '基线检验（识别结果已核对）',
    assessedAt: '2026-11-05 08:41',
    modelVersion: 'DLI-Risk v2.3',
    source: '自动评估',
    result: '低风险，按方案入组',
    researchGroup: 'AI辅助诊疗组',
    inputs: ['基线检验（识别结果已核对）'],
    evidence: ['早筛模型评分 0.21', '基线指标均在正常范围'],
    suggestions: ['按方案入组', '常规随访频率'],
    opinion: {
      adoption: '采纳',
      note: '同意入组',
      doctor: '王医生',
      confirmedAt: '2026-11-05 09:30'
    },
    status: '已确认'
  },
  {
    id: 'AR-0006',
    patientId: pid(21),
    stage: '治疗中',
    modelUsage: '早诊预警',
    category: '治疗中监测预警',
    basis: '影像资料待核对，暂不纳入评估',
    assessedAt: '2026-11-04 15:18',
    modelVersion: 'DLI-Monitor v1.8',
    source: '自动评估',
    result: '资料缺失，评估退回',
    researchGroup: '常规诊疗组',
    inputs: ['影像资料（待核对，未纳入）'],
    evidence: ['必需输入不完整：影像资料未核对'],
    suggestions: ['核对影像资料后重新发起评估'],
    status: '退回',
    reviewNote: '影像资料未核对，评估退回'
  },
  {
    id: 'AR-0007',
    patientId: pid(18),
    stage: '治疗中',
    modelUsage: '早诊预警',
    category: '治疗建议',
    basis: '疗效评估 + 多学科会诊意见',
    assessedAt: '2026-11-03 09:48',
    modelVersion: 'DLI-Treat v1.0',
    source: '自动评估',
    result: '建议调整用药方案',
    researchGroup: 'AI辅助诊疗组',
    inputs: ['疗效评估记录', '多学科会诊意见'],
    evidence: ['早诊预警模型评分上行至 0.66', '会诊意见支持调整'],
    suggestions: ['调整用药方案', '2 周后复评'],
    status: '待核对'
  }
]

/* --------------------------------- P05 预警处置 -------------------------------- */

export const WARNING_TICKETS: WarningTicket[] = [
  {
    id: 'WN-0001',
    patientId: pid(5),
    trigger: '治疗中监测指标连续上行',
    level: '高',
    status: '待处理',
    doctor: '李医生',
    relatedReportId: 'AR-0002',
    channel: 'Web 评估预警',
    intervention: '',
    doctorConfirmed: false,
    sourceVerified: true,
    createdAt: '2026-11-08 14:40',
    records: [
      {
        id: 'DR-001',
        operator: '系统',
        role: '系统',
        action: '生成预警',
        createdAt: '2026-11-08 14:40'
      }
    ]
  },
  {
    id: 'WN-0002',
    patientId: pid(12),
    trigger: '早筛预警阈值触发',
    level: '中',
    status: '处理中',
    doctor: '李医生',
    relatedReportId: 'AR-0001',
    channel: '患者详情',
    intervention: '安排复查并通知患者',
    doctorConfirmed: false,
    sourceVerified: true,
    createdAt: '2026-11-08 11:02',
    records: [
      {
        id: 'DR-002',
        operator: '系统',
        role: '系统',
        action: '生成预警',
        createdAt: '2026-11-08 11:02'
      },
      {
        id: 'DR-003',
        operator: '李医生',
        role: '医生',
        action: '记录跟进事项',
        createdAt: '2026-11-08 11:35'
      }
    ]
  },
  {
    id: 'WN-0003',
    patientId: pid(13),
    trigger: '识别结果未核对，暂缓评估',
    level: '低',
    status: '待处理',
    doctor: '王医生',
    channel: '消息',
    intervention: '',
    doctorConfirmed: false,
    sourceVerified: false,
    createdAt: '2026-11-07 17:12',
    records: [
      {
        id: 'DR-004',
        operator: '系统',
        role: '系统',
        action: '资料待核对',
        createdAt: '2026-11-07 17:12'
      }
    ]
  },
  {
    id: 'WN-0004',
    patientId: pid(16),
    trigger: '转归预测窗口变化',
    level: '中',
    status: '已处理',
    doctor: '王医生',
    relatedReportId: 'AR-0005',
    channel: 'Web 评估预警',
    intervention: '维持方案，2 周后复评',
    doctorConfirmed: true,
    sourceVerified: true,
    handleNote: '风险可控，维持原方案并加强观察',
    handleResult: '已处理：维持方案，2 周后复评',
    createdAt: '2026-11-05 09:20',
    records: [
      {
        id: 'DR-005',
        operator: '系统',
        role: '系统',
        action: '生成预警',
        createdAt: '2026-11-05 09:20'
      },
      {
        id: 'DR-006',
        operator: '王医生',
        role: '医生',
        action: '确认干预安排并下发患者端',
        createdAt: '2026-11-05 10:06'
      }
    ]
  },
  {
    id: 'WN-0005',
    patientId: pid(21),
    trigger: '随访逾期触发',
    level: '低',
    status: '已处理',
    doctor: '李医生',
    channel: '患者详情',
    intervention: '人工补录随访结果',
    doctorConfirmed: true,
    sourceVerified: true,
    handleNote: '随访已补录，风险解除',
    handleResult: '已处理：预警关闭，恢复常规随访',
    createdAt: '2026-11-04 16:44',
    records: [
      {
        id: 'DR-007',
        operator: '系统',
        role: '系统',
        action: '生成预警',
        createdAt: '2026-11-04 16:44'
      },
      {
        id: 'DR-008',
        operator: '陈助理',
        role: '医生助理',
        action: '记录跟进事项',
        createdAt: '2026-11-04 17:03'
      }
    ]
  }
]

/* --------------------------- P05 管理计划表 [批注 05] --------------------------- */

export const MANAGEMENT_PLANS: ManagementPlan[] = [
  {
    id: 'MP-0001',
    patientId: pid(5),
    name: '保肝用药调整',
    type: '用药',
    content: '停用当前保肝药，改用多烯磷脂酰胆碱，每日 2 次',
    executeAt: '2026-11-10 08:00',
    requirement: '按医嘱定时服用，3 日内反馈用药反应',
    status: '已发布',
    taskId: 'FT-MP0001',
    operator: '李医生',
    createdAt: '2026-11-08 15:10',
    publishedAt: '2026-11-08 15:30'
  },
  {
    id: 'MP-0002',
    patientId: pid(5),
    name: '肝功能复查',
    type: '复查',
    content: '复查肝功能五项 + 腹部超声',
    executeAt: '2026-11-14 09:00',
    requirement: '空腹前往，检查前 8 小时禁食',
    status: '草稿',
    operator: '李医生',
    createdAt: '2026-11-08 16:02'
  },
  {
    id: 'MP-0003',
    patientId: pid(12),
    name: '抗病毒用药维持',
    type: '用药',
    content: '维持当前抗病毒方案，不作调整',
    executeAt: '2026-11-12 08:00',
    requirement: '按方案定时服用，漏服当日补记',
    status: '已发布',
    taskId: 'FT-MP0003',
    operator: '王医生',
    createdAt: '2026-11-06 10:20',
    publishedAt: '2026-11-06 10:45'
  },
  {
    id: 'MP-0004',
    patientId: pid(12),
    name: '影像学复查',
    type: '复查',
    content: '胸腹部 HRCT 复查，评估病灶变化',
    executeAt: '2026-11-20 14:00',
    requirement: '提前 1 日预约影像中心',
    status: '已取消',
    operator: '王医生',
    createdAt: '2026-11-05 11:30'
  }
]

/* --------------------------------- P10 随访管理 -------------------------------- */

export const FOLLOWUP_PLANS: FollowupPlan[] = [
  {
    id: 'FP-001',
    patientId: pid(12),
    name: '抗肿瘤治疗后 4 周随访计划',
    doctor: '李医生',
    startDate: '2026-10-28',
    endDate: '2026-11-25',
    status: '已发布',
    source: '医生创建',
    version: 'V1.2',
    templateId: 'FUT-001',
    publishedAt: '2026-10-28',
    createdAt: '2026-10-26 09:00'
  },
  {
    id: 'FP-002',
    patientId: pid(18),
    name: 'DLI 确诊后管理计划',
    doctor: '王医生',
    startDate: '2026-11-02',
    endDate: '2026-12-02',
    status: '已发布',
    source: '模型建议',
    version: 'V1.0',
    templateId: 'FUT-002',
    publishedAt: '2026-11-02',
    createdAt: '2026-10-30 14:30'
  },
  {
    id: 'FP-003',
    patientId: pid(21),
    name: '高危药物监测计划',
    doctor: '王医生',
    startDate: '2026-11-12',
    endDate: '2026-12-12',
    status: '草稿',
    source: '自动规则',
    version: 'V1.0（草稿）',
    templateId: 'FUT-003',
    createdAt: '2026-11-08 10:00'
  },
  {
    id: 'FP-004',
    patientId: pid(5),
    name: '治疗后转归观察计划',
    doctor: '李医生',
    startDate: '2026-09-01',
    endDate: '2026-11-01',
    status: '已完成',
    source: '医生创建',
    version: 'V1.1',
    publishedAt: '2026-09-01',
    createdAt: '2026-08-28 11:00'
  },
  {
    id: 'FP-005',
    patientId: pid(23),
    name: '影像复查随访计划（已取消）',
    doctor: '李医生',
    startDate: '2026-10-15',
    endDate: '2026-11-15',
    status: '已取消',
    source: '医生创建',
    version: 'V1.0',
    publishedAt: '2026-10-15',
    createdAt: '2026-10-12 15:00'
  }
]

export const FOLLOWUP_TASKS: FollowupTask[] = [
  {
    id: 'FT-0001',
    planId: 'FP-001',
    patientId: pid(12),
    title: '肝功能复查结果上报',
    itemName: '检验复查',
    executeAt: '2026-11-10 09:00',
    requirement: '空腹前往，上传检验报告',
    completeWay: '上传报告',
    status: '待完成',
    overdue: false,
    type: '自动任务',
    dueDate: '2026-11-10',
    assignee: '张护士',
    result: '',
    resultSource: '',
    doctorConfirmed: true,
    changeLog: [{ action: '计划下发', operator: '李医生', createdAt: '2026-10-28 09:00' }]
  },
  {
    id: 'FT-0002',
    planId: 'FP-001',
    patientId: pid(5),
    title: '症状体征周报',
    itemName: '症状随访',
    executeAt: '2026-11-06 08:00',
    requirement: '每周填写症状体征问卷',
    completeWay: '填写反馈',
    status: '已提交待核对',
    overdue: false,
    type: '自动任务',
    dueDate: '2026-11-06',
    assignee: '患者端回传',
    result: '已填写周报：无新增不适，睡眠一般',
    resultSource: '患者回传',
    feedback: '无新增不适，睡眠一般，食欲正常',
    feedbackAt: '2026-11-06 09:15',
    feedbackAttachment: '',
    doctorConfirmed: true,
    changeLog: [
      { action: '计划下发', operator: '李医生', createdAt: '2026-10-28 09:00' },
      { action: '患者提交反馈，待核对', operator: '患者端', createdAt: '2026-11-06 09:15' }
    ]
  },
  {
    id: 'FT-0003',
    planId: 'FP-002',
    patientId: pid(18),
    title: '用药打卡核对',
    itemName: '用药随访',
    executeAt: '2026-11-05 10:00',
    requirement: '核对近 7 日用药打卡记录',
    completeWay: '医护记录',
    status: '待完成',
    overdue: true,
    type: '人工随访',
    dueDate: '2026-11-05',
    assignee: '陈助理',
    result: '',
    resultSource: '',
    doctorConfirmed: true,
    changeLog: [{ action: '计划变更并通知患者', operator: '王医生', createdAt: '2026-11-03 14:20' }]
  },
  {
    id: 'FT-0004',
    planId: 'FP-002',
    patientId: pid(23),
    title: '影像资料补交',
    itemName: '资料补交',
    executeAt: '2026-11-12 14:00',
    requirement: '补交外院 HRCT 影像资料',
    completeWay: '上传报告',
    status: '待补充',
    overdue: false,
    type: '自动任务',
    dueDate: '2026-11-12',
    assignee: '李医生',
    result: '',
    resultSource: '',
    checkResult: '要求补充',
    checkNote: '影像资料不清晰，要求重新上传',
    checkBy: '李医生',
    doctorConfirmed: true,
    changeLog: [
      { action: '核对要求补充：影像资料不清晰', operator: '李医生', createdAt: '2026-11-07 16:00' }
    ]
  },
  {
    id: 'FT-0005',
    planId: 'FP-001',
    patientId: pid(16),
    title: '电话随访（人工补录）',
    itemName: '电话随访',
    executeAt: '2026-11-04 15:00',
    requirement: '电话确认用药与症状',
    completeWay: '医护记录',
    status: '已完成',
    overdue: false,
    type: '人工随访',
    dueDate: '2026-11-04',
    assignee: '张护士',
    result: '已电话随访，按计划用药',
    resultSource: '医护补录',
    contactAt: '2026-11-04 15:30',
    contactWay: '电话',
    contactResult: '已联系',
    doctorConfirmed: true,
    changeLog: [{ action: '补录人工随访结果', operator: '张护士', createdAt: '2026-11-04 15:30' }]
  },
  {
    id: 'FT-0006',
    planId: 'FP-003',
    patientId: pid(21),
    title: '高危用药前评估',
    itemName: '治疗前评估',
    executeAt: '2026-11-15 09:00',
    requirement: '用药前完成基线评估',
    completeWay: '填写反馈',
    status: '待完成',
    overdue: false,
    type: '自动任务',
    dueDate: '2026-11-15',
    assignee: '王医生',
    result: '',
    resultSource: '',
    doctorConfirmed: false,
    changeLog: []
  },
  {
    id: 'FT-0007',
    planId: 'FP-004',
    patientId: pid(5),
    title: '治疗结束转归评估',
    itemName: '转归评估',
    executeAt: '2026-10-30 09:00',
    requirement: '完成转归评估问卷',
    completeWay: '填写反馈',
    status: '已完成',
    overdue: false,
    type: '自动任务',
    dueDate: '2026-10-30',
    assignee: '李医生',
    result: '转归评估完成，病情稳定',
    resultSource: '患者回传',
    feedback: '已完成全部随访项目',
    feedbackAt: '2026-10-30 10:00',
    doctorConfirmed: true,
    changeLog: [{ action: '任务完成', operator: '李医生', createdAt: '2026-10-30 10:30' }]
  },
  {
    id: 'FT-0008',
    planId: 'FP-005',
    patientId: pid(23),
    title: '影像复查预约',
    itemName: '复查随访',
    executeAt: '2026-11-01 09:00',
    requirement: '预约影像复查',
    completeWay: '医护记录',
    status: '已取消',
    overdue: false,
    type: '自动任务',
    dueDate: '2026-11-01',
    assignee: '张护士',
    result: '计划取消，停止后续提醒',
    resultSource: '',
    doctorConfirmed: true,
    changeLog: [
      { action: '计划取消，停止后续提醒', operator: '李医生', createdAt: '2026-10-20 11:00' }
    ]
  }
]

/* ---------------- 随访模板 [批注 10] ---------------- */

export const FOLLOWUP_TEMPLATES: FollowupTemplate[] = [
  {
    id: 'FUT-001',
    name: '抗肿瘤治疗后 4 周随访模板',
    stage: '治疗中',
    version: 'V2.1',
    status: '已发布',
    items: ['检验复查（第 4 周）', '症状体征周报（每周）', '电话随访（第 2 周）'],
    timePoints: '相对时点：治疗后 1/2/4 周',
    requirement: '按方案时点执行，逾期自动提醒',
    completeWay: '填写反馈 / 上传报告',
    updatedAt: '2026-11-05 10:00',
    operator: '李医生'
  },
  {
    id: 'FUT-002',
    name: 'DLI 确诊后管理随访模板',
    stage: '诊断后',
    version: 'V1.3',
    status: '已发布',
    items: ['用药打卡核对', '影像资料补交', '转归评估'],
    timePoints: '相对时点：确诊后 1/3/6/12 月',
    requirement: '按诊断后节点执行',
    completeWay: '填写反馈 / 医护记录',
    updatedAt: '2026-10-22 14:00',
    operator: '王医生'
  },
  {
    id: 'FUT-003',
    name: '高危药物监测随访模板',
    stage: '治疗前',
    version: 'V1.0（草稿）',
    status: '草稿',
    items: ['高危用药前评估', '基线检验复查'],
    timePoints: '相对时点：用药前 1 周、用药后 1 周',
    requirement: '用药前必需完成基线评估',
    completeWay: '填写反馈',
    updatedAt: '2026-11-08 09:30',
    operator: '王医生'
  }
]

/* ------------------------------ P08 研究项目详情 ------------------------------ */

/* ------------------------------ P08 研究项目详情 ------------------------------ */

export const RESEARCH_PROJECT_DETAILS: ResearchProjectDetail[] = [
  {
    id: 'RP-001',
    name: 'DLI 早期诊断多中心前瞻性研究',
    officialGroup: 'AI辅助诊疗组',
    shareLevel: '指定内容共享',
    groups: ['AI辅助诊疗组', '常规诊疗组', '全部入组'],
    indicators: ['DLI 发生率', '早期诊断率', '死亡率', 'FVC 变化'],
    timeRanges: ['近 30 天', '近 90 天', '全研究周期'],
    results: [
      {
        condition: { group: 'AI辅助诊疗组', indicator: '早期诊断率', timeRange: '近 90 天' },
        statisticalMethod: '按入组人数计算比例',
        unit: '%',
        validCount: 186,
        missingCount: 4,
        value: '72.6',
        needsRerun: false,
        savedAt: '2026-11-07 10:20'
      },
      {
        condition: { group: '常规诊疗组', indicator: 'DLI 发生率', timeRange: '全研究周期' },
        statisticalMethod: '按随访人年计算',
        unit: '例/100 人年',
        validCount: 204,
        missingCount: 9,
        value: '4.8',
        needsRerun: true,
        savedAt: '2026-10-30 16:05'
      }
    ],
    progress: [
      {
        center: '中心 A',
        group: 'AI辅助诊疗组',
        enrolled: 96,
        target: 120,
        followupDone: 88,
        endpointDone: 81
      },
      {
        center: '中心 A',
        group: '常规诊疗组',
        enrolled: 90,
        target: 120,
        followupDone: 80,
        endpointDone: 74
      },
      {
        center: '中心 B',
        group: 'AI辅助诊疗组',
        enrolled: 62,
        target: 100,
        followupDone: 55,
        endpointDone: 49
      },
      {
        center: '中心 C',
        group: '常规诊疗组',
        enrolled: 48,
        target: 80,
        followupDone: 41,
        endpointDone: 38
      }
    ],
    endpoints: [
      { name: 'DLI 发生率', value: '5.2%', safetyEventConfirmed: true },
      { name: '早期诊断率', value: '70.1%', safetyEventConfirmed: true },
      { name: '死亡率', value: '1.4%', safetyEventConfirmed: true }
    ],
    materials: [
      {
        id: 'RM-001',
        name: '研究方案 V3.1',
        type: '研究方案',
        version: 'V3.1',
        updatedAt: '2026-09-12'
      },
      {
        id: 'RM-002',
        name: '伦理批件',
        type: '伦理材料',
        version: 'V1.0',
        updatedAt: '2026-08-30'
      },
      {
        id: 'RM-003',
        name: '中期评价材料',
        type: '评价材料',
        version: 'V1.2',
        updatedAt: '2026-10-22'
      }
    ],
    shareGrantsPatientDetail: false,
    shareGrantsEdit: false,
    shareGrantsExport: false
  },
  {
    id: 'RP-002',
    name: '药物治疗相关肝损伤转归预测研究',
    officialGroup: '常规诊疗组',
    shareLevel: '未共享',
    groups: ['常规诊疗组', '全部入组'],
    indicators: ['转归预测准确率', 'FVC 变化', '死亡率'],
    timeRanges: ['近 30 天', '全研究周期'],
    results: [
      {
        condition: { group: '常规诊疗组', indicator: '转归预测准确率', timeRange: '全研究周期' },
        statisticalMethod: '按窗口样本数计算',
        unit: '%',
        validCount: 132,
        missingCount: 6,
        value: '83.3',
        needsRerun: false,
        savedAt: '2026-11-03 11:42'
      }
    ],
    progress: [
      {
        center: '中心 B',
        group: '常规诊疗组',
        enrolled: 74,
        target: 90,
        followupDone: 68,
        endpointDone: 60
      },
      {
        center: '中心 D',
        group: '常规诊疗组',
        enrolled: 36,
        target: 60,
        followupDone: 30,
        endpointDone: 27
      }
    ],
    endpoints: [{ name: '转归预测准确率', value: '83.3%', safetyEventConfirmed: false }],
    materials: [
      {
        id: 'RM-004',
        name: '研究方案 V1.4',
        type: '研究方案',
        version: 'V1.4',
        updatedAt: '2026-10-08'
      }
    ],
    shareGrantsPatientDetail: false,
    shareGrantsEdit: false,
    shareGrantsExport: false
  }
]

/* ------------------- 研究项目主链路扩展数据 [批注 08/12/15] ------------------- */

/** 指标方案：单位与统计方式按项目方案确定，不固定用均值 [批注 08] */
export const INDICATOR_META: Record<string, IndicatorMeta> = {
  'DLI 发生率': { unit: '%', statisticalMethod: '按入组人数计算比例' },
  早期诊断率: { unit: '%', statisticalMethod: '按入组人数计算比例' },
  死亡率: { unit: '%', statisticalMethod: '按随访人年计算' },
  'FVC 变化': { unit: '%', statisticalMethod: '按基线差值中位数统计' },
  转归预测准确率: { unit: '%', statisticalMethod: '按窗口样本数计算' },
  'HRCT 磨玻璃影变化': { unit: '分', statisticalMethod: '按评分变化中位数统计' },
  'FVC 下降率': { unit: '%', statisticalMethod: '按随访窗口下降比例统计' },
  'IL-6 水平': { unit: 'pg/mL', statisticalMethod: '按检测值中位数统计' },
  早筛灵敏度: { unit: '%', statisticalMethod: '按真阳性率计算' },
  早筛特异度: { unit: '%', statisticalMethod: '按真阴性率计算' },
  AUC: { unit: '', statisticalMethod: '按 ROC 曲线下面积计算' },
  血药浓度: { unit: 'ng/mL', statisticalMethod: '按检测值中位数统计' },
  '6 个月转归概率': { unit: '%', statisticalMethod: '按窗口样本数计算' },
  IL6: { unit: 'pg/mL', statisticalMethod: '按检测值中位数统计' },
  'IL-6': { unit: 'pg/mL', statisticalMethod: '按检测值中位数统计' },
  'TNF-α': { unit: 'pg/mL', statisticalMethod: '按检测值中位数统计' },
  CRP: { unit: 'mg/L', statisticalMethod: '按检测值中位数统计' }
}

export function getIndicatorMeta(indicator: string): IndicatorMeta {
  return (
    INDICATOR_META[indicator] ?? {
      unit: '',
      statisticalMethod: '按方案统计口径'
    }
  )
}

/** Agent 分析运行记录：内存态，刷新复位 [批注 08] */
export const ANALYSIS_RUNS: AnalysisRun[] = []

/** 入组清单条目模板：上传文件或 Agent 文字不会自动成为生效规则 [批注 15] */
const CRITERIA_SEED: Array<Omit<ResearchCriteriaItem, 'id'>> = [
  {
    type: '纳入条件',
    content: '年龄 ≥ 18 岁，已完成建档并可按方案随访',
    basis: '基础资料 / 随访记录',
    displayOrder: 1
  },
  {
    type: '纳入条件',
    content: '基线肝功能、血常规等必需检查资料完整且已核对归档',
    basis: '检验报告 / 检查资料',
    displayOrder: 2
  },
  {
    type: '纳入条件',
    content: '拟接受或正在接受方案规定的高危药物治疗',
    basis: '用药记录 / 诊疗历程',
    displayOrder: 3
  },
  {
    type: '排除条件',
    content: '既往确诊药物性肝损伤且病情尚未稳定',
    basis: '既往史 / 诊断资料',
    displayOrder: 4
  },
  {
    type: '排除条件',
    content: '妊娠期，或合并严重肝肾功能不全',
    basis: '检验报告 / 病历',
    displayOrder: 5
  }
]

function makeCriteriaList(
  projectId: string,
  version: string,
  status: ResearchCriteriaList['status'],
  confirmedBy = '医生'
): ResearchCriteriaList {
  return {
    id: `CL-${projectId}-${version}`,
    projectId,
    planVersion: 'V1.0',
    version,
    status,
    items: CRITERIA_SEED.map((item, index) => ({
      ...item,
      id: `${projectId}-${version}-${index + 1}`
    })),
    confirmedBy: status === '已确认' ? confirmedBy : '',
    confirmedAt: status === '已确认' ? nowStr() : '',
    updatedAt: nowStr()
  }
}

export const RESEARCH_CRITERIA_LISTS: ResearchCriteriaList[] = [
  // 研究管理列表项目：与患者详情研究入组使用同一编号 [批注 03/15]
  makeCriteriaList('R-2026-001', 'V1.0', '已停用', '陈明远'),
  makeCriteriaList('R-2026-001', 'V1.1', '已确认', '陈明远'),
  makeCriteriaList('R-2026-002', 'V1.0', '已确认', '周雅琴'),
  makeCriteriaList('R-2026-003', 'V1.0', '已确认', '刘志远'),
  // 旧蓝图项目详情保留兼容，不再作为患者入组项目来源
  makeCriteriaList('RP-001', 'V1.0', '已确认', '陈明远'),
  makeCriteriaList('RP-002', 'V1.0', '已确认', '周雅琴'),
  makeCriteriaList('RP-003', 'V1.1', '已确认', '刘志远')
]

/** 项目没有预置清单时生成一份已确认基线清单，供患者详情研究入组使用 */
export function ensureCriteriaListForProject(projectId: string): ResearchCriteriaList {
  const effective = RESEARCH_CRITERIA_LISTS.find(
    (item) => item.projectId === projectId && item.status === '已确认'
  )
  if (effective) return effective
  const created = makeCriteriaList(projectId, 'V1.0', '已确认', '系统预置')
  RESEARCH_CRITERIA_LISTS.push(created)
  return created
}

export function getEffectiveCriteriaVersion(projectId: string): string {
  return ensureCriteriaListForProject(projectId).version
}

/** 从研究管理列表行生成项目详情；不修改正式入组数据 [批注 08] */
function makeShareSetting(row: ResearchItem): ResearchShareSetting {
  const contents = (row.shareContents ?? ['项目概况', '进度汇总']) as ResearchShareContent[]
  return {
    shared: row.shared,
    level: row.shared ? row.shareLevel : '未共享',
    targets: row.shareTargets ?? [row.center],
    contents,
    actualVisibleScope:
      row.actualVisibleScope ??
      (row.shared ? `${row.shareLevel}内可见项目概况 / 进度汇总` : '仅项目成员可见')
  }
}

export function createResearchProjectDetailFromRow(row: ResearchItem): ResearchProjectDetail {
  const isAiControlled = row.groupBy.some((item) => item.includes('AI'))
  const groups = isAiControlled
    ? ['AI辅助诊疗组', '常规诊疗组', '全部入组']
    : ['观察组', '对照组', '全部入组']
  const groupNames = groups.filter((item) => item !== '全部入组')
  const centers = Array.from(new Set([row.center, '中心 B', '中心 C'])).slice(0, 3)
  const progress = centers.flatMap((center, centerIndex) =>
    groupNames.map((group, groupIndex) => {
      const target = 60 + centerIndex * 12 + groupIndex * 8
      const enrolled = target - 8 - centerIndex * 3 - groupIndex
      return {
        center,
        group,
        enrolled,
        target,
        followupDone: enrolled - 6 - centerIndex,
        endpointDone: enrolled - 10 - centerIndex,
        exited: 2 + centerIndex + groupIndex,
        followupExpected: enrolled,
        endpointExpected: enrolled,
        missingCount: 3 + centerIndex + groupIndex
      }
    })
  )
  const criteriaVersion = getEffectiveCriteriaVersion(row.id)
  return {
    id: row.id,
    listId: row.id,
    name: row.name,
    owner: row.owner,
    center: row.center,
    planVersion: 'V1.0',
    criteriaVersion,
    officialGroup: isAiControlled ? 'AI辅助诊疗组' : '全部入组',
    shareLevel: row.shared ? row.shareLevel : '未共享',
    shareSetting: makeShareSetting(row),
    groupDimensions: row.groupBy,
    groups,
    indicators: row.indicators,
    timeRanges: ['近 30 天', '近 90 天', '全研究周期'],
    results: [],
    progress,
    endpoints: row.indicators.slice(0, 3).map((name, index) => ({
      name,
      value: `${(60 + index * 8).toFixed(1)}%`,
      safetyEventConfirmed: index === 0
    })),
    materials: [
      {
        id: `RM-${row.id}-1`,
        name: '研究方案',
        type: '研究方案',
        version: 'V1.0',
        updatedAt: '2026-10-01',
        fileName: '研究方案.pdf',
        fileSize: '2.4 MB',
        previewNote: '演示环境仅展示文件信息，不存真实文件'
      },
      {
        id: `RM-${row.id}-2`,
        name: '伦理批件',
        type: '伦理材料',
        version: 'V1.0',
        updatedAt: '2026-09-18',
        fileName: '伦理批件.pdf',
        fileSize: '860 KB',
        previewNote: '演示环境仅展示文件信息，不存真实文件'
      },
      {
        id: `RM-${row.id}-3`,
        name: `入组清单 ${criteriaVersion}`,
        type: '入组清单',
        version: criteriaVersion,
        updatedAt: '2026-10-05',
        fileName: `入组清单_${criteriaVersion}.pdf`,
        fileSize: '420 KB',
        previewNote: '医生确认后供患者详情研究入组使用'
      }
    ],
    shareGrantsPatientDetail: false,
    shareGrantsEdit: false,
    shareGrantsExport: false
  }
}

/* ------------------------------ P13 知情同意 ------------------------------ */

/**
 * 知情同意书模板 [批注 16]：关联研究项目编号与适用中心取自 RESEARCHES，
 * 仅「已发布 + 已批准」的生效版本可供患者详情发放。
 */
export const CONSENT_TEMPLATES: ConsentTemplate[] = [
  {
    id: 'CT-001',
    name: 'DLI 研究入组知情同意书',
    projectId: 'R-2026-001',
    center: '华东中心',
    version: 'V2.1',
    fileName: 'DLI研究入组知情同意书_V2.1.pdf',
    fileSize: '256 KB',
    status: '已发布',
    approval: '已批准',
    approvedBy: '平台管理员',
    approvedAt: '2026-10-18 09:00',
    publishedBy: '平台管理员',
    publishedAt: '2026-10-18 10:00',
    updatedAt: '2026-10-18',
    operator: '平台管理员',
    history: [
      { version: 'V2.0', updatedAt: '2026-08-02', operator: '平台管理员' },
      { version: 'V2.1', updatedAt: '2026-10-18', operator: '平台管理员', note: '另存新版本' }
    ]
  },
  {
    id: 'CT-002',
    name: 'AI 早筛模型验证知情同意书',
    projectId: 'R-2026-002',
    center: '华北中心',
    version: 'V1.3',
    fileName: 'AI早筛验证知情同意书_V1.3.pdf',
    fileSize: '198 KB',
    status: '已发布',
    approval: '已批准',
    approvedBy: '平台管理员',
    approvedAt: '2026-09-25 14:20',
    publishedBy: '平台管理员',
    publishedAt: '2026-09-25 15:00',
    updatedAt: '2026-09-25',
    operator: '中心管理员',
    history: [{ version: 'V1.3', updatedAt: '2026-09-25', operator: '中心管理员' }]
  },
  {
    id: 'CT-003',
    name: '生物样本炎症因子谱研究知情同意书',
    projectId: 'R-2026-003',
    center: '华南中心',
    version: 'V0.9',
    fileName: '炎症因子谱知情同意书_V0.9.pdf',
    fileSize: '172 KB',
    status: '草稿',
    approval: '未提交',
    approvedBy: '',
    approvedAt: '',
    publishedBy: '',
    publishedAt: '',
    updatedAt: '2026-11-06',
    operator: '中心管理员',
    history: []
  },
  {
    id: 'CT-004',
    name: 'DLI 研究入组知情同意书',
    projectId: 'R-2026-001',
    center: '华东中心',
    version: 'V2.2',
    fileName: 'DLI研究入组知情同意书_V2.2.pdf',
    fileSize: '268 KB',
    status: '草稿',
    approval: '待批准',
    approvedBy: '',
    approvedAt: '',
    publishedBy: '',
    publishedAt: '',
    updatedAt: '2026-11-10',
    operator: '中心管理员',
    history: []
  },
  {
    id: 'CT-005',
    name: '多模态影像组学研究知情同意书',
    projectId: 'R-2026-005',
    center: '华东中心',
    version: 'V1.0',
    fileName: '影像组学知情同意书_V1.0.pdf',
    fileSize: '184 KB',
    status: '已停用',
    approval: '已批准',
    approvedBy: '平台管理员',
    approvedAt: '2026-07-01 10:00',
    publishedBy: '平台管理员',
    publishedAt: '2026-07-01 11:00',
    updatedAt: '2026-10-01',
    operator: '平台管理员',
    history: [{ version: 'V1.0', updatedAt: '2026-07-01', operator: '平台管理员' }]
  },
  {
    id: 'CT-006',
    name: 'DLI 通用研究知情同意书',
    projectId: '',
    center: '',
    version: 'V1.2',
    fileName: 'DLI通用研究知情同意书_V1.2.pdf',
    fileSize: '210 KB',
    status: '已发布',
    approval: '已批准',
    approvedBy: '平台管理员',
    approvedAt: '2026-06-12 09:30',
    publishedBy: '平台管理员',
    publishedAt: '2026-06-12 10:00',
    updatedAt: '2026-06-12',
    operator: '平台管理员',
    history: [{ version: 'V1.2', updatedAt: '2026-06-12', operator: '平台管理员' }]
  }
]

/**
 * 生效模板：仅「已发布 + 已批准」，按关联研究项目与适用中心匹配。
 * 项目专属模板优先，通用模板（projectId 为空、center 为空）作为兜底。
 */
export function getEffectiveConsentTemplates(projectId: string, center = ''): ConsentTemplate[] {
  return CONSENT_TEMPLATES.filter(
    (item) =>
      item.status === '已发布' &&
      item.approval === '已批准' &&
      (item.projectId === projectId || !item.projectId) &&
      (!item.center || !center || item.center === center)
  ).sort((a, b) => Number(Boolean(b.projectId)) - Number(Boolean(a.projectId)))
}

export function getEffectiveConsentTemplate(
  projectId: string,
  center = ''
): ConsentTemplate | undefined {
  return getEffectiveConsentTemplates(projectId, center)[0]
}

/* ------------------------------ P14 患者字段配置 ------------------------------ */

export const PATIENT_FIELDS: PatientField[] = [
  {
    id: 'PF-001',
    name: '系统患者编号',
    code: 'patient_id',
    type: '文本',
    options: [],
    unit: '',
    required: true,
    validation: '唯一，按编码规则生成',
    listVisible: true,
    filterable: true,
    order: 1,
    scopeType: '平台统一',
    scopeName: '',
    status: '已发布',
    version: 'V1.4',
    systemLocked: true,
    updatedAt: '2026-10-30 14:20',
    operator: '平台管理员'
  },
  {
    id: 'PF-002',
    name: '研究受试者编号',
    code: 'subject_id',
    type: '文本',
    options: [],
    unit: '',
    required: true,
    validation: '唯一，按编码规则生成',
    listVisible: true,
    filterable: true,
    order: 2,
    scopeType: '平台统一',
    scopeName: '',
    status: '已发布',
    version: 'V1.4',
    systemLocked: true,
    updatedAt: '2026-10-30 14:20',
    operator: '平台管理员'
  },
  {
    id: 'PF-003',
    name: '研究组别',
    code: 'research_group',
    type: '单选',
    options: ['AI辅助诊疗组', '常规诊疗组'],
    unit: '',
    required: true,
    validation: '按研究方案',
    listVisible: true,
    filterable: true,
    order: 3,
    scopeType: '平台统一',
    scopeName: '',
    status: '已发布',
    version: 'V1.4',
    systemLocked: true,
    updatedAt: '2026-10-30 14:20',
    operator: '平台管理员'
  },
  {
    id: 'PF-004',
    name: '入组日期',
    code: 'enroll_date',
    type: '日期',
    options: [],
    unit: '',
    required: true,
    validation: '不晚于今日',
    listVisible: true,
    filterable: true,
    order: 4,
    scopeType: '平台统一',
    scopeName: '',
    status: '已发布',
    version: 'V1.4',
    systemLocked: false,
    updatedAt: '2026-10-30 14:20',
    operator: '平台管理员'
  },
  {
    id: 'PF-005',
    name: '主管医生',
    code: 'attending',
    type: '文本',
    options: [],
    unit: '',
    required: false,
    validation: '',
    listVisible: true,
    filterable: false,
    order: 5,
    scopeType: '平台统一',
    scopeName: '',
    status: '已发布',
    version: 'V1.4',
    systemLocked: false,
    updatedAt: '2026-10-30 14:20',
    operator: '平台管理员'
  },
  {
    id: 'PF-006',
    name: 'FVC',
    code: 'fvc',
    type: '数字',
    options: [],
    unit: 'L',
    required: false,
    validation: '0~10',
    listVisible: false,
    filterable: true,
    order: 6,
    scopeType: '平台统一',
    scopeName: '',
    status: '已发布',
    version: 'V1.4',
    systemLocked: false,
    updatedAt: '2026-10-30 14:20',
    operator: '平台管理员'
  },
  {
    id: 'PF-007',
    name: '中心扩展·随访联系人',
    code: 'ext_contact',
    type: '文本',
    options: [],
    unit: '',
    required: false,
    validation: '',
    listVisible: false,
    filterable: false,
    order: 7,
    scopeType: '指定中心',
    scopeName: '中心 A',
    status: '待发布',
    version: 'V1.0',
    systemLocked: false,
    updatedAt: '2026-11-10 09:40',
    operator: '中心 A 管理员'
  },
  {
    id: 'PF-008',
    name: '课题组扩展·样本备注',
    code: 'ext_sample_note',
    type: '文本',
    options: [],
    unit: '',
    required: false,
    validation: '',
    listVisible: false,
    filterable: false,
    order: 8,
    scopeType: '指定课题组',
    scopeName: '课题组 2',
    status: '草稿',
    version: 'V1.0',
    systemLocked: false,
    updatedAt: '2026-11-11 15:05',
    operator: '课题组 2 管理员'
  },
  {
    id: 'PF-009',
    name: '既往吸烟年限',
    code: 'smoking_years',
    type: '数字',
    options: [],
    unit: '年',
    required: false,
    validation: '0~80',
    listVisible: false,
    filterable: true,
    order: 9,
    scopeType: '指定中心',
    scopeName: '中心 B',
    status: '已停用',
    version: 'V1.1',
    systemLocked: false,
    updatedAt: '2026-09-22 11:12',
    operator: '中心 B 管理员'
  }
]

export const FIELD_CONFIG_VERSIONS: FieldConfigVersion[] = [
  {
    version: 'V1.4',
    publishedAt: '2026-10-30 14:20',
    operator: '平台管理员',
    appliesTo: ['患者表单', '导入模板', 'Web', 'App'],
    note: '新增入组日期筛选项'
  },
  {
    version: 'V1.3',
    publishedAt: '2026-09-18 10:05',
    operator: '平台管理员',
    appliesTo: ['患者表单', '导入模板', 'Web', 'App'],
    note: '统一 FVC 单位'
  },
  {
    version: 'V1.2',
    publishedAt: '2026-08-12 16:30',
    operator: '平台管理员',
    appliesTo: ['患者表单', 'Web'],
    note: '中心 A 扩展字段'
  }
]

/* ------------------------------ P18 编码规则配置 [批注 18] ------------------------------ */

export const CODE_RULES: CodeRule[] = [
  {
    id: 'CD-001',
    target: '系统患者编号',
    prefix: 'DLI',
    centerCode: '01',
    projectCode: '',
    dateFormat: 'YYYY',
    serialDigits: 4,
    resetCycle: '按年',
    effectiveScope: '全平台（系统内唯一）',
    status: '已发布',
    version: 'V2.0',
    operator: '平台管理员',
    updatedAt: '2026-10-30 14:20',
    note: '变更仅作用于后续新编号；编码不含姓名、手机号、病历号'
  },
  {
    id: 'CD-002',
    target: '研究受试者编号',
    prefix: 'RS',
    centerCode: '01',
    projectCode: 'R01',
    dateFormat: 'YYYY',
    serialDigits: 4,
    resetCycle: '按年',
    effectiveScope: '研究项目 R01（按项目唯一）',
    status: '已发布',
    version: 'V1.2',
    operator: '平台管理员',
    updatedAt: '2026-09-15 10:05',
    note: '正式研究入组时生成；样本及检测编号沿用源库，不在此重新生成'
  },
  {
    id: 'CD-003',
    target: '系统患者编号',
    prefix: 'DLI',
    centerCode: '02',
    projectCode: '',
    dateFormat: 'YYYY',
    serialDigits: 5,
    resetCycle: '按月',
    effectiveScope: '中心 B 试点（待校验）',
    status: '草稿',
    version: 'V2.1（草稿）',
    operator: '平台管理员',
    updatedAt: '2026-11-11 16:30',
    note: '按月重置流水但日期格式仅含年份，校验会提示重号风险，需修正后再发布'
  },
  {
    id: 'CD-004',
    target: '系统患者编号',
    prefix: 'PT',
    centerCode: '',
    projectCode: '',
    dateFormat: 'YYYY',
    serialDigits: 4,
    resetCycle: '按年',
    effectiveScope: '历史规则（已停用，保留关联）',
    status: '已停用',
    version: 'V1.0',
    operator: '平台管理员',
    updatedAt: '2026-05-20 09:00',
    note: '停用保留历史，历史编号关联不变'
  }
]

/* -------------------------------- P18 系统日志 -------------------------------- */

export const SYSTEM_LOGS: SystemLog[] = [
  {
    id: 'LG-0001',
    category: '配置变更',
    action: '发布患者字段配置 V1.4',
    operator: '平台管理员',
    role: 'R_PLATFORM',
    scope: '全平台',
    objectType: '患者字段配置',
    objectId: 'PF-CONFIG',
    target: 'PF-CONFIG',
    detail: '新增入组日期筛选项',
    result: '成功',
    beforeContent: 'V1.3：基础信息 + 诊断信息 + 治疗信息',
    afterContent: 'V1.4：在诊断信息下新增入组日期筛选项，仅作用于后续建档',
    createdAt: '2026-10-30 14:20'
  },
  {
    id: 'LG-0002',
    category: '权限变更',
    action: '停用账号并保留历史业务记录',
    operator: '中心管理员',
    role: 'R_CENTER',
    scope: '中心 A',
    objectType: '账号',
    objectId: 'ACC-0107',
    target: '账号编号（脱敏）',
    detail: '角色变更已留痕，停用已终止会话并保留历史',
    result: '成功',
    beforeContent: '启用 · 医生助理',
    afterContent: '停用 · 医生助理（保留历史业务关联）',
    createdAt: '2026-11-02 09:15'
  },
  {
    id: 'LG-0003',
    category: '导入导出',
    action: '按筛选导出患者表格',
    operator: '医生助理',
    role: 'R_ASSISTANT',
    scope: '中心 A',
    objectType: '患者表格',
    objectId: 'EXPORT-20261103',
    target: '患者表格（脱敏）',
    detail: '导出单独授权通过，导出内容不含姓名、手机号、病历号',
    result: '成功',
    createdAt: '2026-11-03 16:42'
  },
  {
    id: 'LG-0004',
    category: '重要数据',
    action: '识别结果核对后写入评估',
    operator: '医生',
    role: 'R_DOCTOR',
    scope: '中心 B',
    objectType: '评估报告',
    objectId: 'AR-0007',
    target: pid(18),
    detail: '患者相关日志已脱敏，未记录密码或验证码',
    result: '成功',
    createdAt: '2026-11-07 17:03'
  },
  {
    id: 'LG-0005',
    category: '配置变更',
    action: '发布编码规则 V2.0',
    operator: '平台管理员',
    role: 'R_PLATFORM',
    scope: '全平台',
    objectType: '编码规则',
    objectId: 'CD-001',
    target: 'CD-001',
    detail: '预览示例唯一性校验通过',
    result: '成功',
    beforeContent: 'V1.9 · 已发布',
    afterContent: 'V2.0 · 已发布（仅作用于后续新编号）',
    createdAt: '2026-10-21 11:08'
  },
  {
    id: 'LG-0006',
    category: '导入导出',
    action: '导出脱敏系统日志',
    operator: '系统管理员',
    role: 'R_SYS',
    scope: '系统管理端',
    objectType: '系统日志',
    objectId: 'EXPORT-20261107',
    target: '系统日志（脱敏）',
    detail: '查询与导出分别授权，导出内容不含患者姓名、手机号、病历号、密码或验证码',
    result: '成功',
    createdAt: '2026-11-07 18:10'
  },
  {
    id: 'LG-0007',
    category: '权限变更',
    action: '研究共享级别调整',
    operator: '课题组管理员',
    role: 'R_GROUP',
    scope: '课题组 2',
    objectType: '研究项目',
    objectId: 'RP-001',
    target: 'RP-001',
    detail: '未授予患者明细、编辑和导出权限',
    result: '成功',
    beforeContent: '共享级别：课题组内可见',
    afterContent: '共享级别：项目成员可见（不含明细导出）',
    createdAt: '2026-11-08 10:26'
  },
  {
    id: 'LG-0008',
    category: '配置变更',
    action: '校验并发布编码规则 V2.1',
    operator: '平台管理员',
    role: 'R_PLATFORM',
    scope: '全平台',
    objectType: '编码规则',
    objectId: 'CD-002',
    target: 'CD-002',
    detail: '发布前校验未通过，已阻止发布',
    result: '失败',
    failureReason: '中心代码段格式校验未通过：代码段位数与适用范围不一致，已阻止发布',
    createdAt: '2026-11-09 10:12'
  },
  {
    id: 'LG-0009',
    category: '导入导出',
    action: '申请导出研究分析数据',
    operator: '课题组管理员',
    role: 'R_GROUP',
    scope: '课题组 2',
    objectType: '研究项目',
    objectId: 'RP-002',
    target: 'RP-002',
    detail: '导出操作单独授权校验未通过',
    result: '失败',
    failureReason: '未获导出授权：课题组管理员无导出分析数据权限，已拒绝并留痕',
    createdAt: '2026-11-09 15:40'
  }
]

/** 重要数据、共享、资料、清单确认等操作统一留痕；内存态，刷新复位 */
export function appendSystemLog(
  entry: Omit<SystemLog, 'id' | 'createdAt' | 'result'> & { result?: LogResult }
): SystemLog {
  const log: SystemLog = {
    ...entry,
    result: entry.result ?? '成功',
    id: `LG-${String(Date.now()).slice(-6)}`,
    createdAt: nowStr()
  }
  SYSTEM_LOGS.unshift(log)
  return log
}
