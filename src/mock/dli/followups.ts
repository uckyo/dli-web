/**
 * DLI Mock 数据 - 随访（模板 / 计划 / 任务）与审核发布
 *
 * 随访时点：诊断后 1/3/6/12 月；项目含 HRCT、肺功能 FVC/DLCO、血常规、肝肾功能等。
 */
import type { FollowupPlan, FollowupTemplate, PendingReview } from './types'

/** 随访模板（可配置） */
export const FOLLOWUP_TEMPLATES: FollowupTemplate[] = [
  {
    id: 'FT-01',
    name: '诊断后标准随访模板',
    timePoint: '诊断后 1/3/6/12 月',
    items: [
      { name: 'HRCT 胸部薄层扫描', type: 'exam' },
      { name: '肺功能（FVC/DLCO）', type: 'exam' },
      { name: '血常规', type: 'lab' },
      { name: '肝肾功能', type: 'lab' },
      { name: '症状与生活质量量表', type: 'questionnaire' }
    ],
    description: '适用于 DLI 确诊后恢复期患者的标准随访方案',
    enabled: true
  },
  {
    id: 'FT-02',
    name: '高危用药密集监测模板',
    timePoint: '用药期间每 2 周',
    items: [
      { name: '血常规', type: 'lab' },
      { name: '肝肾功能', type: 'lab' },
      { name: '炎症指标（CRP/ESR）', type: 'lab' },
      { name: '指夹式血氧监测', type: 'exam' }
    ],
    description: '适用于 L1/L2 高风险分层患者的治疗中密集监测',
    enabled: true
  },
  {
    id: 'FT-03',
    name: '康复期简化随访模板',
    timePoint: '诊断后 3/6 月',
    items: [
      { name: '肺功能（FVC/DLCO）', type: 'exam' },
      { name: '症状与生活质量量表', type: 'questionnaire' }
    ],
    description: '适用于 L4 低风险、恢复良好患者的简化方案',
    enabled: true
  }
]

/** 随访计划（含任务实例） */
export const FOLLOWUP_PLANS: FollowupPlan[] = [
  {
    id: 'FP-2026-008',
    patientId: 'DLI-2026-0005',
    patientName: '赵**（DLI-2026-0005）',
    templateName: '诊断后标准随访模板',
    startTime: '2026-09-20',
    endTime: '2027-09-20',
    status: 'recycling',
    progress: 25,
    tasks: [
      {
        id: 'FT-0081',
        planId: 'FP-2026-008',
        patientId: 'DLI-2026-0005',
        patientName: '赵**',
        itemName: '1 月随访：HRCT + 肺功能',
        dueDate: '2026-10-20',
        status: 'done',
        result: 'HRCT 较前吸收，DLCO 78%↑'
      },
      {
        id: 'FT-0082',
        planId: 'FP-2026-008',
        patientId: 'DLI-2026-0005',
        patientName: '赵**',
        itemName: '3 月随访：HRCT + 肺功能 + 量表',
        dueDate: '2026-12-20',
        status: 'pending'
      }
    ]
  },
  {
    id: 'FP-2026-009',
    patientId: 'DLI-2026-0007',
    patientName: '周**（DLI-2026-0007）',
    templateName: '诊断后标准随访模板',
    startTime: '2026-07-15',
    endTime: '2027-07-15',
    status: 'recycling',
    progress: 50,
    tasks: [
      {
        id: 'FT-0091',
        planId: 'FP-2026-009',
        patientId: 'DLI-2026-0007',
        patientName: '周**',
        itemName: '3 月随访：HRCT + 肺功能',
        dueDate: '2026-10-10',
        status: 'overdue'
      },
      {
        id: 'FT-0092',
        planId: 'FP-2026-009',
        patientId: 'DLI-2026-0007',
        patientName: '周**',
        itemName: '6 月随访：HRCT + 肺功能 + 量表',
        dueDate: '2027-01-15',
        status: 'pending'
      }
    ]
  },
  {
    id: 'FP-2026-010',
    patientId: 'DLI-2026-0010',
    patientName: '冯**（DLI-2026-0010）',
    templateName: '康复期简化随访模板',
    startTime: '2026-09-05',
    endTime: '2027-03-05',
    status: 'published',
    progress: 0,
    tasks: [
      {
        id: 'FT-0101',
        planId: 'FP-2026-010',
        patientId: 'DLI-2026-0010',
        patientName: '冯**',
        itemName: '3 月随访：肺功能 + 量表',
        dueDate: '2026-12-05',
        status: 'pending'
      }
    ]
  },
  {
    id: 'FP-2026-011',
    patientId: 'DLI-2026-0006',
    patientName: '孙**（DLI-2026-0006）',
    templateName: '高危用药密集监测模板',
    startTime: '2026-10-01',
    endTime: '2027-01-01',
    status: 'recycling',
    progress: 60,
    tasks: [
      {
        id: 'FT-0111',
        planId: 'FP-2026-011',
        patientId: 'DLI-2026-0006',
        patientName: '孙**',
        itemName: '第 2 周监测：血常规 + 肝肾功能',
        dueDate: '2026-10-15',
        status: 'done',
        result: '各项指标平稳'
      },
      {
        id: 'FT-0112',
        planId: 'FP-2026-011',
        patientId: 'DLI-2026-0006',
        patientName: '孙**',
        itemName: '第 4 周监测：血常规 + 肝肾功能 + CRP',
        dueDate: '2026-10-29',
        status: 'pending'
      }
    ]
  },
  {
    id: 'FP-2026-012',
    patientId: 'DLI-2026-0005',
    patientName: '赵**（DLI-2026-0005）',
    templateName: '高危用药密集监测模板',
    startTime: '2026-10-25',
    endTime: '2027-01-25',
    status: 'draft',
    progress: 0,
    tasks: [
      {
        id: 'FT-0121',
        planId: 'FP-2026-012',
        patientId: 'DLI-2026-0005',
        patientName: '赵**',
        itemName: '第 2 周监测：血常规 + 肝肾功能',
        dueDate: '2026-11-08',
        status: 'pending'
      }
    ]
  }
]

