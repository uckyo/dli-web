<!-- DLI 智能管理 · LLM 管理（Token 余额） -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <div class="art-card p-5" v-loading="loading">
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div
          v-for="item in intelligence?.llms ?? []"
          :key="item.id"
          class="rounded-lg border border-full-d px-4 py-4"
        >
          <div class="flex-cb">
            <span class="font-medium text-g-900">{{ item.name }}</span>
            <ElTag :type="statusTag[item.status]" effect="plain" size="small">
              {{ item.status }}
            </ElTag>
          </div>
          <p class="mt-1 text-xs text-g-500">{{ item.vendor }}</p>
          <p class="mt-3 text-sm text-g-600">
            Token 余额
            <b class="ml-1 text-lg text-g-900">{{ item.balance.toLocaleString() }}</b>
          </p>
          <ElProgress
            class="mt-2"
            :percentage="usedPercent(item)"
            :status="item.status === '已停用' ? 'exception' : undefined"
            :stroke-width="8"
          />
          <p class="mt-1 text-xs text-g-500">
            已用 {{ item.used.toLocaleString() }} {{ item.unit }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { LlmItem } from '@/mock/dli/types'
  import { useIntelligenceData } from '../useIntelligence'

  defineOptions({ name: 'DliIntelligenceLlm' })

  const { loading, intelligence } = useIntelligenceData()

  /** LLM 状态标签 */
  const statusTag: Record<LlmItem['status'], 'success' | 'warning' | 'info'> = {
    正常: 'success',
    余额预警: 'warning',
    已停用: 'info'
  }

  /** 已用占比 */
  function usedPercent(item: LlmItem): number {
    const total = item.balance + item.used
    if (!total) return 100
    return Math.round((item.used / total) * 100)
  }
</script>
