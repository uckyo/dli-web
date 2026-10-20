<!-- 患者详情 - 检验检查（关键指标趋势 / 影像 / 病理） -->
<template>
  <div>
    <!-- 关键指标趋势 -->
    <section>
      <h3 class="mb-3 text-base font-semibold text-g-900">关键指标趋势</h3>
      <div v-if="labTrends.length" class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div v-for="item in labTrends" :key="item.itemCode" class="art-card-sm p-4">
          <div class="flex-cb flex-wrap gap-2">
            <div class="flex-c gap-2">
              <span class="font-medium text-g-900">{{ item.itemName }}</span>
              <span class="text-xs text-g-500">{{ item.unit }}</span>
            </div>
            <span class="text-xs text-g-500">参考范围：{{ item.refRange }}</span>
          </div>
          <ArtLineChart
            :data="item.values"
            :x-axis-data="item.dates"
            height="12rem"
            :colors="trendColors(item)"
            class="mt-2"
          />
        </div>
      </div>
      <ElEmpty v-else description="暂无检验指标趋势" :image-size="60" />
    </section>

    <!-- 影像 / 病理报告 -->
    <template v-if="imagingStudies.length || pathologyReports.length">
      <section v-if="imagingStudies.length" class="mt-6">
        <h3 class="mb-3 text-base font-semibold text-g-900">影像报告</h3>
        <div class="flex flex-col gap-3">
          <div v-for="study in imagingStudies" :key="study.id" class="art-card-sm p-4">
            <div class="flex-cb flex-wrap gap-2">
              <div class="flex-c flex-wrap gap-3">
                <ElTag type="primary" effect="plain">{{ study.modality }}</ElTag>
                <span class="text-sm text-g-500">检查日期：{{ study.studyDate }}</span>
              </div>
              <ElButton size="small" @click="handleViewPacs">调阅 PACS 影像</ElButton>
            </div>
            <p class="mt-2 font-medium text-g-900">{{ study.conclusion }}</p>
            <p class="mt-1 text-sm leading-6 text-g-600">{{ study.reportText }}</p>
            <p class="mt-2 text-xs text-g-500">PACS UID：{{ study.pacsUid }}</p>
          </div>
        </div>
      </section>

      <section v-if="pathologyReports.length" class="mt-6">
        <h3 class="mb-3 text-base font-semibold text-g-900">病理报告</h3>
        <div class="flex flex-col gap-3">
          <div v-for="report in pathologyReports" :key="report.id" class="art-card-sm p-4">
            <div class="flex-c flex-wrap gap-3">
              <ElTag type="warning" effect="plain">{{ report.sampleType }}</ElTag>
              <span class="text-sm text-g-500">样本日期：{{ report.sampleDate }}</span>
            </div>
            <p class="mt-2 text-sm leading-6 text-g-600">{{ report.reportText }}</p>
          </div>
        </div>
      </section>
    </template>
    <ElEmpty v-else class="py-6" description="暂无影像与病理报告" />
  </div>
</template>

<script setup lang="ts">
  import type { ImagingStudy, LabTrendSeries, PathologyReport } from '@/mock/dli/types'
  import { getCssVar } from '@/utils/ui'

  defineOptions({ name: 'DliPatientExamTab' })

  defineProps<{
    labTrends: LabTrendSeries[]
    imagingStudies: ImagingStudy[]
    pathologyReports: PathologyReport[]
  }>()

  /**
   * 按指标名称返回趋势线颜色，未命中时使用组件默认主题色
   */
  const trendColors = (series: LabTrendSeries): string[] | undefined => {
    if (series.itemName.includes('血氧') || series.itemCode === 'SPO2') {
      return [getCssVar('--el-color-danger')]
    }
    if (series.itemName.includes('ALT') || series.itemCode === 'ALT') {
      return [getCssVar('--el-color-warning')]
    }
    return undefined
  }

  /**
   * 调阅 PACS 影像（演示）
   */
  const handleViewPacs = () => {
    ElMessage.info('正在调阅 PACS 影像（演示）')
  }
</script>
