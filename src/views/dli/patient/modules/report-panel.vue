<!-- 患者详情 → 上报：患者端主动上报，医护在此核对 [批注 14]；报告资料仍复用检查记录 -->
<template>
  <div class="dli-pane dli-own">
    <ArtTable :data="reportList" :columns="columns" empty-text="暂无上报记录" />
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElMessage, ElTag } from 'element-plus'
  import { computed, ref, watch } from 'vue'
  import { fetchGetPatientReports, fetchReviewPatientReport } from '@/mock/dli/api'
  import { useUserStore } from '@/store/modules/user'
  import type { ColumnOption } from '@/types/component'
  import type { PatientReport } from '@/mock/dli/types'

  defineOptions({ name: 'PatientReportPanel' })

  const props = defineProps<{ patientId: string }>()

  const userStore = useUserStore()
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const canManage = computed(() => ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role.value))
  const operatorName = computed(() => {
    const info = userStore.getUserInfo as {
      userName?: string
      username?: string
      nickName?: string
    }
    return info.userName ?? info.username ?? info.nickName ?? '当前医护'
  })

  const reportList = ref<PatientReport[]>([])

  const columns: ColumnOption<PatientReport>[] = [
    { prop: 'date', label: '上报日期', width: 130 },
    { prop: 'type', label: '上报类型', width: 140 },
    { prop: 'content', label: '上报内容', minWidth: 260, showOverflowTooltip: true },
    {
      prop: 'status',
      label: '核对状态',
      width: 110,
      formatter: (row: PatientReport) =>
        h(
          ElTag,
          {
            type:
              row.status === '已核对' ? 'success' : row.status === '已退回' ? 'danger' : 'warning',
            effect: 'light'
          },
          () => row.status
        )
    },
    {
      prop: 'reviewer',
      label: '核对人',
      width: 120,
      formatter: (row: PatientReport) => row.reviewer || '—'
    },
    {
      prop: 'operation',
      label: '操作',
      width: 160,
      formatter: (row: PatientReport) => {
        if (row.status !== '待核对') {
          return h('span', { class: 'text-xs text-g-500' }, () => '已处理')
        }
        if (!canManage.value) return h('span', { class: 'text-xs text-g-500' }, () => '—')
        return h('div', { class: 'flex-c gap-2' }, [
          h(
            ElButton,
            { link: true, type: 'primary', onClick: () => review(row, '已核对') },
            () => '通过'
          ),
          h(
            ElButton,
            { link: true, type: 'danger', onClick: () => review(row, '已退回') },
            () => '退回'
          )
        ])
      }
    }
  ]

  async function load() {
    if (!props.patientId) return
    try {
      reportList.value = await fetchGetPatientReports(props.patientId)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '上报记录加载失败')
    }
  }

  async function review(row: PatientReport, action: '已核对' | '已退回') {
    try {
      const updated = await fetchReviewPatientReport(row.id, action, operatorName.value)
      const target = reportList.value.find((item) => item.id === row.id)
      if (target) Object.assign(target, updated)
      ElMessage.success(action === '已核对' ? '上报已核对' : '上报已退回')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '核对失败')
    }
  }

  watch(
    () => props.patientId,
    () => void load(),
    { immediate: true }
  )
  defineExpose({ load })
</script>
