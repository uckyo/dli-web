/**
 * DLI Mock 数据 - 患者档案与 360° 详情数据
 *
 * 覆盖 10 例在管患者，风险分层 L1-L4、用药状态、入组分组均有分布，
 * 患者编号规则：DLI-{入组年}-{序号}
 */
import type {
  DliPatient,
  DliPatientDetail,
  ImagingStudy,
  LabTrendSeries,
  PathologyReport,
  TimelineEvent
} from './types'

/** 患者列表数据 */
export const PATIENT_LIST: DliPatient[] = [
  {
    id: 'DLI-2026-0001',
    name: '王**',
    sex: 'male',
    age: 68,
    center: '华中科技大学同济医学院附属同济医院',
    groupType: 'ai',
    medStatus: 'during',
    riskLevel: 'L1',
    drugs: ['甲氨蝶呤', '来氟米特'],
    lastAssessTime: '2026-10-19 16:20',
    unreadReports: 3,
    consentStatus: 'signed',
    doctor: '陈明远'
  },
  {
    id: 'DLI-2026-0002',
    name: '李**',
    sex: 'female',
    age: 55,
    center: '中日友好医院',
    groupType: 'ai',
    medStatus: 'during',
    riskLevel: 'L2',
    drugs: ['胺碘酮'],
    lastAssessTime: '2026-10-18 10:05',
    unreadReports: 1,
    consentStatus: 'signed',
    doctor: '陈明远'
  },
  {
    id: 'DLI-2026-0003',
    name: '张**',
    sex: 'male',
    age: 72,
    center: '上海交通大学附属瑞金医院',
    groupType: 'routine',
    medStatus: 'during',
    riskLevel: 'L1',
    drugs: ['博来霉素', '环磷酰胺'],
    lastAssessTime: '2026-10-17 14:40',
    unreadReports: 5,
    consentStatus: 'signed',
    doctor: '林巧茹'
  },
  {
    id: 'DLI-2026-0004',
    name: '刘**',
    sex: 'female',
    age: 47,
    center: '同济医院',
    groupType: 'ai',
    medStatus: 'before',
    riskLevel: 'L3',
    drugs: ['甲氨蝶呤（待启用）'],
    lastAssessTime: '2026-10-16 09:15',
    unreadReports: 0,
    consentStatus: 'signed',
    doctor: '陈明远'
  },
  {
    id: 'DLI-2026-0005',
    name: '赵**',
    sex: 'male',
    age: 63,
    center: '中日友好医院',
    groupType: 'routine',
    medStatus: 'after',
    riskLevel: 'L4',
    drugs: ['胺碘酮（已停用）'],
    lastAssessTime: '2026-10-15 11:30',
    unreadReports: 0,
    consentStatus: 'signed',
    doctor: '林巧茹'
  },
  {
    id: 'DLI-2026-0006',
    name: '孙**',
    sex: 'female',
    age: 59,
    center: '瑞金医院',
    groupType: 'ai',
    medStatus: 'during',
    riskLevel: 'L2',
    drugs: ['利妥昔单抗'],
    lastAssessTime: '2026-10-19 08:50',
    unreadReports: 2,
    consentStatus: 'signed',
    doctor: '周建国'
  },
  {
    id: 'DLI-2026-0007',
    name: '周**',
    sex: 'male',
    age: 65,
    center: '同济医院',
    groupType: 'ai',
    medStatus: 'after',
    riskLevel: 'L3',
    drugs: ['环磷酰胺（已停用）'],
    lastAssessTime: '2026-10-12 15:25',
    unreadReports: 1,
    consentStatus: 'withdrawn',
    doctor: '陈明远'
  },
  {
    id: 'DLI-2026-0008',
    name: '吴**',
    sex: 'female',
    age: 51,
    center: '瑞金医院',
    groupType: 'routine',
    medStatus: 'before',
    riskLevel: 'L3',
    drugs: ['博来霉素（待启用）'],
    lastAssessTime: '2026-10-11 10:10',
    unreadReports: 0,
    consentStatus: 'unsigned',
    doctor: '周建国'
  },
  {
    id: 'DLI-2026-0009',
    name: '郑**',
    sex: 'male',
    age: 76,
    center: '中日友好医院',
    groupType: 'ai',
    medStatus: 'during',
    riskLevel: 'L1',
    drugs: ['甲氨蝶呤', '胺碘酮'],
    lastAssessTime: '2026-10-19 17:05',
    unreadReports: 4,
    consentStatus: 'signed',
    doctor: '林巧茹'
  },
  {
    id: 'DLI-2026-0010',
    name: '冯**',
    sex: 'female',
    age: 43,
    center: '同济医院',
    groupType: 'ai',
    medStatus: 'after',
    riskLevel: 'L4',
    drugs: ['来氟米特（已停用）'],
    lastAssessTime: '2026-10-09 09:45',
    unreadReports: 0,
    consentStatus: 'signed',
    doctor: '陈明远'
  }
]

