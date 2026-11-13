<!-- DLI 模型管理（批注 20）：三卡片 + 详情弹窗补全 + 配置弹窗（输入映射/版本留痕）；接入与启用状态分开 -->
<template>
  <div v-loading="loading" class="art-full-height overflow-y-auto pb-5">
    <!-- 页面操作区：新建/编辑按钮按实际授权裁剪，普通医护默认查看和使用 [批注 20] -->
    <div class="mb-4 flex" v-if="canConfigure">
      <ElButton type="primary" @click="openCreate">
        <ArtSvgIcon icon="ri:add-line" class="mr-1" />新建模型
      </ElButton>
    </div>
    <ElAlert
      v-else
      class="mb-4"
      type="info"
      :closable="false"
      title="模型配置由平台管理员及获明确授权的角色维护，当前账号可查看与使用"
    />

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <div v-for="model in models" :key="model.id" class="art-card flex flex-col p-5">
        <div class="flex-cb items-start gap-3">
          <div class="min-w-0">
            <!-- 卡片明确：模型名称/编号、用途、模型版本、接入状态、启用状态 [批注 20] -->
            <div class="flex-c gap-2">
              <p class="truncate text-base font-medium text-g-900">{{ model.name }}</p>
              <ElTag :type="model.connected ? 'success' : 'info'" effect="plain">
                {{ model.connected ? '已接入' : '未接入' }}
              </ElTag>
            </div>
            <p class="mt-1 text-xs text-g-500">{{ model.id }} · 版本 {{ model.version }}</p>
          </div>
          <!-- 启用状态与接入状态分开；未接入不可启用 [批注 20] -->
          <ElSwitch
            v-if="canConfigure"
            :model-value="model.enabled"
            :disabled="!model.connected"
            :before-change="() => toggleModel(model)"
            inline-prompt
            active-text="启用"
            inactive-text="停用"
          />
          <ElTag v-else :type="model.enabled ? 'success' : 'info'" effect="light">
            {{ model.enabled ? '启用' : '停用' }}
          </ElTag>
        </div>

        <div class="mt-5 space-y-3 text-sm">
          <div class="flex gap-2">
            <span class="w-20 shrink-0 text-g-500">模型用途</span>
            <span class="text-g-900">{{ model.field }}</span>
          </div>
          <div class="flex gap-2">
            <span class="w-20 shrink-0 text-g-500">分析模式</span>
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
            <span class="w-20 shrink-0 text-g-500">输入要求</span>
            <span class="min-w-0 flex-1 text-g-800">{{ model.input || '待配置' }}</span>
          </div>
          <div class="flex gap-2">
            <span class="w-20 shrink-0 text-g-500">输出项</span>
            <span class="min-w-0 flex-1 text-g-800">{{ model.output || '待配置' }}</span>
          </div>
          <div class="flex gap-2">
            <span class="w-20 shrink-0 text-g-500">配置版本</span>
            <span class="text-g-800">{{ model.configVersion }}</span>
          </div>
        </div>

        <div class="mt-auto flex justify-end gap-3 pt-4">
          <ElButton link type="primary" @click="openDetail(model)">查看详情</ElButton>
          <ElButton v-if="canConfigure" link type="primary" @click="openEdit(model)">
            编辑配置
          </ElButton>
        </div>
      </div>
    </div>

    <!-- 模型详情：补模型来源/适用范围/支持模式/支持时间点/输入要求/输出内容/评价结果及来源 [批注 20] -->
    <ElDialog v-model="detailVisible" title="模型详情" width="620px">
      <ElDescriptions v-if="activeModel" :column="1" border size="small" label-width="120px">
        <ElDescriptionsItem label="模型名称">{{ activeModel.name }}</ElDescriptionsItem>
        <ElDescriptionsItem label="模型编号">{{ activeModel.id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="模型用途">{{ activeModel.field }}</ElDescriptionsItem>
        <ElDescriptionsItem label="模型版本">{{ activeModel.version }}</ElDescriptionsItem>
        <ElDescriptionsItem label="模型来源">
          {{ activeModel.source || '待接入后由模型提供方补充' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="适用范围">
          {{ activeModel.scope || '待接入后确认影响的中心/课题组范围' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="支持模式">
          {{
            activeModel.mode
              ? activeModel.mode === '纵向'
                ? '纵向（时间点多选）'
                : '横向（时间点单选）'
              : '待配置'
          }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="支持时间点">
          {{ activeModel.timePoints.length ? activeModel.timePoints.join('、') : '待配置' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="输入要求">{{
          activeModel.input || '待配置'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="输出内容">{{
          activeModel.output || '待配置'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="输入映射">
          <template v-if="activeModel.inputMappings.length">
            <div v-for="row in activeModel.inputMappings" :key="row.item" class="text-xs leading-5">
              {{ row.item }} → {{ row.systemField || '未映射' }}
              <ElTag size="small" :type="row.required ? 'danger' : 'info'" effect="plain">
                {{ row.required ? '必需' : '可缺省' }}
              </ElTag>
            </div>
          </template>
          <span v-else>待配置</span>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="评价结果及来源">
          <!-- 未评价不填固定准确率 [批注 20] -->
          {{ activeModel.evaluation || '未评价' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="接入状态">
          {{ activeModel.connected ? '已接入' : '未接入' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="启用状态">
          {{ activeModel.enabled ? '启用' : '停用' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="配置版本">{{ activeModel.configVersion }}</ElDescriptionsItem>
        <ElDescriptionsItem label="更新时间">{{ activeModel.updatedAt }}</ElDescriptionsItem>
      </ElDescriptions>
    </ElDialog>

    <!-- 新建 / 编辑配置：分析模式/评估时间点/输入映射/输出项 [批注 20] -->
    <ElDialog
      v-model="editVisible"
      :title="isCreate ? '新建模型' : '编辑配置'"
      width="720px"
      destroy-on-close
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="96px">
        <ElFormItem label="模型名称" prop="name">
          <ElInput v-model="form.name" maxlength="40" placeholder="请输入模型名称" />
        </ElFormItem>
        <ElFormItem label="模型版本" prop="version">
          <ElInput v-model="form.version" placeholder="例如：V1.0 / 待接入" />
        </ElFormItem>
        <ElFormItem label="模型用途" prop="field">
          <ElSelect v-model="form.field" class="w-full" placeholder="请选择模型用途">
            <ElOption v-for="item in FIELD_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="分析模式">
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
        <ElFormItem label="评估时间点">
          <!-- 时间点选项以模型支持范围及方案为准，不固定写死月份 [批注 20] -->
          <ElSelect
            v-if="form.mode === '纵向'"
            v-model="form.timePoints"
            class="w-full"
            multiple
            clearable
            placeholder="纵向可选多个时间点（以模型支持范围及方案为准）"
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
            placeholder="横向单选时间点"
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
        <ElFormItem label="输入要求">
          <ElInput
            v-model="form.input"
            type="textarea"
            :rows="2"
            placeholder="例如：基线影像 + 检验报告"
          />
        </ElFormItem>
        <!-- 输入映射：模型输入项 / 系统字段 / 是否必需 / 默认映射 [批注 20] -->
        <ElFormItem label="输入映射">
          <div class="w-full">
            <ElTable :data="form.inputMappings" border size="small">
              <ElTableColumn label="模型输入项" min-width="130">
                <template #default="{ row }">
                  <ElInput v-model="row.item" size="small" placeholder="输入项" />
                </template>
              </ElTableColumn>
              <ElTableColumn label="系统字段" min-width="150">
                <template #default="{ row }">
                  <ElInput v-model="row.systemField" size="small" placeholder="映射的系统字段" />
                </template>
              </ElTableColumn>
              <ElTableColumn label="是否必需" width="90" align="center">
                <template #default="{ row }">
                  <ElSwitch v-model="row.required" size="small" />
                </template>
              </ElTableColumn>
              <ElTableColumn label="默认映射" min-width="140">
                <template #default="{ row }">
                  <ElInput v-model="row.defaultMapping" size="small" placeholder="可缺省默认值" />
                </template>
              </ElTableColumn>
              <ElTableColumn label="操作" width="60" align="center">
                <template #default="{ $index }">
                  <ElButton
                    link
                    type="danger"
                    size="small"
                    @click="form.inputMappings.splice($index, 1)"
                  >
                    删除
                  </ElButton>
                </template>
              </ElTableColumn>
            </ElTable>
            <ElButton
              class="mt-2"
              size="small"
              @click="
                form.inputMappings.push({
                  item: '',
                  systemField: '',
                  required: false,
                  defaultMapping: ''
                })
              "
            >
              添加输入项
            </ElButton>
            <p class="mt-1 text-xs text-g-500">
              可缺省仅指采用约定默认映射，不能缺模型必需数据。
            </p>
          </div>
        </ElFormItem>
        <ElFormItem label="输出项">
          <ElInput v-model="form.output" type="textarea" :rows="2" placeholder="请输入输出项说明" />
        </ElFormItem>
        <ElFormItem label="模型来源">
          <ElInput v-model="form.source" placeholder="例如：院内自研 / 厂商提供" />
        </ElFormItem>
        <ElFormItem label="适用范围">
          <ElInput v-model="form.scope" placeholder="接入后启停影响的中心 / 课题组范围" />
        </ElFormItem>
        <ElFormItem label="评价结果">
          <ElInput
            v-model="form.evaluation"
            type="textarea"
            :rows="2"
            placeholder="评价结果及来源；未评价不填固定准确率"
          />
        </ElFormItem>
        <ElFormItem label="启用开关">
          <ElSwitch
            v-model="form.enabled"
            :disabled="!form.connected"
            inline-prompt
            active-text="启用"
            inactive-text="停用"
          />
          <span class="ml-2 text-xs text-g-500">未接入不可启用</span>
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
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import {
    fetchCreateModel,
    fetchGetModels,
    fetchSaveModel,
    fetchToggleModel
  } from '@/mock/dli/api'
  import { useUserStore } from '@/store/modules/user'
  import type { AiModel, ModelField, ModelInputMapping } from '@/mock/dli/types'

  defineOptions({ name: 'DliModel' })

  /** 时间点选项以模型支持范围及方案为准，不固定写死月份 [批注 20] */
  const TIME_POINT_OPTIONS = ['T0 基线', '治疗中随访', '治疗结束', '治疗后随访']

  const FIELD_OPTIONS: ModelField[] = ['早筛预警', '早诊预警', '转归预测']

  const userStore = useUserStore()
  /** 平台管理员及获明确授权的角色可配置；医生/助理/护士只读 [批注 20] */
  const canConfigure = computed(
    () => (userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR') === 'R_PLATFORM'
  )

  const loading = ref(true)
  const saving = ref(false)
  const models = ref<AiModel[]>([])

  const detailVisible = ref(false)
  const activeModel = ref<AiModel>()
  const editVisible = ref(false)
  /** 弹窗是否为新建模式 */
  const isCreate = ref(false)
  const formRef = ref<FormInstance>()

  function emptyModel(): AiModel {
    return {
      id: '',
      name: '',
      field: '早筛预警',
      version: '待接入',
      mode: '',
      timePoints: [],
      input: '',
      output: '',
      inputMappings: [],
      source: '',
      scope: '',
      evaluation: '',
      configVersion: 'V1.0',
      connected: false,
      enabled: false,
      updatedAt: ''
    }
  }

  const form = reactive<AiModel>(emptyModel())

  const rules: FormRules = {
    name: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
    field: [{ required: true, message: '请选择模型用途', trigger: 'change' }]
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

  function openCreate() {
    Object.assign(form, emptyModel(), { inputMappings: [] as ModelInputMapping[] })
    isCreate.value = true
    editVisible.value = true
  }

  function openEdit(model: AiModel) {
    activeModel.value = model
    Object.assign(form, {
      ...model,
      timePoints: [...model.timePoints],
      inputMappings: model.inputMappings.map((row) => ({ ...row }))
    })
    isCreate.value = false
    editVisible.value = true
  }

  /** 切换方式后收敛时间点：横向只能保留一个，未配置时清空 */
  function handleModeChange() {
    if (!form.mode) form.timePoints = []
    else if (form.mode === '横向') form.timePoints = form.timePoints.slice(0, 1)
  }

  /** 启停：接入后操作提示所影响的中心/课题组范围；未接入不可启用 [批注 20] */
  async function toggleModel(model: AiModel): Promise<boolean> {
    const next = !model.enabled
    if (next) {
      const confirmed = await ElMessageBox.confirm(
        `启用「${model.name}」将影响范围：${model.scope || '全部适用中心/课题组'}；Web 与 App 使用同一接入状态。是否确认启用？`,
        '启用模型',
        { type: 'warning', confirmButtonText: '确认启用', cancelButtonText: '返回' }
      )
        .then(() => true)
        .catch(() => false)
      if (!confirmed) return false
    }
    try {
      await fetchToggleModel(model.id, next, userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
      model.enabled = next
      ElMessage.success(`${model.name} 已${next ? '启用' : '停用'}${next ? '' : '，历史报告保留'}`)
      return true
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '操作失败')
      return false
    }
  }

  /** 保存校验后更新卡片，错误留在弹窗，取消不保存 [批注 20] */
  async function handleSubmit() {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    saving.value = true
    try {
      const payload: AiModel = {
        ...form,
        timePoints: [...form.timePoints],
        inputMappings: form.inputMappings.map((row) => ({ ...row })),
        updatedAt: new Date().toISOString().slice(0, 10)
      }
      if (isCreate.value) {
        await fetchCreateModel(payload)
        ElMessage.success('模型已新建，接入状态为未接入')
      } else {
        await fetchSaveModel(payload)
        ElMessage.success('模型配置已保存，配置版本已更新')
      }
      editVisible.value = false
      await loadModels()
    } catch (error) {
      // 必需输入项未映射等校验错误留在弹窗 [批注 20]
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      saving.value = false
    }
  }

  onMounted(loadModels)
</script>
