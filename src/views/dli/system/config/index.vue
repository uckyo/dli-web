<!-- DLI 系统管理 · 基础配置 -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <div class="art-card px-5 py-5">
      <BaseConfig scope="system" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import BaseConfig from '@/components/business/dli/base-config/index.vue'

  defineOptions({ name: 'DliSystemConfig' })
</script>
