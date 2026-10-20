<!-- 患者详情 - 诊疗时间轴 -->
<template>
  <div class="min-h-40">
    <ElTimeline v-if="events.length">
      <ElTimelineItem
        v-for="event in events"
        :key="event.id"
        :timestamp="event.time"
        placement="top"
      >
        <template #dot>
          <span class="flex-cc size-7 rounded-full bg-g-100" :class="metaOf(event).textClass">
            <ArtSvgIcon :icon="metaOf(event).icon" class="text-base" />
          </span>
        </template>
        <div class="pb-2">
          <div class="flex-c flex-wrap gap-2">
            <span class="font-medium text-g-900">{{ event.title }}</span>
            <ElTag size="small" effect="plain">{{ metaOf(event).label }}</ElTag>
          </div>
          <p class="mt-1 text-sm leading-6 text-g-600">{{ event.content }}</p>
        </div>
      </ElTimelineItem>
    </ElTimeline>

    <ElEmpty v-else description="暂无诊疗时间轴事件" />
  </div>
</template>

<script setup lang="ts">
  import type { TimelineEvent } from '@/mock/dli/types'
  import { TIMELINE_TYPE_META } from './constants'

  defineOptions({ name: 'DliPatientTimelineTab' })

  defineProps<{
    events: TimelineEvent[]
  }>()

  /**
   * 获取事件类型对应的图标与颜色配置
   */
  const metaOf = (event: TimelineEvent) => TIMELINE_TYPE_META[event.type]
</script>
