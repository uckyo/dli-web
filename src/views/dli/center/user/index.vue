<!-- DLI 中心管理 · 用户管理（中心管理员，不可删除用户） -->
<template>
  <UserManager scope="center" />
</template>

<script setup lang="ts">
  import UserManager from '@/components/business/dli/user-manager/index.vue'

  defineOptions({ name: 'DliCenterUser' })
</script>
