<!-- DLI 模型管理：早筛预警 / 早诊预警 / 转归预测三个方向占位，模型接入后对接 -->
<template>
  <div v-loading="loading" class="art-full-height overflow-y-auto pb-5">
    <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <div v-for="model in models" :key="model.id" class="art-card flex flex-col p-5">
        <div class="flex-cb items-start gap-3">
          <div class="min-w-0">
            <div class="flex-c gap-2">
              <p class="truncate text-base font-medium text-g-900">{{ model.name }}</p>
              <ElTag :type="model.connected ? 'success' : 'info'" effect="plain">
                {{ model.connected ? '已接入' : '未接入' }}
              </ElTag>
            </div>
            <p class="mt-1 text-xs text-g-500">{{ model.id }}</p>
          </div>
          <ElSwitch
            v-model="model.enabled"
            :disabled="!model.connected"
            :before-change="() => toggleModel(model)"
            inline-prompt
            active-text="启动"
            inactive-text="停用"
          />
        </div>

        <div class="mt-5 space-y-3 text-sm">
          <div class="flex gap-2">
            <span class="w-20 shrink-0 text-g-500">所属方向</span>
            <span class="text-g-900">{{ model.field }}</span>
          </div>
          <div class="flex gap-2">
            <span class="w-20 shrink-0 text-g-500">模型方式</span>
            <span class="text-g-900">{{ model.mode || '待配置' }}</span>
          </div>
          <div class="flex gap-2">
            <span class="w-20 shrink-0 text-g-500">时间点</span>
            <div v-if="model.timePoints.length" class="flex flex-wrap gap-1">
              <ElTag v-for="point in model.timePoints" :key="point" size="small" effect="light">
                {{ point }}
              </ElTag>
            </div>
            <span v-else class="text-g-500">待配置</span>
          </div>
          <div class="flex gap-2">
            <span class="w-20 shrink-0 text-g-500">输入</span>
            <span class="min-w-0 flex-1 text-g-800">{{ model.input || '待配置' }}</span>
          </div>
          <div class="flex gap-2">
            <span class="w-20 shrink-0 text-g-500">输出</span>
            <span class="min-w-0 flex-1 text-g-800">{{ model.output || '待配置' }}</span>
          </div>
        </div>

        <div class="mt-auto flex justify-end gap-3 pt-4">
          <ElButton link type="primary" @click="openDetail(model)">查看详情</ElButton>
          <ElButton link type="primary" @click="openEdit(model)">编辑配置</ElButton>
        </div>
      </div>
    </div>

    <!-- 模型详情 -->
    <ElDialog v-model="detailVisible" title="模型详情" width="560px">
      <ElDescriptions v-if="activeModel" :column="1" border size="small" label-width="110px">
        <ElDescriptionsItem label="模型名称">{{ activeModel.name }}</ElDescriptionsItem>
        <ElDescriptionsItem label="模型编号">{{ activeModel.id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="所属方向">{{ activeModel.field }}</ElDescriptionsItem>
        <ElDescriptionsItem label="模型方式">{{ activeModel.mode || '待配置' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="时间点">
          {{ activeModel.timePoints.length ? activeModel.timePoints.join('、') : '待配置' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="输入">{{ activeModel.input || '待配置' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="输出">{{ activeModel.output || '待配置' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="接入状态">
          {{ activeModel.connected ? '已接入' : '未接入' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="启动状态">
          {{ activeModel.enabled ? '已启动' : '未启动' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="更新时间">{{ activeModel.updatedAt }}</ElDescriptionsItem>
      </ElDescriptions>
    </ElDialog>

    <!-- 编辑配置 -->
    <ElDialog v-model="editVisible" title="编辑配置" width="620px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="96px">
        <ElFormItem label="模型名称" prop="name">
          <ElInput v-model="form.name" maxlength="40" placeholder="请输入模型名称" />
        </ElFormItem>
        <ElFormItem label="所属方向" prop="field">
          <ElSelect v-model="form.field" class="w-full" placeholder="请选择所属方向">
            <ElOption v-for="item in FIELD_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="模型方式">
          <ElSelect
            v-model="form.mode"
            class="w-full"
            clearable
            placeholder="待配置"
            @change="handleModeChange"
          >
            <ElOption label="纵向（时间点多选）" value="纵向" />
            <ElOption label="横向（时间点单选）" value="横向" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="时间点">
          <ElSelect
            v-if="form.mode === '纵向'"
            v-model="form.timePoints"
            class="w-full"
            multiple
            clearable
            placeholder="可选择多个时间点"
          >
            <ElOption
              v-for="point in TIME_POINT_OPTIONS"
              :key="point"
              :label="point"
              :value="point"
            />
          </ElSelect>
          <ElSelect
            v-else
            :model-value="form.timePoints[0] || ''"
            class="w-full"
            clearable
            :disabled="form.mode !== '横向'"
            placeholder="待配置"
            @update:model-value="(value: string) => (form.timePoints = value ? [value] : [])"
          >
            <ElOption
              v-for="point in TIME_POINT_OPTIONS"
              :key="point"
              :label="point"
              :value="point"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="输入">
          <ElInput v-model="form.input" type="textarea" :rows="2" placeholder="可缺省" />
        </ElFormItem>
        <ElFormItem label="输出">
          <ElInput v-model="form.output" type="textarea" :rows="2" placeholder="请输入输出摘要" />
        </ElFormItem>
        <ElFormItem label="启动开关">
          <ElSwitch
            v-model="form.enabled"
            :disabled="!form.connected"
            inline-prompt
            active-text="启动"
            inactive-text="停用"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="editVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSubmit">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import { fetchGetModels, fetchSaveModel, fetchToggleModel } from '@/mock/dli/api'
  import type { AiModel, ModelField } from '@/mock/dli/types'

  defineOptions({ name: 'DliModel' })

  /** 可选时间点：具体选项待模型提供方确认 */
  const TIME_POINT_OPTIONS = [
    'T0 基线',
    'T1 用药 1 月',
    'T2 用药 3 月',
    'T3 用药 6 月',
    'T4 用药 12 月'
  ]

  const FIELD_OPTIONS: ModelField[] = ['早筛预警', '早诊预警', '转归预测']

  const loading = ref(true)
  const saving = ref(false)
  const models = ref<AiModel[]>([])

  const detailVisible = ref(false)
  const activeModel = ref<AiModel>()
  const editVisible = ref(false)
  const formRef = ref<FormInstance>()

  function emptyModel(): AiModel {
    return {
      id: '',
      name: '',
      field: '早筛预警',
      mode: '',
      timePoints: [],
      input: '',
      output: '',
      connected: false,
      enabled: false,
      updatedAt: ''
    }
  }

  const form = reactive<AiModel>(emptyModel())

  const rules: FormRules = {
    name: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
    field: [{ required: true, message: '请选择所属方向', trigger: 'change' }]
  }

  async function loadModels() {
    loading.value = true
    try {
      models.value = await fetchGetModels()
    } finally {
      loading.value = false
    }
  }

  function openDetail(model: AiModel) {
    activeModel.value = model
    detailVisible.value = true
  }

  function openEdit(model: AiModel) {
    activeModel.value = model
    Object.assign(form, { ...model, timePoints: [...model.timePoints] })
    editVisible.value = true
  }

  /** 切换方式后收敛时间点：横向只能保留一个，未配置时清空 */
  function handleModeChange() {
    if (!form.mode) form.timePoints = []
    else if (form.mode === '横向') form.timePoints = form.timePoints.slice(0, 1)
  }

  async function toggleModel(model: AiModel): Promise<boolean> {
    const next = !model.enabled
    await fetchToggleModel(model.id, next)
    ElMessage.success(`${model.name} 已${next ? '启动' : '停用'}`)
    return true
  }

  async function handleSubmit() {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    saving.value = true
    try {
      await fetchSaveModel({
        ...form,
        timePoints: [...form.timePoints],
        updatedAt: new Date().toISOString().slice(0, 10)
      })
      ElMessage.success('模型配置已更新')
      editVisible.value = false
      await loadModels()
    } finally {
      saving.value = false
    }
  }

  onMounted(loadModels)
</script>
