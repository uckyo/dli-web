<!-- 详情抽屉内的四项小指标 -->
<template>
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
    <div v-for="item in items" :key="item.label" class="rounded-lg bg-g-100 px-3 py-2.5">
      <p class="text-xs text-g-500">{{ item.label }}</p>
      <p class="mt-1 truncate text-lg font-medium" :class="toneClass(item.tone)">
        {{ item.value }}
        <span v-if="item.suffix" class="ml-0.5 text-xs font-normal text-g-500">{{
          item.suffix
        }}</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'MetricStrip' })

  interface MetricItem {
    label: string
    value: string | number
    suffix?: string
    tone?: 'default' | 'success' | 'warning' | 'danger'
  }

  defineProps<{ items: MetricItem[] }>()

  const toneClass = (tone?: MetricItem['tone']) => {
    if (tone === 'success') return 'text-success'
    if (tone === 'warning') return 'text-warning'
    if (tone === 'danger') return 'text-danger'
    return 'text-g-900'
  }
</script>
