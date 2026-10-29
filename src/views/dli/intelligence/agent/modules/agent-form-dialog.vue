<!-- 智能体新建 / 编辑 -->
<template>
  <ElDialog
    :model-value="modelValue"
    :title="agent ? '编辑智能体' : '新建智能体'"
    width="760px"
    destroy-on-close
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
      <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <ElFormItem label="名称" prop="name">
          <ElInput v-model="form.name" maxlength="30" placeholder="如：患者教育Agent" />
        </ElFormItem>
        <ElFormItem label="职责" prop="role">
          <ElInput v-model="form.role" maxlength="30" placeholder="如：疾病科普与用药指导" />
        </ElFormItem>
        <ElFormItem label="绑定模型" prop="model">
          <ElSelect v-model="form.model" class="w-full">
            <ElOption v-for="item in modelOptions" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="可见范围" prop="scope">
          <ElSelect v-model="form.scope" class="w-full">
            <ElOption v-for="item in SCOPE_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
      </div>

      <ElFormItem label="简介" prop="description">
        <ElInput
          v-model="form.description"
          type="textarea"
          :rows="2"
          maxlength="120"
          show-word-limit
          placeholder="说明智能体的服务对象与主要能力"
        />
      </ElFormItem>

      <ElFormItem label="关联技能" prop="skills">
        <ElSelect v-model="form.skills" multiple filterable class="w-full">
          <ElOption v-for="item in skillOptions" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>

      <ElFormItem label="关联知识库">
        <ElSelect v-model="form.knowledge" multiple filterable class="w-full">
          <ElOption v-for="item in knowledgeOptions" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>

      <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
        <ElFormItem label="Temperature">
          <ElInputNumber
            v-model="form.temperature"
            :min="0"
            :max="1"
            :step="0.1"
            :precision="1"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="Top P">
          <ElInputNumber
            v-model="form.topP"
            :min="0.1"
            :max="1"
            :step="0.05"
            :precision="2"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="最大轮次">
          <ElInputNumber v-model="form.maxRounds" :min="1" :max="30" class="w-full" />
        </ElFormItem>
      </div>

      <ElFormItem label="系统提示词" prop="prompt">
        <ElInput
          v-model="form.prompt"
          type="textarea"
          :rows="5"
          maxlength="800"
          show-word-limit
          placeholder="描述角色设定、输出格式与安全边界"
        />
      </ElFormItem>

      <ElFormItem label="兜底策略" prop="fallback">
        <ElInput
          v-model="form.fallback"
          type="textarea"
          :rows="2"
          maxlength="160"
          placeholder="如：连续 2 轮未识别意图时转人工"
        />
      </ElFormItem>

      <ElFormItem label="启用状态">
        <ElSwitch v-model="form.enabled" inline-prompt active-text="启用" inactive-text="停用" />
      </ElFormItem>
    </ElForm>

    <template #footer>
      <ElButton @click="emit('update:modelValue', false)">取消</ElButton>
      <ElButton type="primary" :loading="saving" @click="submit">保存智能体</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { KNOWLEDGE, LLMS, SKILLS } from '@/mock/dli/data'
  import { fetchCreateAgent, fetchUpdateAgent } from '@/mock/dli/api'
  import type { AgentItem, AgentPayload, VisibleScope } from '@/mock/dli/types'

  defineOptions({ name: 'AgentFormDialog' })

  const props = defineProps<{
    modelValue: boolean
    agent?: AgentItem | null
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    saved: [mode: 'create' | 'edit']
  }>()

  const SCOPE_OPTIONS: VisibleScope[] = ['全平台', '本中心', '课题组']
  const modelOptions = LLMS.map((item) => item.name)
  const skillOptions = SKILLS.map((item) => item.name)
  const knowledgeOptions = KNOWLEDGE.map((item) => item.name)

  const formRef = ref<FormInstance>()
  const saving = ref(false)

  const emptyForm = (): AgentPayload => ({
    name: '',
    role: '',
    description: '',
    model: modelOptions[0] ?? '',
    knowledge: [],
    skills: [],
    scope: '全平台',
    temperature: 0.3,
    topP: 0.85,
    maxRounds: 8,
    prompt: '',
    fallback: '',
    enabled: true
  })

  const form = reactive<AgentPayload>(emptyForm())

  const rules: FormRules = {
    name: [{ required: true, message: '请输入智能体名称', trigger: 'blur' }],
    role: [{ required: true, message: '请输入职责', trigger: 'blur' }],
    description: [{ required: true, message: '请输入简介', trigger: 'blur' }],
    model: [{ required: true, message: '请选择绑定模型', trigger: 'change' }],
    scope: [{ required: true, message: '请选择可见范围', trigger: 'change' }],
    skills: [
      { required: true, type: 'array', min: 1, message: '至少关联一个技能', trigger: 'change' }
    ],
    prompt: [{ required: true, message: '请填写系统提示词', trigger: 'blur' }],
    fallback: [{ required: true, message: '请填写兜底策略', trigger: 'blur' }]
  }

  watch(
    () => props.modelValue,
    (visible) => {
      if (!visible) return
      Object.assign(form, emptyForm())
      if (props.agent) {
        Object.assign(form, {
          name: props.agent.name,
          role: props.agent.role,
          description: props.agent.description,
          model: props.agent.model,
          knowledge: [...props.agent.knowledge],
          skills: [...props.agent.skills],
          scope: props.agent.scope,
          temperature: props.agent.temperature,
          topP: props.agent.topP,
          maxRounds: props.agent.maxRounds,
          prompt: props.agent.prompt,
          fallback: props.agent.fallback,
          enabled: props.agent.enabled
        })
      }
    },
    { immediate: true }
  )

  async function submit() {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    saving.value = true
    try {
      const payload: AgentPayload = {
        ...form,
        name: form.name.trim(),
        role: form.role.trim(),
        knowledge: [...form.knowledge],
        skills: [...form.skills],
        prompt: form.prompt.trim(),
        fallback: form.fallback.trim()
      }
      if (props.agent) {
        await fetchUpdateAgent(props.agent.id, payload)
        ElMessage.success('智能体配置已更新')
      } else {
        await fetchCreateAgent(payload)
        ElMessage.success('智能体已创建')
      }
      emit('saved', props.agent ? 'edit' : 'create')
      emit('update:modelValue', false)
    } finally {
      saving.value = false
    }
  }
</script>
