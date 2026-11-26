<!-- DLI MCP 管理：平台统一维护，只读查看与授权下载，不提供测试/新增/编辑/删除 [批注 21] -->
<template>
  <div class="art-full-height">
    <ArtListControls>
      <ArtSearchBar
        v-model="searchParams"
        :items="searchItems"
        @search="handleSearch"
        @reset="handleReset"
      />
    </ArtListControls>

    <ArtTable
      list-layout
      :loading="loading"
      :data="data"
      :columns="columns"
      :pagination="pagination"
      @pagination:size-change="handleSizeChange"
      @pagination:current-change="handleCurrentChange"
    />

    <McpDetailDrawer v-model="detailVisible" :mcp-id="activeMcpId" />
  </div>
</template>

<script setup lang="ts">
  import ArtListControls from '@/components/core/tables/art-list-controls/index.vue'
  import { ElButton, ElMessage, ElTag } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchGetMcpDetail, fetchGetMcpList, fetchGetMcpOverview } from '@/mock/dli/api'
  import type { McpItem, McpOverview } from '@/mock/dli/types'
  import { formatInt, MCP_STATUS_DOT } from '../format'
  import { useIntelligenceRole } from '../useIntelligenceRole'
  import McpDetailDrawer from './modules/mcp-detail-drawer.vue'

  defineOptions({ name: 'DliIntelligenceMcp' })

  const { isAdmin } = useIntelligenceRole()

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
    data,
    loading,
    pagination,
    searchParams,
    getData,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
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
          label: '协议类型',
          width: 100,
          formatter: (row: McpItem) =>
            h(ElTag, { type: PROTOCOL_TAG[row.protocol], effect: 'light', size: 'small' }, () =>
              row.protocol.toUpperCase()
            )
        },
        { prop: 'version', label: '服务版本', width: 100 },
        {
          prop: 'status',
          label: '服务状态',
          width: 105,
          formatter: (row: McpItem) =>
            h('div', { class: 'flex-c gap-2' }, [
              h('span', { class: ['size-2 rounded-full', MCP_STATUS_DOT[row.status]] }),
              h('span', { class: 'text-g-700' }, row.status)
            ])
        },
        {
          prop: 'calls30d',
          label: '调用次数',
          width: 105,
          align: 'right' as const,
          formatter: (row: McpItem) =>
            h('span', { class: row.calls30d ? 'text-g-700' : 'text-g-400' }, [
              row.calls30d ? formatInt(row.calls30d) : '暂无'
            ])
        },
        {
          prop: 'lastCalledAt',
          label: '最近调用时间',
          width: 155,
          formatter: (row: McpItem) =>
            h(
              'span',
              { class: row.lastCalledAt ? 'text-g-700' : 'text-g-400' },
              row.lastCalledAt || '暂无'
            )
        },
        {
          prop: 'operation',
          label: '操作',
          width: 120,
          fixed: 'right' as const,
          align: 'center' as const,
          formatter: (row: McpItem) =>
            h('div', { class: 'flex-c justify-center gap-1' }, [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openDetail(row) },
                () => '详情'
              ),
              isAdmin.value
                ? h(
                    ElButton,
                    { link: true, type: 'primary', onClick: () => handleDownload(row) },
                    () => '下载'
                  )
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

  function openDetail(row: McpItem) {
    activeMcpId.value = row.id
    detailVisible.value = true
  }

  async function handleDownload(row: McpItem) {
    try {
      const detail = await fetchGetMcpDetail(row.id)
      const payload = {
        id: detail.id,
        name: detail.name,
        protocol: detail.protocol,
        version: detail.version,
        endpoint: detail.endpoint,
        authType: detail.authType,
        tools: detail.toolList.map((tool) => ({
          name: tool.name,
          description: tool.description
        }))
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${detail.name}-mcp.json`
      link.click()
      URL.revokeObjectURL(url)
      ElMessage.success('服务描述文件已开始下载（不含密钥与凭据）')
    } catch (error) {
      ElMessage.error(`下载失败：${(error as Error)?.message ?? '服务详情获取异常'}`)
    }
  }
</script>
