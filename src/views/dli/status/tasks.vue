<!-- DLI 状态管理 · 执行记录：由原页签改为左侧子菜单入口 [批注 09] -->
<template>
  <div class="art-full-height">
    <ArtListControls>
      <ArtSearchBar
        v-model="taskSearchParams"
        :items="taskSearchItems"
        @search="getTaskData"
        @reset="resetTaskSearchParams"
      />
    </ArtListControls>

    <ArtTable
      list-layout
      :loading="taskLoading"
      :data="taskData"
      :columns="taskColumns"
      :pagination="taskPagination"
      @pagination:size-change="handleTaskSizeChange"
      @pagination:current-change="handleTaskCurrentChange"
    />

    <!-- 查看记录抽屉：来源记录 / 输入资料 / 模型·规则版本 / 关联结果，不另开详情页 [批注 09] -->
    <ElDrawer v-model="detailVisible" title="执行记录" size="600px">
      <template v-if="activeTask">
        <ElDescriptions :column="2" border class="mb-4" size="small">
          <ElDescriptionsItem label="任务编号">{{ activeTask.id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="患者编号">{{ activeTask.patientId }}</ElDescriptionsItem>
          <ElDescriptionsItem label="任务类型">{{ activeTask.type }}</ElDescriptionsItem>
          <ElDescriptionsItem label="触发时间">{{ activeTask.triggeredAt }}</ElDescriptionsItem>
          <ElDescriptionsItem label="触发来源">
            <ElTag size="small" effect="plain">{{ activeTask.triggerSource }}</ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="执行状态">
            <ElTag size="small" :type="STATUS_TAG[activeTask.status]" effect="light">
              {{ activeTask.status }}
            </ElTag>
          </ElDescriptionsItem>
        </ElDescriptions>

        <div class="dli-s-title">来源记录</div>
        <div class="dli-s-block">{{ activeTask.sourceRecord }}</div>

        <div class="dli-s-title">输入资料</div>
        <ElTable :data="tableOf(activeTask.inputs)" border size="small" class="mb-1">
          <ElTableColumn prop="text" label="资料项" />
        </ElTable>

        <div class="dli-s-title">模型／规则版本</div>
        <div class="dli-s-block">{{ activeTask.modelVersion }}</div>

        <div class="dli-s-title">关联结果</div>
        <div class="dli-s-block">
          {{ activeTask.relatedResult || '—' }}
          <ElButton
            v-if="activeTask.relatedReportId"
            link
            type="primary"
            class="ml-2"
            @click="goRelatedReport(activeTask.relatedReportId)"
          >
            查看报告 {{ activeTask.relatedReportId }}
          </ElButton>
        </div>

        <div v-if="activeTask.note" class="dli-s-title">失败／缺项说明</div>
        <div v-if="activeTask.note" class="dli-s-block dli-s-warn">{{ activeTask.note }}</div>

        <!-- 抽屉操作 [批注 09] -->
        <div class="mt-4 flex-c gap-2 flex-wrap">
          <ElButton
            v-if="activeTask.status === '待补资料'"
            type="primary"
            @click="supplementTask(activeTask)"
          >
            补充资料
          </ElButton>
          <ElButton
            v-if="
              isDoctor && (activeTask.status === '执行失败' || activeTask.status === '待补资料')
            "
            type="primary"
            plain
            @click="rerunTask(activeTask)"
          >
            确认重新评估
          </ElButton>
          <ElButton
            v-if="
              isSystemAdmin && activeTask.type === '资料同步' && activeTask.status === '执行失败'
            "
            type="warning"
            plain
            @click="resolveTask(activeTask)"
          >
            处理接口运行
          </ElButton>
          <ElButton @click="goSource(activeTask)">查看来源</ElButton>
        </div>
        <p class="mt-2 text-xs leading-5 text-g-500">
          数据经患者匹配、核对、必需输入和组别规则检查后触发；同一来源记录版本不重复调用。缺资料不会显示为低风险，同一记录在诊疗历程中复用展示。
        </p>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import ArtListControls from '@/components/core/tables/art-list-controls/index.vue'
  import {
    ElButton,
    ElDrawer,
    ElDescriptions,
    ElDescriptionsItem,
    ElMessage,
    ElTable,
    ElTableColumn,
    ElTag
  } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { useUserStore } from '@/store/modules/user'
  import {
    fetchGetAutomationTasks,
    fetchResolveAutomationTask,
    fetchRerunAutomationTask,
    fetchSupplementAutomationTask
  } from '@/mock/dli/api'
  import type { AutomationTask, AutomationTaskStatus, AutomationTaskType } from '@/mock/dli/types'

  defineOptions({ name: 'DliStatusTasks' })

  const router = useRouter()
  const userStore = useUserStore()

  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const isDoctor = computed(() => role.value === 'R_DOCTOR')
  const isSystemAdmin = computed(() => role.value === 'R_SYS')
  const operatorName = computed(() => {
    const info = userStore.getUserInfo as { userName?: string; username?: string }
    return info.userName ?? info.username ?? '当前医生'
  })

  const STATUS_TAG: Record<
    AutomationTaskStatus,
    'info' | 'primary' | 'success' | 'danger' | 'warning'
  > = {
    待执行: 'info',
    执行中: 'primary',
    执行成功: 'success',
    执行失败: 'danger',
    待补资料: 'warning'
  }
  const TYPE_OPTIONS: AutomationTaskType[] = ['资料同步', '识别解析', '模型评估', '随访草稿生成']
  const STATUS_OPTIONS: AutomationTaskStatus[] = [
    '待执行',
    '执行中',
    '执行成功',
    '执行失败',
    '待补资料'
  ]

  const taskSearchItems = [
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
      key: 'type',
      label: '任务类型',
      type: 'select',
      placeholder: '全部类型',
      options: TYPE_OPTIONS.map((item) => ({ label: item, value: item }))
    },
    {
      key: 'timeRange',
      label: '触发时间',
      type: 'daterange',
      props: { type: 'daterange', 'value-format': 'YYYY-MM-DD' },
      span: 6
    },
    {
      key: 'status',
      label: '执行状态',
      type: 'select',
      placeholder: '全部状态',
      options: STATUS_OPTIONS.map((item) => ({ label: item, value: item }))
    }
  ]

  const {
    columns: taskColumns,
    data: taskData,
    loading: taskLoading,
    pagination: taskPagination,
    searchParams: taskSearchParams,
    getData: getTaskData,
    resetSearchParams: resetTaskSearchParams,
    handleSizeChange: handleTaskSizeChange,
    handleCurrentChange: handleTaskCurrentChange,
    refreshData: refreshTaskData
  } = useTable({
    core: {
      apiFn: fetchGetAutomationTasks,
      apiParams: {
        patientId: '',
        type: '',
        timeRange: [] as string[],
        status: '',
        role: role.value,
        operator: operatorName.value
      },
      columnsFactory: () => [
        { prop: 'id', label: '任务编号', width: 110 },
        { prop: 'patientId', label: '患者编号', width: 140 },
        { prop: 'type', label: '任务类型', width: 110 },
        { prop: 'triggeredAt', label: '触发时间', width: 160 },
        {
          prop: 'triggerSource',
          label: '触发来源',
          width: 90,
          align: 'center' as const,
          formatter: (row: AutomationTask) =>
            h(ElTag, { effect: 'light', size: 'small' }, () => row.triggerSource)
        },
        {
          prop: 'status',
          label: '执行状态',
          width: 100,
          align: 'center' as const,
          formatter: (row: AutomationTask) =>
            h(ElTag, { effect: 'light', type: STATUS_TAG[row.status] }, () => row.status)
        },
        {
          prop: 'note',
          label: '失败／缺项说明',
          minWidth: 200,
          showOverflowTooltip: true,
          align: 'center' as const,
          formatter: (row: AutomationTask) => row.note || '—'
        },
        {
          prop: 'operation',
          label: '操作',
          width: 100,
          fixed: 'right' as const,
          align: 'center' as const,
          formatter: (row: AutomationTask) =>
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => openDetail(row) },
              () => '查看记录'
            )
        }
      ]
    }
  })

  /** 查看记录抽屉 */
  const detailVisible = ref(false)
  const activeTask = ref<AutomationTask>()

  function openDetail(row: AutomationTask) {
    activeTask.value = row
    detailVisible.value = true
  }

  function tableOf(list: string[] | undefined) {
    return (list ?? []).map((text) => ({ text }))
  }

  /** 补充资料：关闭抽屉并跳原检查或患者记录 [批注 09] */
  async function supplementTask(row: AutomationTask) {
    try {
      await fetchSupplementAutomationTask(row.id)
      ElMessage.success('已记录资料补充，正在跳转原检查或患者记录')
      detailVisible.value = false
      await refreshTaskData()
      navigateToSource(row)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  /** 医生确认重新评估 [批注 09] */
  async function rerunTask(row: AutomationTask) {
    try {
      await fetchRerunAutomationTask(row.id, operatorName.value)
      ElMessage.success('已确认重新评估，任务进入执行中')
      await refreshTaskData()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  /** 系统管理员处理同步 / 接口运行故障 */
  async function resolveTask(row: AutomationTask) {
    try {
      await fetchResolveAutomationTask(row.id, role.value, operatorName.value)
      ElMessage.success('接口运行故障已记录，任务重新进入待执行')
      await refreshTaskData()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  /** 补充资料跳原检查或患者记录 [批注 09] */
  function goSource(row: AutomationTask) {
    detailVisible.value = false
    navigateToSource(row)
  }

  function navigateToSource(row: AutomationTask) {
    const examRelated = /检查|报告|解析|PACS|LIS|EX-|影像|检验/.test(row.sourceRecord)
    if (examRelated) {
      void router.push({ name: 'DliExam', query: { patientId: row.patientId } })
      return
    }
    void router.push({
      name: 'DliPatientDetail',
      params: { id: row.patientId },
      query: { tab: 'exam' }
    })
  }

  /** 查看报告进入批注 05 对应报告 [批注 09] */
  function goRelatedReport(reportId: string) {
    detailVisible.value = false
    void router.push({ name: 'DliAssessmentReportDetail', params: { id: reportId } })
  }
</script>

<style lang="scss" scoped>
  .dli-s-title {
    margin: 14px 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--art-gray-800);
  }

  .dli-s-block {
    padding: 10px 12px;
    font-size: 13px;
    color: var(--art-gray-700);
    background: var(--art-gray-100);
    border-radius: 6px;
  }

  .dli-s-warn {
    color: var(--el-color-danger);
  }
</style>
