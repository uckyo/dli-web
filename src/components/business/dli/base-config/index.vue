<!-- DLI 基础配置：平台信息、数据保留、共享与安全策略（平台 / 系统管理端） -->
<template>
  <div>
    <div class="mb-4 flex-cb flex-wrap gap-3">
      <h4 class="font-medium text-g-900">基础信息</h4>
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
        <div v-if="maskEnabled" class="mt-2 text-xs text-g-600">
          脱敏示例：患者编号
          <span class="font-medium text-g-900">DLI-2026-0347</span>
        </div>
        <div v-else class="mt-2 text-sm font-medium text-red-600">
          敏感字段脱敏已关闭，患者标识将明文展示，请谨慎操作
        </div>
      </ElFormItem>
    </ElForm>

    <!-- 系统管理端：字段与编码规则配置的权限和运行 -->
    <div v-if="props.scope === 'system'" class="art-card mt-5 px-5 py-4">
      <div class="mb-3 flex-cb">
        <h4 class="font-medium text-g-900">字段与编码规则配置</h4>
        <ElButton type="primary" @click="savePerm">保存权限配置</ElButton>
      </div>
      <div class="space-y-3">
        <div
          v-for="item in PERM_ITEMS"
          :key="item.key"
          class="flex-cb rounded-lg border border-full-d px-3 py-3"
        >
          <div>
            <p class="text-sm font-medium text-g-800">{{ item.label }}</p>
            <p class="mt-1 text-xs text-g-500">{{ item.desc }}</p>
          </div>
          <ElSwitch v-model="permConfig[item.key]" />
        </div>
      </div>
      <p v-if="permSavedAt" class="mt-3 text-xs text-g-500">最近保存：{{ permSavedAt }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {
    ElMessage,
    ElButton,
    ElForm,
    ElFormItem,
    ElInput,
    ElSelect,
    ElOption,
    ElRadioGroup,
    ElRadio,
    ElCheckboxGroup,
    ElCheckbox,
    ElSwitch
  } from 'element-plus'
  import { fetchSaveBaseConfig } from '@/mock/dli/api'

  defineOptions({ name: 'DliBaseConfig' })

  const props = defineProps<{
    scope: 'platform' | 'system'
  }>()

  /** 数据保留期限 */
  const RETENTION_OPTIONS = ['1 年', '3 年', '5 年', '长期保留']

  const nowStr = () =>
    `${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 5)}`

  const saving = ref(false)

  /** 基础配置表单 */
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

  /** 敏感字段脱敏开关真实影响页面 */
  const maskEnabled = computed(() => form.policies.includes('mask'))

  /* ------------------------------ 字段与编码规则配置（系统端） ------------------------------ */

  const permConfig = reactive({
    allowPlatformPublish: true,
    allowCenterExtend: false,
    codeGenService: true
  })
  const PERM_ITEMS: Array<{ key: keyof typeof permConfig; label: string; desc: string }> = [
    {
      key: 'allowPlatformPublish',
      label: '允许平台发布配置',
      desc: '由平台统一发布字段与编码规则'
    },
    { key: 'allowCenterExtend', label: '允许中心扩展字段', desc: '中心可在统一配置上扩展自有字段' },
    { key: 'codeGenService', label: '编号生成服务', desc: '患者编号与研究受试者编号生成服务' }
  ]
  const permSavedAt = ref('')

  function savePerm() {
    permSavedAt.value = nowStr()
    ElMessage.success('字段与编码规则配置的权限及运行开关已保存')
  }

  /** 保存基础配置（保留原有接口） */
  async function save() {
    saving.value = true
    try {
      await fetchSaveBaseConfig({ ...form, scope: props.scope })
      ElMessage.success('基础配置已保存')
    } finally {
      saving.value = false
    }
  }
</script>
