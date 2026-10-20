/**
 * DLI Mock 数据 - 预警与患者上报
 *
 * 预警分级：红 / 橙 / 黄；来源：系统监测 / 患者上报；
 * 响应时限 SLA：红 15min / 橙 2h / 黄 24h，超时自动升级上级医生。
 */
import type { DliAlert, PatientReport } from './types'

/** 预警列表 */
export const ALERT_LIST: DliAlert[] = [
  {
    id: 'AL-2026-1031',
    patientId: 'DLI-2026-0001',
    patientName: '王**（DLI-2026-0001）',
    level: 'red',
    source: 'patient',
    ruleName: '血氧饱和度持续低于 93%',
    triggerData: '近 3 日晨间血氧 92% / 92% / 91%，伴气短加重（中度）',
    status: 'pending',
    occurTime: '2026-10-19 16:20',
    deadline: '2026-10-19 16:35',
    handleRecord: null
  },
  {
    id: 'AL-2026-1030',
    patientId: 'DLI-2026-0009',
    patientName: '郑**（DLI-2026-0009）',
    level: 'red',
    source: 'system',
    ruleName: 'HRCT 进展 + 弥散功能重度下降',
    triggerData: 'DLCO 52%预计值（较基线下降 28%），HRCT 示双肺磨玻璃影进展',
    status: 'pending',
    occurTime: '2026-10-19 17:05',
    deadline: '2026-10-19 17:20',
    handleRecord: null
  },
  {
    id: 'AL-2026-1029',
    patientId: 'DLI-2026-0002',
    patientName: '李**（DLI-2026-0002）',
    level: 'orange',
    source: 'system',
    ruleName: 'DLCO 较基线下降 ≥ 20%',
    triggerData: 'DLCO 64%预计值，较基线（85%）下降 21%',
    status: 'pending',
    occurTime: '2026-10-18 10:05',
    deadline: '2026-10-18 12:05',
    handleRecord: null
  },
  {
    id: 'AL-2026-1028',
    patientId: 'DLI-2026-0006',
    patientName: '孙**（DLI-2026-0006）',
    level: 'orange',
    source: 'patient',
    ruleName: '患者上报新发皮疹 + 发热',
    triggerData: '体温 38.2℃，躯干斑丘疹，AI 分诊判定「异常」',
    status: 'pending',
    occurTime: '2026-10-18 19:40',
    deadline: '2026-10-18 21:40',
    handleRecord: null
  },
  {
    id: 'AL-2026-1027',
    patientId: 'DLI-2026-0003',
    patientName: '张**（DLI-2026-0003）',
    level: 'yellow',
    source: 'system',
    ruleName: 'CRP 连续 2 次升高 > 15mg/L',
    triggerData: 'CRP 16.2 → 18.7mg/L，无发热主诉',
    status: 'pending',
    occurTime: '2026-10-17 14:40',
    deadline: '2026-10-18 14:40',
    handleRecord: null
  },
  {
    id: 'AL-2026-1026',
    patientId: 'DLI-2026-0001',
    patientName: '王**（DLI-2026-0001）',
    level: 'orange',
    source: 'system',
    ruleName: 'ALT 升高超过正常上限 1.5 倍',
    triggerData: 'ALT 68 U/L（参考 9-50），白细胞 3.2×10⁹/L',
    status: 'handled',
    occurTime: '2026-10-16 09:35',
    deadline: '2026-10-16 11:35',
    handleRecord: {
      action: 'mark',
      opinion: '已调整甲氨蝶呤剂量并加用叶酸，3 日后复查肝功能',
      handler: '陈明远',
      handleTime: '2026-10-16 10:20'
    }
  },
  {
    id: 'AL-2026-1025',
    patientId: 'DLI-2026-0007',
    patientName: '周**（DLI-2026-0007）',
    level: 'yellow',
    source: 'patient',
    ruleName: '随访任务逾期未完成',
    triggerData: '诊断后 3 月随访（HRCT + 肺功能）逾期 5 天',
    status: 'handled',
    occurTime: '2026-10-12 15:25',
    deadline: '2026-10-13 15:25',
    handleRecord: {
      action: 'followup',
      opinion: '电话确认患者因故延期，已改约 10-25 复查',
      handler: '陈明远',
      handleTime: '2026-10-13 09:10'
    }
  },
  {
    id: 'AL-2026-1024',
    patientId: 'DLI-2026-0003',
    patientName: '张**（DLI-2026-0003）',
    level: 'red',
    source: 'system',
    ruleName: '博来霉素累计剂量超警戒 + 肺功能下降',
    triggerData: '累计剂量 270U（警戒 240U），FVC 下降 18%',
    status: 'escalated',
    occurTime: '2026-10-10 11:00',
    deadline: '2026-10-10 11:15',
    handleRecord: {
      action: 'escalate',
      opinion: '升级至上级医师，建议停用博来霉素并多学科会诊',
      handler: '林巧茹',
      handleTime: '2026-10-10 11:08'
    }
  },
  {
    id: 'AL-2026-1023',
    patientId: 'DLI-2026-0006',
    patientName: '孙**（DLI-2026-0006）',
    level: 'yellow',
    source: 'system',
    ruleName: '输注后一过性低热',
    triggerData: '利妥昔单抗输注后体温 37.8℃，4 小时自行恢复',
    status: 'handled',
    occurTime: '2026-10-08 16:00',
    deadline: '2026-10-09 16:00',
    handleRecord: {
      action: 'mark',
      opinion: '输注反应，属预期不良反应，继续观察',
      handler: '周建国',
      handleTime: '2026-10-08 17:30'
    }
  }
]

