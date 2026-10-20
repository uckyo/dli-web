/**
 * DLI 患者详情 360° 视图 - 展示配置
 *
 * 风险分层 / 入组分组 / 知情同意状态徽章，以及时间轴事件类型的
 * 图标与颜色映射，供详情页各 Tab 共用。
 */
import type {
  ConsentStatus,
  EntryType,
  GroupType,
  RiskLevel,
  TimelineEvent
} from '@/mock/dli/types'

/** ElTag 标签类型 */
export type DetailTagType = 'success' | 'warning' | 'info' | 'danger' | 'primary'

/** 徽章展示配置 */
export interface DetailTagConfig {
  label: string
  tagType: DetailTagType
}

/** 风险分层展示配置（L1 极高 / L2 高 / L3 中 / L4 低） */
export const RISK_TAG_CONFIG: Record<RiskLevel, DetailTagConfig> = {
  L1: { label: 'L1 极高', tagType: 'danger' },
  L2: { label: 'L2 高', tagType: 'warning' },
  L3: { label: 'L3 中', tagType: 'primary' },
  L4: { label: 'L4 低', tagType: 'success' }
}

/** 入组入口展示配置（拟接受高危药物治疗 / 已确诊 DLI） */
export const ENTRY_TAG_CONFIG: Record<EntryType, DetailTagConfig> = {
  premed: { label: '拟接受高危药物治疗', tagType: 'info' },
  diagnosed: { label: '已确诊 DLI', tagType: 'danger' }
}

/** 入组分组展示配置（AI 组 / 常规组） */
export const GROUP_TAG_CONFIG: Record<GroupType, DetailTagConfig> = {
  ai: { label: 'AI 组', tagType: 'primary' },
  routine: { label: '常规组', tagType: 'info' }
}

/** 知情同意状态展示配置 */
export const CONSENT_TAG_CONFIG: Record<ConsentStatus, DetailTagConfig> = {
  signed: { label: '已签署', tagType: 'success' },
  unsigned: { label: '未签署', tagType: 'warning' },
  withdrawn: { label: '已撤回', tagType: 'danger' }
}

/** 时间轴事件类型展示配置 */
export interface TimelineTypeMeta {
  label: string
  icon: string
  /** 图标颜色类 */
  textClass: string
}

/** 时间轴事件图标与颜色映射 */
export const TIMELINE_TYPE_META: Record<TimelineEvent['type'], TimelineTypeMeta> = {
  medication: { label: '用药', icon: 'ri:medicine-bottle-line', textClass: 'text-primary' },
  lab: { label: '检测', icon: 'ri:flask-line', textClass: 'text-info' },
  alert: { label: '预警', icon: 'ri:alarm-warning-line', textClass: 'text-danger' },
  report: { label: '上报', icon: 'ri:user-voice-line', textClass: 'text-warning' },
  assess: { label: '评估', icon: 'ri:stethoscope-line', textClass: 'text-success' }
}
