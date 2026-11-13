<!-- 项目详情 · 数据分析 [批注 08]：临时筛选不改变正式入组；明细 / 汇总 / 已保存结果 -->
<template>
  <div v-loading="loading" class="dli-research-panel">
    <ElForm :inline="true" class="dli-research-filter" @submit.prevent>
      <ElFormItem label="分组维度">
        <ElSelect v-model="query.groupBy" style="width: 165px">
          <ElOption v-for="item in groupOptions" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="分组取值">
        <ElSelect v-model="query.groupValue" style="width: 165px">
          <ElOption v-for="item in groupValues" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="观察指标">
        <ElSelect v-model="query.indicators" multiple collapse-tags style="width: 260px">
          <ElOption v-for="item in indicatorOptions" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="观察时间范围">
        <ElSelect v-model="query.timeRange" style="width: 155px">
          <ElOption v-for="item in timeOptions" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem>
        <ElButton type="primary" @click="viewData">查看数据</ElButton>
        <ElButton v-if="!readonly" @click="openAgent">Agent 对话</ElButton>
        <ElButton v-if="!readonly" @click="markStale">标记需重新分析</ElButton>
      </ElFormItem>
    </ElForm>

    <p class="dli-research-hint">
      当前为临时分析筛选，不会改变患者正式入组组别；无数据不生成结论，切换条件后旧结果保留原条件快照。
    </p>

    <div class="dli-research-section-head">
      <span class="dli-research-section-title">查看数据</span>
      <ElRadioGroup v-model="mode" size="small">
        <ElRadioButton value="明细">明细</ElRadioButton>
        <ElRadioButton value="汇总">汇总</ElRadioButton>
      </ElRadioGroup>
    </div>

    <ArtTable
      v-if="mode === '明细'"
      :data="detailRows"
      :columns="detailColumns"
      :height="300"
      empty-text="请先点击「查看数据」"
      class="mb-5"
    />
    <ArtTable
      v-else
      :data="summaryRows"
      :columns="summaryColumns"
      :height="300"
      empty-text="请先点击「查看数据」"
      class="mb-5"
    />

    <div class="dli-research-section-head">
      <span class="dli-research-section-title">已保存分析结果</span>
      <ElTag effect="plain" size="small">共 {{ results.length }} 条</ElTag>
    </div>
    <ArtTable :data="results" :columns="resultColumns" :height="260" empty-text="暂无已保存结果" />
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElForm,
    ElFormItem,
    ElMessage,
    ElOption,
    ElRadioButton,
    ElRadioGroup,
    ElSelect,
    ElTag
  } from 'element-plus'
  import { computed, onMounted, reactive, ref, watch } from 'vue'
  import type { ColumnOption } from '@/types/component'
  import type { ResearchItem } from '@/mock/dli/types'
  import {
    fetchGetResearchAnalysisData,
    fetchGetResearchProjectDetailByResearchId,
    fetchGetResearchResults,
    fetchMarkAnalysisStale
  } from '@/mock/dli/blueprint/api'
  import type {
    AnalysisCondition,
    AnalysisDataRow,
    AnalysisResult,
    AnalysisSummaryRow,
    ResearchAnalysisQuery,
    ResearchProjectDetail
  } from '@/mock/dli/blueprint/types'

  defineOptions({ name: 'ResearchAnalysisPanel' })

  const props = defineProps<{
    projectId: string
    research?: ResearchItem
    readonly: boolean
    refreshKey: number
  }>()
  const emit = defineEmits<{
    'condition-change': [condition: AnalysisCondition]
    'open-agent': []
  }>()

  const loading = ref(false)
  const mode = ref<'明细' | '汇总'>('明细')
  const project = ref<ResearchProjectDetail>()
  const detailRows = ref<AnalysisDataRow[]>([])
  const summaryRows = ref<AnalysisSummaryRow[]>([])
  const results = ref<AnalysisResult[]>([])

  const query = reactive<ResearchAnalysisQuery>({
    groupBy: '',
    groupValue: '全部入组',
    indicators: [],
    timeRange: '全研究周期'
  })

  const groupOptions = computed(
    () => project.value?.groupDimensions ?? props.research?.groupBy ?? ['研究组别']
  )
  const groupValues = computed(() => project.value?.groups ?? ['全部入组'])
  const indicatorOptions = computed(
    () => project.value?.indicators ?? props.research?.indicators ?? []
  )
  const timeOptions = computed(
    () => project.value?.timeRanges ?? ['近 30 天', '近 90 天', '全研究周期']
  )

  const currentCondition = computed<AnalysisCondition>(() => ({
    group: query.groupValue,
    indicator: query.indicators[0] ?? '',
    timeRange: query.timeRange,
    groupBy: query.groupBy,
    groupValue: query.groupValue,
    indicators: [...query.indicators],
    source: '手动查看'
  }))

  const detailColumns = computed<ColumnOption<AnalysisDataRow>[]>(() => [
    { prop: 'patientId', label: '患者编号', width: 150 },
    { prop: 'researchNo', label: '研究受试者编号', width: 165 },
    { prop: 'groupValue', label: '分组取值', width: 130 },
    { prop: 'observedAt', label: '观察时间 / 日期', width: 155 },
    ...query.indicators.map((indicator, index) => ({
      prop: `indicator_${index}`,
      label: indicator,
      minWidth: 160,
      formatter: (row: AnalysisDataRow) => h('span', {}, row[`indicator_${index}`] || '—')
    }))
  ])

  const summaryColumns: ColumnOption<AnalysisSummaryRow>[] = [
    { prop: 'groupName', label: '分组取值', width: 140 },
    { prop: 'indicator', label: '观察指标', minWidth: 180 },
    { prop: 'validCount', label: '有效数据量', width: 120 },
    { prop: 'missingCount', label: '缺失情况', width: 110 },
    { prop: 'result', label: '统计结果', width: 120 },
    { prop: 'unit', label: '单位', width: 100 },
    { prop: 'statisticalMethod', label: '统计方式', minWidth: 200 }
  ]

  const resultColumns: ColumnOption<AnalysisResult>[] = [
    {
      prop: 'condition',
      label: '分析条件',
      minWidth: 240,
      formatter: (row: AnalysisResult) =>
        h(
          'span',
          { class: 'text-xs' },
          `${row.condition.groupValue ?? row.condition.group} / ${(row.condition.indicators ?? [row.condition.indicator]).filter(Boolean).join('、')} / ${row.condition.timeRange}`
        )
    },
    { prop: 'statisticalMethod', label: '统计口径', minWidth: 170, showOverflowTooltip: true },
    { prop: 'unit', label: '单位', width: 100 },
    { prop: 'validCount', label: '有效数据量', width: 120 },
    { prop: 'missingCount', label: '缺失情况', width: 110 },
    { prop: 'value', label: '结果值', width: 110 },
    { prop: 'savedAt', label: '保存时间', width: 170 },
    {
      prop: 'status',
      label: '结果来源',
      width: 120,
      formatter: (row: AnalysisResult) =>
        h(ElTag, { effect: 'plain', size: 'small' }, () => row.condition.source ?? '手动查看')
    },
    {
      prop: 'needsRerun',
      label: '状态',
      width: 130,
      formatter: (row: AnalysisResult) =>
        h(
          ElTag,
          { effect: 'plain', size: 'small', type: row.needsRerun ? 'warning' : 'success' },
          () => (row.needsRerun ? '需重新分析' : '有效')
        )
    }
  ]

  async function loadProject() {
    if (!props.projectId) return
    project.value = await fetchGetResearchProjectDetailByResearchId(props.projectId)
    query.groupBy = groupOptions.value[0] ?? '研究组别'
    query.groupValue = groupValues.value.includes('全部入组')
      ? '全部入组'
      : (groupValues.value[0] ?? '全部入组')
    query.indicators = indicatorOptions.value.slice(0, 2)
    query.timeRange = timeOptions.value[timeOptions.value.length - 1] ?? '全研究周期'
    emit('condition-change', currentCondition.value)
  }

  async function loadResults() {
    if (!props.projectId) return
    try {
      results.value = await fetchGetResearchResults(props.projectId)
    } catch {
      results.value = []
    }
  }

  async function viewData() {
    if (!query.indicators.length) {
      ElMessage.warning('请至少选择一个观察指标')
      return
    }
    loading.value = true
    try {
      const data = await fetchGetResearchAnalysisData(props.projectId, { ...query })
      detailRows.value = data.detail
      summaryRows.value = data.summary
      if (!data.detail.length) ElMessage.info('当前筛选无数据，未生成结论')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '查看数据失败')
    } finally {
      loading.value = false
    }
  }

  async function markStale() {
    try {
      await fetchMarkAnalysisStale(props.projectId)
      await loadResults()
      ElMessage.success('已标记需重新分析')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '标记失败')
    }
  }

  function openAgent() {
    emit('condition-change', currentCondition.value)
    emit('open-agent')
  }

  async function init() {
    await loadProject()
    await loadResults()
    await viewData()
  }

  watch(query, () => emit('condition-change', currentCondition.value), { deep: true })
  watch(
    () => props.refreshKey,
    () => void loadResults()
  )
  watch(
    () => props.projectId,
    () => void init()
  )

  onMounted(() => void init())
</script>