/** 患者上报（症状 / 体征 / 日记） */
export const PATIENT_REPORTS: PatientReport[] = [
  {
    id: 'PR-0031',
    patientId: 'DLI-2026-0001',
    patientName: '王**',
    reportType: 'symptom',
    symptoms: [
      { name: '气短', level: '中度' },
      { name: '干咳', level: '轻度' }
    ],
    vitals: { temp: '36.8℃', spo2: '92%', hr: '96 次/分' },
    aiTriage: 'abnormal',
    reportTime: '2026-10-19 08:12',
    read: false
  },
  {
    id: 'PR-0030',
    patientId: 'DLI-2026-0001',
    patientName: '王**',
    reportType: 'diary',
    symptoms: [],
    vitals: {},
    diaryText: '夜间咳嗽较前减少，晨起仍有乏力，爬二楼需要休息一次。',
    aiTriage: 'normal',
    reportTime: '2026-10-10 21:35',
    read: true
  },
  {
    id: 'PR-0029',
    patientId: 'DLI-2026-0001',
    patientName: '王**',
    reportType: 'vital',
    symptoms: [],
    vitals: { temp: '37.1℃', spo2: '94%', hr: '88 次/分' },
    aiTriage: 'normal',
    reportTime: '2026-10-17 07:55',
    read: true
  },
  {
    id: 'PR-0028',
    patientId: 'DLI-2026-0009',
    patientName: '郑**',
    reportType: 'symptom',
    symptoms: [
      { name: '活动后气短', level: '重度' },
      { name: '乏力', level: '中度' },
      { name: '食欲下降', level: '轻度' }
    ],
    vitals: { temp: '37.6℃', spo2: '90%', hr: '102 次/分' },
    aiTriage: 'abnormal',
    reportTime: '2026-10-18 20:05',
    read: false
  },
  {
    id: 'PR-0027',
    patientId: 'DLI-2026-0006',
    patientName: '孙**',
    reportType: 'symptom',
    symptoms: [
      { name: '发热', level: '中度' },
      { name: '皮疹', level: '中度' }
    ],
    vitals: { temp: '38.2℃', spo2: '96%', hr: '92 次/分' },
    diaryText: '今天下午开始躯干出现红色皮疹，有点痒，量了体温 38.2℃。',
    aiTriage: 'abnormal',
    reportTime: '2026-10-18 19:40',
    read: false
  },
  {
    id: 'PR-0026',
    patientId: 'DLI-2026-0002',
    patientName: '李**',
    reportType: 'vital',
    symptoms: [],
    vitals: { temp: '36.5℃', spo2: '95%', hr: '78 次/分' },
    aiTriage: 'normal',
    reportTime: '2026-10-18 07:30',
    read: true
  }
]
