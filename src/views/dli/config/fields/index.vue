<!-- DLI 患者字段配置（批注 17）：字段表 + 预览效果宽弹窗 + 草稿→提交平台→发布流转；平台/中心/课题组三路由复用 -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <ArtSearchBar
      v-model="fieldSearchParams"
      :items="fieldSearchItems"
      @search="handleFieldSearch"
      @reset="handleFieldReset"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader
        v-model:columns="fieldColumnChecks"
        :loading="fieldLoading"
        @refresh="refreshFieldData"
      >
        <template #left>
          <ElButton type="primary" @click="openFieldForm()">新增字段</ElButton>
          <ElButton @click="previewVisible = true">预览效果</ElButton>
          <ElButton @click="openVersions">版本记录</ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="fieldLoading"
        :data="fieldData"
        :columns="fieldColumns"
        :pagination="fieldPagination"
        @pagination:size-change="handleFieldSizeChange"
        @pagination:current-change="handleFieldCurrentChange"
      />
    </ElCard>

    <!-- 新增 / 编辑字段弹窗：11 项配置 [批注 17] -->
    <ElDialog
      v-model="formVisible"
      :title="formModel.id ? '编辑字段' : '新增字段'"
      width="620px"
      destroy-on-close
    >
      <ElForm ref="fieldFormRef" :model="formModel" :rules="fieldRules" label-width="110px">
        <ElFormItem label="字段名称" prop="name">
          <ElInput v-model="formModel.name" placeholder="例如：吸烟史" />
        </ElFormItem>
        <ElFormItem label="字段代码" prop="code">
          <!-- 已使用代码不能改义或直接改类型 [批注 17] -->
          <ElInput v-model="formModel.code" placeholder="例如：smoking_history" />
        </ElFormItem>
        <ElFormItem label="字段类型" prop="type">
          <ElSelect v-model="formModel.type" placeholder="选择类型" class="w-full">
            <ElOption v-for="item in TYPE_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="单位" prop="unit">
          <ElInput v-model="formModel.unit" placeholder="例如：岁 / mg" />
        </ElFormItem>
        <ElFormItem v-if="needsOptions" label="可选值" prop="optionsText">
          <ElInput
            v-model="formModel.optionsText"
            :placeholder="
              needsOptions ? '多个可选值用换行或逗号分隔，例如：AI辅助诊疗组,常规诊疗组' : ''
            "
          />
        </ElFormItem>
        <ElFormItem label="是否必填" prop="required">
          <ElSwitch v-model="formModel.required" />
        </ElFormItem>
        <ElFormItem label="校验规则" prop="validation">
          <ElInput v-model="formModel.validation" placeholder="例如：0-120 的数值" />
        </ElFormItem>
        <ElFormItem label="是否列表显示" prop="listVisible">
          <ElSwitch v-model="formModel.listVisible" />
          <span class="ml-2 text-xs text-g-500">表单专用字段不自动塞入列表</span>
        </ElFormItem>
        <ElFormItem label="是否支持筛选" prop="filterable">
          <ElSwitch v-model="formModel.filterable" />
        </ElFormItem>
        <ElFormItem label="显示顺序" prop="order">
          <ElInputNumber v-model="formModel.order" :min="1" :max="99" />
        </ElFormItem>
        <ElFormItem label="适用范围" prop="scopeType">
          <ElSelect v-model="formModel.scopeType" class="w-full" @change="formModel.scopeName = ''">
            <ElOption v-for="item in SCOPE_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="formModel.scopeType !== '平台统一'" label="指定对象" prop="scopeName">
          <ElInput v-model="formModel.scopeName" placeholder="例如：中心 A / 课题组 2" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="formVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submitFieldForm">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 预览效果宽弹窗：患者录入表单 / 患者列表，只看应用效果，不创建患者 [批注 17] -->
    <ElDialog v-model="previewVisible" title="预览效果" width="860px" destroy-on-close>
      <ElTabs v-model="previewTab">
        <ElTabPane label="患者录入表单" name="form">
          <ElForm label-width="140px" class="max-w-240">
            <ElFormItem
              v-for="field in previewFormFields"
              :key="field.id"
              :label="field.name"
              :required="field.required"
            >
              <ElInput
                v-if="field.type === '文本'"
                :placeholder="field.validation || '请输入'"
                disabled
              />
              <ElInputNumber v-else-if="field.type === '数字'" disabled class="w-full" />
              <ElDatePicker v-else-if="field.type === '日期'" disabled class="w-full!" />
              <ElSelect v-else disabled class="w-full" placeholder="请选择">
                <ElOption v-for="opt in field.options" :key="opt" :label="opt" :value="opt" />
              </ElSelect>
              <div v-if="field.unit" class="text-xs text-g-500">单位：{{ field.unit }}</div>
            </ElFormItem>
          </ElForm>
          <p class="text-xs text-g-500">
            预览仅展示适用版本的应用效果，不创建患者；新必填项不伪造历史值，缺资料时提示补充。
          </p>
        </ElTabPane>
        <ElTabPane label="患者列表" name="list">
          <ElAlert
            v-if="previewListFields.length === 0"
            type="info"
            :closable="false"
            title="当前没有勾选「是否列表显示」的字段"
          />
          <ElTable v-else :data="previewRows" border>
            <ElTableColumn
              v-for="field in previewListFields"
              :key="field.id"
              :prop="field.code"
              :label="field.name"
              min-width="120"
            >
              <template v-if="field.type === '单选' || field.type === '多选'" #default>
                {{ field.options.join(' / ') }}
              </template>
            </ElTableColumn>
          </ElTable>
          <p class="mt-2 text-xs text-g-500">
            列表按「是否列表显示」勾选展示；系统患者编号、研究分组、模型必需字段保持统一，各中心扩展不覆盖统一定义。
          </p>
        </ElTabPane>
      </ElTabs>
      <template #footer>
        <ElButton @click="previewVisible = false">关闭预览</ElButton>
      </template>
    </ElDialog>

    <!-- 版本记录抽屉：版本 / 发布时间 / 操作人 / 适用端 -->
    <ElDrawer v-model="versionVisible" title="字段配置版本记录" size="560px">
      <ElTimeline v-if="versions.length">
        <ElTimelineItem
          v-for="item in versions"
          :key="item.version"
          :timestamp="item.publishedAt"
          placement="top"
        >
          <ElDescriptions :column="1" border>
            <ElDescriptionsItem label="版本">{{ item.version }}</ElDescriptionsItem>
            <ElDescriptionsItem label="操作人">{{ item.operator }}</ElDescriptionsItem>
            <ElDescriptionsItem label="适用端">{{ item.appliesTo.join(' / ') }}</ElDescriptionsItem>
            <ElDescriptionsItem label="说明">{{ item.note }}</ElDescriptionsItem>
          </ElDescriptions>
        </ElTimelineItem>
      </ElTimeline>
      <p v-else class="text-sm text-g-500">暂无版本记录</p>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElTag,
    ElMessage,
    ElMessageBox,
    ElDialog,
    ElTabs,
    ElTabPane,
    ElForm,
    ElFormItem,
    ElInput,
    ElInputNumber,
    ElDatePicker,
    ElSelect,
    ElOption,
    ElSwitch,
    ElDrawer,
    ElDescriptions,
    ElDescriptionsItem,
    ElTimeline,
    ElTimelineItem,
    ElTable,
    ElTableColumn,
    ElAlert
  } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { useUserStore } from '@/store/modules/user'
  import {
    fetchGetPatientFields,
    fetchGetFieldConfigVersions,
    fetchSavePatientField,
    fetchSubmitFieldConfig,
    fetchPublishFieldConfig,
    fetchTogglePatientField
  } from '@/mock/dli/blueprint/api'
  import type {
    FieldConfigStatus,
    FieldConfigVersion,
    FieldScopeType,
    PatientField
  } from '@/mock/dli/blueprint/types'

  defineOptions({ name: 'DliFields' })

  /** 清洗接口异常里夹带的批注 / 出处编号，避免展示给用户 */
  const stripNote = (text: string) => text.replace(/\[(?:批注|源)[^\]]*\]/g, '').trim()

  /** 同一组件被平台 / 中心 / 课题组三个路由复用；中心／课题组扩展字段提交平台，平台核对发布 [批注 17] */
  const route = useRoute()
  const scope = computed<'platform' | 'center' | 'group'>(() => {
    if (route.path.includes('/center/fields')) return 'center'
    if (route.path.includes('/group/fields')) return 'group'
    return 'platform'
  })
  const isPlatform = computed(() => scope.value === 'platform')
  const userStore = useUserStore()
  const operatorName = computed(() => {
    const info = userStore.getUserInfo as { userName?: string; username?: string }
    return info?.userName ?? info?.username ?? '当前医护'
  })

  const STATUS_OPTIONS: FieldConfigStatus[] = ['草稿', '待发布', '已发布', '已停用']
  const TYPE_OPTIONS: PatientField['type'][] = ['文本', '数字', '日期', '单选', '多选']
  const SCOPE_OPTIONS: FieldScopeType[] = ['平台统一', '指定中心', '指定课题组']

  const STATUS_TAG: Record<FieldConfigStatus, 'info' | 'warning' | 'success' | 'danger'> = {
    草稿: 'info',
    待发布: 'warning',
    已发布: 'success',
    已停用: 'danger'
  }

  /** 筛选：关键词 + 配置状态（平台用「待发布」筛选提交的配置）+ 适用范围 [批注 17] */
  const fieldSearchItems = [
    {
      key: 'keyword',
      label: '字段名称',
      type: 'input',
      placeholder: '字段名称 / 字段代码',
      span: 6
    },
    {
      key: 'status',
      label: '配置状态',
      type: 'select',
      placeholder: '全部状态',
      options: STATUS_OPTIONS.map((item) => ({ label: item, value: item }))
    },
    {
      key: 'scopeType',
      label: '适用范围',
      type: 'select',
      placeholder: '全部范围',
      options: SCOPE_OPTIONS.map((item) => ({ label: item, value: item }))
    }
  ]

  const {
    columns: fieldColumns,
    columnChecks: fieldColumnChecks,
    data: fieldData,
    loading: fieldLoading,
    pagination: fieldPagination,
    searchParams: fieldSearchParams,
    getData: getFieldData,
    resetSearchParams: resetFieldSearchParams,
    handleSizeChange: handleFieldSizeChange,
    handleCurrentChange: handleFieldCurrentChange,
    refreshData: refreshFieldData
  } = useTable({
    core: {
      apiFn: fetchGetPatientFields,
      apiParams: {
        current: 1,
        size: 10,
        keyword: '',
        status: '' as FieldConfigStatus | '',
        scopeType: '' as FieldScopeType | ''
      },
      columnsFactory: () => [
        { prop: 'name', label: '字段名称', minWidth: 140, showOverflowTooltip: true },
        { prop: 'code', label: '字段代码', width: 150, showOverflowTooltip: true },
        { prop: 'type', label: '字段类型', width: 90, align: 'center' as const },
        {
          prop: 'scopeType',
          label: '适用范围',
          minWidth: 150,
          formatter: (row: PatientField) =>
            row.scopeType === '平台统一'
              ? h('span', null, () => '平台统一')
              : h('span', null, () => `${row.scopeType}·${row.scopeName}`)
        },
        {
          prop: 'required',
          label: '是否必填',
          width: 90,
          align: 'center' as const,
          formatter: (row: PatientField) =>
            h(
              ElTag,
              { effect: 'plain', type: row.required ? 'warning' : 'info', size: 'small' },
              () => (row.required ? '是' : '否')
            )
        },
        {
          prop: 'listVisible',
          label: '是否列表显示',
          width: 110,
          align: 'center' as const,
          formatter: (row: PatientField) => (row.listVisible ? '是' : '否')
        },
        {
          prop: 'filterable',
          label: '是否支持筛选',
          width: 110,
          align: 'center' as const,
          formatter: (row: PatientField) => (row.filterable ? '是' : '否')
        },
        {
          prop: 'status',
          label: '配置状态',
          width: 100,
          align: 'center' as const,
          formatter: (row: PatientField) =>
            h(ElTag, { effect: 'light', type: STATUS_TAG[row.status] }, () => row.status)
        },
        { prop: 'version', label: '配置版本', width: 100, align: 'center' as const },
        {
          prop: 'operation',
          label: '操作',
          width: 190,
          fixed: 'right' as const,
          align: 'center' as const,
          formatter: (row: PatientField) => {
            const btns: ReturnType<typeof h>[] = [
              // 系统统一字段（患者编号、研究分组、模型必需字段）不得改义 [批注 17]
              h(
                ElButton,
                {
                  link: true,
                  type: 'primary',
                  disabled: row.systemLocked,
                  onClick: () => openFieldForm(row)
                },
                () => '编辑'
              )
            ]
            // 中心／课题组：草稿提交平台 [批注 17]
            if (!isPlatform.value && row.status === '草稿') {
              btns.push(
                h(
                  ElButton,
                  { link: true, type: 'warning', onClick: () => submitToPlatform(row) },
                  () => '提交平台'
                )
              )
            }
            // 平台：核对「待发布」配置后发布 [批注 17]
            if (isPlatform.value && row.status === '待发布') {
              btns.push(
                h(
                  ElButton,
                  { link: true, type: 'success', onClick: () => publishField(row) },
                  () => '发布'
                )
              )
            }
            // 停用保留历史 [批注 17]
            if (row.status === '已发布' || row.status === '已停用') {
              btns.push(
                h(
                  ElButton,
                  {
                    link: true,
                    type: row.status === '已停用' ? 'success' : 'danger',
                    disabled: row.systemLocked,
                    onClick: () => toggleField(row)
                  },
                  () => (row.status === '已停用' ? '启用' : '停用')
                )
              )
            }
            return h('div', { class: 'flex-c justify-center gap-1' }, btns)
          }
        }
      ]
    }
  })

  function handleFieldSearch() {
    getFieldData()
  }

  function handleFieldReset() {
    resetFieldSearchParams()
  }

  /** 新增 / 编辑字段弹窗（11 项配置）[批注 17] */
  interface FieldFormModel {
    id: string
    name: string
    code: string
    type: PatientField['type']
    unit: string
    optionsText: string
    required: boolean
    validation: string
    listVisible: boolean
    filterable: boolean
    order: number
    scopeType: FieldScopeType
    scopeName: string
  }

  const formVisible = ref(false)
  const saving = ref(false)
  const fieldFormRef = ref<FormInstance>()
  const formModel = reactive<FieldFormModel>({
    id: '',
    name: '',
    code: '',
    type: '文本',
    unit: '',
    optionsText: '',
    required: false,
    validation: '',
    listVisible: false,
    filterable: false,
    order: 10,
    scopeType: '平台统一',
    scopeName: ''
  })
  const fieldRules: FormRules = {
    name: [{ required: true, message: '请输入字段名称', trigger: 'blur' }],
    code: [{ required: true, message: '请输入字段代码', trigger: 'blur' }],
    type: [{ required: true, message: '请选择字段类型', trigger: 'change' }],
    scopeName: [
      {
        validator: (_rule, value: string, callback) => {
          if (formModel.scopeType !== '平台统一' && !value?.trim())
            callback(new Error('指定中心／课题组时须填写指定对象'))
          else callback()
        },
        trigger: 'blur'
      }
    ]
  }

  const needsOptions = computed(() => formModel.type === '单选' || formModel.type === '多选')

  function openFieldForm(row?: PatientField) {
    formModel.id = row?.id ?? ''
    formModel.name = row?.name ?? ''
    formModel.code = row?.code ?? ''
    formModel.type = row?.type ?? '文本'
    formModel.unit = row?.unit ?? ''
    formModel.optionsText = row?.options.join(',') ?? ''
    formModel.required = row?.required ?? false
    formModel.validation = row?.validation ?? ''
    formModel.listVisible = row?.listVisible ?? false
    formModel.filterable = row?.filterable ?? false
    formModel.order = row?.order ?? 10
    formModel.scopeType = row?.scopeType ?? '平台统一'
    formModel.scopeName = row?.scopeName ?? ''
    formVisible.value = true
  }

  async function submitFieldForm() {
    if (!fieldFormRef.value) return
    const valid = await fieldFormRef.value.validate().catch(() => false)
    if (!valid) return
    saving.value = true
    try {
      const saved = await fetchSavePatientField({
        id: formModel.id || undefined,
        name: formModel.name.trim(),
        code: formModel.code.trim(),
        type: formModel.type,
        unit: formModel.unit.trim(),
        options: needsOptions.value
          ? formModel.optionsText
              .split(/[,，\n]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        required: formModel.required,
        validation: formModel.validation.trim(),
        listVisible: formModel.listVisible,
        filterable: formModel.filterable,
        order: formModel.order,
        scopeType: formModel.scopeType,
        scopeName: formModel.scopeType === '平台统一' ? '' : formModel.scopeName.trim(),
        operator: operatorName.value
      })
      ElMessage.success(
        formModel.id
          ? '字段已保存，配置状态与版本保持不变'
          : `已存为草稿（${saved.id}），可在状态筛选中查找并发布`
      )
      formVisible.value = false
      await getFieldData()
    } catch (error) {
      // 已使用代码不能改义／敏感字段校验错误留在弹窗 [批注 17]
      ElMessage.error(error instanceof Error ? stripNote(error.message) : '保存失败')
    } finally {
      saving.value = false
    }
  }

  /** 中心／课题组：草稿提交平台 [批注 17] */
  async function submitToPlatform(row: PatientField) {
    const confirmed = await ElMessageBox.confirm(
      `将字段「${row.name}」提交平台？平台核对适用范围后发布，发布前本中心不生效。`,
      '提交平台',
      { type: 'warning', confirmButtonText: '确认提交', cancelButtonText: '返回' }
    )
      .then(() => true)
      .catch(() => false)
    if (!confirmed) return
    try {
      await fetchSubmitFieldConfig(row.id, operatorName.value)
      ElMessage.success('已提交平台，可在平台「待发布」筛选中跟踪')
      await refreshFieldData()
    } catch (error) {
      ElMessage.error(error instanceof Error ? stripNote(error.message) : '提交失败')
    }
  }

  /** 平台：发布「待发布」配置，刷新版本与状态 [批注 17] */
  async function publishField(row: PatientField) {
    const confirmed = await ElMessageBox.confirm(
      `核对「${row.name}」（${row.scopeType}${row.scopeName ? '·' + row.scopeName : ''}）的适用范围后发布？发布后患者表单、导入模板及 App 使用适用版本。`,
      '发布字段配置',
      { type: 'warning', confirmButtonText: '确认发布', cancelButtonText: '返回' }
    )
      .then(() => true)
      .catch(() => false)
    if (!confirmed) return
    try {
      const published = await fetchPublishFieldConfig(row.id, operatorName.value)
      ElMessage.success(`配置已发布（${published.version}），录入表单、导入模板及 App 同步适用`)
      await refreshFieldData()
    } catch (error) {
      ElMessage.error(error instanceof Error ? stripNote(error.message) : '发布失败')
    }
  }

  /** 停用保留历史；已停用可重新启用 [批注 17] */
  async function toggleField(row: PatientField) {
    const stopping = row.status === '已发布'
    const confirmed = await ElMessageBox.confirm(
      stopping
        ? `停用字段「${row.name}」？停用保留历史，历史数据不变。`
        : `重新启用字段「${row.name}」？启用后回到已发布状态。`,
      stopping ? '停用字段' : '启用字段',
      {
        type: 'warning',
        confirmButtonText: stopping ? '确认停用' : '确认启用',
        cancelButtonText: '返回'
      }
    )
      .then(() => true)
      .catch(() => false)
    if (!confirmed) return
    try {
      await fetchTogglePatientField(row.id, operatorName.value)
      ElMessage.success(stopping ? '字段已停用，历史保留' : '字段已重新启用')
      await refreshFieldData()
    } catch (error) {
      ElMessage.error(error instanceof Error ? stripNote(error.message) : '操作失败')
    }
  }

  /** 预览效果宽弹窗：患者录入表单 / 患者列表两个预览页签 [批注 17] */
  const previewVisible = ref(false)
  const previewTab = ref<'form' | 'list'>('form')
  const previewFormFields = computed(() =>
    fieldData.value.filter((row) => row.status === '已发布').sort((a, b) => a.order - b.order)
  )
  const previewListFields = computed(() => previewFormFields.value.filter((row) => row.listVisible))
  const previewRows = computed(() => {
    const row: Record<string, string> = {}
    previewListFields.value.forEach((field) => {
      row[field.code] =
        field.type === '单选' || field.type === '多选'
          ? (field.options[0] ?? '')
          : field.type === '日期'
            ? '2026-11-12'
            : field.type === '数字'
              ? `示例值${field.unit ? '（' + field.unit + '）' : ''}`
              : '示例文本'
    })
    return [row]
  })

  /** 版本记录抽屉：版本、发布时间、操作人、适用端 */
  const versionVisible = ref(false)
  const versions = ref<FieldConfigVersion[]>([])

  async function openVersions() {
    versionVisible.value = true
    versions.value = await fetchGetFieldConfigVersions()
  }
</script>
