<!-- DLI 平台管理 · 用户管理（可删除） -->
<template>
  <UserManager scope="platform" />
</template>

<script setup lang="ts">
  import UserManager from '@/components/business/dli/user-manager/index.vue'

  defineOptions({ name: 'DliPlatformUser' })
</script>
