<!-- DLI 知情同意书（旧独立页已并入平台管理 → 基础配置 → 知情同意书页签） -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <div class="art-card px-5 py-5">
      <ConsentTemplates scope="platform" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import ConsentTemplates from '@/components/business/dli/consent-templates/index.vue'

  defineOptions({ name: 'DliConsent' })
</script>
