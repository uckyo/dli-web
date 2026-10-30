<!-- DLI 系统管理 · 平台管理（可暂停服务） -->
<template>
  <OrgManager kind="platform" />
</template>

<script setup lang="ts">
  import OrgManager from '@/components/business/dli/org-manager/index.vue'

  defineOptions({ name: 'DliSystemPlatform' })
</script>
