<!-- DLI 知识库管理：文档资产、检索测试与召回参数 -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <div class="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <ArtStatsCard
        title="知识库数"
        :count="overview.total"
        icon="ri:book-2-line"
        icon-style="bg-primary"
      />
      <ArtStatsCard
        title="文档总数"
        :count="overview.docs"
        icon="ri:file-text-line"
        icon-style="bg-success"
      />
      <ArtStatsCard
        title="总容量"
        :count="overview.sizeGb"
        :decimals="2"
        suffix="GB"
        icon="ri:hard-drive-2-line"
        icon-style="bg-warning"
      />
      <ArtStatsCard
        title="近 7 天检索"
        :count="overview.retrievals7d"
        icon="ri:search-eye-line"
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
            <ArtSvgIcon icon="ri:add-line" class="mr-1" />新建知识库
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

    <KnowledgeDetailDrawer
      v-model="detailVisible"
      :knowledge-id="activeKnowledgeId"
      :is-admin="isAdmin"
      :tab="detailTab"
      @refresh="handleDrawerRefresh"
      @edit="handleEditFromDrawer"
    />

    <KnowledgeFormDialog v-model="formVisible" :knowledge="editingKnowledge" @saved="handleSaved" />
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElMessage, ElMessageBox, ElSwitch, ElTag } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import ArtButtonMore from '@/components/core/forms/art-button-more/index.vue'
  import type { ButtonMoreItem } from '@/components/core/forms/art-button-more/index.vue'
  import {
    fetchDeleteKnowledge,
    fetchGetKnowledgeList,
    fetchGetKnowledgeOverview,
    fetchToggleKnowledge
  } from '@/mock/dli/api'
  import type { KnowledgeItem, KnowledgeOverview } from '@/mock/dli/types'
  import { useIntelligenceRole } from '../useIntelligenceRole'
  import { formatBytes, formatInt, formatPercent, SCOPE_TAG } from '../format'
  import KnowledgeDetailDrawer from './modules/knowledge-detail-drawer.vue'
  import KnowledgeFormDialog from './modules/knowledge-form-dialog.vue'

  defineOptions({ name: 'DliIntelligenceKnowledge' })

  const { isAdmin } = useIntelligenceRole()

  const overview = ref<KnowledgeOverview>({ total: 0, docs: 0, sizeGb: 0, retrievals7d: 0 })

  async function loadOverview() {
    overview.value = await fetchGetKnowledgeOverview()
  }

  const searchItems = [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: '知识库名称 / 描述',
      span: 6
    },
    {
      key: 'scope',
      label: '可见范围',
      type: 'select',
      placeholder: '全部范围',
      options: [
        { label: '全平台', value: '全平台' },
        { label: '本中心', value: '本中心' },
        { label: '课题组', value: '课题组' }
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
  const detailTab = ref('docs')
  const activeKnowledgeId = ref('')
  const formVisible = ref(false)
  const editingKnowledge = ref<KnowledgeItem | null>(null)

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
      apiFn: fetchGetKnowledgeList,
      apiParams: { current: 1, size: 10, keyword: '', scope: '', enabled: '' },
      columnsFactory: () => [
        {
          prop: 'name',
          label: '知识库',
          minWidth: 230,
          formatter: (row: KnowledgeItem) =>
            h('div', { class: 'leading-5' }, [
              h('div', { class: 'text-g-900' }, row.name),
              h('div', { class: 'text-xs text-g-500' }, row.description)
            ])
        },
        {
          prop: 'scope',
          label: '可见范围',
          width: 95,
          formatter: (row: KnowledgeItem) =>
            h(
              ElTag,
              { type: SCOPE_TAG[row.scope], effect: 'plain', size: 'small' },
              () => row.scope
            )
        },
        {
          prop: 'docs',
          label: '文档数',
          width: 85,
          align: 'right' as const,
          formatter: (row: KnowledgeItem) => formatInt(row.docs)
        },
        {
          prop: 'size',
          label: '容量',
          width: 95,
          align: 'right' as const,
          formatter: (row: KnowledgeItem) => formatBytes(row.sizeBytes)
        },
        {
          prop: 'retrievals7d',
          label: '近 7 天检索',
          width: 110,
          align: 'right' as const,
          formatter: (row: KnowledgeItem) => formatInt(row.retrievals7d)
        },
        {
          prop: 'hitRate',
          label: '命中率',
          width: 90,
          align: 'right' as const,
          formatter: (row: KnowledgeItem) => formatPercent(row.hitRate)
        },
        { prop: 'maintainer', label: '维护人', width: 90 },
        { prop: 'updatedAt', label: '更新时间', width: 110 },
        {
          prop: 'enabled',
          label: '状态',
          width: 80,
          align: 'center' as const,
          formatter: (row: KnowledgeItem) =>
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
          formatter: (row: KnowledgeItem) =>
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
                      { key: 'retrieval', label: '检索测试', icon: 'ri:search-eye-line' },
                      {
                        key: 'delete',
                        label: '删除知识库',
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

  function handleDrawerRefresh() {
    refreshUpdate()
    loadOverview()
  }

  function openDetail(row: KnowledgeItem, tab = 'docs') {
    activeKnowledgeId.value = row.id
    detailTab.value = tab
    detailVisible.value = true
  }

  function openCreate() {
    editingKnowledge.value = null
    formVisible.value = true
  }

  function openEdit(row: KnowledgeItem) {
    editingKnowledge.value = row
    formVisible.value = true
  }

  function handleEditFromDrawer(knowledge: KnowledgeItem) {
    detailVisible.value = false
    openEdit(knowledge)
  }

  function handleSaved(mode: 'create' | 'edit') {
    if (mode === 'create') refreshCreate()
    else refreshUpdate()
    loadOverview()
  }

  async function handleToggle(row: KnowledgeItem): Promise<boolean> {
    await fetchToggleKnowledge(row.id, !row.enabled)
    ElMessage.success(`已${row.enabled ? '停用' : '启用'}「${row.name}」`)
    await refreshUpdate()
    loadOverview()
    return true
  }

  async function handleMore(item: ButtonMoreItem, row: KnowledgeItem) {
    if (item.key === 'retrieval') {
      openDetail(row, 'retrieval')
      return
    }
    if (item.key === 'delete') {
      const confirmed = await ElMessageBox.confirm(
        `删除「${row.name}」将同时移除 ${row.docs} 个文档与索引，确定删除？`,
        '删除知识库',
        { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
      )
        .then(() => true)
        .catch(() => false)
      if (!confirmed) return
      await fetchDeleteKnowledge(row.id)
      ElMessage.success('知识库已删除')
      await refreshRemove()
      loadOverview()
    }
  }
</script>
