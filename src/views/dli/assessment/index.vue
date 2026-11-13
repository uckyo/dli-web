<!-- DLI 评估预警：单入口双页签「评估报告 / 预警处理」（蓝图 P05）[批注 05] -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <ElCard class="art-table-card dli-tab-card" shadow="never">
      <ElTabs v-model="activeTab" class="dli-tabs">
        <ElTabPane label="评估报告" name="reports">
          <ReportList ref="reportRef" :patient-id="presetPatientId" />
        </ElTabPane>
        <ElTabPane label="预警处理" name="warnings">
          <WarningList ref="warningRef" :patient-id="presetPatientId" />
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElCard, ElTabs, ElTabPane } from 'element-plus'
  import { useRoute } from 'vue-router'
  import ReportList from './report-list.vue'
  import WarningList from './warning-list.vue'

  defineOptions({ name: 'DliAssessment' })

  const route = useRoute()
  const activeTab = ref('reports')

  /** 从患者详情 / 快捷入口带入患者编号 [批注 05] */
  const presetPatientId = computed(() =>
    typeof route.query.patientId === 'string' ? route.query.patientId : ''
  )

  /** query.tab 支持外部直接定位页签 */
  watch(
    () => route.query.tab,
    (tab) => {
      if (tab === 'warnings') activeTab.value = 'warnings'
      else if (tab === 'reports') activeTab.value = 'reports'
    },
    { immediate: true }
  )

  const reportRef = ref<InstanceType<typeof ReportList>>()
  const warningRef = ref<InstanceType<typeof WarningList>>()

  /** 页签切换后刷新对应列表，保证数据同源 */
  watch(activeTab, (tab) => {
    if (tab === 'reports') reportRef.value?.refresh()
    else warningRef.value?.refresh()
  })
</script>
