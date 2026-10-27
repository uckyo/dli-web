<!-- DLI 智能管理 · MCP 管理（仅开放下载） -->
<template>
  <div class="art-full-height">
    <div class="art-card mb-5 px-5 py-4">
      <div class="flex-cb flex-wrap gap-3">
        <div>
          <h3 class="text-lg font-medium text-g-900">MCP 管理</h3>
        </div>
        <ElTag effect="plain" type="warning">只读 · 仅下载</ElTag>
      </div>
    </div>

    <ElCard class="art-table-card">
      <p class="mb-3 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
        MCP 服务由平台统一维护，此处仅开放下载，不支持新增、编辑或删除。
      </p>
      <ElTable :data="intelligence?.mcps ?? []" border stripe v-loading="loading">
        <ElTableColumn prop="name" label="服务名称" min-width="180" />
        <ElTableColumn prop="protocol" label="协议" width="100" />
        <ElTableColumn prop="version" label="版本" width="100" />
        <ElTableColumn prop="tools" label="工具数" width="100" align="center" />
        <ElTableColumn prop="description" label="说明" min-width="220" show-overflow-tooltip />
        <ElTableColumn label="操作" width="110" align="center">
          <template #default="{ row }">
            <ElButton link type="primary" @click="downloadMcp(row.name)">
              <ArtSvgIcon icon="ri:download-2-line" class="mr-1" />下载
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import { useIntelligenceData } from '../useIntelligence'

  defineOptions({ name: 'DliIntelligenceMcp' })

  const { loading, intelligence } = useIntelligenceData()

  /** 下载 MCP 配置（演示） */
  function downloadMcp(name: string) {
    ElMessage.success(`${name} 下载已开始（演示）`)
  }
</script>
