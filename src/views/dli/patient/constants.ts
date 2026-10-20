/**
 * DLI 患者管理 - 枚举展示配置
 *
 * 风险分层 / 用药状态 / 入组分组等枚举的文案与标签类型映射，
 * 供患者列表页与患者详情页共用。
 */
import type {
  AssessPhase,
  ConfirmAction,
  ConsentStatus,
  GroupType,
  MedStatus,
  RiskLevel
} from '@/mock/dli/types'

/** ElTag 标签类型 */
type TagType = 'success' | 'warning' | 'info' | 'danger' | 'primary'

/** 枚举展示配置 */
export interface EnumDisplayConfig {
  /** 展示文案 */
  label: string
  /** 标签类型 */
  tagType: TagType
}

/** 患者搜索表单参数 */
export interface PatientSearchForm {
  keyword?: string
  riskLevel?: string
  medStatus?: string
  groupType?: string
}

/** 风险分层展示配置（L1 极高 / L2 高 / L3 中 / L4 低） */
export const RISK_LEVEL_CONFIG: Record<RiskLevel, EnumDisplayConfig> = {
  L1: { label: 'L1 极高', tagType: 'danger' },
  L2: { label: 'L2 高', tagType: 'warning' },
  L3: { label: 'L3 中', tagType: 'info' },
  L4: { label: 'L4 低', tagType: 'success' }
}

/** 用药状态展示配置（用药前 / 用药中 / 诊断后） */
export const MED_STATUS_CONFIG: Record<MedStatus, EnumDisplayConfig> = {
  before: { label: '用药前', tagType: 'info' },
  during: { label: '用药中', tagType: 'warning' },
  after: { label: '诊断后', tagType: 'success' }
}

/** 入组分组展示配置（AI 组 / 常规组） */
export const GROUP_TYPE_CONFIG: Record<GroupType, EnumDisplayConfig> = {
  ai: { label: 'AI 组', tagType: 'primary' },
  routine: { label: '常规组', tagType: 'info' }
}

/** 知情同意状态展示配置 */
export const CONSENT_STATUS_CONFIG: Record<ConsentStatus, EnumDisplayConfig> = {
  signed: { label: '已签署', tagType: 'success' },
  unsigned: { label: '未签署', tagType: 'warning' },
  withdrawn: { label: '已撤回', tagType: 'danger' }
}

/** 评估阶段展示配置（治疗前 / 治疗中 / 诊断后） */
export const ASSESS_PHASE_CONFIG: Record<AssessPhase, EnumDisplayConfig> = {
  pre: { label: '治疗前', tagType: 'info' },
  during: { label: '治疗中', tagType: 'warning' },
  post: { label: '诊断后', tagType: 'success' }
}

/** 医生确认动作展示配置（采纳 / 修改 / 不采纳） */
export const CONFIRM_ACTION_CONFIG: Record<ConfirmAction, EnumDisplayConfig> = {
  agree: { label: '已采纳', tagType: 'success' },
  modify: { label: '已修改', tagType: 'warning' },
  reject: { label: '未采纳', tagType: 'danger' }
}

/** 患者上报类型展示配置（症状 / 体征 / 日记） */
export const REPORT_TYPE_CONFIG: Record<'symptom' | 'vital' | 'diary', EnumDisplayConfig> = {
  symptom: { label: '症状上报', tagType: 'warning' },
  vital: { label: '体征上报', tagType: 'primary' },
  diary: { label: '健康日记', tagType: 'info' }
}

/** 风险因素权重 → 标签类型映射 */
export const WEIGHT_TAG_TYPE: Record<string, TagType> = {
  极高: 'danger',
  高: 'warning',
  中: 'primary',
  低: 'info'
}
