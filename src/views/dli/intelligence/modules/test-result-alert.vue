<!-- 连通性 / 调用测试结果 -->
<template>
  <ElAlert v-if="result" :type="result.ok ? 'success' : 'error'" :closable="false" show-icon>
    <template #title>
      <span class="font-medium">{{ result.ok ? '测试通过' : '测试失败' }}</span>
      <span v-if="result.ok && result.latency" class="ml-2 text-xs font-normal">
        耗时 {{ result.latency }}ms
      </span>
      <span v-if="result.checkedAt" class="ml-2 text-xs font-normal">· {{ result.checkedAt }}</span>
    </template>
    <p class="text-xs leading-5">{{ result.message }}</p>
  </ElAlert>
</template>

<script setup lang="ts">
  defineOptions({ name: 'TestResultAlert' })

  defineProps<{
    result: { ok: boolean; latency: number; message: string; checkedAt?: string } | null
  }>()
</script>
