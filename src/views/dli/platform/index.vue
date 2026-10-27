<!-- DLI 平台管理（平台管理员）：基础配置 / 中心管理（可删除）/ 用户管理（可删除） -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <ElTabs v-model="activeTab" class="art-card px-5 pb-5 pt-2">
      <ElTabPane label="基础配置" name="config">
        <BaseConfig scope="platform" />
      </ElTabPane>
      <ElTabPane label="中心管理" name="center">
        <OrgManager kind="center" />
      </ElTabPane>
      <ElTabPane label="用户管理" name="user">
        <UserManager scope="platform" />
      </ElTabPane>
    </ElTabs>
  </div>
</template>

<script setup lang="ts">
  import BaseConfig from '@/components/business/dli/base-config/index.vue'
  import OrgManager from '@/components/business/dli/org-manager/index.vue'
  import UserManager from '@/components/business/dli/user-manager/index.vue'

  defineOptions({ name: 'DliPlatform' })

  const activeTab = ref('config')
</script>
