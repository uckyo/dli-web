<!-- DLI 系统管理 · 用户管理（不可删除） -->
<template>
  <UserManager scope="system" />
</template>

<script setup lang="ts">
  import UserManager from '@/components/business/dli/user-manager/index.vue'

  defineOptions({ name: 'DliSystemUser' })
</script>
