<!-- 样本详情抽屉：入库信息、取样/处理/保存 SOP 与样本流转记录 -->
<template>
  <ElDrawer v-model="visible" :title="`样本详情 · ${sample?.name ?? ''}`" size="600px">
    <div v-if="sample" class="flex h-full flex-col">
      <ElTabs v-model="tab" class="flex-1 overflow-hidden">
        <ElTabPane label="基本信息" name="detail">
          <div class="h-full overflow-y-auto pr-1">
            <ElDescriptions :column="2" border size="small" label-width="88px">
              <ElDescriptionsItem label="样本编号" :span="2">
                {{ sample.id }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="样本名称">{{ sample.name }}</ElDescriptionsItem>
              <ElDescriptionsItem label="样本类型">{{ sample.type }}</ElDescriptionsItem>
              <ElDescriptionsItem label="患者编号">{{ sample.patientId }}</ElDescriptionsItem>
              <ElDescriptionsItem label="所属中心">{{ sample.center }}</ElDescriptionsItem>
              <ElDescriptionsItem label="采集时间">{{ sample.collectedAt }}</ElDescriptionsItem>
              <ElDescriptionsItem label="入库时间">{{ sample.storedAt }}</ElDescriptionsItem>
              <ElDescriptionsItem label="剩余样本量">
                {{ sample.remaining }} {{ sample.unit }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="样本状态">
                <ElTag :type="SAMPLE_STATUS_TAG[sample.status]" effect="plain" size="small">
                  {{ sample.status }}
                </ElTag>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="保存位置">{{ sample.location }}</ElDescriptionsItem>
              <ElDescriptionsItem label="共享级别">{{ sample.shareLevel }}</ElDescriptionsItem>
              <ElDescriptionsItem label="操作者">{{ sample.operator }}</ElDescriptionsItem>
              <ElDescriptionsItem label="设备及位置" :span="2">
                {{ sample.device }}
              </ElDescriptionsItem>
            </ElDescriptions>

            <div class="mt-5">
              <p class="mb-2 text-sm font-medium text-g-900">SOP</p>
              <ElDescriptions :column="1" border size="small" label-width="88px">
                <ElDescriptionsItem
                  v-for="step in sample.sop"
                  :key="step.stage"
                  :label="step.stage"
                >
                  {{ step.content }}
                </ElDescriptionsItem>
              </ElDescriptions>
            </div>
          </div>
        </ElTabPane>

        <ElTabPane label="流转记录" name="flow">
          <div class="h-full overflow-y-auto pr-1">
            <ElTimeline>
              <ElTimelineItem
                v-for="log in flowDesc"
                :key="`${log.time}-${log.action}`"
                :timestamp="log.time"
                placement="top"
              >
                <div class="rounded-lg border border-full-d bg-g-100/60 px-3 py-2">
                  <div class="flex-cb gap-2">
                    <span class="text-sm font-medium text-g-900">{{ log.action }}</span>
                    <span class="text-xs text-g-500">{{ log.operator }}</span>
                  </div>
                  <p class="mt-1 text-sm leading-6 text-g-600">{{ log.remark }}</p>
                </div>
              </ElTimelineItem>
            </ElTimeline>
          </div>
        </ElTabPane>
      </ElTabs>
    </div>
  </ElDrawer>
</template>

<script setup lang="ts">
  import type { SampleRecord } from '@/mock/dli/types'
  import { SAMPLE_STATUS_TAG } from '../../format'

  defineOptions({ name: 'SampleDetailDrawer' })

  const props = defineProps<{
    modelValue: boolean
    sample?: SampleRecord
    tab?: 'detail' | 'flow'
  }>()

  const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const tab = ref<'detail' | 'flow'>(props.tab ?? 'detail')

  watch(
    () => [props.modelValue, props.tab] as const,
    ([open, nextTab]) => {
      if (open) tab.value = nextTab ?? 'detail'
    }
  )

  const flowDesc = computed(() => [...(props.sample?.flow ?? [])].reverse())
</script>
