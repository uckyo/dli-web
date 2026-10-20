<!-- CDSS 决策支持：治疗前 / 治疗中 / 诊断后三阶段报告，医生确认留痕 -->
<template>
  <div class="dli-cdss-page art-full-height overflow-y-auto pb-5" v-loading="loading">
    <!-- 页头与阶段切换 -->
    <div class="art-card px-5 py-4 mb-5">
      <div class="flex-cb flex-wrap gap-3">
        <div>
          <h3 class="text-xl font-medium text-g-900">CDSS 决策支持</h3>
          <p class="mt-1 text-sm text-g-600"> 所有 AI 建议需医生确认后生效，确认过程全程留痕 </p>
        </div>
        <ElButton type="primary" @click="handleNewAssessment">
          <ArtSvgIcon icon="ri:add-line" class="mr-1" />
          发起新评估
        </ElButton>
      </div>

      <div class="mt-4 flex-cb flex-wrap gap-3">
        <ElRadioGroup v-model="activePhase">
          <ElRadioButton v-for="phase in PHASE_LIST" :key="phase.value" :value="phase.value">
            {{ phase.label }}
            <span class="ml-1 rounded-full bg-g-200 px-1.5 text-xs text-g-600">
              {{ phaseCounts[phase.value] }}
            </span>
          </ElRadioButton>
        </ElRadioGroup>
        <span class="text-sm text-g-500">共 {{ assessments.length }} 份评估报告</span>
      </div>
    </div>

    <!-- 报告列表 + 报告详情 -->
    <div class="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
      <!-- 左栏：当前阶段报告列表 -->
      <div class="art-card p-4">
        <div class="mb-3 flex-cb gap-2">
          <h4 class="text-base font-medium text-g-900">评估报告</h4>
          <span class="text-xs text-g-500"
            >{{ phaseLabel }} · {{ phaseAssessments.length }} 份</span
          >
        </div>

        <div
          v-if="phaseAssessments.length"
          class="flex flex-col gap-2 max-h-[calc(100vh-390px)] overflow-y-auto pr-1"
        >
          <div
            v-for="item in phaseAssessments"
            :key="item.id"
            class="rounded-lg border p-3 c-p tad-200"
            :class="
              item.id === selectedId ? 'border-theme bg-g-100' : 'border-full-d hover:bg-g-100'
            "
            @click="selectReport(item.id)"
          >
            <div class="flex-cb gap-2">
              <span class="min-w-0 truncate text-sm font-medium text-g-900">
                {{ item.patientName }}
              </span>
              <span
                class="shrink-0 text-lg font-semibold"
                :class="RISK_SCORE_CLASS[item.riskLevel]"
              >
                {{ item.score }}
              </span>
            </div>
            <div class="mt-2 flex-cb gap-2">
              <ElTag size="small" :type="RISK_TAG_TYPE[item.riskLevel]">
                {{ RISK_LABEL[item.riskLevel] }}
              </ElTag>
              <span class="text-xs text-g-500">{{ item.assessTime }}</span>
            </div>
            <div
              class="mt-2 flex-c items-center gap-1 text-xs"
              :class="item.doctorConfirm ? 'text-success' : 'text-warning'"
            >
              <ArtSvgIcon :icon="item.doctorConfirm ? 'ri:checkbox-circle-line' : 'ri:time-line'" />
              <span>{{ item.doctorConfirm ? '已确认' : '待确认' }}</span>
            </div>
          </div>
        </div>
        <ElEmpty v-else description="该阶段暂无评估报告" :image-size="80" />
      </div>

      <!-- 右栏：报告详情 -->
      <div class="art-card p-5">
        <template v-if="selectedReport">
          <!-- 头部 -->
          <div class="flex-cb flex-wrap gap-3">
            <div class="flex-c flex-wrap gap-2">
              <h3 class="text-lg font-semibold text-g-900">{{ selectedReport.patientName }}</h3>
              <ElTag :type="PHASE_TAG_TYPE[selectedReport.phase]" effect="plain">
                {{ PHASE_LABEL[selectedReport.phase] }}
              </ElTag>
              <ElTag type="info" effect="plain">{{ selectedReport.modelVersion }}</ElTag>
            </div>
            <span class="text-sm text-g-500">评估时间：{{ selectedReport.assessTime }}</span>
          </div>

          <!-- 评分与风险分层 -->
          <div class="mt-4 flex flex-wrap items-center gap-5 rounded-lg bg-g-100 p-5">
            <div class="flex items-end gap-1">
              <span
                class="text-5xl font-bold leading-none"
                :class="RISK_SCORE_CLASS[selectedReport.riskLevel]"
              >
                {{ selectedReport.score }}
              </span>
              <span class="mb-1 text-sm text-g-500">分</span>
            </div>
            <div class="hidden h-12 w-px bg-g-200 sm:block"></div>
            <div class="min-w-0 flex-1">
              <div class="flex-c flex-wrap gap-2">
                <ElTag :type="RISK_TAG_TYPE[selectedReport.riskLevel]">
                  {{ RISK_LABEL[selectedReport.riskLevel] }}
                </ElTag>
                <span class="text-sm font-medium text-g-900">
                  {{ RISK_DESC[selectedReport.riskLevel].title }}
                </span>
              </div>
              <p class="mt-1 text-sm leading-6 text-g-600">
                {{ RISK_DESC[selectedReport.riskLevel].desc }}
              </p>
            </div>
          </div>

          <!-- 关键风险因素 -->
          <div class="mt-5">
            <h4 class="text-base font-medium text-g-900">关键风险因素</h4>
            <div class="mt-3 flex flex-col gap-2">
              <div
                v-for="factor in selectedReport.riskFactors"
                :key="factor.factor"
                class="flex-cb gap-3 rounded-md bg-g-100 px-3 py-2.5"
              >
                <span class="text-sm text-g-700">{{ factor.factor }}</span>
                <ElTag size="small" :type="WEIGHT_TAG_TYPE[factor.weight] || 'info'">
                  权重 {{ factor.weight }}
                </ElTag>
              </div>
            </div>
          </div>

          <!-- 个体化建议（按类型分组） -->
          <div class="mt-5">
            <h4 class="text-base font-medium text-g-900">个体化建议</h4>
            <div class="mt-3 flex flex-col gap-2">
              <div
                v-for="group in suggestionGroups"
                :key="group.type"
                class="rounded-md border-full-d p-3"
              >
                <p class="text-sm font-medium text-g-900">{{ group.type }}</p>
                <p
                  v-for="(content, index) in group.contents"
                  :key="index"
                  class="mt-1 text-sm leading-6 text-g-600"
                >
                  · {{ content }}
                </p>
              </div>
            </div>
          </div>

          <!-- 可追溯依据 -->
          <div class="mt-5">
            <h4 class="text-base font-medium text-g-900">可追溯依据</h4>
            <ElCollapse v-model="expandedTrace" class="mt-3">
              <ElCollapseItem
                name="trace"
                :title="`依据明细（${selectedReport.traceability.length}）`"
              >
                <div class="flex flex-col gap-3">
                  <div
                    v-for="(trace, index) in selectedReport.traceability"
                    :key="index"
                    class="rounded-md bg-g-100 p-3"
                  >
                    <div class="flex-c flex-wrap gap-2">
                      <ElTag size="small" :type="TRACE_META[trace.sourceType].type">
                        {{ TRACE_META[trace.sourceType].label }}
                      </ElTag>
                      <span class="text-sm font-medium text-g-900">{{ trace.title }}</span>
                    </div>
                    <p class="mt-1 text-sm leading-6 text-g-600">{{ trace.excerpt }}</p>
                  </div>
                </div>
              </ElCollapseItem>
            </ElCollapse>
          </div>

          <!-- 医生确认 -->
          <div class="mt-5">
            <h4 class="text-base font-medium text-g-900">医生确认</h4>

            <ElAlert
              v-if="selectedReport.doctorConfirm"
              type="success"
              :closable="false"
              class="mt-3"
            >
              <template #title>
                {{ CONFIRM_LABEL[selectedReport.doctorConfirm.action] }}
              </template>
              <div class="text-sm leading-6 text-g-700">
                <p>
                  确认医生：{{ selectedReport.doctorConfirm.doctor }} ｜ 确认时间：{{
                    selectedReport.doctorConfirm.time
                  }}
                </p>
                <p>确认意见：{{ selectedReport.doctorConfirm.opinion || '—' }}</p>
              </div>
            </ElAlert>

            <div v-else class="mt-3 rounded-lg border-full-d p-4">
              <div class="flex-cb flex-wrap gap-2">
                <span class="text-sm text-g-600">请确认本报告建议是否采纳</span>
                <span class="text-xs text-warning">待确认 · 确认后建议才会生效</span>
              </div>
              <ElRadioGroup v-model="confirmAction" class="mt-3">
                <ElRadio value="agree">采纳</ElRadio>
                <ElRadio value="modify">修改</ElRadio>
                <ElRadio value="reject">不采纳</ElRadio>
              </ElRadioGroup>
              <ElInput
                v-model="confirmOpinion"
                type="textarea"
                :rows="3"
                maxlength="200"
                show-word-limit
                class="mt-3"
                :placeholder="
                  confirmAction === 'agree'
                    ? '可补充确认意见（选填）'
                    : '请填写修改或不采纳的理由（必填）'
                "
              />
              <div class="mt-3 flex justify-end">
                <ElButton type="primary" :loading="submitting" @click="submitConfirm">
                  确认提交
                </ElButton>
              </div>
            </div>
          </div>
        </template>

        <ElEmpty v-else description="请选择左侧评估报告查看详情" :image-size="100" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { fetchConfirmAssessment, fetchGetRiskAssessments } from '@/mock/dli/api'
  import type { AssessPhase, RiskAssessment, RiskLevel, TraceabilityItem } from '@/mock/dli/types'

  defineOptions({ name: 'DliCdss' })

  type TagType = 'success' | 'warning' | 'info' | 'danger' | 'primary'
  type ConfirmAction = 'agree' | 'modify' | 'reject'

  /** 阶段展示配置 */
  const PHASE_LIST: Array<{ value: AssessPhase; label: string }> = [
    { value: 'pre', label: '治疗前' },
    { value: 'during', label: '治疗中' },
    { value: 'post', label: '诊断后' }
  ]

  /** 阶段文案 */
  const PHASE_LABEL: Record<AssessPhase, string> = {
    pre: '治疗前',
    during: '治疗中',
    post: '诊断后'
  }

  /** 阶段标签类型 */
  const PHASE_TAG_TYPE: Record<AssessPhase, TagType> = {
    pre: 'info',
    during: 'warning',
    post: 'success'
  }

  /** 风险分层文案 */
  const RISK_LABEL: Record<RiskLevel, string> = {
    L1: 'L1 极高',
    L2: 'L2 高',
    L3: 'L3 中',
    L4: 'L4 低'
  }

  /** 风险分层标签类型 */
  const RISK_TAG_TYPE: Record<RiskLevel, TagType> = {
    L1: 'danger',
    L2: 'warning',
    L3: 'primary',
    L4: 'success'
  }

  /** 风险评分颜色 */
  const RISK_SCORE_CLASS: Record<RiskLevel, string> = {
    L1: 'text-danger',
    L2: 'text-warning',
    L3: 'text-primary',
    L4: 'text-success'
  }

  /** 风险等级说明 */
  const RISK_DESC: Record<RiskLevel, { title: string; desc: string }> = {
    L1: {
      title: '极高风险',
      desc: '建议 24 小时内启动紧急干预，暂停可疑药物并上报上级医师。'
    },
    L2: {
      title: '高风险',
      desc: '建议 48 小时内强化监测并评估调整治疗方案。'
    },
    L3: {
      title: '中等风险',
      desc: '按计划监测关键指标，关注指标变化趋势。'
    },
    L4: {
      title: '低风险',
      desc: '维持常规随访与健康宣教，按计划复评。'
    }
  }

  /** 风险因素权重标签类型 */
  const WEIGHT_TAG_TYPE: Record<string, TagType> = {
    极高: 'danger',
    高: 'danger',
    中: 'warning',
    低: 'info'
  }

  /** 可追溯依据来源配置 */
  const TRACE_META: Record<TraceabilityItem['sourceType'], { label: string; type: TagType }> = {
    guideline: { label: '指南', type: 'primary' },
    literature: { label: '文献', type: 'success' },
    case: { label: '相似病例', type: 'warning' },
    model: { label: '模型特征', type: 'info' }
  }

  /** 确认动作文案 */
  const CONFIRM_LABEL: Record<ConfirmAction, string> = {
    agree: '已采纳',
    modify: '已修改',
    reject: '不采纳'
  }

  const loading = ref(false)
  const assessments = ref<RiskAssessment[]>([])
  const activePhase = ref<AssessPhase>('pre')
  const selectedId = ref('')
  const confirmAction = ref<ConfirmAction>('agree')
  const confirmOpinion = ref('')
  const submitting = ref(false)
  const expandedTrace = ref<string[]>(['trace'])

  /** 当前阶段报告 */
  const phaseAssessments = computed(() =>
    assessments.value.filter((item) => item.phase === activePhase.value)
  )

  /** 当前选中报告 */
  const selectedReport = computed(
    () => phaseAssessments.value.find((item) => item.id === selectedId.value) ?? null
  )

  /** 各阶段报告数量 */
  const phaseCounts = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = { pre: 0, during: 0, post: 0 }
    assessments.value.forEach((item) => {
      counts[item.phase] += 1
    })
    return counts
  })

  /** 当前阶段文案 */
  const phaseLabel = computed(() => PHASE_LABEL[activePhase.value])

  /** 建议按类型分组 */
  const suggestionGroups = computed(() => {
    const groups: Array<{ type: string; contents: string[] }> = []
    selectedReport.value?.suggestions.forEach((item) => {
      const group = groups.find((current) => current.type === item.type)
      if (group) {
        group.contents.push(item.content)
      } else {
        groups.push({ type: item.type, contents: [item.content] })
      }
    })
    return groups
  })

  /**
   * 保证当前阶段始终有选中项
   */
  const ensureSelected = () => {
    if (!phaseAssessments.value.some((item) => item.id === selectedId.value)) {
      selectedId.value = phaseAssessments.value[0]?.id ?? ''
    }
  }

  /**
   * 加载全部评估报告
   */
  const loadAssessments = async () => {
    loading.value = true
    try {
      assessments.value = await fetchGetRiskAssessments()
      ensureSelected()
    } catch {
      ElMessage.error('评估报告加载失败，请稍后重试')
    } finally {
      loading.value = false
    }
  }

  /**
   * 切换选中报告
   */
  const selectReport = (id: string) => {
    selectedId.value = id
  }

  /**
   * 发起新评估（演示）
   */
  const handleNewAssessment = () => {
    ElMessage.info('已提交评估任务（演示）')
  }

  /**
   * 提交医生确认（修改 / 不采纳需填写意见）
   */
  const submitConfirm = async () => {
    const report = selectedReport.value
    if (!report) return

    if (confirmAction.value !== 'agree' && !confirmOpinion.value.trim()) {
      ElMessage.warning('选择「修改」或「不采纳」时请填写确认意见')
      return
    }

    submitting.value = true
    try {
      await fetchConfirmAssessment(report.id, confirmAction.value, confirmOpinion.value.trim())
      ElMessage.success('医生确认已提交，操作已留痕')
      confirmOpinion.value = ''
      await loadAssessments()
    } catch {
      ElMessage.error('确认提交失败，请稍后重试')
    } finally {
      submitting.value = false
    }
  }

  watch(activePhase, () => {
    selectedId.value = phaseAssessments.value[0]?.id ?? ''
  })

  watch(selectedId, () => {
    confirmAction.value = 'agree'
    confirmOpinion.value = ''
  })

  onMounted(loadAssessments)
</script>
