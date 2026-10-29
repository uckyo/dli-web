<!-- DLI 技能管理：资产台账、调用质量、配置与版本 -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <div v-if="isAdmin" class="art-card mb-5 flex-cb flex-wrap gap-3 px-5 py-4">
      <div>
        <h3 class="text-lg font-medium text-g-900">技能管理</h3>
      </div>
      <ElButton type="primary" @click="openCreate">
        <ArtSvgIcon icon="ri:add-line" class="mr-1" />新建技能
      </ElButton>
    </div>

    <div class="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <ArtStatsCard
        title="技能总数"
        :count="overview.total"
        description="覆盖工具调用 / 提示词 / 工作流"
        icon="ri:flashlight-line"
        icon-style="bg-primary"
      />
      <ArtStatsCard
        title="已启用"
        :count="overview.enabled"
        description="停用后智能体不可调用"
        icon="ri:play-circle-line"
        icon-style="bg-success"
      />
      <ArtStatsCard
        title="近 30 天调用"
        :count="overview.calls30d"
        description="全部技能累计调用次数"
        icon="ri:loop-left-line"
        icon-style="bg-warning"
      />
      <ArtStatsCard
        title="平均成功率"
        :count="overview.avgSuccessRate"
        :decimals="1"
        suffix="%"
        description="低于 95% 需关注失败原因"
        icon="ri:shield-check-line"
        icon-style="bg-danger"
      />
    </div>

    <ArtSearchBar
      v-model="searchParams"
      :items="searchItems"
      class="mb-5"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <div class="flex-c flex-wrap gap-3">
            <ElTag effect="plain">共 {{ pagination.total }} 个技能</ElTag>
            <span class="text-xs text-g-500">近 7 日失败次数可在详情中查看</span>
          </div>
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
    </ElCard>

    <SkillDetailDrawer
      v-model="detailVisible"
      :skill-id="activeSkillId"
      :is-admin="isAdmin"
      :tab="detailTab"
      @refresh="handleRefresh"
      @edit="handleEditFromDrawer"
    />

    <SkillFormDialog v-model="formVisible" :skill="editingSkill" @saved="handleSaved" />
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElMessage, ElMessageBox, ElSwitch, ElTag } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import ArtButtonMore from '@/components/core/forms/art-button-more/index.vue'
  import type { ButtonMoreItem } from '@/components/core/forms/art-button-more/index.vue'
  import { AGENTS } from '@/mock/dli/data'
  import {
    fetchDeleteSkill,
    fetchGetSkillList,
    fetchGetSkillOverview,
    fetchTestSkill,
    fetchToggleSkill
  } from '@/mock/dli/api'
  import type { SkillItem, SkillOverview } from '@/mock/dli/types'
  import { useIntelligenceRole } from '../useIntelligenceRole'
  import { formatInt, formatLatency, formatPercent, SKILL_TYPE_TAG } from '../format'
  import SkillDetailDrawer from './modules/skill-detail-drawer.vue'
  import SkillFormDialog from './modules/skill-form-dialog.vue'

  defineOptions({ name: 'DliIntelligenceSkill' })

  const { isAdmin } = useIntelligenceRole()

  const overview = ref<SkillOverview>({ total: 0, enabled: 0, calls30d: 0, avgSuccessRate: 0 })

  async function loadOverview() {
    overview.value = await fetchGetSkillOverview()
  }

  const searchItems = [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: '技能名称 / 编号 / 描述',
      span: 6
    },
    {
      key: 'type',
      label: '类型',
      type: 'select',
      placeholder: '全部类型',
      options: [
        { label: '工具调用', value: '工具调用' },
        { label: '提示词', value: '提示词' },
        { label: '工作流', value: '工作流' }
      ]
    },
    {
      key: 'agent',
      label: '归属智能体',
      type: 'select',
      placeholder: '全部智能体',
      options: AGENTS.map((item) => ({ label: item.name, value: item.name }))
    },
    {
      key: 'enabled',
      label: '状态',
      type: 'select',
      placeholder: '全部状态',
      options: [
        { label: '已启用', value: true },
        { label: '已停用', value: false }
      ]
    }
  ]

  const detailVisible = ref(false)
  const detailTab = ref('overview')
  const activeSkillId = ref('')
  const formVisible = ref(false)
  const editingSkill = ref<SkillItem | null>(null)

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    searchParams,
    getData,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData,
    refreshSoft,
    refreshCreate,
    refreshUpdate,
    refreshRemove
  } = useTable({
    core: {
      apiFn: fetchGetSkillList,
      apiParams: { current: 1, size: 10, keyword: '', type: '', agent: '', enabled: '' },
      columnsFactory: () => [
        {
          prop: 'name',
          label: '技能',
          minWidth: 230,
          formatter: (row: SkillItem) =>
            h('div', { class: 'leading-5' }, [
              h('div', { class: 'text-g-900' }, row.name),
              h('div', { class: 'text-xs text-g-500' }, row.description)
            ])
        },
        {
          prop: 'type',
          label: '类型',
          width: 100,
          formatter: (row: SkillItem) =>
            h(
              ElTag,
              { type: SKILL_TYPE_TAG[row.type], effect: 'plain', size: 'small' },
              () => row.type
            )
        },
        { prop: 'agent', label: '归属智能体', width: 150 },
        {
          prop: 'successRate',
          label: '成功率',
          width: 95,
          align: 'right' as const,
          formatter: (row: SkillItem) => formatPercent(row.successRate)
        },
        {
          prop: 'avgLatency',
          label: '平均延迟',
          width: 100,
          align: 'right' as const,
          formatter: (row: SkillItem) => formatLatency(row.avgLatency)
        },
        {
          prop: 'calls',
          label: '近 30 天调用',
          width: 115,
          align: 'right' as const,
          formatter: (row: SkillItem) => formatInt(row.calls)
        },
        { prop: 'version', label: '版本', width: 90 },
        { prop: 'updatedAt', label: '更新时间', width: 110 },
        {
          prop: 'enabled',
          label: '状态',
          width: 80,
          align: 'center' as const,
          formatter: (row: SkillItem) =>
            isAdmin.value
              ? h(ElSwitch, {
                  modelValue: row.enabled,
                  beforeChange: () => handleToggle(row)
                })
              : h(
                  ElTag,
                  { type: row.enabled ? 'success' : 'info', effect: 'plain', size: 'small' },
                  () => (row.enabled ? '已启用' : '已停用')
                )
        },
        {
          prop: 'operation',
          label: '操作',
          width: 180,
          fixed: 'right' as const,
          align: 'center' as const,
          formatter: (row: SkillItem) =>
            h('div', { class: 'flex-c justify-center gap-1' }, [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openDetail(row) },
                () => '详情'
              ),
              isAdmin.value
                ? h(
                    ElButton,
                    { link: true, type: 'primary', onClick: () => openEdit(row) },
                    () => '编辑'
                  )
                : null,
              isAdmin.value
                ? h(ArtButtonMore, {
                    list: [
                      { key: 'versions', label: '版本记录', icon: 'ri:history-line' },
                      { key: 'test', label: '测试调用', icon: 'ri:play-circle-line' },
                      {
                        key: 'delete',
                        label: '删除技能',
                        icon: 'ri:delete-bin-4-line',
                        color: '#f56c6c'
                      }
                    ],
                    onClick: (item: ButtonMoreItem) => handleMore(item, row)
                  })
                : null
            ])
        }
      ]
    }
  })

  let mountedOnce = false
  onMounted(loadOverview)
  onActivated(() => {
    if (!mountedOnce) {
      mountedOnce = true
      return
    }
    loadOverview()
    refreshSoft()
  })

  function handleSearch() {
    getData()
  }

  function handleReset() {
    resetSearchParams()
  }

  function handleRefresh() {
    refreshUpdate()
    loadOverview()
  }

  function openDetail(row: SkillItem, tab = 'overview') {
    activeSkillId.value = row.id
    detailTab.value = tab
    detailVisible.value = true
  }

  function openCreate() {
    editingSkill.value = null
    formVisible.value = true
  }

  function openEdit(row: SkillItem) {
    editingSkill.value = row
    formVisible.value = true
  }

  function handleEditFromDrawer(skill: SkillItem) {
    detailVisible.value = false
    openEdit(skill)
  }

  function handleSaved(mode: 'create' | 'edit') {
    if (mode === 'create') refreshCreate()
    else refreshUpdate()
    loadOverview()
  }

  async function handleToggle(row: SkillItem): Promise<boolean> {
    await fetchToggleSkill(row.id, !row.enabled)
    ElMessage.success(`已${row.enabled ? '停用' : '启用'}「${row.name}」`)
    await refreshUpdate()
    loadOverview()
    return true
  }

  async function handleMore(item: ButtonMoreItem, row: SkillItem) {
    if (item.key === 'versions') {
      openDetail(row, 'versions')
      return
    }
    if (item.key === 'test') {
      const result = await fetchTestSkill(row.id)
      if (result.ok) ElMessage.success(result.message)
      else ElMessage.error(result.message)
      return
    }
    if (item.key === 'delete') {
      const confirmed = await ElMessageBox.confirm(
        `删除后「${row.name}」将无法被智能体调用，确定删除？`,
        '删除技能',
        { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
      )
        .then(() => true)
        .catch(() => false)
      if (!confirmed) return
      await fetchDeleteSkill(row.id)
      ElMessage.success('技能已删除')
      await refreshRemove()
      loadOverview()
    }
  }
</script>
