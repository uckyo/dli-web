<!-- DLI 系统管理 · 用户管理（不可删除） -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <div class="art-card px-5 py-5">
      <UserManager scope="system" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import UserManager from '@/components/business/dli/user-manager/index.vue'

  defineOptions({ name: 'DliSystemUser' })
</script>
