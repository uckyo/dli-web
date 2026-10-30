<!-- DLI 中心管理 · 课题组管理（中心管理员，不可删除课题组） -->
<template>
  <OrgManager kind="group" />
</template>

<script setup lang="ts">
  import OrgManager from '@/components/business/dli/org-manager/index.vue'

  defineOptions({ name: 'DliCenterGroup' })
</script>
