<!-- DLI 评估预警 · 评估报告：由原页签改为左侧子菜单入口 [批注 05] -->
<template>
  <ReportList :patient-id="presetPatientId" />
</template>

<script setup lang="ts">
  import { useRoute } from 'vue-router'
  import ReportList from './report-list.vue'

  defineOptions({ name: 'DliAssessmentReports' })

  const route = useRoute()

  /** 从患者详情 / 快捷入口带入患者编号 [批注 05] */
  const presetPatientId = computed(() =>
    typeof route.query.patientId === 'string' ? route.query.patientId : ''
  )
</script>
