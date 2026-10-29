<!-- 技能新建 / 编辑 -->
<template>
  <ElDialog
    :model-value="modelValue"
    :title="skill ? '编辑技能' : '新建技能'"
    width="720px"
    destroy-on-close
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="96px">
      <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <ElFormItem label="技能名称" prop="name">
          <ElInput v-model="form.name" maxlength="30" placeholder="如：用药禁忌校验" />
        </ElFormItem>
        <ElFormItem label="技能类型" prop="type">
          <ElRadioGroup v-model="form.type">
            <ElRadioButton value="工具调用">工具调用</ElRadioButton>
            <ElRadioButton value="提示词">提示词</ElRadioButton>
            <ElRadioButton value="工作流">工作流</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="归属智能体" prop="agent">
          <ElSelect v-model="form.agent" placeholder="选择智能体" class="w-full">
            <ElOption v-for="item in agentOptions" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="维护人" prop="owner">
          <ElInput v-model="form.owner" placeholder="如：陈明远" />
        </ElFormItem>
        <ElFormItem label="可见范围" prop="scope">
          <ElSelect v-model="form.scope" class="w-full">
            <ElOption v-for="item in SCOPE_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="启用状态">
          <ElSwitch v-model="form.enabled" inline-prompt active-text="启用" inactive-text="停用" />
        </ElFormItem>
      </div>

      <ElFormItem label="技能描述" prop="description">
        <ElInput
          v-model="form.description"
          type="textarea"
          :rows="2"
          maxlength="120"
          show-word-limit
          placeholder="说明技能解决的问题与适用场景"
        />
      </ElFormItem>

      <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <ElFormItem label="超时（秒）">
          <ElInputNumber v-model="form.timeout" :min="5" :max="300" :step="5" class="w-full" />
        </ElFormItem>
        <ElFormItem label="失败重试">
          <ElInputNumber v-model="form.retries" :min="0" :max="5" class="w-full" />
        </ElFormItem>
      </div>

      <ElFormItem v-if="form.type === '工具调用'" label="工具标识">
        <ElInput v-model="form.tool" placeholder="如：dli.pharma.contraindication.check" />
      </ElFormItem>
      <ElFormItem v-else-if="form.type === '提示词'" label="提示词模板">
        <ElInput
          v-model="form.prompt"
          type="textarea"
          :rows="4"
          placeholder="填写角色设定、输入要求与输出约束"
        />
      </ElFormItem>
      <ElFormItem v-else label="工作流步骤">
        <ElInput
          v-model="form.workflow"
          type="textarea"
          :rows="3"
          placeholder="如：拉取数据 → 标准化 → 拟合 → 输出"
        />
      </ElFormItem>

      <ElFormItem label="入参定义">
        <div class="w-full">
          <div
            v-for="(param, index) in form.params"
            :key="index"
            class="mb-2 grid grid-cols-12 items-center gap-2"
          >
            <ElInput v-model="param.name" placeholder="参数名" class="col-span-3" size="small" />
            <ElSelect v-model="param.type" class="col-span-2" size="small">
              <ElOption label="string" value="string" />
              <ElOption label="number" value="number" />
              <ElOption label="boolean" value="boolean" />
              <ElOption label="object" value="object" />
            </ElSelect>
            <ElInput
              v-model="param.defaultValue"
              placeholder="默认值"
              class="col-span-2"
              size="small"
            />
            <ElInput
              v-model="param.description"
              placeholder="参数说明"
              class="col-span-3"
              size="small"
            />
            <ElCheckbox v-model="param.required" size="small" class="col-span-1">必填</ElCheckbox>
            <ElButton link type="danger" class="col-span-1" @click="removeParam(index)">
              删除
            </ElButton>
          </div>
          <ElButton link type="primary" @click="addParam">
            <ArtSvgIcon icon="ri:add-line" class="mr-1" />添加参数
          </ElButton>
        </div>
      </ElFormItem>
    </ElForm>

    <template #footer>
      <ElButton @click="emit('update:modelValue', false)">取消</ElButton>
      <ElButton type="primary" :loading="saving" @click="submit">保存技能</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { AGENTS } from '@/mock/dli/data'
  import { fetchCreateSkill, fetchUpdateSkill } from '@/mock/dli/api'
  import type { SkillItem, SkillParam, SkillPayload, VisibleScope } from '@/mock/dli/types'

  defineOptions({ name: 'SkillFormDialog' })

  const props = defineProps<{
    modelValue: boolean
    skill?: SkillItem | null
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    saved: [mode: 'create' | 'edit']
  }>()

  const SCOPE_OPTIONS: VisibleScope[] = ['全平台', '本中心', '课题组']
  const agentOptions = AGENTS.map((item) => item.name)

  const formRef = ref<FormInstance>()
  const saving = ref(false)

  const emptyForm = (): SkillPayload => ({
    name: '',
    type: '工具调用',
    description: '',
    agent: agentOptions[0] ?? '',
    owner: '',
    scope: '全平台',
    timeout: 30,
    retries: 1,
    enabled: true,
    params: [],
    tool: '',
    prompt: '',
    workflow: ''
  })

  const form = reactive<SkillPayload>(emptyForm())

  const rules: FormRules = {
    name: [{ required: true, message: '请输入技能名称', trigger: 'blur' }],
    type: [{ required: true, message: '请选择技能类型', trigger: 'change' }],
    agent: [{ required: true, message: '请选择归属智能体', trigger: 'change' }],
    owner: [{ required: true, message: '请输入维护人', trigger: 'blur' }],
    description: [{ required: true, message: '请输入技能描述', trigger: 'blur' }]
  }

  watch(
    () => props.modelValue,
    (visible) => {
      if (!visible) return
      Object.assign(form, emptyForm())
      if (props.skill) {
        Object.assign(form, {
          name: props.skill.name,
          type: props.skill.type,
          description: props.skill.description,
          agent: props.skill.agent,
          owner: props.skill.owner,
          scope: props.skill.scope,
          timeout: props.skill.timeout,
          retries: props.skill.retries,
          enabled: props.skill.enabled,
          params: props.skill.params.map((param) => ({ ...param })),
          tool: props.skill.tool ?? '',
          prompt: props.skill.prompt ?? '',
          workflow: props.skill.workflow ?? ''
        })
      }
    },
    { immediate: true }
  )

  function addParam() {
    const param: SkillParam = {
      name: '',
      type: 'string',
      required: false,
      defaultValue: '',
      description: ''
    }
    form.params.push(param)
  }

  function removeParam(index: number) {
    form.params.splice(index, 1)
  }

  async function submit() {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
    const invalidParam = form.params.some((param) => !param.name.trim())
    if (invalidParam) {
      ElMessage.warning('请填写完整的参数名，或删除空白参数行')
      return
    }

    saving.value = true
    try {
      const payload: SkillPayload = {
        ...form,
        name: form.name.trim(),
        owner: form.owner.trim(),
        params: form.params.map((param) => ({ ...param, name: param.name.trim() }))
      }
      if (props.skill) {
        await fetchUpdateSkill(props.skill.id, payload)
        ElMessage.success('技能配置已更新')
      } else {
        await fetchCreateSkill(payload)
        ElMessage.success('技能已创建')
      }
      emit('saved', props.skill ? 'edit' : 'create')
      emit('update:modelValue', false)
    } finally {
      saving.value = false
    }
  }
</script>
