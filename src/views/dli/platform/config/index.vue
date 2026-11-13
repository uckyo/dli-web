<!-- DLI 平台管理 · 基础配置（批注 16/17/18）：四个页签，不另加左侧子菜单 -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <div class="art-card px-5 py-4">
      <ElTabs v-model="activeTab" class="dli-config-tabs">
        <ElTabPane label="基础信息" name="basic">
          <BaseConfig scope="platform" />
        </ElTabPane>
        <ElTabPane label="知情同意书" name="consent">
          <ConsentTemplates scope="platform" />
        </ElTabPane>
        <ElTabPane label="患者字段配置" name="fields">
          <PatientFields />
        </ElTabPane>
        <ElTabPane label="编码规则配置" name="code">
          <CodeRules />
        </ElTabPane>
      </ElTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ElTabs, ElTabPane } from 'element-plus'
  import { ref } from 'vue'
  import BaseConfig from '@/components/business/dli/base-config/index.vue'
  import ConsentTemplates from '@/components/business/dli/consent-templates/index.vue'
  import PatientFields from '@/views/dli/config/fields/index.vue'
  import CodeRules from '@/views/dli/config/code/index.vue'

  defineOptions({ name: 'DliPlatformConfig' })

  const activeTab = ref('basic')
</script>

<style scoped lang="scss">
  /* 子页面原本是独立全高页，嵌入页签后改为随内容自适应，避免出现嵌套滚动容器 */
  .dli-config-tabs {
    :deep(.art-full-height) {
      height: auto !important;
      padding-bottom: 0 !important;
      overflow: visible !important;
    }

    :deep(.art-table-card) {
      box-shadow: none;
    }
  }
</style>
