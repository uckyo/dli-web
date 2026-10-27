<!-- DLI 基础配置：平台信息、数据保留、共享与安全策略（平台 / 系统管理端） -->
<template>
  <div>
    <div class="mb-4 flex-cb flex-wrap gap-3">
      <div>
        <h4 class="font-medium text-g-900">基础配置</h4>
      </div>
      <ElButton type="primary" :loading="saving" @click="save">保存配置</ElButton>
    </div>

    <ElForm :model="form" label-width="120px" class="max-w-3xl">
      <ElFormItem label="平台名称">
        <ElInput v-model="form.platformName" maxlength="30" />
      </ElFormItem>
      <ElFormItem label="平台简称">
        <ElInput v-model="form.shortName" maxlength="16" />
      </ElFormItem>
      <ElFormItem label="服务地址">
        <ElInput v-model="form.baseUrl" placeholder="https://" />
      </ElFormItem>
      <ElFormItem label="联系人">
        <ElInput v-model="form.contact" maxlength="20" />
      </ElFormItem>
      <ElFormItem label="联系电话">
        <ElInput v-model="form.phone" maxlength="20" />
      </ElFormItem>
      <ElFormItem label="数据保留期限">
        <ElSelect v-model="form.retention" style="width: 220px">
          <ElOption v-for="item in RETENTION_OPTIONS" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="默认共享级别">
        <ElRadioGroup v-model="form.defaultShare">
          <ElRadio value="课题组">课题组</ElRadio>
          <ElRadio value="中心">中心</ElRadio>
          <ElRadio value="平台">平台</ElRadio>
        </ElRadioGroup>
      </ElFormItem>
      <ElFormItem label="安全策略">
        <ElCheckboxGroup v-model="form.policies">
          <ElCheckbox value="mfa">强制双因子认证</ElCheckbox>
          <ElCheckbox value="audit">操作全量审计</ElCheckbox>
          <ElCheckbox value="mask">敏感字段脱敏</ElCheckbox>
        </ElCheckboxGroup>
      </ElFormItem>
    </ElForm>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import { fetchSaveBaseConfig } from '@/mock/dli/api'

  defineOptions({ name: 'DliBaseConfig' })

  const props = defineProps<{
    scope: 'platform' | 'system'
  }>()

  /** 数据保留期限 */
  const RETENTION_OPTIONS = ['1 年', '3 年', '5 年', '长期保留']

  const saving = ref(false)

  /** 基础配置表单（演示数据） */
  const form = reactive({
    platformName: 'DLI 疾病智能管理平台',
    shortName: 'DLI 平台',
    baseUrl: 'https://dli.example.com',
    contact: props.scope === 'system' ? '系统管理员' : '张启明',
    phone: '400-800-2026',
    retention: '5 年',
    defaultShare: '课题组',
    policies: ['audit', 'mask'] as string[]
  })

  /** 保存配置（演示） */
  async function save() {
    saving.value = true
    try {
      await fetchSaveBaseConfig({ ...form, scope: props.scope })
      ElMessage.success('基础配置已保存（演示）')
    } finally {
      saving.value = false
    }
  }
</script>
