<!-- DLI 模型管理：纵向（多时间点）/ 横向（单时间点）、输入输出配置与启动开关 -->
<template>
  <div class="art-full-height overflow-y-auto pb-5" v-loading="loading">
    <div class="mb-4 flex-c flex-wrap gap-3">
      <ElButton type="primary" @click="openCreate">新建模型</ElButton>
    </div>

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <div v-for="model in models" :key="model.id" class="art-card p-5">
        <div class="flex-cb gap-3">
          <div class="flex-c gap-2">
            <span class="text-base font-medium text-g-900">{{ model.name }}</span>
            <ElTag :type="model.direction === '纵向' ? 'primary' : 'warning'" effect="plain">
              {{ model.direction }}
            </ElTag>
          </div>
          <ElSwitch
            v-model="model.enabled"
            :before-change="() => toggleModel(model)"
            inline-prompt
            active-text="启动"
            inactive-text="停用"
          />
        </div>

        <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-lg bg-g-100 px-3 py-2">
            <p class="text-xs text-g-500">模型编号</p>
            <p class="mt-1 text-g-900">{{ model.id }}</p>
          </div>
          <div class="rounded-lg bg-g-100 px-3 py-2">
            <p class="text-xs text-g-500">准确率</p>
            <p class="mt-1 text-g-900">{{ (model.accuracy * 100).toFixed(1) }}%</p>
          </div>
        </div>

        <div class="mt-3">
          <p class="text-xs text-g-500">
            时间点（{{ model.direction === '纵向' ? '多选' : '单选' }}）
          </p>
          <div class="mt-1 flex flex-wrap gap-1">
            <ElTag v-for="point in model.timePoints" :key="point" size="small" effect="light">
              {{ point }}
            </ElTag>
          </div>
        </div>

        <div class="mt-3 space-y-2 text-sm">
          <div class="flex gap-2">
            <span class="w-16 shrink-0 text-g-500">输入</span>
            <span class="text-g-800">{{ model.input || '缺省（使用平台默认数据集）' }}</span>
          </div>
          <div class="flex gap-2">
            <span class="w-16 shrink-0 text-g-500">输出</span>
            <span class="text-g-800">{{ model.output }}</span>
          </div>
        </div>

        <div class="mt-4 flex-cb border-t border-full-d pt-3">
          <span class="text-xs text-g-500">更新于 {{ model.updatedAt }}</span>
          <ElButton link type="primary" @click="openEdit(model)">编辑配置</ElButton>
        </div>
      </div>
    </div>

    <!-- 新建 / 编辑模型 -->
    <ElDialog v-model="dialogVisible" :title="editing ? '编辑模型配置' : '新建模型'" width="620px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="96px">
        <ElFormItem label="模型名称" prop="name">
          <ElInput v-model="form.name" placeholder="如：早筛风险预测模型" />
        </ElFormItem>
        <ElFormItem label="模型方向" prop="direction">
          <ElRadioGroup v-model="form.direction" @change="handleDirectionChange">
            <ElRadioButton value="纵向">纵向（多时间点）</ElRadioButton>
            <ElRadioButton value="横向">横向（单时间点）</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="时间点" prop="timePoints">
          <ElSelect
            v-model="form.timePoints"
            :multiple="form.direction === '纵向'"
            placeholder="请选择时间点"
            style="width: 100%"
          >
            <ElOption
              v-for="point in TIME_POINT_OPTIONS"
              :key="point"
              :label="point"
              :value="point"
            />
          </ElSelect>
          <p class="mt-1 text-xs text-g-500">
            {{
              form.direction === '纵向'
                ? '纵向模型可多选时间点（如基线、用药 1/3/6 月）'
                : '横向模型仅可选择单一时间点'
            }}
          </p>
        </ElFormItem>
        <ElFormItem label="输入">
          <ElInput
            v-model="form.input"
            type="textarea"
            :rows="2"
            placeholder="可缺省，缺省时使用平台默认多模态数据集"
          />
        </ElFormItem>
        <ElFormItem label="输出" prop="output">
          <ElInput
            v-model="form.output"
            type="textarea"
            :rows="2"
            placeholder="如：风险概率、分层结果、建议"
          />
        </ElFormItem>
        <ElFormItem label="启动开关">
          <ElSwitch v-model="form.enabled" inline-prompt active-text="启动" inactive-text="停用" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSubmit">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import { fetchGetModels, fetchSaveModel, fetchToggleModel } from '@/mock/dli/api'
  import type { AiModel } from '@/mock/dli/types'

  defineOptions({ name: 'DliModel' })

  /** 可选时间点 */
  const TIME_POINT_OPTIONS = [
    'T0 基线',
    'T1 用药 1 月',
    'T2 用药 3 月',
    'T3 用药 6 月',
    'T4 用药 12 月'
  ]

  const loading = ref(true)
  const saving = ref(false)
  const models = ref<AiModel[]>([])

  const dialogVisible = ref(false)
  const editing = ref(false)
  const formRef = ref<FormInstance>()

  const form = reactive<AiModel>({
    id: '',
    name: '',
    direction: '纵向',
    timePoints: [],
    input: '',
    output: '',
    enabled: true,
    accuracy: 0,
    updatedAt: ''
  })

  const rules: FormRules = {
    name: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
    direction: [{ required: true, message: '请选择模型方向', trigger: 'change' }],
    timePoints: [{ required: true, message: '请选择时间点', trigger: 'change' }],
    output: [{ required: true, message: '请输入输出内容', trigger: 'blur' }]
  }

  /** 加载模型列表 */
  async function loadModels() {
    loading.value = true
    try {
      models.value = await fetchGetModels()
    } finally {
      loading.value = false
    }
  }

  /** 新建 */
  function openCreate() {
    editing.value = false
    Object.assign(form, {
      id: '',
      name: '',
      direction: '纵向',
      timePoints: [],
      input: '',
      output: '',
      enabled: true,
      accuracy: 0,
      updatedAt: ''
    })
    dialogVisible.value = true
  }

  /** 编辑 */
  function openEdit(model: AiModel) {
    editing.value = true
    Object.assign(form, { ...model, timePoints: [...model.timePoints] })
    dialogVisible.value = true
  }

  /** 切换方向时重置时间点选择 */
  function handleDirectionChange(value: string | number | boolean | undefined) {
    void value
    form.timePoints = []
  }

  /** 启停模型 */
  async function toggleModel(model: AiModel): Promise<boolean> {
    const next = !model.enabled
    await fetchToggleModel(model.id, next)
    ElMessage.success(`${model.name} 已${next ? '启动' : '停用'}`)
    return true
  }

  /** 保存模型 */
  async function handleSubmit() {
    if (!formRef.value) return
    await formRef.value.validate(async (valid) => {
      if (!valid) return
      saving.value = true
      try {
        const today = new Date().toISOString().slice(0, 10)
        await fetchSaveModel({
          ...form,
          id: form.id || `M-${String(models.value.length + 1).padStart(3, '0')}`,
          accuracy: form.accuracy || 0.8,
          updatedAt: today
        })
        ElMessage.success(editing.value ? '模型配置已更新' : '模型已创建')
        dialogVisible.value = false
        await loadModels()
      } finally {
        saving.value = false
      }
    })
  }

  onMounted(loadModels)
</script>
