<!-- DLI 中心管理 · 同意书（批注 16）：只维护本中心草稿，批准与发布归平台管理员 -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <div class="art-card px-5 py-5">
      <ConsentTemplates scope="center" :center="currentCenter" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import ConsentTemplates from '@/components/business/dli/consent-templates/index.vue'
  import { CENTERS_DATA } from '@/mock/dli/data'

  defineOptions({ name: 'DliCenterConsent' })

  /** 演示环境以登录中心作为范围；实际由账号所属中心下发 */
  const currentCenter = CENTERS_DATA[0]?.name ?? '华东中心'
</script>
