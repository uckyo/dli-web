/**
 * DLI Mock 数据 - CDSS 风险评估报告（治疗前 / 治疗中 / 诊断后三阶段）
 *
 * 每份报告含：风险分层、关键风险因素、个体化建议、可追溯依据（指南/文献/病例/模型特征贡献）、医生确认留痕。
 */
import type { RiskAssessment } from './types'

/** CDSS 评估报告存档 */
export const RISK_ASSESSMENTS: RiskAssessment[] = [
  {
    id: 'RA-2026-0028',
    patientId: 'DLI-2026-0001',
    patientName: '王**（DLI-2026-0001）',
    phase: 'pre',
    modelVersion: 'DLI-CDSS v2.3.1',
    triggerMode: 'auto',
    score: 65,
    riskLevel: 'L2',
    riskFactors: [
      { factor: '高龄（≥65 岁）', weight: '高' },
      { factor: '基线肝功异常（ALT 42 U/L）', weight: '高' },
      { factor: '甲氨蝶呤 + 来氟米特联合用药', weight: '中' }
    ],
    suggestions: [
      { type: '监测频次', content: '用药前 4 周每 2 周复查血常规 + 肝肾功能' },
      { type: '预防措施', content: '甲氨蝶呤同步补充叶酸 5mg/周' },
      { type: '基线检查', content: '完善 HRCT 基线、肺功能（FVC/DLCO）与 CRP 存档' }
    ],
    traceability: [
      {
        sourceType: 'guideline',
        title: '《药物相关性肺损伤诊治专家共识（2024）》条款 4.2',
        excerpt: '联合免疫抑制剂治疗者建议基线评估肝肾功能并每 2-4 周监测。'
      },
      {
        sourceType: 'literature',
        title: 'Methotrexate-induced pulmonary toxicity: a meta-analysis (2023)',
        excerpt: '高龄（OR 2.1）与基线肝酶异常（OR 1.8）为独立危险因素。'
      },
      {
        sourceType: 'model',
        title: '模型特征贡献度',
        excerpt: '年龄 22% + 基线 ALT 18% + 联合用药 15%，合计贡献 55%。'
      }
    ],
    assessTime: '2026-08-13 10:20',
    doctorConfirm: {
      action: 'agree',
      opinion: '按建议执行，签署知情同意后开始治疗。',
      doctor: '陈明远',
      time: '2026-08-13 11:05'
    }
  },
  {
    id: 'RA-2026-0035',
    patientId: 'DLI-2026-0001',
    patientName: '王**（DLI-2026-0001）',
    phase: 'during',
    modelVersion: 'DLI-CDSS v2.3.1',
    triggerMode: 'auto',
    score: 82,
    riskLevel: 'L1',
    riskFactors: [
      { factor: '血氧饱和度持续下降（97% → 92%）', weight: '极高' },
      { factor: 'HRCT 磨玻璃影较基线进展', weight: '高' },
      { factor: 'CRP 升高趋势（6.2 → 21.6mg/L）', weight: '中' }
    ],
    suggestions: [
      { type: '紧急处置', content: '建议 24h 内复查 HRCT，暂停可疑药物并请呼吸科会诊' },
      { type: '监测频次', content: '升级为每日血氧监测 + 症状打卡' },
      { type: '预警联动', content: '已自动生成红色预警（AL-2026-1031）推送主管医生' }
    ],
    traceability: [
      {
        sourceType: 'case',
        title: '相似病例 #A-1024（相似度 87%）',
        excerpt: '68 岁男性，MTX+LEF 治疗第 9 周血氧降至 92%，确诊 DLI，停药 + 糖皮质激素后缓解。'
      },
      {
        sourceType: 'guideline',
        title: '《药物相关性肺损伤诊治专家共识（2024）》条款 6.1',
        excerpt: '高危患者出现不明原因血氧下降或新发影像浸润影时，应考虑暂停可疑药物。'
      },
      {
        sourceType: 'model',
        title: '模型特征贡献度',
        excerpt: '血氧趋势 31% + HRCT 进展 26% + CRP 趋势 14%，合计贡献 71%。'
      }
    ],
    assessTime: '2026-10-19 16:20',
    doctorConfirm: null
  },
  {
    id: 'RA-2026-0021',
    patientId: 'DLI-2026-0005',
    patientName: '赵**（DLI-2026-0005）',
    phase: 'post',
    modelVersion: 'DLI-CDSS v2.3.1',
    triggerMode: 'manual',
    score: 35,
    riskLevel: 'L4',
    riskFactors: [
      { factor: '恢复期，症状稳定 8 周', weight: '低' },
      { factor: '残留轻度弥散功能下降', weight: '低' }
    ],
    suggestions: [
      {
        type: '鉴别诊断',
        content: '胺碘酮肺毒性（恢复期）可能性最高（82%），感染后遗留改变次之（11%）'
      },
      { type: '预后分层', content: '预后良好，预计 3 个月内 DLCO 恢复至 80% 以上' },
      { type: '随访建议', content: '按「诊断后标准随访模板」执行 1/3/6/12 月随访（HRCT + 肺功能）' }
    ],
    traceability: [
      {
        sourceType: 'literature',
        title: 'Amiodarone pulmonary toxicity: long-term follow-up (2022)',
        excerpt: '停药后 82% 患者 6 个月内影像学完全吸收，DLCO 恢复中位时间 14 周。'
      },
      {
        sourceType: 'case',
        title: '相似病例 #B-0231（相似度 79%）',
        excerpt: '63 岁男性，胺碘酮肺毒性停药后 12 周随访 DLCO 由 68% 恢复至 84%。'
      }
    ],
    assessTime: '2026-10-15 11:30',
    doctorConfirm: {
      action: 'agree',
      opinion: '下发标准随访计划至患者端。',
      doctor: '林巧茹',
      time: '2026-10-15 14:20'
    }
  },
  {
    id: 'RA-2026-0036',
    patientId: 'DLI-2026-0002',
    patientName: '李**（DLI-2026-0002）',
    phase: 'during',
    modelVersion: 'DLI-CDSS v2.3.1',
    triggerMode: 'manual',
    score: 70,
    riskLevel: 'L2',
    riskFactors: [
      { factor: 'DLCO 较基线下降 21%', weight: '高' },
      { factor: 'HRCT 右肺上叶新发斑片影', weight: '高' },
      { factor: '胺碘酮用药 6 周', weight: '中' }
    ],
    suggestions: [
      { type: '紧急处置', content: '建议暂停胺碘酮，评估替代抗心律失常方案' },
      { type: '补充检查', content: '完善支气管肺泡灌洗 + 肺功能复查（1 周内）' },
      { type: '预警联动', content: '已生成橙色预警（AL-2026-1029）' }
    ],
    traceability: [
      {
        sourceType: 'guideline',
        title: '《药物相关性肺损伤诊治专家共识（2024）》条款 6.3',
        excerpt: '胺碘酮使用者 DLCO 较基线下降 ≥ 20% 时建议暂停用药并评估替代方案。'
      },
      {
        sourceType: 'model',
        title: '模型特征贡献度',
        excerpt: 'DLCO 变化率 34% + 影像新发病灶 28%，合计贡献 62%。'
      }
    ],
    assessTime: '2026-10-18 10:05',
    doctorConfirm: null
  },
  {
    id: 'RA-2026-0037',
    patientId: 'DLI-2026-0009',
    patientName: '郑**（DLI-2026-0009）',
    phase: 'during',
    modelVersion: 'DLI-CDSS v2.3.1',
    triggerMode: 'auto',
    score: 88,
    riskLevel: 'L1',
    riskFactors: [
      { factor: 'DLCO 52%预计值（重度下降）', weight: '极高' },
      { factor: '双肺磨玻璃影进展', weight: '极高' },
      { factor: '联合用药（MTX + 胺碘酮）', weight: '高' }
    ],
    suggestions: [
      { type: '紧急处置', content: '建议立即停用可疑药物并收入院评估' },
      { type: '多学科会诊', content: '呼吸科 + 风湿免疫科 + 心内科 MDT' },
      { type: '预警联动', content: '已生成红色预警（AL-2026-1030）' }
    ],
    traceability: [
      {
        sourceType: 'case',
        title: '相似病例 #A-0987（相似度 91%）',
        excerpt: '76 岁男性，MTX+胺碘酮联合用药 10 周后 DLCO 降至 55%，住院治疗后好转。'
      },
      {
        sourceType: 'model',
        title: '模型特征贡献度',
        excerpt: 'DLCO 38% + 影像进展 30% + 年龄 12%，合计贡献 80%。'
      }
    ],
    assessTime: '2026-10-19 17:05',
    doctorConfirm: null
  }
]
