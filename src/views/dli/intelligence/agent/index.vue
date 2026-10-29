<!-- DLI 智能体管理：台账、配置、版本发布与回滚、会话记录 -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <div class="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <ArtStatsCard
        title="智能体总数"
        :count="overview.total"
        icon="ri:robot-2-line"
        icon-style="bg-primary"
      />
      <ArtStatsCard
        title="已启用"
        :count="overview.enabled"
        icon="ri:play-circle-line"
        icon-style="bg-success"
      />
      <ArtStatsCard
        title="今日会话"
        :count="overview.todaySessions"
        icon="ri:chat-3-line"
        icon-style="bg-warning"
      />
      <ArtStatsCard
        title="平均满意度"
        :count="overview.avgSatisfaction"
        :decimals="1"
        suffix="%"
        icon="ri:emotion-happy-line"
        icon-style="bg-danger"
      />
    </div>

    <ArtSearchBar
      v-model="searchParams"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton v-if="isAdmin" type="primary" @click="openCreate">
            <ArtSvgIcon icon="ri:add-line" class="mr-1" />新建智能体
          </ElButton>
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

    <AgentDetailDrawer
      v-model="detailVisible"
      :agent-id="activeAgentId"
      :is-admin="isAdmin"
      :tab="detailTab"
      @refresh="handleRefresh"
      @edit="handleEditFromDrawer"
    />

    <AgentFormDialog v-model="formVisible" :agent="editingAgent" @saved="handleSaved" />
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElMessage, ElMessageBox, ElSwitch, ElTag } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import ArtButtonMore from '@/components/core/forms/art-button-more/index.vue'
  import type { ButtonMoreItem } from '@/components/core/forms/art-button-more/index.vue'
  import {
    fetchCloneAgent,
    fetchDeleteAgent,
    fetchGetAgentList,
    fetchGetAgentOverview,
    fetchToggleAgent
  } from '@/mock/dli/api'
  import type { AgentItem, AgentOverview } from '@/mock/dli/types'
  import { useIntelligenceRole } from '../useIntelligenceRole'
  import { formatInt, formatPercent } from '../format'
  import AgentDetailDrawer from './modules/agent-detail-drawer.vue'
  import AgentFormDialog from './modules/agent-form-dialog.vue'

  defineOptions({ name: 'DliIntelligenceAgent' })

  const { isAdmin } = useIntelligenceRole()

  const overview = ref<AgentOverview>({
    total: 0,
    enabled: 0,
    todaySessions: 0,
    avgSatisfaction: 0
  })

  async function loadOverview() {
    overview.value = await fetchGetAgentOverview()
  }

  const searchItems = [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: '名称 / 职责 / 模型',
      span: 6
    },
    {
      key: 'builtin',
      label: '来源',
      type: 'select',
      placeholder: '全部来源',
      options: [
        { label: '内置', value: true },
        { label: '自建', value: false }
      ]
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
  const activeAgentId = ref('')
  const formVisible = ref(false)
  const editingAgent = ref<AgentItem | null>(null)

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
      apiFn: fetchGetAgentList,
      apiParams: { current: 1, size: 10, keyword: '', builtin: '', enabled: '' },
      columnsFactory: () => [
        {
          prop: 'name',
          label: '智能体',
          minWidth: 250,
          formatter: (row: AgentItem) =>
            h('div', { class: 'leading-5' }, [
              h('div', { class: 'flex-c gap-2' }, [
                h('span', { class: 'text-g-900' }, row.name),
                row.builtin
                  ? h(ElTag, { type: 'primary', effect: 'plain', size: 'small' }, () => '内置')
                  : null
              ]),
              h('div', { class: 'text-xs text-g-500' }, row.description)
            ])
        },
        { prop: 'model', label: '绑定模型', width: 140 },
        {
          prop: 'role',
          label: '职责',
          minWidth: 170,
          showOverflowTooltip: true
        },
        {
          prop: 'skills',
          label: '技能',
          minWidth: 210,
          formatter: (row: AgentItem) => {
            const shown = row.skills.slice(0, 2)
            const rest = row.skills.length - shown.length
            return h('div', { class: 'flex flex-wrap gap-1' }, [
              ...shown.map((skill) =>
                h(ElTag, { key: skill, size: 'small', effect: 'plain' }, () => skill)
              ),
              rest > 0
                ? h(ElTag, { size: 'small', type: 'info', effect: 'plain' }, () => `+${rest}`)
                : null
            ])
          }
        },
        {
          prop: 'knowledge',
          label: '知识库',
          width: 90,
          align: 'center' as const,
          formatter: (row: AgentItem) => `${row.knowledge.length} 个`
        },
        {
          prop: 'sessions',
          label: '今日会话',
          width: 100,
          align: 'right' as const,
          formatter: (row: AgentItem) => formatInt(row.sessions)
        },
        {
          prop: 'satisfaction',
          label: '满意度',
          width: 90,
          align: 'right' as const,
          formatter: (row: AgentItem) => formatPercent(row.satisfaction)
        },
        { prop: 'version', label: '版本', width: 90 },
        { prop: 'updatedAt', label: '更新时间', width: 110 },
        {
          prop: 'enabled',
          label: '状态',
          width: 80,
          align: 'center' as const,
          formatter: (row: AgentItem) =>
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
          width: 185,
          fixed: 'right' as const,
          align: 'center' as const,
          formatter: (row: AgentItem) =>
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
                      { key: 'clone', label: '克隆智能体', icon: 'ri:file-copy-line' },
                      { key: 'publish', label: '发布版本', icon: 'ri:upload-cloud-2-line' },
                      {
                        key: 'delete',
                        label: '删除智能体',
                        icon: 'ri:delete-bin-4-line',
                        disabled: row.builtin,
                        color: row.builtin ? undefined : '#f56c6c'
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

  function openDetail(row: AgentItem, tab = 'overview') {
    activeAgentId.value = row.id
    detailTab.value = tab
    detailVisible.value = true
  }

  function openCreate() {
    editingAgent.value = null
    formVisible.value = true
  }

  function openEdit(row: AgentItem) {
    editingAgent.value = row
    formVisible.value = true
  }

  function handleEditFromDrawer(agent: AgentItem) {
    detailVisible.value = false
    openEdit(agent)
  }

  function handleSaved(mode: 'create' | 'edit') {
    if (mode === 'create') refreshCreate()
    else refreshUpdate()
    loadOverview()
  }

  async function handleToggle(row: AgentItem): Promise<boolean> {
    await fetchToggleAgent(row.id, !row.enabled)
    ElMessage.success(`已${row.enabled ? '停用' : '启用'}「${row.name}」`)
    await refreshUpdate()
    loadOverview()
    return true
  }

  async function handleMore(item: ButtonMoreItem, row: AgentItem) {
    if (item.key === 'clone') {
      await fetchCloneAgent(row.id)
      ElMessage.success(`已克隆「${row.name}」，副本默认停用`)
      await refreshSoft()
      loadOverview()
      return
    }
    if (item.key === 'publish') {
      openDetail(row, 'versions')
      return
    }
    if (item.key === 'delete') {
      const confirmed = await ElMessageBox.confirm(
        `删除后「${row.name}」的会话记录与版本将一并移除，确定删除？`,
        '删除智能体',
        { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
      )
        .then(() => true)
        .catch(() => false)
      if (!confirmed) return
      const deleted = await fetchDeleteAgent(row.id)
      if (!deleted) {
        ElMessage.warning('删除失败')
        return
      }
      ElMessage.success('智能体已删除')
      await refreshRemove()
      loadOverview()
    }
  }
</script>
