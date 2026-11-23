<!-- DLI 评估预警 · 预警处理：由原页签改为左侧子菜单入口 [批注 05] -->
<template>
  <WarningList :patient-id="presetPatientId" />
</template>

<script setup lang="ts">
  import { useRoute } from 'vue-router'
  import WarningList from './warning-list.vue'

  defineOptions({ name: 'DliAssessmentWarnings' })

  const route = useRoute()

  /** 从患者详情 / 快捷入口带入患者编号 [批注 05] */
  const presetPatientId = computed(() =>
    typeof route.query.patientId === 'string' ? route.query.patientId : ''
  )
</script>
