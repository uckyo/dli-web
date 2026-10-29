<!-- 知识库新建 / 编辑 -->
<template>
  <ElDialog
    :model-value="modelValue"
    :title="knowledge ? '编辑知识库' : '新建知识库'"
    width="680px"
    destroy-on-close
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="110px">
      <ElFormItem label="知识库名称" prop="name">
        <ElInput v-model="form.name" maxlength="30" placeholder="如：DLI 诊疗指南库" />
      </ElFormItem>
      <ElFormItem label="描述" prop="description">
        <ElInput
          v-model="form.description"
          type="textarea"
          :rows="2"
          maxlength="120"
          show-word-limit
          placeholder="说明知识库收录的内容范围"
        />
      </ElFormItem>

      <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <ElFormItem label="维护人" prop="maintainer">
          <ElInput v-model="form.maintainer" placeholder="如：陈明远" />
        </ElFormItem>
        <ElFormItem label="可见范围" prop="scope">
          <ElSelect v-model="form.scope" class="w-full">
            <ElOption v-for="item in SCOPE_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
      </div>

      <ElFormItem label="向量模型" prop="embedding">
        <ElSelect v-model="form.embedding" class="w-full">
          <ElOption v-for="item in EMBEDDING_OPTIONS" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>

      <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <ElFormItem label="切片长度">
          <ElInputNumber
            v-model="form.chunkSize"
            :min="200"
            :max="2000"
            :step="100"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="切片重叠">
          <ElInputNumber
            v-model="form.chunkOverlap"
            :min="0"
            :max="500"
            :step="20"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="召回 TopK">
          <ElInputNumber v-model="form.topK" :min="1" :max="10" class="w-full" />
        </ElFormItem>
        <ElFormItem label="相似度阈值">
          <ElInputNumber
            v-model="form.scoreThreshold"
            :min="0"
            :max="1"
            :step="0.01"
            :precision="2"
            class="w-full"
          />
        </ElFormItem>
      </div>

      <ElFormItem label="启用状态">
        <ElSwitch v-model="form.enabled" inline-prompt active-text="启用" inactive-text="停用" />
      </ElFormItem>
    </ElForm>

    <template #footer>
      <ElButton @click="emit('update:modelValue', false)">取消</ElButton>
      <ElButton type="primary" :loading="saving" @click="submit">保存知识库</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { fetchCreateKnowledge, fetchUpdateKnowledge } from '@/mock/dli/api'
  import type { KnowledgeItem, KnowledgePayload, VisibleScope } from '@/mock/dli/types'

  defineOptions({ name: 'KnowledgeFormDialog' })

  const props = defineProps<{
    modelValue: boolean
    knowledge?: KnowledgeItem | null
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    saved: [mode: 'create' | 'edit']
  }>()

  const SCOPE_OPTIONS: VisibleScope[] = ['全平台', '本中心', '课题组']
  const EMBEDDING_OPTIONS = [
    'bge-large-zh-v1.5',
    'bge-m3',
    'bge-small-zh-v1.5',
    'text-embedding-3-large'
  ]

  const formRef = ref<FormInstance>()
  const saving = ref(false)

  const emptyForm = (): KnowledgePayload => ({
    name: '',
    description: '',
    maintainer: '',
    scope: '全平台',
    embedding: 'bge-large-zh-v1.5',
    chunkSize: 800,
    chunkOverlap: 120,
    topK: 5,
    scoreThreshold: 0.7,
    enabled: true
  })

  const form = reactive<KnowledgePayload>(emptyForm())

  const rules: FormRules = {
    name: [{ required: true, message: '请输入知识库名称', trigger: 'blur' }],
    description: [{ required: true, message: '请输入知识库描述', trigger: 'blur' }],
    maintainer: [{ required: true, message: '请输入维护人', trigger: 'blur' }],
    embedding: [{ required: true, message: '请选择向量模型', trigger: 'change' }]
  }

  watch(
    () => props.modelValue,
    (visible) => {
      if (!visible) return
      Object.assign(form, emptyForm())
      if (props.knowledge) {
        Object.assign(form, {
          name: props.knowledge.name,
          description: props.knowledge.description,
          maintainer: props.knowledge.maintainer,
          scope: props.knowledge.scope,
          embedding: props.knowledge.embedding,
          chunkSize: props.knowledge.chunkSize,
          chunkOverlap: props.knowledge.chunkOverlap,
          topK: props.knowledge.topK,
          scoreThreshold: props.knowledge.scoreThreshold,
          enabled: props.knowledge.enabled
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
      const payload: KnowledgePayload = { ...form, name: form.name.trim() }
      if (props.knowledge) {
        await fetchUpdateKnowledge(props.knowledge.id, payload)
        ElMessage.success('知识库配置已保存')
      } else {
        await fetchCreateKnowledge(payload)
        ElMessage.success('知识库已创建，可上传文档')
      }
      emit('saved', props.knowledge ? 'edit' : 'create')
      emit('update:modelValue', false)
    } finally {
      saving.value = false
    }
  }
</script>