/** 今日待随访任务（工作台用） */
export const TODAY_FOLLOWUP_TASKS = [
  {
    taskId: 'FT-0081',
    patientName: '赵**（DLI-2026-0005）',
    itemName: '1 月随访：HRCT + 肺功能',
    dueDate: '2026-10-20',
    status: 'done' as const
  },
  {
    taskId: 'FT-0091',
    patientName: '周**（DLI-2026-0007）',
    itemName: '3 月随访：HRCT + 肺功能',
    dueDate: '2026-10-10',
    status: 'overdue' as const
  },
  {
    taskId: 'FT-0113',
    patientName: '王**（DLI-2026-0001）',
    itemName: '本周血氧监测回收确认',
    dueDate: '2026-10-20',
    status: 'pending' as const
  },
  {
    taskId: 'FT-0114',
    patientName: '郑**（DLI-2026-0009）',
    itemName: '每日症状打卡督促',
    dueDate: '2026-10-20',
    status: 'pending' as const
  }
]

/** 审核发布 - 待确认的 CDSS 建议 */
export const PENDING_REVIEWS: PendingReview[] = [
  {
    id: 'RV-2026-0041',
    patientId: 'DLI-2026-0001',
    patientName: '王**（DLI-2026-0001）',
    phase: 'during',
    content:
      '血氧持续下降 + HRCT 进展，建议 24h 内复查 HRCT、暂停可疑药物并请呼吸科会诊（评估报告 RA-2026-0035）',
    modelVersion: 'DLI-CDSS v2.3.1',
    submitTime: '2026-10-19 16:20'
  },
  {
    id: 'RV-2026-0042',
    patientId: 'DLI-2026-0009',
    patientName: '郑**（DLI-2026-0009）',
    phase: 'during',
    content:
      'DLCO 重度下降 + 双肺进展，建议立即停用可疑药物并收入院评估，安排 MDT 会诊（评估报告 RA-2026-0037）',
    modelVersion: 'DLI-CDSS v2.3.1',
    submitTime: '2026-10-19 17:05'
  },
  {
    id: 'RV-2026-0043',
    patientId: 'DLI-2026-0002',
    patientName: '李**（DLI-2026-0002）',
    phase: 'during',
    content: 'DLCO 较基线下降 21%，建议暂停胺碘酮并完善支气管肺泡灌洗（评估报告 RA-2026-0036）',
    modelVersion: 'DLI-CDSS v2.3.1',
    submitTime: '2026-10-18 10:05'
  }
]

/** 审核发布 - 待发布的随访计划与干预建议 */
export const PENDING_PUBLICATIONS = [
  {
    id: 'PB-2026-0018',
    type: '随访计划',
    patientName: '赵**（DLI-2026-0005）',
    content: '高危用药密集监测模板（2026-10-25 起，每 2 周监测）',
    confirmDoctor: '林巧茹',
    confirmTime: '2026-10-15 14:20'
  },
  {
    id: 'PB-2026-0019',
    type: '干预建议',
    patientName: '王**（DLI-2026-0001）',
    content: '甲氨蝶呤减量至 10mg/周 + 每日血氧监测提醒',
    confirmDoctor: '陈明远',
    confirmTime: '2026-10-16 10:20'
  }
]
