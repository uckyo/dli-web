<!-- DLI 中心管理（中心管理员）：课题组管理 / 用户管理（均不可删除） -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <ElTabs v-model="activeTab" class="art-card px-5 pb-5 pt-2">
      <ElTabPane label="课题组管理" name="group">
        <OrgManager kind="group" />
      </ElTabPane>
      <ElTabPane label="用户管理" name="user">
        <UserManager scope="center" />
      </ElTabPane>
    </ElTabs>
  </div>
</template>

<script setup lang="ts">
  import OrgManager from '@/components/business/dli/org-manager/index.vue'
  import UserManager from '@/components/business/dli/user-manager/index.vue'

  defineOptions({ name: 'DliCenter' })

  const activeTab = ref('group')
</script>
