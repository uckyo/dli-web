<!-- DLI 随访管理 · 随访模板：由原页签改为左侧子菜单入口 [批注 10] -->
<template>
  <div class="art-full-height">
    <ArtSearchBar
      v-model="templateSearchParams"
      :items="templateSearchItems"
      @search="handleTemplateSearch"
      @reset="resetTemplateSearchParams"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader :loading="templateLoading" @refresh="loadTemplates">
        <template #left>
          <ElButton type="primary" @click="openTemplateDialog()">新增模板</ElButton>
        </template>
      </ArtTableHeader>
      <ArtTable
        :loading="templateLoading"
        :data="pagedTemplates"
        :columns="templateColumns"
        :pagination="templatePagination"
        @pagination:size-change="handleTemplateSizeChange"
        @pagination:current-change="handleTemplateCurrentChange"
      />
    </ElCard>

    <!-- 模板新增 / 编辑弹窗 [批注 10] -->
    <ElDialog
      v-model="templateDialogVisible"
      :title="templateForm.id ? '编辑模板' : '新增模板'"
      width="600px"
      destroy-on-close
    >
      <ElForm
        ref="templateFormRef"
        :model="templateForm"
        :rules="templateRules"
        label-width="110px"
      >
        <ElFormItem label="模板名称" prop="name">
          <ElInput v-model="templateForm.name" />
        </ElFormItem>
        <ElFormItem label="适用阶段" prop="stage">
          <ElSelect v-model="templateForm.stage" class="w-full">
            <ElOption label="治疗前" value="治疗前" />
            <ElOption label="治疗中" value="治疗中" />
            <ElOption label="诊断后" value="诊断后" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="任务项目" prop="itemsText">
          <ElInput
            v-model="templateForm.itemsText"
            type="textarea"
            :rows="3"
            placeholder="每行一个任务项目"
          />
        </ElFormItem>
        <ElFormItem label="相对时点" prop="timePoints">
          <ElInput
            v-model="templateForm.timePoints"
            placeholder="例如：相对时点：治疗后 1/2/4 周"
          />
        </ElFormItem>
        <ElFormItem label="执行要求" prop="requirement">
          <ElInput v-model="templateForm.requirement" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="完成方式" prop="completeWay">
          <ElSelect v-model="templateForm.completeWay" class="w-full">
            <ElOption label="填写反馈" value="填写反馈" />
            <ElOption label="上传报告" value="上传报告" />
            <ElOption label="医护记录" value="医护记录" />
            <ElOption label="填写反馈 / 上传报告" value="填写反馈 / 上传报告" />
            <ElOption label="填写反馈 / 医护记录" value="填写反馈 / 医护记录" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="templateDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="savingTemplate" @click="submitTemplate">
          {{ templateForm.id ? '保存' : '存为草稿' }}
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElCard,
    ElTag,
    ElMessage,
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElSelect,
    ElOption
  } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { useUserStore } from '@/store/modules/user'
  import {
    fetchGetFollowupTemplates,
    fetchSaveFollowupTemplate,
    fetchPublishFollowupTemplate,
    type FollowupTemplateQuery
  } from '@/mock/dli/blueprint/api'
  import type { FollowupTemplate } from '@/mock/dli/blueprint/types'
  import type { ColumnOption } from '@/types/component'

  defineOptions({ name: 'DliFollowupTemplates' })

  const userStore = useUserStore()

  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const isDoctor = computed(() => role.value === 'R_DOCTOR')
  const operatorName = computed(() => {
    const info = userStore.getUserInfo as { userName?: string; username?: string }
    return info.userName ?? info.username ?? '当前医护'
  })

  const TEMPLATE_STATUS_TAG: Record<FollowupTemplate['status'], 'info' | 'success' | 'danger'> = {
    草稿: 'info',
    已发布: 'success',
    已停用: 'danger'
  }

  const STAGE_OPTIONS: FollowupTemplate['stage'][] = ['治疗前', '治疗中', '诊断后']
  const STATUS_OPTIONS: FollowupTemplate['status'][] = ['草稿', '已发布', '已停用']

  const templateSearchParams = reactive<FollowupTemplateQuery>({
    keyword: '',
    stage: '',
    status: '',
    dateRange: []
  })
  const templateSearchItems = [
    {
      key: 'keyword',
      label: '模板名称',
      type: 'input',
      placeholder: '模板名称 / 编号'
    },
    {
      key: 'stage',
      label: '适用阶段',
      type: 'select',
      placeholder: '全部阶段',
      options: STAGE_OPTIONS.map((item) => ({ label: item, value: item }))
    },
    {
      key: 'status',
      label: '模板状态',
      type: 'select',
      placeholder: '全部状态',
      options: STATUS_OPTIONS.map((item) => ({ label: item, value: item }))
    },
    {
      key: 'dateRange',
      label: '更新时间',
      type: 'daterange',
      props: { type: 'daterange', 'value-format': 'YYYY-MM-DD' },
      span: 6
    }
  ]

  const templates = ref<FollowupTemplate[]>([])
  const templateLoading = ref(false)
  const templatePagination = reactive({ current: 1, size: 10, total: 0 })
  const pagedTemplates = computed(() =>
    templates.value.slice(
      (templatePagination.current - 1) * templatePagination.size,
      templatePagination.current * templatePagination.size
    )
  )
  const templateDialogVisible = ref(false)
  const savingTemplate = ref(false)
  const templateFormRef = ref<FormInstance>()
  const templateForm = reactive({
    id: '',
    name: '',
    stage: '治疗中' as FollowupTemplate['stage'],
    itemsText: '',
    timePoints: '',
    requirement: '',
    completeWay: '填写反馈'
  })
  const templateRules: FormRules = {
    name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
    stage: [{ required: true, message: '请选择适用阶段', trigger: 'change' }],
    itemsText: [{ required: true, message: '请输入任务项目', trigger: 'blur' }],
    timePoints: [{ required: true, message: '请输入相对时点', trigger: 'blur' }],
    requirement: [{ required: true, message: '请输入执行要求', trigger: 'blur' }],
    completeWay: [{ required: true, message: '请选择完成方式', trigger: 'change' }]
  }

  async function loadTemplates() {
    templateLoading.value = true
    try {
      templates.value = await fetchGetFollowupTemplates(templateSearchParams)
      templatePagination.total = templates.value.length
      if (pagedTemplates.value.length === 0 && templatePagination.current > 1) {
        templatePagination.current -= 1
      }
    } finally {
      templateLoading.value = false
    }
  }

  function handleTemplateSearch() {
    templatePagination.current = 1
    void loadTemplates()
  }

  function handleTemplateSizeChange(size: number) {
    templatePagination.size = size
    templatePagination.current = 1
  }

  function handleTemplateCurrentChange(current: number) {
    templatePagination.current = current
  }

  function resetTemplateSearchParams() {
    templateSearchParams.keyword = ''
    templateSearchParams.stage = ''
    templateSearchParams.status = ''
    templateSearchParams.dateRange = []
    templatePagination.current = 1
    void loadTemplates()
  }

  function openTemplateDialog(row?: FollowupTemplate) {
    templateForm.id = row?.id ?? ''
    templateForm.name = row?.name ?? ''
    templateForm.stage = row?.stage ?? '治疗中'
    templateForm.itemsText = row?.items.join('\n') ?? ''
    templateForm.timePoints = row?.timePoints ?? ''
    templateForm.requirement = row?.requirement ?? ''
    templateForm.completeWay = row?.completeWay ?? '填写反馈'
    templateDialogVisible.value = true
  }

  async function submitTemplate() {
    if (!templateFormRef.value) return
    const valid = await templateFormRef.value.validate().catch(() => false)
    if (!valid) return
    savingTemplate.value = true
    try {
      await fetchSaveFollowupTemplate(
        {
          id: templateForm.id || undefined,
          name: templateForm.name.trim(),
          stage: templateForm.stage,
          version: templateForm.id
            ? (templates.value.find((t) => t.id === templateForm.id)?.version ?? 'V1.0')
            : 'V1.0（草稿）',
          status: templateForm.id
            ? (templates.value.find((t) => t.id === templateForm.id)?.status ?? '草稿')
            : '草稿',
          items: templateForm.itemsText
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
          timePoints: templateForm.timePoints.trim(),
          requirement: templateForm.requirement.trim(),
          completeWay: templateForm.completeWay,
          operator: operatorName.value
        },
        role.value
      )
      ElMessage.success(templateForm.id ? '模板已保存' : '模板已存为草稿，获授权医生确认版本后发布')
      templateDialogVisible.value = false
      await loadTemplates()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      savingTemplate.value = false
    }
  }

  async function publishTemplate(row: FollowupTemplate) {
    try {
      await fetchPublishFollowupTemplate(row.id, operatorName.value, role.value)
      ElMessage.success('模板已发布；更新模板不覆盖已发布计划')
      await loadTemplates()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '发布失败')
    }
  }

  /** 模板 5 列 [批注 10] */
  const templateColumns: ColumnOption<FollowupTemplate>[] = [
    { prop: 'name', label: '模板名称', minWidth: 200, showOverflowTooltip: true },
    { prop: 'stage', label: '适用阶段', width: 100 },
    { prop: 'version', label: '模板版本', width: 110 },
    {
      prop: 'status',
      label: '模板状态',
      width: 100,
      formatter: (row) =>
        h(ElTag, { effect: 'light', type: TEMPLATE_STATUS_TAG[row.status] }, () => row.status)
    },
    { prop: 'updatedAt', label: '最近更新时间', width: 170 },
    {
      prop: 'operation',
      label: '操作',
      width: 130,
      fixed: 'right' as const,
      align: 'center' as const,
      formatter: (row) =>
        h('div', { class: 'flex-c justify-center gap-1' }, [
          h(
            ElButton,
            { link: true, type: 'primary', onClick: () => openTemplateDialog(row) },
            () => '编辑'
          ),
          ...(isDoctor.value && row.status === '草稿'
            ? [
                h(
                  ElButton,
                  { link: true, type: 'success', onClick: () => publishTemplate(row) },
                  () => '发布'
                )
              ]
            : [])
        ])
    }
  ]

  onMounted(() => {
    void loadTemplates()
  })
</script>