/** 患者详情（含基线资料与用药记录） */
export const PATIENT_DETAILS: Record<string, DliPatientDetail> = {
  'DLI-2026-0001': {
    ...PATIENT_LIST[0],
    phone: '138****6621',
    idNoMasked: '4201**********0537',
    enrollDate: '2026-08-12',
    diagnosis: '类风湿关节炎（高危药物治疗中）',
    medicationCourses: [
      {
        drugName: '甲氨蝶呤',
        dose: '15mg',
        route: '口服',
        frequency: '每周 1 次',
        startDate: '2026-08-15'
      },
      {
        drugName: '来氟米特',
        dose: '20mg',
        route: '口服',
        frequency: '每日 1 次',
        startDate: '2026-08-15'
      }
    ]
  },
  'DLI-2026-0002': {
    ...PATIENT_LIST[1],
    phone: '139****3385',
    idNoMasked: '1101**********2049',
    enrollDate: '2026-09-02',
    diagnosis: '心律失常（胺碘酮治疗中）',
    medicationCourses: [
      {
        drugName: '胺碘酮',
        dose: '200mg',
        route: '口服',
        frequency: '每日 1 次',
        startDate: '2026-09-05'
      }
    ]
  },
  'DLI-2026-0003': {
    ...PATIENT_LIST[2],
    phone: '137****9014',
    idNoMasked: '3101**********7726',
    enrollDate: '2026-07-20',
    diagnosis: '霍奇金淋巴瘤（ABVD 方案化疗中）',
    medicationCourses: [
      {
        drugName: '博来霉素',
        dose: '30U',
        route: '静脉滴注',
        frequency: '每 2 周 1 次',
        startDate: '2026-07-24'
      },
      {
        drugName: '环磷酰胺',
        dose: '1200mg',
        route: '静脉滴注',
        frequency: '每 2 周 1 次',
        startDate: '2026-07-24'
      }
    ]
  }
}

/** 诊疗时间轴事件（按时间倒序） */
export const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: 'TL-0012',
    patientId: 'DLI-2026-0001',
    type: 'alert',
    title: '红色预警',
    content: '血氧饱和度连续 3 日 < 93%，CDSS 建议立即复查 HRCT',
    time: '2026-10-19 16:20'
  },
  {
    id: 'TL-0011',
    patientId: 'DLI-2026-0001',
    type: 'report',
    title: '患者上报',
    content: '气短加重（中度）、干咳（轻度），血氧 92%',
    time: '2026-10-19 08:12'
  },
  {
    id: 'TL-0010',
    patientId: 'DLI-2026-0001',
    type: 'assess',
    title: '治疗中评估',
    content: 'CDSS 动态评估：风险评分 78 → 82，维持 L2 高风险',
    time: '2026-10-18 10:00'
  },
  {
    id: 'TL-0009',
    patientId: 'DLI-2026-0001',
    type: 'lab',
    title: '检验结果',
    content: '血常规 + 肝肾功能：白细胞 3.2×10⁹/L（↓），ALT 68 U/L（↑）',
    time: '2026-10-16 09:30'
  },
  {
    id: 'TL-0008',
    patientId: 'DLI-2026-0001',
    type: 'medication',
    title: '用药调整',
    content: '甲氨蝶呤 15mg/周 维持，加用叶酸 5mg 每周',
    time: '2026-10-12 14:00'
  },
  {
    id: 'TL-0007',
    patientId: 'DLI-2026-0001',
    type: 'report',
    title: '患者上报',
    content: '症状日记：夜间咳嗽减少，晨起乏力',
    time: '2026-10-10 21:35'
  },
  {
    id: 'TL-0006',
    patientId: 'DLI-2026-0001',
    type: 'assess',
    title: '治疗前评估',
    content: 'CDSS 基线评估：风险评分 65，L2 高风险（高龄 + 基线肝功异常）',
    time: '2026-08-13 10:20'
  },
  {
    id: 'TL-0005',
    patientId: 'DLI-2026-0001',
    type: 'lab',
    title: '基线检验',
    content: '基线血常规、肝肾功能、炎症指标归档完成',
    time: '2026-08-12 15:00'
  },
  {
    id: 'TL-0004',
    patientId: 'DLI-2026-0001',
    type: 'medication',
    title: '入组建档',
    content: '知情同意签署，同步基线检验与病历数据',
    time: '2026-08-12 11:00'
  },
  {
    id: 'TL-0003',
    patientId: 'DLI-2026-0002',
    type: 'alert',
    title: '橙色预警',
    content: 'DLCO 较基线下降 21%，疑似胺碘酮肺毒性',
    time: '2026-10-18 10:05'
  },
  {
    id: 'TL-0002',
    patientId: 'DLI-2026-0002',
    type: 'lab',
    title: '肺功能检查',
    content: 'FVC 78%（预计值），DLCO 64%（较基线下降 21%）',
    time: '2026-10-17 09:00'
  },
  {
    id: 'TL-0001',
    patientId: 'DLI-2026-0002',
    type: 'assess',
    title: '治疗中评估',
    content: 'CDSS 动态评估：风险评分 70，L2 高风险',
    time: '2026-10-15 16:30'
  }
]

