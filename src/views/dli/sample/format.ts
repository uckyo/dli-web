/**
 * 生物样本 · 标签映射
 */
import type {
  QcConclusion,
  SampleStatus,
  SampleTestStatus,
  SyncStatus,
  VisibleScope
} from '@/mock/dli/types'

type TagType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

export const SAMPLE_STATUS_TAG: Record<SampleStatus, TagType> = {
  已入库: 'success',
  待入库: 'warning',
  已出库: 'info'
}

export const TEST_STATUS_TAG: Record<SampleTestStatus, TagType> = {
  已完成: 'success',
  检测中: 'primary',
  异常: 'danger'
}

export const QC_TAG: Record<QcConclusion, TagType> = {
  合格: 'success',
  不合格: 'danger',
  待质控: 'info'
}

export const SCOPE_TAG: Record<VisibleScope, TagType> = {
  全平台: 'danger',
  本中心: 'warning',
  课题组: 'info'
}

/** 源库同步状态：异常 / 待匹配需在列表标识 [批注 07] */
export const SYNC_STATUS_TAG: Record<SyncStatus, TagType> = {
  正常: 'success',
  异常: 'danger',
  待匹配: 'warning'
}
