<!-- DLI 系统管理 · 平台管理（可暂停服务） -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <div class="art-card px-5 py-5">
      <OrgManager kind="platform" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import OrgManager from '@/components/business/dli/org-manager/index.vue'

  defineOptions({ name: 'DliSystemPlatform' })
</script>
