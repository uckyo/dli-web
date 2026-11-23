<!-- DLI 状态管理 · 自动化配置：由原页签改为左侧子菜单入口 [批注 09] -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <div v-loading="loading" class="pt-4">
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
                <!-- 配置开关只给明确获授权医生等现有角色 [批注 09] -->
                <ElSwitch
                  :model-value="item.enabled"
                  :disabled="!canConfigure"
                  :before-change="() => handleToggle(item)"
                />
              </div>
              <p class="mt-1 text-xs leading-5 text-g-500">{{ item.description }}</p>
            </div>
          </div>
        </div>
      </div>
      <p v-if="!canConfigure" class="mt-4 text-xs text-g-500">
        助理／护士不默认保存医学规则，配置开关仅对获授权医生开放
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox, ElSwitch } from 'element-plus'
  import { useUserStore } from '@/store/modules/user'
  import { fetchGetAutomation, fetchSaveAutomation } from '@/mock/dli/api'
  import type { AutomationItem } from '@/mock/dli/types'

  defineOptions({ name: 'DliStatusConfig' })

  const userStore = useUserStore()

  /** 配置开关只给明确获授权医生等现有角色 [批注 09] */
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const canConfigure = computed(() => role.value === 'R_DOCTOR')
  const operatorName = computed(() => {
    const info = userStore.getUserInfo as { userName?: string; username?: string }
    return info.userName ?? info.username ?? '当前医生'
  })

  interface AutoGroup {
    name: 'patient' | 'exam' | 'followup'
    title: string
    desc: string
    icon: string
    items: AutomationItem[]
  }

  const GROUPS: AutoGroup[] = reactive([
    {
      name: 'patient',
      title: '患者自动化',
      desc: '候选队列、建档与早筛触发',
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
      desc: '草稿生成、提醒与失访升级',
      icon: 'ri:calendar-check-line',
      items: []
    }
  ])

  const loading = ref(true)

  async function persistAutomation(messagePrefix: string) {
    await fetchSaveAutomation(
      {
        patient: GROUPS[0].items,
        exam: GROUPS[1].items,
        followup: GROUPS[2].items
      },
      role.value,
      operatorName.value
    )
    const enabled = GROUPS.reduce(
      (count, group) => count + group.items.filter((item) => item.enabled).length,
      0
    )
    ElMessage.success(`${messagePrefix}，当前启用 ${enabled} 项自动化规则`)
  }

  /** 每次开关变更先确认，确认后立即生效；取消则保持原状态 */
  async function handleToggle(item: AutomationItem): Promise<boolean> {
    const next = !item.enabled
    const confirmed = await ElMessageBox.confirm(
      `确认${next ? '开启' : '关闭'}「${item.label}」吗？该改动将立即生效。`,
      next ? '开启自动化规则' : '关闭自动化规则',
      {
        type: 'warning',
        confirmButtonText: next ? '确认开启' : '确认关闭',
        cancelButtonText: '返回'
      }
    )
      .then(() => true)
      .catch(() => false)
    if (!confirmed) return false

    const previous = item.enabled
    item.enabled = next
    try {
      await persistAutomation(next ? '规则已开启' : '规则已关闭')
      return true
    } catch (error) {
      item.enabled = previous
      ElMessage.error(error instanceof Error ? error.message : '保存配置失败')
      return false
    }
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
