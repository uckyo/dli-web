<!-- DLI 状态管理：患者自动化 / 检查自动化 / 智能随访（仅临床角色） -->
<template>
  <div class="art-full-height overflow-y-auto pb-5" v-loading="loading">
    <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <div v-for="group in GROUPS" :key="group.name" class="art-card px-5 py-4">
        <div class="mb-3 flex-c gap-2">
          <span class="size-9 flex-cc rounded-lg bg-primary/10 text-primary">
            <ArtSvgIcon :icon="group.icon" />
          </span>
          <div>
            <p class="font-medium text-g-900">{{ group.title }}</p>
            <p class="text-xs text-g-500">{{ group.desc }}</p>
          </div>
        </div>

        <div class="space-y-3">
          <div
            v-for="item in group.items"
            :key="item.key"
            class="rounded-lg border border-full-d px-3 py-3"
          >
            <div class="flex-cb gap-3">
              <span class="text-sm font-medium text-g-800">{{ item.label }}</span>
              <ElSwitch v-model="item.enabled" @change="handleToggle(item)" />
            </div>
            <p class="mt-1 text-xs leading-5 text-g-500">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="art-card mt-5 px-5 py-4">
      <div class="flex-cb flex-wrap gap-3">
        <p class="text-xs text-g-500">
          自动化执行记录可在患者管理 → 诊疗历程中查看；涉及临床处置的结果仍需医生确认。
        </p>
        <ElButton type="primary" plain @click="saveConfig">保存配置</ElButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import { fetchGetAutomation } from '@/mock/dli/api'
  import type { AutomationItem } from '@/mock/dli/types'

  defineOptions({ name: 'DliStatus' })

  /** 自动化分组展示配置 */
  const GROUPS: Array<{
    name: 'patient' | 'exam' | 'followup'
    title: string
    desc: string
    icon: string
    items: AutomationItem[]
  }> = reactive([
    {
      name: 'patient',
      title: '患者自动化',
      desc: '入组、建档与早筛触发',
      icon: 'ri:user-heart-line',
      items: []
    },
    {
      name: 'exam',
      title: '检查自动化',
      desc: '采集、解析与异常提示',
      icon: 'ri:file-search-line',
      items: []
    },
    {
      name: 'followup',
      title: '智能随访',
      desc: '计划生成、提醒与失访升级',
      icon: 'ri:calendar-check-line',
      items: []
    }
  ])

  const loading = ref(true)

  /** 切换开关（演示即时生效） */
  function handleToggle(item: AutomationItem) {
    ElMessage.success(`「${item.label}」已${item.enabled ? '开启' : '关闭'}（演示）`)
  }

  /** 保存配置（演示） */
  function saveConfig() {
    ElMessage.success('自动化配置已保存（演示）')
  }

  onMounted(async () => {
    try {
      const data = await fetchGetAutomation()
      GROUPS[0].items = data.patient
      GROUPS[1].items = data.exam
      GROUPS[2].items = data.followup
    } finally {
      loading.value = false
    }
  })
</script>
