<!-- DLI 随访计划：模板配置 / 计划下发与回收 / 完成率看板 -->
<template>
  <div class="followup-page art-full-height">
    <!-- 完成率看板 -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 shrink-0">
      <ArtStatsCard
        title="随访模板数"
        :count="templates.length"
        description="已配置的随访方案模板"
        icon="ri:file-list-3-line"
        icon-style="bg-primary"
      />
      <ArtStatsCard
        title="随访计划总数"
        :count="planTotal"
        description="全部已创建的随访计划"
        icon="ri:calendar-todo-line"
        icon-style="bg-primary"
      />
      <ArtStatsCard
        title="进行中计划数"
        :count="recyclingCount"
        description="回收中、待完成任务"
        icon="ri:loop-left-line"
        icon-style="bg-warning"
      />
      <ArtStatsCard
        title="逾期任务数"
        :count="overdueTaskCount"
        description="需尽快催办的任务"
        icon="ri:alarm-warning-line"
        icon-style="bg-danger"
      />
    </div>

    <ElCard class="art-table-card">
      <ElTabs v-model="activeTab" class="followup-tabs">
        <!-- 随访模板 -->
        <ElTabPane label="随访模板" name="template">
          <div v-loading="statsLoading" class="h-full overflow-y-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-2">
              <div v-for="tpl in templates" :key="tpl.id" class="art-card p-4 flex flex-col">
                <div class="flex-cb gap-2">
                  <h4 class="text-base font-medium text-g-900 truncate">{{ tpl.name }}</h4>
                  <ElTag type="primary" size="small">{{ tpl.timePoint }}</ElTag>
                </div>
                <p class="mt-2 text-sm leading-6 text-g-600">{{ tpl.description }}</p>
                <div class="mt-3 flex flex-wrap content-start gap-2 flex-1">
                  <ElTag
                    v-for="item in tpl.items"
                    :key="item.name"
                    :type="TEMPLATE_ITEM_TAG[item.type]"
                    effect="plain"
                    size="small"
                  >
                    {{ item.name }}
                  </ElTag>
                </div>
                <div class="mt-4 pt-3 border-t border-full-d flex-cb">
                  <span class="text-sm" :class="tpl.enabled ? 'text-success' : 'text-g-500'">
                    {{ tpl.enabled ? '启用中' : '已停用' }}
                  </span>
                  <ElButton link type="primary" @click="editTemplate">编辑</ElButton>
                </div>
              </div>
            </div>
          </div>
        </ElTabPane>

        <!-- 随访计划 -->
        <ElTabPane label="随访计划" name="plan">
          <div class="flex flex-col h-full">
            <ArtSearchBar
              v-model="searchForm"
              :items="searchItems"
              class="shrink-0"
              @search="handleSearch"
              @reset="resetSearchParams"
            />
            <div class="flex-1 min-h-0 pt-2">
              <ArtTableHeader :loading="loading" layout="refresh" @refresh="refreshData">
                <template #left>
                  <span class="text-sm text-g-600">
                    共 <span class="font-medium text-g-900">{{ pagination.total }}</span> 个计划
                  </span>
                </template>
              </ArtTableHeader>
              <ArtTable
                :loading="loading"
                :data="data"
                :columns="columns"
                :pagination="pagination"
                @pagination:size-change="handleSizeChange"
                @pagination:current-change="handleCurrentChange"
              />
            </div>
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <!-- 任务明细抽屉 -->
    <ElDrawer v-model="drawerVisible" title="随访任务明细" size="500px">
      <template v-if="currentPlan">
        <div class="art-card p-4 flex flex-col gap-2.5">
          <div class="flex-cb text-sm">
            <span class="text-g-500">计划编号</span>
            <span class="text-g-900">{{ currentPlan.id }}</span>
          </div>
          <div class="flex-cb text-sm">
            <span class="text-g-500">患者</span>
            <span class="text-g-900">{{ currentPlan.patientName }}</span>
          </div>
          <div class="flex-cb text-sm">
            <span class="text-g-500">随访模板</span>
            <span class="text-g-900">{{ currentPlan.templateName }}</span>
          </div>
          <div class="flex-cb text-sm">
            <span class="text-g-500">随访周期</span>
            <span class="text-g-900">{{ currentPlan.startTime }} ~ {{ currentPlan.endTime }}</span>
          </div>
          <div class="flex-cb text-sm">
            <span class="text-g-500">执行进度</span>
            <ElProgress :percentage="currentPlan.progress" :stroke-width="8" class="w-40" />
          </div>
        </div>

        <h4 class="mt-5 mb-3 text-sm font-medium text-g-900">
          任务列表（共 {{ currentPlan.tasks.length }} 项）
        </h4>
        <div class="flex flex-col gap-3">
          <div v-for="task in currentPlan.tasks" :key="task.id" class="art-card p-3">
            <div class="flex-cb gap-2">
              <span class="text-sm font-medium text-g-900">{{ task.itemName }}</span>
              <ElTag :type="TASK_STATUS_CONFIG[task.status].tagType" size="small">
                {{ TASK_STATUS_CONFIG[task.status].label }}
              </ElTag>
            </div>
            <p
              class="mt-1 text-xs"
              :class="task.status === 'overdue' ? 'text-danger' : 'text-g-500'"
            >
              截止 {{ task.dueDate }}
            </p>
            <p v-if="task.result" class="mt-2 text-sm text-g-600">结果：{{ task.result }}</p>
          </div>
        </div>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import {
    fetchGetFollowupPlans,
    fetchGetFollowupTemplates,
    fetchPublishFollowupPlan
  } from '@/mock/dli/api'
  import type { FollowupPlan, FollowupTask, FollowupTemplate } from '@/mock/dli/types'
  import { ElButton, ElMessageBox, ElProgress, ElTag } from 'element-plus'

  defineOptions({ name: 'DliFollowup' })

  type TagType = 'success' | 'warning' | 'info' | 'danger' | 'primary'

  /** 随访计划搜索表单 */
  type FollowupSearchForm = {
    keyword?: string
    status?: string
  }

  /** 随访计划状态展示配置 */
  const PLAN_STATUS_CONFIG: Record<FollowupPlan['status'], { label: string; tagType: TagType }> = {
    draft: { label: '草稿', tagType: 'info' },
    published: { label: '已下发', tagType: 'primary' },
    recycling: { label: '回收中', tagType: 'warning' },
    finished: { label: '已完成', tagType: 'success' }
  }

  /** 随访任务状态展示配置 */
  const TASK_STATUS_CONFIG: Record<FollowupTask['status'], { label: string; tagType: TagType }> = {
    pending: { label: '待完成', tagType: 'info' },
    done: { label: '已完成', tagType: 'success' },
    overdue: { label: '已逾期', tagType: 'danger' }
  }

  /** 模板项目类型标签配置 */
  const TEMPLATE_ITEM_TAG: Record<FollowupTemplate['items'][number]['type'], TagType> = {
    exam: 'primary',
    lab: 'success',
    questionnaire: 'warning'
  }

  const activeTab = ref('template')

  // 统计看板数据
  const statsLoading = ref(true)
  const templates = ref<FollowupTemplate[]>([])
  const allPlans = ref<FollowupPlan[]>([])
  const planTotal = ref(0)

  const recyclingCount = computed(
    () => allPlans.value.filter((plan) => plan.status === 'recycling').length
  )

  const overdueTaskCount = computed(() =>
    allPlans.value.reduce(
      (sum, plan) => sum + plan.tasks.filter((task) => task.status === 'overdue').length,
      0
    )
  )

  // 搜索表单
  const searchForm = ref<FollowupSearchForm>({
    keyword: undefined,
    status: undefined
  })

  const searchItems = computed(() => [
    {
      label: '关键词',
      key: 'keyword',
      type: 'input',
      placeholder: '姓名 / 编号 / 模板名称',
      clearable: true
    },
    {
      label: '计划状态',
      key: 'status',
      type: 'select',
      props: {
        placeholder: '请选择计划状态',
        clearable: true,
        options: Object.entries(PLAN_STATUS_CONFIG).map(([value, item]) => ({
          label: item.label,
          value
        }))
      }
    }
  ])

  // 任务抽屉
  const drawerVisible = ref(false)
  const currentPlan = ref<FollowupPlan>()

  const {
    columns,
    data,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: fetchGetFollowupPlans,
      apiParams: {
        current: 1,
        size: 10,
        ...searchForm.value
      },
      columnsFactory: () => [
        {
          prop: 'id',
          label: '计划编号 / 患者',
          minWidth: 190,
          formatter: (row) =>
            h('div', [
              h('p', { class: 'font-medium text-g-900' }, row.id),
              h('p', { class: 'mt-0.5 text-xs text-g-500' }, row.patientName)
            ])
        },
        {
          prop: 'templateName',
          label: '模板名称',
          minWidth: 170,
          showOverflowTooltip: true
        },
        {
          prop: 'startTime',
          label: '起止时间',
          minWidth: 200,
          formatter: (row) => `${row.startTime} ~ ${row.endTime}`
        },
        {
          prop: 'tasks',
          label: '任务数',
          width: 90,
          formatter: (row) => `${row.tasks.length} 项`
        },
        {
          prop: 'progress',
          label: '执行进度',
          minWidth: 180,
          formatter: (row) =>
            h('div', { class: 'flex-c gap-2' }, [
              h(ElProgress, {
                percentage: row.progress,
                strokeWidth: 8,
                showText: false,
                class: 'flex-1 min-w-16'
              }),
              h('span', { class: 'w-9 shrink-0 text-xs text-g-600' }, `${row.progress}%`)
            ])
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row) => {
            const config = PLAN_STATUS_CONFIG[row.status]
            return h(ElTag, { type: config.tagType }, () => config.label)
          }
        },
        {
          prop: 'operation',
          label: '操作',
          width: 200,
          fixed: 'right',
          formatter: (row) => {
            const actions = [
              h(
                ElButton,
                {
                  link: true,
                  type: 'primary',
                  class: '!px-1',
                  onClick: () => openTaskDrawer(row)
                },
                () => '查看任务'
              )
            ]
            if (row.status === 'draft') {
              actions.push(
                h(
                  ElButton,
                  {
                    link: true,
                    type: 'primary',
                    class: '!px-1',
                    onClick: () => handlePublish(row)
                  },
                  () => '下发'
                )
              )
            }
            if (row.status === 'recycling') {
              actions.push(
                h(
                  ElButton,
                  {
                    link: true,
                    type: 'warning',
                    class: '!px-1',
                    onClick: handleRemind
                  },
                  () => '催办'
                )
              )
            }
            return h('div', { class: 'flex gap-1' }, actions)
          }
        }
      ]
    }
  })

  /**
   * 加载模板与全部计划，用于顶部统计
   */
  const loadStats = async (): Promise<void> => {
    statsLoading.value = true
    try {
      const [templateRes, planRes] = await Promise.all([
        fetchGetFollowupTemplates(),
        fetchGetFollowupPlans({ current: 1, size: 999 })
      ])
      templates.value = templateRes
      allPlans.value = planRes.records
      planTotal.value = planRes.total
    } finally {
      statsLoading.value = false
    }
  }

  /**
   * 搜索处理
   */
  const handleSearch = (params: FollowupSearchForm): void => {
    replaceSearchParams(params)
    getData()
  }

  /**
   * 打开任务明细抽屉
   */
  const openTaskDrawer = (row: FollowupPlan): void => {
    currentPlan.value = row
    drawerVisible.value = true
  }

  /**
   * 下发随访计划
   */
  const handlePublish = (row: FollowupPlan): void => {
    ElMessageBox.confirm(`确认将「${row.templateName}」下发至患者端？`, '下发随访计划', {
      confirmButtonText: '确认下发',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        await fetchPublishFollowupPlan(row.id)
        ElMessage.success('随访计划已下发至患者端')
        await loadStats()
        getData()
      })
      .catch(() => {})
  }

  /**
   * 催办提醒
   */
  const handleRemind = (): void => {
    ElMessage.success('已发送催办提醒（演示）')
  }

  /**
   * 编辑模板
   */
  const editTemplate = (): void => {
    ElMessage.info('模板编辑（演示）')
  }

  onMounted(loadStats)
</script>

<style lang="scss" scoped>
  .followup-tabs {
    display: flex;
    flex-direction: column;
    height: 100%;

    :deep(.el-tabs__content) {
      flex: 1;
      min-height: 0;
    }

    :deep(.el-tab-pane) {
      height: 100%;
    }
  }
</style>
