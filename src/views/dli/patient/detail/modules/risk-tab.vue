<!-- 患者详情 - 风险评估历史 -->
<template>
  <div>
    <div v-if="assessments.length" class="flex flex-col gap-4">
      <div v-for="item in assessments" :key="item.id" class="art-card-sm p-5">
        <!-- 头部信息 -->
        <div class="flex-cb flex-wrap gap-3">
          <div class="flex-c flex-wrap gap-3">
            <ElTag :type="ASSESS_PHASE_CONFIG[item.phase].tagType" effect="plain">
              {{ ASSESS_PHASE_CONFIG[item.phase].label }}
            </ElTag>
            <span class="text-sm text-g-500">评估时间：{{ item.assessTime }}</span>
            <span class="text-sm text-g-500">模型版本：{{ item.modelVersion }}</span>
          </div>
          <ElButton size="small" @click="goCdss">查看完整报告</ElButton>
        </div>

        <!-- 评分与风险分层 -->
        <div class="mt-4 flex flex-wrap items-end gap-5">
          <div class="flex items-end gap-1">
            <span class="text-4xl font-bold text-g-900">{{ item.score }}</span>
            <span class="mb-1 text-sm text-g-500">分</span>
          </div>
          <ElTag :type="RISK_TAG_CONFIG[item.riskLevel].tagType">
            {{ RISK_TAG_CONFIG[item.riskLevel].label }}
          </ElTag>
        </div>

        <!-- 风险因素 -->
        <div class="mt-4">
          <p class="mb-2 text-sm font-medium text-g-700">风险因素</p>
          <div class="flex flex-wrap gap-2">
            <ElTag
              v-for="factor in item.riskFactors"
              :key="factor.factor"
              :type="WEIGHT_TAG_TYPE[factor.weight] || 'info'"
              effect="plain"
            >
              {{ factor.factor }}（权重 {{ factor.weight }}）
            </ElTag>
          </div>
        </div>

        <!-- 个体化建议 -->
        <div class="mt-4">
          <p class="mb-2 text-sm font-medium text-g-700">个体化建议</p>
          <ul class="flex flex-col gap-2">
            <li
              v-for="(suggestion, index) in item.suggestions"
              :key="index"
              class="flex-cb items-start gap-3 text-sm"
            >
              <ElTag size="small" effect="plain" class="shrink-0">{{ suggestion.type }}</ElTag>
              <span class="flex-1 leading-6 text-g-600">{{ suggestion.content }}</span>
            </li>
          </ul>
        </div>

        <!-- 可追溯依据 -->
        <ElCollapse class="mt-4">
          <ElCollapseItem :title="`可追溯依据（${item.traceability.length}）`" :name="item.id">
            <div class="flex flex-col gap-3">
              <div
                v-for="(trace, index) in item.traceability"
                :key="index"
                class="rounded-lg bg-g-100 p-3"
              >
                <div class="flex-c flex-wrap gap-2">
                  <ElTag size="small" type="info" effect="plain">
                    {{ TRACE_SOURCE_LABELS[trace.sourceType] }}
                  </ElTag>
                  <span class="text-sm font-medium text-g-900">{{ trace.title }}</span>
                </div>
                <p class="mt-1 text-sm leading-6 text-g-600">{{ trace.excerpt }}</p>
              </div>
            </div>
          </ElCollapseItem>
        </ElCollapse>

        <!-- 医生确认状态 -->
        <ElAlert v-if="item.doctorConfirm" type="success" :closable="false" class="mt-4">
          <template #title> 医生已确认（{{ confirmActionLabel(item) }}） </template>
          <div class="text-sm leading-6">
            <p>确认医生：{{ item.doctorConfirm?.doctor }}</p>
            <p>确认时间：{{ item.doctorConfirm?.time }}</p>
            <p>确认意见：{{ item.doctorConfirm?.opinion }}</p>
          </div>
        </ElAlert>
        <ElAlert v-else type="warning" :closable="false" class="mt-4" title="待医生确认" />
      </div>
    </div>

    <ElEmpty v-else description="暂无风险评估记录" />
  </div>
</template>

<script setup lang="ts">
  import type { RiskAssessment, TraceabilityItem } from '@/mock/dli/types'
  import {
    ASSESS_PHASE_CONFIG,
    CONFIRM_ACTION_CONFIG,
    WEIGHT_TAG_TYPE
  } from '@/views/dli/patient/constants'
  import { RISK_TAG_CONFIG } from './constants'

  defineOptions({ name: 'DliPatientRiskTab' })

  defineProps<{
    assessments: RiskAssessment[]
  }>()

  /** 可追溯依据来源文案 */
  const TRACE_SOURCE_LABELS: Record<TraceabilityItem['sourceType'], string> = {
    guideline: '指南',
    literature: '文献',
    case: '相似病例',
    model: '模型特征'
  }

  /**
   * 获取医生确认动作文案
   */
  const confirmActionLabel = (assessment: RiskAssessment) =>
    assessment.doctorConfirm ? CONFIRM_ACTION_CONFIG[assessment.doctorConfirm.action].label : ''

  const router = useRouter()

  /**
   * 跳转 CDSS 查看完整评估报告
   */
  const goCdss = () => {
    router.push('/dli/cdss')
  }
</script>
