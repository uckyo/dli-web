<!-- DLI 平台管理 · 中心管理（可删除） -->
<template>
  <OrgManager kind="center" />
</template>

<script setup lang="ts">
  import OrgManager from '@/components/business/dli/org-manager/index.vue'

  defineOptions({ name: 'DliPlatformCenter' })
</script>
