<!-- LLM 充值 -->
<template>
  <ElDialog
    :model-value="modelValue"
    title="模型充值"
    width="480px"
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
          {{ llm.vendor }} · {{ llm.model }} · 输入单价 {{ llm.priceIn }} 元 / 千 Token
        </p>
        <p class="mt-2 text-sm text-g-700">
          当前余额 {{ formatTokens(llm.balance) }} Token · 已用 {{ formatTokens(llm.used) }} Token
        </p>
      </div>

      <ElForm label-width="90px">
        <ElFormItem label="充值金额">
          <ElInputNumber v-model="amount" :min="10" :max="100000" :step="100" class="w-full">
            <template #prefix>¥</template>
          </ElInputNumber>
        </ElFormItem>
        <ElFormItem label="预计 Token">
          <div class="text-sm text-g-900">{{ formatTokens(estimateTokens) }} Token</div>
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="note" maxlength="40" placeholder="如：季度额度补充" />
        </ElFormItem>
      </ElForm>

      <p class="rounded-lg bg-g-100 px-3 py-2 text-xs text-g-600">
        演示环境仅更新余额与充值记录，不会发起真实支付；换算按输入单价估算。
      </p>
    </template>

    <template #footer>
      <ElButton @click="emit('update:modelValue', false)">取消</ElButton>
      <ElButton
        type="primary"
        :loading="submitting"
        :disabled="!llm || amount <= 0"
        @click="submit"
      >
        确认充值
      </ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { fetchRechargeLlm } from '@/mock/dli/api'
  import type { LlmItem } from '@/mock/dli/types'
  import { formatTokens, LLM_STATUS_TAG } from '../../format'

  defineOptions({ name: 'LlmRechargeDialog' })

  const props = defineProps<{
    modelValue: boolean
    llm?: LlmItem | null
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    done: []
  }>()

  const amount = ref(500)
  const note = ref('')
  const submitting = ref(false)

  const estimateTokens = computed(() => {
    if (!props.llm) return 0
    return Math.round((amount.value / Math.max(props.llm.priceIn, 0.0001)) * 1000)
  })

  watch(
    () => props.modelValue,
    (visible) => {
      if (!visible) return
      amount.value = 500
      note.value = ''
    },
    { immediate: true }
  )

  async function submit() {
    if (!props.llm) return
    submitting.value = true
    try {
      const tokens = await fetchRechargeLlm(props.llm.id, amount.value, note.value.trim())
      ElMessage.success(`充值成功，新增 ${formatTokens(tokens)} Token`)
      emit('done')
      emit('update:modelValue', false)
    } finally {
      submitting.value = false
    }
  }
</script>
