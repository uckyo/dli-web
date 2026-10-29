<!-- DLI MCP 管理：平台统一维护，只读查看、连通性测试与下载 -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <div class="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <ArtStatsCard
        title="MCP 服务"
        :count="overview.services"
        icon="ri:plug-line"
        icon-style="bg-primary"
      />
      <ArtStatsCard
        title="注册工具"
        :count="overview.tools"
        icon="ri:tools-line"
        icon-style="bg-success"
      />
      <ArtStatsCard
        title="在线服务"
        :count="overview.online"
        icon="ri:signal-tower-line"
        icon-style="bg-warning"
      />
      <ArtStatsCard
        title="近 30 天调用"
        :count="overview.calls30d"
        icon="ri:exchange-line"
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
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData" />

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <McpDetailDrawer v-model="detailVisible" :mcp-id="activeMcpId" @refresh="handleDrawerRefresh" />
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElMessage, ElTag } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import {
    fetchGetMcpDetail,
    fetchGetMcpList,
    fetchGetMcpOverview,
    fetchTestMcp
  } from '@/mock/dli/api'
  import type { McpItem, McpOverview } from '@/mock/dli/types'
  import { formatInt, formatLatency, MCP_STATUS_DOT } from '../format'
  import McpDetailDrawer from './modules/mcp-detail-drawer.vue'

  defineOptions({ name: 'DliIntelligenceMcp' })

  const overview = ref<McpOverview>({ services: 0, tools: 0, online: 0, calls30d: 0 })

  async function loadOverview() {
    overview.value = await fetchGetMcpOverview()
  }

  const PROTOCOL_TAG: Record<McpItem['protocol'], 'primary' | 'success' | 'warning'> = {
    http: 'primary',
    sse: 'warning',
    stdio: 'success'
  }

  const searchItems = [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: '服务名称 / 说明',
      span: 6
    },
    {
      key: 'protocol',
      label: '协议',
      type: 'select',
      placeholder: '全部协议',
      options: [
        { label: 'HTTP', value: 'http' },
        { label: 'SSE', value: 'sse' },
        { label: 'STDIO', value: 'stdio' }
      ]
    },
    {
      key: 'status',
      label: '连接状态',
      type: 'select',
      placeholder: '全部状态',
      options: [
        { label: '在线', value: '在线' },
        { label: '异常', value: '异常' },
        { label: '离线', value: '离线' }
      ]
    }
  ]

  const detailVisible = ref(false)
  const activeMcpId = ref('')

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
    refreshSoft
  } = useTable({
    core: {
      apiFn: fetchGetMcpList,
      apiParams: { current: 1, size: 10, keyword: '', protocol: '', status: '' },
      columnsFactory: () => [
        {
          prop: 'name',
          label: '服务名称',
          minWidth: 230,
          formatter: (row: McpItem) =>
            h('div', { class: 'leading-5' }, [
              h('div', { class: 'text-g-900' }, row.name),
              h('div', { class: 'text-xs text-g-500' }, row.description)
            ])
        },
        {
          prop: 'protocol',
          label: '协议',
          width: 90,
          formatter: (row: McpItem) =>
            h(ElTag, { type: PROTOCOL_TAG[row.protocol], effect: 'plain', size: 'small' }, () =>
              row.protocol.toUpperCase()
            )
        },
        { prop: 'version', label: '版本', width: 90 },
        { prop: 'tools', label: '工具数', width: 85, align: 'right' as const },
        {
          prop: 'status',
          label: '连接状态',
          width: 105,
          formatter: (row: McpItem) =>
            h('div', { class: 'flex-c gap-2' }, [
              h('span', { class: ['size-2 rounded-full', MCP_STATUS_DOT[row.status]] }),
              h('span', { class: 'text-g-700' }, row.status)
            ])
        },
        {
          prop: 'latency',
          label: '延迟',
          width: 85,
          align: 'right' as const,
          formatter: (row: McpItem) => formatLatency(row.latency)
        },
        {
          prop: 'calls30d',
          label: '近 30 天调用',
          width: 115,
          align: 'right' as const,
          formatter: (row: McpItem) => formatInt(row.calls30d)
        },
        { prop: 'updatedAt', label: '最近更新', width: 110 },
        {
          prop: 'operation',
          label: '操作',
          width: 175,
          fixed: 'right' as const,
          align: 'center' as const,
          formatter: (row: McpItem) =>
            h('div', { class: 'flex-c justify-center gap-1' }, [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openDetail(row) },
                () => '详情'
              ),
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => handleTest(row) },
                () => '测试'
              ),
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => handleDownload(row) },
                () => '下载'
              )
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
    refreshSoft()
    loadOverview()
  }

  function openDetail(row: McpItem) {
    activeMcpId.value = row.id
    detailVisible.value = true
  }

  async function handleTest(row: McpItem) {
    const result = await fetchTestMcp(row.id)
    if (result.ok) ElMessage.success(result.message)
    else ElMessage.error(result.message)
    await refreshSoft()
    loadOverview()
  }

  async function handleDownload(row: McpItem) {
    const detail = await fetchGetMcpDetail(row.id)
    const tools = detail.toolList.map((tool) => {
      let schema: unknown = tool.schema
      try {
        schema = JSON.parse(tool.schema)
      } catch {
        schema = tool.schema
      }
      return { name: tool.name, description: tool.description, schema }
    })
    const payload = {
      id: detail.id,
      name: detail.name,
      protocol: detail.protocol,
      version: detail.version,
      endpoint: detail.endpoint,
      authType: detail.authType,
      tools
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${detail.name}-mcp.json`
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('服务描述文件已下载（演示）')
  }
</script>
