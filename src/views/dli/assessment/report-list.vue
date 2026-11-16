<!-- 评估预警 · 评估报告页签：列表 / 发起评估；记录意见与重新评估在报告详情页 [批注 05] -->
<template>
  <div class="pt-3">
    <ArtSearchBar
      v-model="reportSearchParams"
      :items="reportSearchItems"
      @search="handleReportSearch"
      @reset="handleReportReset"
    />

    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader
        v-model:columns="reportColumnChecks"
        :loading="reportLoading"
        @refresh="refreshReportData"
      >
        <template #left>
          <!-- 发起评估：选患者编号 + 模型用途，只读显示模型版本和输入完整性 [批注 05] -->
          <ElButton v-if="isDoctor" type="primary" @click="openLaunch()">发起评估</ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="reportLoading"
        :data="reportData"
        :columns="reportColumns"
        :pagination="reportPagination"
        @pagination:size-change="handleReportSizeChange"
        @pagination:current-change="handleReportCurrentChange"
      />
    </ElCard>

    <!-- 发起评估弹窗：等待时显示执行状态 -->
    <ElDialog v-model="launchVisible" title="发起评估" width="560px" destroy-on-close>
      <ElForm ref="launchFormRef" :model="launchForm" :rules="launchRules" label-width="110px">
        <ElFormItem label="患者编号" prop="patientId">
          <ElInput v-model="launchForm.patientId" placeholder="系统患者编号 / 研究受试者编号" />
        </ElFormItem>
        <ElFormItem label="模型用途" prop="modelUsage">
          <ElSelect
            v-model="launchForm.modelUsage"
            class="w-full"
            placeholder="选择模型用途 / 名称"
          >
            <ElOption
              v-for="item in MODEL_OPTIONS"
              :key="item.usage"
              :label="item.name"
              :value="item.usage"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="模型版本">
          <ElInput :model-value="launchModel?.version ?? '—'" readonly />
        </ElFormItem>
        <ElFormItem label="输入完整性">
          <ElInput :model-value="inputCheckText" readonly />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="launchVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="launching" @click="submitLaunch">
          {{ launching ? '评估执行中…' : '确认提交' }}
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElTag,
    ElMessage,
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElSelect,
    ElOption
  } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { useRoute, useRouter } from 'vue-router'
  import { useTable } from '@/hooks/core/useTable'
  import { useUserStore } from '@/store/modules/user'
  import {
    fetchGetAssessmentReports,
    fetchLaunchAssessment,
    fetchCheckAssessmentInputs,
    MODEL_OPTIONS
  } from '@/mock/dli/blueprint/api'
  import type { AssessmentReport, AssessmentStage, ModelUsage } from '@/mock/dli/blueprint/types'

  defineOptions({ name: 'DliAssessmentReportList' })

  const props = defineProps<{ patientId?: string }>()
  const router = useRouter()
  const route = useRoute()
  const userStore = useUserStore()

  /** 医生可发起评估；记录意见 / 重新评估在报告详情页操作 [批注 05] */
  const isDoctor = computed(() => (userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR') === 'R_DOCTOR')
  const operatorName = computed(() => {
    const info = userStore.getUserInfo as { userName?: string; username?: string }
    return info.userName ?? info.username ?? '当前医生'
  })

  const STAGE_OPTIONS: AssessmentStage[] = ['治疗前', '治疗中', '诊断后']
  const USAGE_OPTIONS: ModelUsage[] = ['早筛预警', '早诊预警', '转归预测']

  const STAGE_TAG: Record<AssessmentStage, 'warning' | 'primary' | 'success'> = {
    治疗前: 'warning',
    治疗中: 'primary',
    诊断后: 'success'
  }

  /** 患者编号跳转患者详情，共用同一患者记录 [批注 02-1] */
  function goPatientDetail(row: AssessmentReport) {
    router.push({ name: 'DliPatientDetail', params: { id: row.patientId } })
  }

  /** 医生确认状态：已记录医生意见或终审确认 → 已确认 [批注 05] */
  const confirmStatus = (row: AssessmentReport): '已确认' | '待确认' =>
    row.status === '已确认' || row.opinion ? '已确认' : '待确认'

  /** 报告筛选：患者编号 / 评估阶段 / 模型用途 / 评估时间范围 / 医生确认状态 [批注 05] */
  const reportSearchItems = [
    {
      key: 'patientId',
      label: '患者编号',
      type: 'input',
      placeholder: '系统患者编号 / 研究受试者编号',
      // placeholder 需要约 196px 文字宽，默认 195px 会截断，单独放宽
      width: 220,
      span: 6
    },
    {
      key: 'stage',
      label: '评估阶段',
      type: 'select',
      placeholder: '全部阶段',
      options: STAGE_OPTIONS.map((item) => ({ label: item, value: item }))
    },
    {
      key: 'modelUsage',
      label: '模型用途',
      type: 'select',
      placeholder: '全部用途',
      options: USAGE_OPTIONS.map((item) => ({ label: item, value: item }))
    },
    {
      key: 'timeRange',
      label: '评估时间',
      type: 'daterange',
      props: { type: 'daterange', 'value-format': 'YYYY-MM-DD' },
      span: 6
    },
    {
      key: 'confirmStatus',
      label: '确认状态',
      type: 'select',
      placeholder: '全部状态',
      options: ['待确认', '已确认'].map((item) => ({ label: item, value: item }))
    }
  ]

  const {
    columns: reportColumns,
    columnChecks: reportColumnChecks,
    data: reportData,
    loading: reportLoading,
    pagination: reportPagination,
    searchParams: reportSearchParams,
    getData: getReportData,
    resetSearchParams: resetReportSearchParams,
    handleSizeChange: handleReportSizeChange,
    handleCurrentChange: handleReportCurrentChange,
    refreshData: refreshReportData
  } = useTable({
    core: {
      apiFn: fetchGetAssessmentReports,
      apiParams: {
        current: 1,
        size: 10,
        patientId: '',
        stage: '',
        modelUsage: '',
        timeRange: [] as string[],
        confirmStatus: ''
      },
      columnsFactory: () => [
        {
          prop: 'patientId',
          label: '患者编号',
          width: 150,
          formatter: (row: AssessmentReport) =>
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => goPatientDetail(row) },
              () => row.patientId
            )
        },
        {
          prop: 'stage',
          label: '评估阶段',
          width: 110,
          formatter: (row: AssessmentReport) =>
            h(ElTag, { effect: 'light', type: STAGE_TAG[row.stage] }, () => row.stage)
        },
        {
          prop: 'modelUsage',
          label: '模型用途',
          width: 110,
          formatter: (row: AssessmentReport) =>
            h(ElTag, { effect: 'plain', type: 'primary' }, () => row.modelUsage)
        },
        { prop: 'assessedAt', label: '评估时间', width: 170 },
        { prop: 'result', label: '结果摘要', minWidth: 200, showOverflowTooltip: true },
        { prop: 'modelVersion', label: '模型版本', width: 140 },
        {
          prop: 'confirmStatus',
          label: '医生确认状态',
          width: 120,
          align: 'center' as const,
          formatter: (row: AssessmentReport) =>
            h(
              ElTag,
              { effect: 'light', type: confirmStatus(row) === '已确认' ? 'success' : 'warning' },
              () => confirmStatus(row)
            )
        },
        {
          prop: 'operation',
          label: '操作',
          width: 120,
          fixed: 'right' as const,
          align: 'center' as const,
          // 记录意见 / 重新评估只在报告详情页操作，列表只保留查看入口
          formatter: (row: AssessmentReport) =>
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => openReportDetail(row) },
              () => '查看报告'
            )
        }
      ]
    }
  })

  function handleReportSearch() {
    getReportData()
  }

  function handleReportReset() {
    resetReportSearchParams()
  }

  /** 行内查看报告 → 完整报告详情页（顶部返回按钮）[批注 05] */
  function openReportDetail(row: AssessmentReport) {
    void router.push({ name: 'DliAssessmentReportDetail', params: { id: row.id } })
  }

  /* ---------------- 发起评估 [批注 05] ---------------- */
  const launchVisible = ref(false)
  const launching = ref(false)
  const launchFormRef = ref<FormInstance>()
  const launchForm = reactive({ patientId: '', modelUsage: '' as ModelUsage | '' })
  const inputCheckText = ref('请先填写患者编号与模型')
  const launchRules: FormRules = {
    patientId: [{ required: true, message: '请输入患者编号', trigger: 'blur' }],
    modelUsage: [{ required: true, message: '请选择模型', trigger: 'change' }]
  }
  const launchModel = computed(() =>
    MODEL_OPTIONS.find((item) => item.usage === launchForm.modelUsage)
  )

  function openLaunch(preset = '') {
    launchForm.patientId = preset
    launchForm.modelUsage = ''
    inputCheckText.value = '请先填写患者编号与模型'
    launchVisible.value = true
  }

  /** 选择患者与模型后只读刷新输入完整性 */
  watch(
    () => [launchForm.patientId, launchForm.modelUsage] as const,
    async ([patientId, usage]) => {
      if (!patientId.trim() || !usage) return
      const check = await fetchCheckAssessmentInputs(patientId, usage)
      inputCheckText.value = check.text
    }
  )

  async function submitLaunch() {
    if (!launchFormRef.value) return
    const valid = await launchFormRef.value.validate().catch(() => false)
    if (!valid) return
    launching.value = true
    try {
      const result = await fetchLaunchAssessment({
        patientId: launchForm.patientId.trim(),
        modelUsage: launchForm.modelUsage as ModelUsage,
        operator: operatorName.value
      })
      ElMessage.success(
        `评估任务已提交，${result.inputComplete}；新报告已进入列表（等待时显示执行状态）`
      )
      launchVisible.value = false
      await getReportData()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '提交失败，请稍后重试')
    } finally {
      launching.value = false
    }
  }

  /** 外部带入患者编号：写入筛选并查询；openManual=1 直接打开发起评估 [批注 02] */
  onMounted(() => {
    if (props.patientId) {
      reportSearchParams.patientId = props.patientId
    }
    if (
      typeof route.query.openManual === 'string' &&
      route.query.openManual === '1' &&
      isDoctor.value
    ) {
      openLaunch(props.patientId ?? '')
    }
    void getReportData()
  })

  defineExpose({ refresh: getReportData })
</script>
