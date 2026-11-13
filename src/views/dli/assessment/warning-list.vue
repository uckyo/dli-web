<!-- 评估预警 · 预警处理页签：列表 / 处理抽屉（触发依据 · 关联报告 · 跟进记录 · 双跳转）[批注 05] -->
<template>
  <div class="pt-3">
    <ArtSearchBar
      v-model="warningSearchParams"
      :items="warningSearchItems"
      @search="handleWarningSearch"
      @reset="handleWarningReset"
    />

    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader
        v-model:columns="warningColumnChecks"
        :loading="warningLoading"
        @refresh="refreshWarningData"
      />

      <ArtTable
        :loading="warningLoading"
        :data="warningData"
        :columns="warningColumns"
        :pagination="warningPagination"
        @pagination:size-change="handleWarningSizeChange"
        @pagination:current-change="handleWarningCurrentChange"
      />
    </ElCard>

    <!-- 行内处理抽屉：触发依据 / 关联报告 / 跟进记录 + 处理表单 + 双跳转 [批注 05] -->
    <ElDrawer v-model="handleVisible" title="预警处理" size="640px">
      <template v-if="activeWarning">
        <ElDescriptions :column="2" border class="mb-4" size="small">
          <ElDescriptionsItem label="患者编号">{{ activeWarning.patientId }}</ElDescriptionsItem>
          <ElDescriptionsItem label="预警等级">
            <ElTag size="small" :type="LEVEL_TAG[activeWarning.level]" effect="light">
              {{ activeWarning.level }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="预警原因" :span="2">
            {{ activeWarning.trigger }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="发生时间">{{ activeWarning.createdAt }}</ElDescriptionsItem>
          <ElDescriptionsItem label="负责医生">{{
            activeWarning.doctor || '—'
          }}</ElDescriptionsItem>
        </ElDescriptions>

        <div class="dli-w-title">触发依据</div>
        <div class="dli-w-block">
          {{
            activeWarning.sourceVerified
              ? activeWarning.trigger
              : '识别结果尚未核对，核对后才能用于评估与处置 [批注 03-3]'
          }}
        </div>

        <div class="dli-w-title">关联报告</div>
        <div class="dli-w-block dli-w-flex">
          <template v-if="activeWarning.relatedReportId">
            <ElButton link type="primary" @click="goRelatedReport(activeWarning.relatedReportId)">
              {{ activeWarning.relatedReportId }}
            </ElButton>
            <span class="text-xs text-g-500">点击进入完整报告详情页</span>
          </template>
          <span v-else class="text-sm text-g-500">暂无关联报告</span>
        </div>

        <div class="dli-w-title">跟进记录</div>
        <ElTimeline v-if="activeWarning.records.length" class="mb-4">
          <ElTimelineItem
            v-for="item in activeWarning.records"
            :key="item.id"
            :timestamp="item.createdAt"
            placement="top"
          >
            <div class="rounded-lg border border-full-d bg-g-100/60 px-3 py-2">
              <div class="flex-cb gap-2">
                <span class="text-sm text-g-900">{{ item.action }}</span>
                <ElTag size="small" effect="plain">{{ item.role }}</ElTag>
              </div>
              <p class="mt-1 text-xs text-g-500">操作人：{{ item.operator }}</p>
            </div>
          </ElTimelineItem>
        </ElTimeline>
        <p v-else class="mb-4 text-sm text-g-500">暂无跟进记录</p>

        <!-- 处理表单：医生填处理意见 / 处理结果 [批注 05] -->
        <template v-if="isDoctor">
          <div class="dli-w-title">处理意见与结果</div>
          <ElForm ref="handleFormRef" :model="handleForm" :rules="handleRules" label-width="90px">
            <ElFormItem label="处理意见" prop="note">
              <ElInput
                v-model="handleForm.note"
                type="textarea"
                :rows="2"
                placeholder="例如：风险可控，维持原方案并加强观察"
              />
            </ElFormItem>
            <ElFormItem label="处理结果" prop="result">
              <ElInput
                v-model="handleForm.result"
                type="textarea"
                :rows="2"
                placeholder="例如：已处理：维持方案，2 周后复评"
              />
            </ElFormItem>
          </ElForm>
          <div class="mt-2 flex justify-end">
            <ElButton type="primary" :loading="handling" @click="submitHandle"
              >医生确认处置</ElButton
            >
          </div>
          <p class="mt-2 text-xs text-g-500">预警处理不代表患者任务完成</p>
        </template>
        <p v-else class="text-xs text-g-500">助理 / 护士可按授权补跟进记录，医生确认处置</p>
      </template>

      <!-- 双跳转：制定管理计划 → 患者详情管理计划页签；安排随访 → 随访计划 [批注 05] -->
      <template #footer>
        <template v-if="activeWarning">
          <ElButton @click="goManagementPlan(activeWarning)">制定管理计划</ElButton>
          <ElButton @click="goFollowupPlan(activeWarning)">安排随访</ElButton>
        </template>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElTag,
    ElMessage,
    ElMessageBox,
    ElDrawer,
    ElDescriptions,
    ElDescriptionsItem,
    ElTimeline,
    ElTimelineItem,
    ElForm,
    ElFormItem,
    ElInput
  } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { useRouter } from 'vue-router'
  import { useTable } from '@/hooks/core/useTable'
  import { useUserStore } from '@/store/modules/user'
  import {
    fetchGetWarningTickets,
    fetchHandleWarning,
    fetchRecordWarningFollowup
  } from '@/mock/dli/blueprint/api'
  import type { WarningStatus, WarningTicket } from '@/mock/dli/blueprint/types'

  defineOptions({ name: 'DliAssessmentWarningList' })

  const props = defineProps<{ patientId?: string }>()
  const router = useRouter()
  const userStore = useUserStore()

  /** 医生确认处置，助理 / 护士按授权补跟进记录 [批注 05] */
  const isDoctor = computed(() => (userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR') === 'R_DOCTOR')
  const operatorName = computed(() => {
    const info = userStore.getUserInfo as { userName?: string; username?: string }
    return info.userName ?? info.username ?? '当前医护'
  })

  const WARNING_STATUS_OPTIONS: WarningStatus[] = ['待处理', '处理中', '已处理']
  const LEVEL_OPTIONS: WarningTicket['level'][] = ['高', '中', '低']

  const WARNING_STATUS_TAG: Record<WarningStatus, 'warning' | 'primary' | 'success'> = {
    待处理: 'warning',
    处理中: 'primary',
    已处理: 'success'
  }
  const LEVEL_TAG: Record<WarningTicket['level'], 'danger' | 'warning' | 'info'> = {
    高: 'danger',
    中: 'warning',
    低: 'info'
  }

  /** 预警筛选：患者编号 / 等级 / 发生时间范围 / 处理状态 [批注 05] */
  const warningSearchItems = [
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
      key: 'level',
      label: '预警等级',
      type: 'select',
      placeholder: '全部等级',
      options: LEVEL_OPTIONS.map((item) => ({ label: item, value: item }))
    },
    {
      key: 'timeRange',
      label: '发生时间',
      type: 'daterange',
      props: { type: 'daterange', 'value-format': 'YYYY-MM-DD' },
      span: 6
    },
    {
      key: 'status',
      label: '处理状态',
      type: 'select',
      placeholder: '全部状态',
      options: WARNING_STATUS_OPTIONS.map((item) => ({ label: item, value: item }))
    }
  ]

  const {
    columns: warningColumns,
    columnChecks: warningColumnChecks,
    data: warningData,
    loading: warningLoading,
    pagination: warningPagination,
    searchParams: warningSearchParams,
    getData: getWarningData,
    resetSearchParams: resetWarningSearchParams,
    handleSizeChange: handleWarningSizeChange,
    handleCurrentChange: handleWarningCurrentChange,
    refreshData: refreshWarningData
  } = useTable({
    core: {
      apiFn: fetchGetWarningTickets,
      apiParams: {
        current: 1,
        size: 10,
        patientId: '',
        level: '',
        timeRange: [] as string[],
        status: ''
      },
      columnsFactory: () => [
        {
          prop: 'patientId',
          label: '患者编号',
          width: 150,
          formatter: (row: WarningTicket) =>
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => goPatientDetail(row) },
              () => row.patientId
            )
        },
        { prop: 'trigger', label: '预警原因', minWidth: 200, showOverflowTooltip: true },
        {
          prop: 'level',
          label: '预警等级',
          width: 100,
          formatter: (row: WarningTicket) =>
            h(ElTag, { effect: 'light', type: LEVEL_TAG[row.level] }, () => row.level)
        },
        { prop: 'createdAt', label: '发生时间', width: 170 },
        { prop: 'doctor', label: '负责医生', width: 110 },
        {
          prop: 'status',
          label: '处理状态',
          width: 100,
          formatter: (row: WarningTicket) =>
            h(ElTag, { effect: 'light', type: WARNING_STATUS_TAG[row.status] }, () => row.status)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 130,
          fixed: 'right' as const,
          align: 'center' as const,
          formatter: (row: WarningTicket) =>
            h('div', { class: 'flex-c justify-center gap-1' }, [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openHandle(row) },
                () => '处理'
              ),
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => recordFollowup(row) },
                () => '跟进事项'
              )
            ])
        }
      ]
    }
  })

  function handleWarningSearch() {
    getWarningData()
  }

  function handleWarningReset() {
    resetWarningSearchParams()
  }

  function goPatientDetail(row: WarningTicket) {
    router.push({ name: 'DliPatientDetail', params: { id: row.patientId } })
  }

  /* ---------------- 处理抽屉 [批注 05] ---------------- */
  const handleVisible = ref(false)
  const handling = ref(false)
  const activeWarning = ref<WarningTicket>()
  const handleFormRef = ref<FormInstance>()
  const handleForm = reactive({ note: '', result: '' })
  const handleRules: FormRules = {
    note: [{ required: true, message: '请输入处理意见', trigger: 'blur' }],
    result: [{ required: true, message: '请输入处理结果', trigger: 'blur' }]
  }

  function openHandle(row: WarningTicket) {
    activeWarning.value = row
    handleForm.note = row.handleNote ?? ''
    handleForm.result = row.status === '已处理' ? (row.handleResult ?? '') : ''
    handleVisible.value = true
  }

  async function submitHandle() {
    if (!handleFormRef.value || !activeWarning.value) return
    const valid = await handleFormRef.value.validate().catch(() => false)
    if (!valid) return
    handling.value = true
    try {
      await fetchHandleWarning(activeWarning.value.id, {
        note: handleForm.note,
        result: handleForm.result,
        operator: operatorName.value
      })
      ElMessage.success('已确认处置并刷新列表')
      handleVisible.value = false
      await refreshWarningData()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '处理失败')
    } finally {
      handling.value = false
    }
  }

  /** 助理 / 护士按授权补跟进记录 [批注 05] */
  async function recordFollowup(row: WarningTicket) {
    const promptResult = await ElMessageBox.prompt('请输入跟进事项内容', '记录跟进事项', {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：已联系患者，预约复查',
      inputValidator: (value: string) => (value && value.trim() ? true : '跟进事项不能为空')
    }).catch(() => null)
    const action = promptResult?.value?.trim()
    if (!action) return
    await fetchRecordWarningFollowup(row.id, action)
    ElMessage.success('跟进事项已记录')
    await refreshWarningData()
  }

  /** 关联报告 → 完整报告详情页 [批注 05] */
  function goRelatedReport(reportId: string) {
    handleVisible.value = false
    void router.push({ name: 'DliAssessmentReportDetail', params: { id: reportId } })
  }

  /** 制定管理计划 → 该患者详情的管理计划页签 [批注 05] */
  function goManagementPlan(row: WarningTicket) {
    handleVisible.value = false
    void router.push({
      name: 'DliPatientDetail',
      params: { id: row.patientId },
      query: { tab: 'plan' }
    })
  }

  /** 安排随访 → 随访计划页（批注 10）[批注 05] */
  function goFollowupPlan(row: WarningTicket) {
    handleVisible.value = false
    void router.push({ name: 'DliFollowup', query: { patientId: row.patientId } })
  }

  onMounted(() => {
    if (props.patientId) warningSearchParams.patientId = props.patientId
    void getWarningData()
  })

  defineExpose({ refresh: getWarningData })
</script>

<style lang="scss" scoped>
  .dli-w-title {
    margin: 14px 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--art-gray-800);
  }

  .dli-w-block {
    padding: 10px 12px;
    font-size: 13px;
    color: var(--art-gray-700);
    background: var(--art-gray-100);
    border-radius: 6px;
  }

  .dli-w-flex {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
</style>
