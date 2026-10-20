<!-- 患者详情 - 患者上报动态 -->
<template>
  <div>
    <div v-if="reports.length" class="flex flex-col gap-4">
      <div
        v-for="report in reports"
        :key="report.id"
        class="relative overflow-hidden rounded-lg border-full-d p-4"
      >
        <!-- 异常上报左侧红色标记 -->
        <span
          v-if="report.aiTriage === 'abnormal'"
          class="absolute inset-y-4 left-0 w-1 rounded-full bg-danger"
        />

        <!-- 上报元信息 -->
        <div class="flex-c flex-wrap gap-3">
          <ElTag :type="REPORT_TYPE_CONFIG[report.reportType].tagType" effect="plain">
            {{ REPORT_TYPE_CONFIG[report.reportType].label }}
          </ElTag>
          <span class="text-sm text-g-500">{{ report.reportTime }}</span>
          <ElTag v-if="report.aiTriage === 'abnormal'" type="danger" size="small">
            AI 预判：异常
          </ElTag>
          <ElTag v-else type="success" size="small">AI 预判：正常</ElTag>
          <ElTag v-if="!report.read" type="danger" size="small" effect="plain">未读</ElTag>
        </div>

        <!-- 症状 -->
        <div v-if="report.symptoms.length" class="mt-3 flex flex-wrap gap-2">
          <ElTag
            v-for="symptom in report.symptoms"
            :key="symptom.name"
            type="warning"
            effect="plain"
          >
            {{ symptom.name }} · {{ symptom.level }}
          </ElTag>
        </div>

        <!-- 体征 -->
        <div
          v-if="report.vitals.temp || report.vitals.spo2 || report.vitals.hr"
          class="mt-3 flex flex-wrap gap-5 text-sm text-g-700"
        >
          <span v-if="report.vitals.temp">体温：{{ report.vitals.temp }}</span>
          <span v-if="report.vitals.spo2">血氧：{{ report.vitals.spo2 }}</span>
          <span v-if="report.vitals.hr">心率：{{ report.vitals.hr }}</span>
        </div>

        <!-- 健康日记 -->
        <p v-if="report.diaryText" class="mt-3 text-sm leading-6 text-g-600">
          {{ report.diaryText }}
        </p>
      </div>
    </div>

    <ElEmpty v-else description="暂无患者上报记录" />
  </div>
</template>

<script setup lang="ts">
  import type { PatientReport } from '@/mock/dli/types'
  import { REPORT_TYPE_CONFIG } from '@/views/dli/patient/constants'

  defineOptions({ name: 'DliPatientReportTab' })

  defineProps<{
    reports: PatientReport[]
  }>()
</script>