/** 检验指标趋势（关键指标：血常规 / 肝肾功能 / 炎症指标） */
export const LAB_TRENDS: Record<string, LabTrendSeries[]> = {
  'DLI-2026-0001': [
    {
      itemCode: 'WBC',
      itemName: '白细胞计数',
      unit: '×10⁹/L',
      refRange: '3.5-9.5',
      dates: ['08-12', '08-26', '09-09', '09-23', '10-07', '10-16'],
      values: [4.8, 4.2, 3.9, 3.6, 3.4, 3.2]
    },
    {
      itemCode: 'ALT',
      itemName: '谷丙转氨酶',
      unit: 'U/L',
      refRange: '9-50',
      dates: ['08-12', '08-26', '09-09', '09-23', '10-07', '10-16'],
      values: [42, 48, 55, 58, 63, 68]
    },
    {
      itemCode: 'CRP',
      itemName: 'C 反应蛋白',
      unit: 'mg/L',
      refRange: '0-10',
      dates: ['08-12', '08-26', '09-09', '09-23', '10-07', '10-16'],
      values: [6.2, 8.5, 12.1, 15.8, 18.4, 21.6]
    },
    {
      itemCode: 'SPO2',
      itemName: '血氧饱和度',
      unit: '%',
      refRange: '≥95',
      dates: ['08-12', '08-26', '09-09', '09-23', '10-07', '10-16'],
      values: [97, 96, 96, 95, 94, 92]
    }
  ],
  'DLI-2026-0002': [
    {
      itemCode: 'ALT',
      itemName: '谷丙转氨酶',
      unit: 'U/L',
      refRange: '9-50',
      dates: ['09-02', '09-16', '09-30', '10-14'],
      values: [28, 35, 44, 52]
    },
    {
      itemCode: 'DLCO',
      itemName: '一氧化碳弥散量',
      unit: '%预计值',
      refRange: '≥80',
      dates: ['09-02', '09-16', '10-17'],
      values: [85, 79, 64]
    }
  ]
}

/** 影像报告（HRCT 为主，对应 PACS 调阅） */
export const IMAGING_STUDIES: ImagingStudy[] = [
  {
    id: 'IMG-0021',
    patientId: 'DLI-2026-0001',
    modality: 'HRCT',
    studyDate: '2026-10-16',
    pacsUid: '1.2.840.113619.2.2026.10.16.001',
    reportText:
      '两肺外周胸膜下磨玻璃影较前片（2026-08-12）增多，以双下肺为著，小叶间隔增厚，考虑药物相关性肺损伤可能，建议结合临床与停药观察。',
    conclusion: '两肺磨玻璃影，较前进展，考虑 DLI 可能'
  },
  {
    id: 'IMG-0014',
    patientId: 'DLI-2026-0001',
    modality: 'HRCT',
    studyDate: '2026-08-12',
    pacsUid: '1.2.840.113619.2.2026.08.12.001',
    reportText: '两肺纹理清晰，胸膜下少许小结节，余未见明显异常。基线存档。',
    conclusion: '基线未见明显异常'
  },
  {
    id: 'IMG-0018',
    patientId: 'DLI-2026-0002',
    modality: 'HRCT',
    studyDate: '2026-10-17',
    pacsUid: '1.2.840.113619.2.2026.10.17.002',
    reportText:
      '右肺上叶斑片状高密度影，边缘模糊，较基线新发；双侧胸腔少量积液。符合胺碘酮肺毒性表现。',
    conclusion: '右肺上叶斑片影，考虑胺碘酮肺毒性'
  },
  {
    id: 'IMG-0009',
    patientId: 'DLI-2026-0002',
    modality: 'HRCT',
    studyDate: '2026-09-02',
    pacsUid: '1.2.840.113619.2.2026.09.02.002',
    reportText: '双肺未见明显实质性病变。基线存档。',
    conclusion: '基线未见明显异常'
  },
  {
    id: 'IMG-0011',
    patientId: 'DLI-2026-0003',
    modality: 'HRCT',
    studyDate: '2026-10-10',
    pacsUid: '1.2.840.113619.2.2026.10.10.003',
    reportText:
      '两肺弥漫性网格状改变伴磨玻璃密度，以肺底部为主，较前片进展，符合博来霉素所致肺纤维化改变。',
    conclusion: '两肺间质性改变，较前进展'
  }
]

/** 病理报告 */
export const PATHOLOGY_REPORTS: PathologyReport[] = [
  {
    id: 'PAT-0005',
    patientId: 'DLI-2026-0001',
    sampleDate: '2026-08-13',
    sampleType: '支气管肺泡灌洗液',
    reportText:
      '灌洗液细胞学：淋巴细胞比例升高（32%），未见恶性细胞；T 细胞亚群 CD4/CD8 比值 3.2，提示免疫性肺损伤可能。'
  },
  {
    id: 'PAT-0003',
    patientId: 'DLI-2026-0003',
    sampleDate: '2026-07-22',
    sampleType: '淋巴结穿刺活检',
    reportText: '经典型霍奇金淋巴瘤，结节硬化型；免疫组化：CD30(+)、CD15(+)、PAX-5(弱+)。'
  }
]
