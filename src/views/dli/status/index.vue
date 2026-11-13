<!-- DLI 状态管理：页内「自动化配置 / 执行记录」双页签 [批注 09] -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <ElCard class="art-table-card dli-tab-card" shadow="never">
      <ElTabs v-model="activeTab" class="dli-tabs">
        <!-- 页签一：自动化配置（原三组开关与保存按钮） [批注 09] -->
        <ElTabPane label="自动化配置" name="config">
          <div v-loading="loading" class="pt-4">
            <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <div v-for="group in GROUPS" :key="group.name" class="art-card px-5 py-4">
                <div class="mb-3 flex-c gap-2">
                  <span class="size-9 flex-cc rounded-lg bg-primary/10 text-primary">
                    <ArtSvgIcon :icon="group.icon" />
                  </span>
                  <div>
                    <p class="font-medium text-g-900">{{ group.title }}</p>
                    <p class="text-xs text-g-500">{{ group.desc }}</p>
                  </div>
                </div>

                <div class="space-y-3">
                  <div
                    v-for="item in group.items"
                    :key="item.key"
                    class="rounded-lg border border-full-d px-3 py-3"
                  >
                    <div class="flex-cb gap-3">
                      <span class="text-sm font-medium text-g-800">{{ item.label }}</span>
                      <!-- 配置开关只给明确获授权医生等现有角色 [批注 09] -->
                      <ElSwitch
                        v-model="item.enabled"
                        :disabled="!canConfigure"
                        @change="handleToggle(item)"
                      />
                    </div>
                    <p class="mt-1 text-xs leading-5 text-g-500">{{ item.description }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-4 flex-c gap-2">
              <ElButton v-if="canConfigure" type="primary" @click="saveConfig">保存配置</ElButton>
              <p v-else class="text-xs text-g-500">
                助理／护士不默认保存医学规则，配置开关仅对获授权医生开放
              </p>
            </div>
          </div>
        </ElTabPane>

        <!-- 页签二：执行记录（点开才显示任务表） [批注 09] -->
        <ElTabPane label="执行记录" name="tasks" lazy>
          <div class="pt-3">
            <ArtSearchBar
              v-model="taskSearchParams"
              :items="taskSearchItems"
              @search="getTaskData"
              @reset="resetTaskSearchParams"
            />

            <ElCard class="art-table-card" shadow="never">
              <ArtTableHeader
                v-model:columns="taskColumnChecks"
                :loading="taskLoading"
                @refresh="refreshTaskData"
              />

              <ArtTable
                :loading="taskLoading"
                :data="taskData"
                :columns="taskColumns"
                :pagination="taskPagination"
                @pagination:size-change="handleTaskSizeChange"
                @pagination:current-change="handleTaskCurrentChange"
              />
            </ElCard>
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

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
        <div class="mt-4 flex-c gap-2">
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
          <ElButton @click="goSource(activeTask)">查看来源</ElButton>
        </div>
        <p class="mt-2 text-xs text-g-500"> 同一记录在现有诊疗历程中也能查看，复用同一执行记录 </p>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElCard,
    ElDrawer,
    ElDescriptions,
    ElDescriptionsItem,
    ElMessage,
    ElSwitch,
    ElTabPane,
    ElTabs,
    ElTable,
    ElTableColumn,
    ElTag
  } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { useUserStore } from '@/store/modules/user'
  import {
    fetchGetAutomation,
    fetchGetAutomationTasks,
    fetchRerunAutomationTask,
    fetchSupplementAutomationTask
  } from '@/mock/dli/api'
  import type {
    AutomationItem,
    AutomationTask,
    AutomationTaskStatus,
    AutomationTaskType
  } from '@/mock/dli/types'

  defineOptions({ name: 'DliStatus' })

  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()

  /** 配置开关只给明确获授权医生等现有角色 [批注 09] */
  const isDoctor = computed(() => (userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR') === 'R_DOCTOR')
  const canConfigure = isDoctor
  const operatorName = computed(() => {
    const info = userStore.getUserInfo as { userName?: string; username?: string }
    return info.userName ?? info.username ?? '当前医生'
  })

  const activeTab = ref('config')
  watch(
    () => route.query.tab,
    (tab) => {
      if (tab === 'tasks') activeTab.value = 'tasks'
      else if (tab === 'config') activeTab.value = 'config'
    },
    { immediate: true }
  )

  /* ---------------- 页签一：自动化配置 ---------------- */
  interface AutoGroup {
    name: 'patient' | 'exam' | 'followup'
    title: string
    desc: string
    icon: string
    items: AutomationItem[]
  }

  const GROUPS: AutoGroup[] = reactive([
    {
      name: 'patient',
      title: '患者自动化',
      desc: '候选队列、建档与早筛触发',
      icon: 'ri:user-heart-line',
      items: []
    },
    {
      name: 'exam',
      title: '检查自动化',
      desc: '采集、解析与异常提示',
      icon: 'ri:file-search-line',
      items: []
    },
    {
      name: 'followup',
      title: '智能随访',
      desc: '草稿生成、提醒与失访升级',
      icon: 'ri:calendar-check-line',
      items: []
    }
  ])

  const loading = ref(true)

  function handleToggle(item: AutomationItem) {
    ElMessage.success(`「${item.label}」已${item.enabled ? '开启' : '关闭'}`)
  }

  function saveConfig() {
    const enabled = GROUPS.reduce(
      (count, group) => count + group.items.filter((item) => item.enabled).length,
      0
    )
    ElMessage.success(`已保存配置，当前启用 ${enabled} 项自动化规则`)
  }

  /* ---------------- 页签二：执行记录 [批注 09] ---------------- */
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
    columnChecks: taskColumnChecks,
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
        status: ''
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
            h(ElTag, { effect: 'plain', size: 'small' }, () => row.triggerSource)
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
      ElMessage.success('资料已补充，任务重新进入执行队列')
      detailVisible.value = false
      await refreshTaskData()
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

  /** 补充资料跳原检查或患者记录 [批注 09] */
  function goSource(row: AutomationTask) {
    detailVisible.value = false
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

  onMounted(async () => {
    try {
      const data = await fetchGetAutomation()
      GROUPS[0].items = data.patient
      GROUPS[1].items = data.exam
      GROUPS[2].items = data.followup
    } finally {
      loading.value = false
    }
  })
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
