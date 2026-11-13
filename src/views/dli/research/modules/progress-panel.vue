<!-- 项目详情 · 研究进度 [批注 15]：按中心 / 组别筛选，缺失异常核对与患者研究记录 -->
<template>
  <div class="dli-research-panel">
    <ElForm :inline="true" class="dli-research-filter" @submit.prevent>
      <ElFormItem label="中心">
        <ElSelect v-model="filters.center" clearable placeholder="全部中心" style="width: 160px">
          <ElOption v-for="item in centerOptions" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="组别">
        <ElSelect v-model="filters.group" clearable placeholder="全部组别" style="width: 175px">
          <ElOption v-for="item in groupOptions" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="观察时间范围">
        <ElSelect v-model="filters.timeRange" style="width: 155px">
          <ElOption label="近 30 天" value="近 30 天" />
          <ElOption label="近 90 天" value="近 90 天" />
          <ElOption label="全研究周期" value="全研究周期" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem>
        <ElButton type="primary" @click="load">查询</ElButton>
        <ElButton @click="reset">重置</ElButton>
      </ElFormItem>
    </ElForm>

    <p class="dli-research-hint">
      进度汇总来自入组、随访与终点记录；缺失 / 异常需定位到原记录核对，不由系统自动补齐。
    </p>

    <ArtTable
      v-loading="loading"
      :data="rows"
      :columns="columns"
      :height="440"
      empty-text="暂无研究进度数据"
    />

    <!-- 缺失 / 异常核对抽屉 -->
    <ElDrawer
      v-model="issueVisible"
      :title="`缺失 / 异常核对 · ${issueTitle}`"
      size="720px"
      append-to-body
      destroy-on-close
    >
      <ArtTable :data="issues" :columns="issueColumns" :height="420" empty-text="暂无缺失 / 异常" />
    </ElDrawer>

    <!-- 患者研究记录抽屉：与患者详情研究入组共用同一组件 -->
    <PatientResearchRecordDrawer
      v-model="recordVisible"
      :patient-id="recordPatientId"
      :project-id="projectId"
    />
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElDrawer, ElForm, ElFormItem, ElOption, ElSelect, ElTag } from 'element-plus'
  import { computed, onMounted, reactive, ref } from 'vue'
  import type { ColumnOption } from '@/types/component'
  import { fetchGetProgressIssues, fetchGetResearchProgress } from '@/mock/dli/blueprint/api'
  import type { ResearchProgress, ResearchProgressIssue } from '@/mock/dli/blueprint/types'
  import PatientResearchRecordDrawer from './patient-research-record-drawer.vue'

  defineOptions({ name: 'ResearchProgressPanel' })

  const props = defineProps<{
    projectId: string
    readonly: boolean
  }>()

  const loading = ref(false)
  const rows = ref<ResearchProgress[]>([])
  const allRows = ref<ResearchProgress[]>([])
  const filters = reactive({ center: '', group: '', timeRange: '全研究周期' })

  const centerOptions = computed(() => Array.from(new Set(allRows.value.map((row) => row.center))))
  const groupOptions = computed(() => Array.from(new Set(allRows.value.map((row) => row.group))))

  const issueVisible = ref(false)
  const issueTitle = ref('')
  const issues = ref<ResearchProgressIssue[]>([])

  const recordVisible = ref(false)
  const recordPatientId = ref('')

  const columns: ColumnOption<ResearchProgress>[] = [
    { prop: 'center', label: '所属中心', width: 130 },
    { prop: 'group', label: '研究组别', width: 160 },
    {
      prop: 'enrolled',
      label: '已入组人数',
      width: 120,
      formatter: (row: ResearchProgress) => h('span', {}, `${row.enrolled} / ${row.target}`)
    },
    {
      prop: 'followupDone',
      label: '随访完成数 / 应完成数',
      width: 175,
      formatter: (row: ResearchProgress) =>
        h('span', {}, `${row.followupDone} / ${row.followupExpected ?? row.enrolled}`)
    },
    {
      prop: 'endpointDone',
      label: '终点资料完整数 / 应有数',
      width: 185,
      formatter: (row: ResearchProgress) =>
        h('span', {}, `${row.endpointDone} / ${row.endpointExpected ?? row.enrolled}`)
    },
    {
      prop: 'exited',
      label: '已退出人数',
      width: 105,
      formatter: (row: ResearchProgress) => h('span', {}, String(row.exited ?? 0))
    },
    {
      prop: 'missingCount',
      label: '缺失 / 异常',
      width: 120,
      formatter: (row: ResearchProgress) =>
        h(
          ElTag,
          { effect: 'plain', size: 'small', type: row.missingCount ? 'warning' : 'success' },
          () => `${row.missingCount ?? 0} 项`
        )
    },
    {
      prop: 'operation',
      label: '操作',
      width: 220,
      fixed: 'right' as const,
      align: 'center' as const,
      formatter: (row: ResearchProgress) =>
        h('div', { class: 'flex-c justify-center gap-2' }, [
          h(
            ElButton,
            { link: true, type: 'primary', onClick: () => openIssues(row) },
            () => '缺失 / 异常'
          ),
          h(
            ElButton,
            { link: true, type: 'primary', onClick: () => openRecord(row) },
            () => '研究记录'
          )
        ])
    }
  ]

  const issueColumns: ColumnOption<ResearchProgressIssue>[] = [
    { prop: 'patientId', label: '患者编号', width: 155 },
    { prop: 'researchNo', label: '研究受试者编号', width: 170 },
    { prop: 'issue', label: '缺失 / 异常项', minWidth: 170 },
    { prop: 'source', label: '来源记录', minWidth: 180 },
    {
      prop: 'status',
      label: '核对状态',
      width: 110,
      formatter: (row: ResearchProgressIssue) =>
        h(
          ElTag,
          { effect: 'plain', size: 'small', type: row.status === '已核对' ? 'success' : 'warning' },
          () => row.status
        )
    },
    {
      prop: 'operation',
      label: '操作',
      width: 130,
      align: 'center' as const,
      formatter: (row: ResearchProgressIssue) =>
        h(
          ElButton,
          { link: true, type: 'primary', onClick: () => openRecordByPatient(row.patientId) },
          () => '查看研究记录'
        )
    }
  ]

  async function load() {
    if (!props.projectId) return
    loading.value = true
    try {
      allRows.value = await fetchGetResearchProgress(props.projectId, {})
      rows.value = await fetchGetResearchProgress(props.projectId, { ...filters })
    } finally {
      loading.value = false
    }
  }

  function reset() {
    filters.center = ''
    filters.group = ''
    filters.timeRange = '全研究周期'
    void load()
  }

  async function openIssues(row: ResearchProgress) {
    issueTitle.value = `${row.center} · ${row.group}`
    issues.value = await fetchGetProgressIssues(props.projectId, row.center, row.group)
    issueVisible.value = true
  }

  async function openRecord(row: ResearchProgress) {
    const list = await fetchGetProgressIssues(props.projectId, row.center, row.group)
    recordPatientId.value = list[0]?.patientId ?? ''
    recordVisible.value = true
  }

  function openRecordByPatient(patientId: string) {
    recordPatientId.value = patientId
    recordVisible.value = true
  }

  onMounted(() => void load())
</script>
