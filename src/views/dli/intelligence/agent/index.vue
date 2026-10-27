<!-- DLI 智能管理 · Agent 管理（内置智能体不可删除） -->
<template>
  <div class="art-full-height">
    <div class="art-card mb-5 px-5 py-4">
      <div class="flex-cb flex-wrap gap-3">
        <div>
          <h3 class="text-lg font-medium text-g-900">Agent 管理</h3>
        </div>
        <ElTag effect="plain">共 {{ intelligence?.agents.length ?? 0 }} 个</ElTag>
      </div>
    </div>

    <ElCard class="art-table-card">
      <ElTable :data="intelligence?.agents ?? []" border stripe v-loading="loading">
        <ElTableColumn prop="name" label="智能体" min-width="180">
          <template #default="{ row }">
            <div class="flex-c gap-2">
              <span>{{ row.name }}</span>
              <ElTag v-if="row.builtin" type="primary" effect="plain" size="small">内置</ElTag>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="role" label="职责" min-width="210" show-overflow-tooltip />
        <ElTableColumn label="关联技能" min-width="220">
          <template #default="{ row }">
            <ElTag v-for="skill in row.skills" :key="skill" size="small" class="mr-1">
              {{ skill }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="启用" width="100" align="center">
          <template #default="{ row }">
            <ElSwitch v-model="row.enabled" @change="handleAgentToggle(row)" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="100" align="center">
          <template #default="{ row }">
            <ElTooltip v-if="row.builtin" content="内置智能体不可删除" placement="top">
              <span><ElButton link disabled>删除</ElButton></span>
            </ElTooltip>
            <ElButton v-else link type="danger" @click="handleDeleteAgent(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { fetchDeleteAgent, fetchToggleAgent } from '@/mock/dli/api'
  import type { AgentItem } from '@/mock/dli/types'
  import { useIntelligenceData } from '../useIntelligence'

  defineOptions({ name: 'DliIntelligenceAgent' })

  const { loading, intelligence, loadIntelligence } = useIntelligenceData()

  /** 启停智能体 */
  async function handleAgentToggle(row: AgentItem) {
    await fetchToggleAgent(row.id, row.enabled)
    ElMessage.success(`${row.name} 已${row.enabled ? '启用' : '停用'}`)
  }

  /** 删除自定义智能体 */
  async function handleDeleteAgent(row: AgentItem) {
    await ElMessageBox.confirm(
      `确认删除智能体「${row.name}」？删除后其关联技能需重新绑定。`,
      '删除确认',
      {
        type: 'warning'
      }
    )
    await fetchDeleteAgent(row.id)
    ElMessage.success('已删除')
    await loadIntelligence()
  }
</script>
