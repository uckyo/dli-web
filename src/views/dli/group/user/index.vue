<!-- DLI 课题组管理 · 用户管理（课题组管理员，不可删除用户） -->
<template>
  <UserManager scope="group" />
</template>

<script setup lang="ts">
  import UserManager from '@/components/business/dli/user-manager/index.vue'

  defineOptions({ name: 'DliGroupUser' })
</script>
