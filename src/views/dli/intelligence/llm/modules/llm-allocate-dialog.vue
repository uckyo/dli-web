<!-- LLM 内部分配额度（非真实购买，不扩建支付模块 [批注 22]） -->
<template>
  <ElDialog
    :model-value="modelValue"
    title="分配额度"
    width="500px"
    destroy-on-close
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <template v-if="llm">
      <div class="mb-4 rounded-lg bg-g-100 px-4 py-3">
        <div class="flex-cb">
          <span class="text-sm font-medium text-g-900">{{ llm.name }}</span>
          <ElTag :type="LLM_STATUS_TAG[llm.status]" effect="plain" size="small">
            {{ llm.status }}
          </ElTag>
        </div>
        <p class="mt-1 text-xs text-g-500">
          {{ llm.vendor }} · {{ llm.model }} · 额度所属组织：{{ llm.quotaOrg }}
        </p>
        <p class="mt-2 text-sm text-g-700">
          已用额度 {{ formatTokens(llm.used) }} {{ llm.unit }} · 剩余额度
          {{ formatTokens(llm.balance) }} {{ llm.unit }}
        </p>
      </div>

      <ElForm ref="formRef" :model="form" :rules="rules" label-width="90px">
        <ElFormItem label="分配对象" prop="target">
          <ElInput v-model="form.target" maxlength="40" placeholder="如：中心A · 早诊报告Agent" />
        </ElFormItem>
        <ElFormItem label="分配数量" prop="amount">
          <ElInputNumber
            v-model="form.amount"
            :min="0"
            :precision="2"
            :step="1000"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="额度单位" prop="unit">
          <ElRadioGroup v-model="form.unit">
            <ElRadioButton value="万 Token">万 Token</ElRadioButton>
            <ElRadioButton value="Token">Token</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="分配说明" prop="note">
          <ElInput
            v-model="form.note"
            type="textarea"
            :rows="2"
            maxlength="60"
            placeholder="如：课题组季度额度分配"
          />
        </ElFormItem>
      </ElForm>

      <p class="rounded-lg bg-g-100 px-3 py-2 text-xs text-g-600">
        此操作为平台内部分配额度，仅更新剩余额度与分配记录，不涉及真实支付；如需向服务商购买用量，请按服务商流程另行确认。
      </p>
    </template>

    <template #footer>
      <ElButton @click="emit('update:modelValue', false)">取消</ElButton>
      <ElButton
        type="primary"
        :loading="submitting"
        :disabled="!llm || form.amount <= 0 || !form.target.trim()"
        @click="submit"
      >
        确认分配
      </ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { reactive, ref, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { fetchAllocateLlmQuota } from '@/mock/dli/api'
  import type { LlmItem } from '@/mock/dli/types'
  import { formatTokens, LLM_STATUS_TAG } from '../../format'
  import { useIntelligenceRole } from '../../useIntelligenceRole'

  defineOptions({ name: 'LlmAllocateDialog' })

  const props = defineProps<{
    modelValue: boolean
    llm?: LlmItem | null
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    done: []
  }>()

  const { role } = useIntelligenceRole()

  const formRef = ref<FormInstance>()
  const submitting = ref(false)
  const form = reactive({
    target: '',
    amount: 1000,
    unit: '万 Token' as 'Token' | '万 Token',
    note: ''
  })

  const rules: FormRules = {
    target: [{ required: true, message: '请填写分配对象', trigger: 'blur' }],
    amount: [{ required: true, message: '请填写分配数量', trigger: 'blur' }]
  }

  watch(
    () => props.modelValue,
    (visible) => {
      if (!visible) return
      form.target = ''
      form.amount = 1000
      form.unit = '万 Token'
      form.note = ''
    },
    { immediate: true }
  )

  async function submit() {
    if (!props.llm) return
    const valid = await formRef.value
      ?.validate()
      .then(() => true)
      .catch(() => false)
    if (!valid) return
    submitting.value = true
    try {
      await fetchAllocateLlmQuota(props.llm.id, {
        target: form.target,
        amount: form.amount,
        unit: form.unit,
        note: form.note,
        role: role.value
      })
      ElMessage.success(
        `已为「${form.target.trim()}」分配 ${form.amount} ${form.unit}，剩余额度已更新`
      )
      emit('done')
      emit('update:modelValue', false)
    } catch (error) {
      ElMessage.error((error as Error)?.message ?? '分配失败，请稍后重试')
    } finally {
      submitting.value = false
    }
  }
</script>
