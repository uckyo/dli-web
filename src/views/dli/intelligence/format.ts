/**
 * 智能管理格式化与标签映射
 */
import type { LlmItem, McpStatus, SkillType, VisibleScope } from '@/mock/dli/types'

type TagType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

/** 整数千分位 */
export function formatInt(value: number): string {
  return Math.round(value).toLocaleString('zh-CN')
}

/** 百分比 */
export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`
}

/** 延迟：小于 1s 用 ms，否则用 s */
export function formatLatency(ms: number): string {
  if (!ms) return '—'
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`
}

/** Token 数量（万 / 亿） */
export function formatTokens(value: number): string {
  if (value >= 1e8) return `${(value / 1e8).toFixed(2)} 亿`
  if (value >= 1e4) return `${(value / 1e4).toFixed(1)} 万`
  return formatInt(value)
}

/** 金额 */
export function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

/** 字节容量 */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 / 1024)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** 只保留日期部分 */
export function formatDate(value: string): string {
  return value ? value.slice(0, 10) : '—'
}

/** 日期轴标签：MM-DD */
export function formatAxisDate(value: string): string {
  return value.slice(5)
}

export const SKILL_TYPE_TAG: Record<SkillType, TagType> = {
  工具调用: 'primary',
  提示词: 'success',
  工作流: 'warning'
}

export const SCOPE_TAG: Record<VisibleScope, TagType> = {
  全平台: 'danger',
  本中心: 'warning',
  课题组: 'info'
}

export const SKILL_CALL_STATUS_TAG: Record<'成功' | '失败' | '超时', TagType> = {
  成功: 'success',
  失败: 'danger',
  超时: 'warning'
}

export const MCP_STATUS_TAG: Record<McpStatus, TagType> = {
  在线: 'success',
  离线: 'danger',
  异常: 'warning'
}

export const MCP_STATUS_DOT: Record<McpStatus, string> = {
  在线: 'bg-success',
  离线: 'bg-danger',
  异常: 'bg-warning'
}

export const LLM_STATUS_TAG: Record<LlmItem['status'], TagType> = {
  正常: 'success',
  余额预警: 'warning',
  已停用: 'info'
}

export const SESSION_STATUS_TAG: Record<'已结束' | '进行中' | '转人工', TagType> = {
  已结束: 'info',
  进行中: 'primary',
  转人工: 'warning'
}
