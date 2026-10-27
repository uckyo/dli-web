<!-- DLI 智能管理 · 技能管理 -->
<template>
  <div class="art-full-height">
    <div class="art-card mb-5 px-5 py-4">
      <div class="flex-cb flex-wrap gap-3">
        <div>
          <h3 class="text-lg font-medium text-g-900">技能管理</h3>
        </div>
        <ElTag effect="plain">共 {{ intelligence?.skills.length ?? 0 }} 项</ElTag>
      </div>
    </div>

    <ElCard class="art-table-card">
      <ElTable :data="intelligence?.skills ?? []" border stripe v-loading="loading">
        <ElTableColumn prop="name" label="技能名称" min-width="200" />
        <ElTableColumn prop="type" label="类型" width="120" />
        <ElTableColumn prop="agent" label="归属智能体" min-width="150" />
        <ElTableColumn prop="calls" label="近 30 天调用" width="130" align="center" />
        <ElTableColumn label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="row.enabled ? 'success' : 'info'" effect="plain">
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

  defineOptions({ name: 'DliIntelligenceSkill' })

  const { loading, intelligence } = useIntelligenceData()
</script>
