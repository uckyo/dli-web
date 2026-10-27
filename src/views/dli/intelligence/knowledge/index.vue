<!-- DLI 智能管理 · 知识库管理 -->
<template>
  <div class="art-full-height">
    <div class="art-card mb-5 px-5 py-4">
      <div class="flex-cb flex-wrap gap-3">
        <div>
          <h3 class="text-lg font-medium text-g-900">知识库管理</h3>
        </div>
        <ElTag effect="plain">共 {{ intelligence?.knowledge.length ?? 0 }} 个</ElTag>
      </div>
    </div>

    <ElCard class="art-table-card">
      <ElTable :data="intelligence?.knowledge ?? []" border stripe v-loading="loading">
        <ElTableColumn prop="name" label="知识库" min-width="220" />
        <ElTableColumn prop="docs" label="文档数" width="110" align="center" />
        <ElTableColumn prop="size" label="占用空间" width="120" align="center" />
        <ElTableColumn prop="updatedAt" label="最近更新" width="130" />
        <ElTableColumn label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="row.enabled ? 'success' : 'info'">
              {{ row.enabled ? '已启用' : '已停用' }}
            </ElTag>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { useIntelligenceData } from '../useIntelligence'

  defineOptions({ name: 'DliIntelligenceKnowledge' })

  const { loading, intelligence } = useIntelligenceData()
</script>
