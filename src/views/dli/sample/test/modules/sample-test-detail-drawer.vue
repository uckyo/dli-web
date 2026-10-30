<!-- 检测详情抽屉：关联患者与样本、采集时点、检测 SOP、质控与原始数据 -->
<template>
  <ElDrawer v-model="visible" :title="`检测详情 · ${record?.item ?? ''}`" size="600px">
    <div v-if="record" class="flex h-full flex-col">
      <ElTabs v-model="tab" class="flex-1 overflow-hidden">
        <ElTabPane label="基本信息" name="detail">
          <div class="h-full overflow-y-auto pr-1">
            <ElDescriptions :column="2" border size="small" label-width="92px">
              <ElDescriptionsItem label="检测编号" :span="2">
                {{ record.id }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="检测类型">{{ record.type }}</ElDescriptionsItem>
              <ElDescriptionsItem label="检测项目">{{ record.item }}</ElDescriptionsItem>
              <ElDescriptionsItem label="批次">{{ record.batch }}</ElDescriptionsItem>
              <ElDescriptionsItem label="所属中心">{{ record.center }}</ElDescriptionsItem>
              <ElDescriptionsItem label="患者编号">{{ record.patientId }}</ElDescriptionsItem>
              <ElDescriptionsItem label="关联样本">{{ sample?.name ?? '—' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="样本编号" :span="2">
                {{ record.sampleId }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="采集时点">{{ record.collectedAt }}</ElDescriptionsItem>
              <ElDescriptionsItem label="检测时间">{{ record.testedAt }}</ElDescriptionsItem>
              <ElDescriptionsItem label="检测状态">
                <ElTag :type="TEST_STATUS_TAG[record.status]" effect="light" size="small">
                  {{ record.status }}
                </ElTag>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="操作者">{{ record.operator }}</ElDescriptionsItem>
              <ElDescriptionsItem label="结果录入" :span="2">
                {{ record.recordedAt }}
              </ElDescriptionsItem>
            </ElDescriptions>

            <div class="mt-5">
              <p class="mb-2 text-sm font-medium text-g-900">检测 SOP</p>
              <ElDescriptions :column="1" border size="small" label-width="88px">
                <ElDescriptionsItem
                  v-for="step in record.sop"
                  :key="step.stage"
                  :label="step.stage"
                >
                  {{ step.content }}
                </ElDescriptionsItem>
              </ElDescriptions>
            </div>
          </div>
        </ElTabPane>

        <ElTabPane label="质控与数据" name="report">
          <div class="h-full overflow-y-auto pr-1">
            <ElDescriptions :column="1" border size="small" label-width="92px">
              <ElDescriptionsItem label="质控结论">
                <ElTag :type="QC_TAG[record.qc]" effect="light" size="small">
                  {{ record.qc }}
                </ElTag>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="质控报告">{{ record.qcReport }}</ElDescriptionsItem>
              <ElDescriptionsItem label="原始数据">{{ record.dataFile }}</ElDescriptionsItem>
              <ElDescriptionsItem label="表达谱">{{ record.expression }}</ElDescriptionsItem>
              <ElDescriptionsItem label="共享级别">{{ record.shareLevel }}</ElDescriptionsItem>
            </ElDescriptions>
          </div>
        </ElTabPane>
      </ElTabs>
    </div>
  </ElDrawer>
</template>

<script setup lang="ts">
  import { fetchGetSampleById } from '@/mock/dli/api'
  import type { SampleRecord, SampleTestRecord } from '@/mock/dli/types'
  import { QC_TAG, TEST_STATUS_TAG } from '../../format'

  defineOptions({ name: 'SampleTestDetailDrawer' })

  const props = defineProps<{
    modelValue: boolean
    record?: SampleTestRecord
    tab?: 'detail' | 'report'
  }>()

  const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const tab = ref<'detail' | 'report'>(props.tab ?? 'detail')
  const sample = ref<SampleRecord>()

  watch(
    () => [props.modelValue, props.tab] as const,
    async ([open, nextTab]) => {
      if (!open) return
      tab.value = nextTab ?? 'detail'
      if (!props.record) return
      sample.value = await fetchGetSampleById(props.record.sampleId)
    }
  )
</script>
