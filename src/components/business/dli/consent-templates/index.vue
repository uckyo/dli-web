<!-- DLI 知情同意书模板维护（批注 16）：平台基础配置页签 / 中心「同意书」入口共用 -->
<template>
  <div class="dli-consent-templates">
    <ArtSearchBar
      v-model="searchParams"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton type="primary" @click="openForm()">新增模板</ElButton>
          <ElTag v-if="scope === 'center'" effect="plain" type="info">
            仅维护 {{ center || '本中心' }} 草稿，发布由平台管理员确认
          </ElTag>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <!-- 新增 / 编辑 / 另存新版本：模板名称、关联研究项目、适用中心、模板版本、模板文件 -->
    <ElDialog v-model="formVisible" :title="formTitle" width="560px" destroy-on-close>
      <ElForm ref="formRef" :model="formModel" :rules="formRules" label-width="110px">
        <ElFormItem label="模板名称" prop="name">
          <ElInput v-model="formModel.name" maxlength="40" placeholder="请输入模板名称" />
        </ElFormItem>
        <ElFormItem label="关联研究项目" prop="projectId">
          <ElSelect
            v-model="formModel.projectId"
            placeholder="选择关联研究项目"
            filterable
            class="w-full"
          >
            <ElOption
              v-for="item in options.projects"
              :key="item.id"
              :label="`${item.id} · ${item.name}`"
              :value="item.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="适用中心" prop="center">
          <ElSelect
            v-model="formModel.center"
            placeholder="选择适用中心（留空表示全部中心）"
            clearable
            :disabled="scope === 'center'"
            class="w-full"
          >
            <ElOption label="全部中心" value="" />
            <ElOption v-for="item in options.centers" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="模板版本" prop="version">
          <ElInput v-model="formModel.version" maxlength="20" placeholder="如 V2.1" />
        </ElFormItem>
        <ElFormItem label="模板文件" prop="fileName">
          <ElUpload
            v-model:file-list="fileList"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            accept=".pdf,.doc,.docx"
          >
            <ElButton>选择文件</ElButton>
            <template #tip>
              <div class="el-upload__tip">
                仅记录文件信息用于演示，不会上传或存储真实文件；改模板请另存版本
              </div>
            </template>
          </ElUpload>
        </ElFormItem>
      </ElForm>
      <p class="mt-1 text-xs leading-5 text-g-500">
        保存后为「草稿 / 未提交」，需提交批准并由平台管理员确认批准后才能发布；
        已发布或已停用版本不可直接修改。
      </p>
      <template #footer>
        <ElButton @click="formVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submitForm">保存草稿</ElButton>
      </template>
    </ElDialog>

    <!-- 模板文件预览（mock） -->
    <ElDialog v-model="previewVisible" title="模板文件预览" width="520px">
      <ElDescriptions v-if="previewRow" :column="1" border>
        <ElDescriptionsItem label="模板名称">{{ previewRow.name }}</ElDescriptionsItem>
        <ElDescriptionsItem label="关联研究项目">{{ previewRow.projectId }}</ElDescriptionsItem>
        <ElDescriptionsItem label="适用中心">{{
          previewRow.center || '全部中心'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="模板版本">{{ previewRow.version }}</ElDescriptionsItem>
        <ElDescriptionsItem label="模板文件">{{ previewRow.fileName }}</ElDescriptionsItem>
        <ElDescriptionsItem label="文件大小">{{ previewRow.fileSize || '—' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="模板状态">{{ previewRow.status }}</ElDescriptionsItem>
        <ElDescriptionsItem label="批准状态">{{ previewRow.approval }}</ElDescriptionsItem>
      </ElDescriptions>
      <p class="mt-3 text-xs leading-5 text-g-500">
        演示环境仅保存文件信息，不展示真实文件内容；签署以患者详情发放的生效版本为准。
      </p>
      <template #footer>
        <ElButton type="primary" @click="previewVisible = false">知道了</ElButton>
      </template>
    </ElDialog>

    <!-- 历史版本：另存版本不覆盖已签记录 -->
    <ElDialog v-model="historyVisible" title="模板版本历史" width="560px">
      <ElTable v-if="historyRows.length" :data="historyRows" border>
        <ElTableColumn prop="version" label="版本" width="100" />
        <ElTableColumn prop="updatedAt" label="更新时间" width="130" />
        <ElTableColumn prop="operator" label="操作人" width="130" />
        <ElTableColumn prop="note" label="说明" minWidth="180" show-overflow-tooltip />
      </ElTable>
      <p v-else class="text-sm text-g-500">暂无历史版本</p>
      <p class="mt-3 text-xs leading-5 text-g-500">
        已签署记录保留当时发放的模板版本，改模板只另存新版本，不回溯覆盖。
      </p>
      <template #footer>
        <ElButton type="primary" @click="historyVisible = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElCard,
    ElDescriptions,
    ElDescriptionsItem,
    ElDialog,
    ElDropdown,
    ElDropdownItem,
    ElDropdownMenu,
    ElForm,
    ElFormItem,
    ElInput,
    ElMessage,
    ElMessageBox,
    ElOption,
    ElSelect,
    ElTable,
    ElTableColumn,
    ElTag,
    ElUpload
  } from 'element-plus'
  import type { FormInstance, FormRules, UploadFile, UploadUserFile } from 'element-plus'
  import { computed, onMounted, reactive, ref } from 'vue'
  import { useTable } from '@/hooks/core/useTable'
  import { useUserStore } from '@/store/modules/user'
  import {
    fetchApproveConsentTemplate,
    fetchGetConsentTemplateOptions,
    fetchGetConsentTemplates,
    fetchPublishConsentTemplate,
    fetchSaveConsentTemplate,
    fetchStopConsentTemplate,
    fetchSubmitConsentTemplateApproval
  } from '@/mock/dli/blueprint/api'
  import type {
    ConsentApproval,
    ConsentTemplate,
    ConsentTemplateStatus
  } from '@/mock/dli/blueprint/types'

  defineOptions({ name: 'DliConsentTemplates' })

  const props = withDefaults(
    defineProps<{
      /** platform：平台基础配置页签，可批准与发布；center：中心「同意书」入口，只维护本中心草稿 */
      scope?: 'platform' | 'center'
      /** 中心视图限定适用中心 */
      center?: string
    }>(),
    { scope: 'platform', center: '' }
  )

  const userStore = useUserStore()
  /** 角色保持与实际登录态一致；能力边界由 scope 再收一层 */
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_PLATFORM')
  const operator = computed(() => userStore.getUserInfo.userName || roleName(role.value))
  const canPublish = computed(() => props.scope === 'platform')

  function roleName(value: string): string {
    const map: Record<string, string> = {
      R_PLATFORM: '平台管理员',
      R_CENTER: '中心管理员',
      R_SYS: '系统管理员'
    }
    return map[value] ?? '管理员'
  }

  const STATUS_OPTIONS: ConsentTemplateStatus[] = ['草稿', '已发布', '已停用']
  const APPROVAL_OPTIONS: ConsentApproval[] = ['未提交', '待批准', '已批准']
  const STATUS_TAG: Record<ConsentTemplateStatus, 'warning' | 'success' | 'info'> = {
    草稿: 'warning',
    已发布: 'success',
    已停用: 'info'
  }
  const APPROVAL_TAG: Record<ConsentApproval, 'info' | 'warning' | 'success'> = {
    未提交: 'info',
    待批准: 'warning',
    已批准: 'success'
  }

  const options = reactive<{
    projects: Array<{ id: string; name: string; center: string }>
    centers: string[]
  }>({ projects: [], centers: [] })

  const searchItems = computed(() => [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: '模板名称 / 研究项目 / 版本',
      span: 6
    },
    {
      key: 'projectId',
      label: '研究项目',
      type: 'select',
      placeholder: '全部项目',
      options: options.projects.map((item) => ({ label: item.id, value: item.id }))
    },
    {
      key: 'status',
      label: '模板状态',
      type: 'select',
      placeholder: '全部状态',
      options: STATUS_OPTIONS.map((item) => ({ label: item, value: item }))
    },
    {
      key: 'approval',
      label: '批准状态',
      type: 'select',
      placeholder: '全部批准状态',
      options: APPROVAL_OPTIONS.map((item) => ({ label: item, value: item }))
    }
  ])

  /** 表格列严格按批注 16：模板名称 / 关联研究项目 / 适用中心 / 模板版本 / 模板状态 / 操作 */
  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    searchParams,
    getData,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: fetchGetConsentTemplates,
      apiParams: {
        current: 1,
        size: 10,
        keyword: '',
        projectId: '',
        center: props.center,
        status: '',
        approval: ''
      },
      columnsFactory: () => [
        { prop: 'name', label: '模板名称', minWidth: 200, showOverflowTooltip: true },
        { prop: 'projectId', label: '关联研究项目', minWidth: 150 },
        {
          prop: 'center',
          label: '适用中心',
          minWidth: 120,
          formatter: (row: ConsentTemplate) => row.center || '全部中心'
        },
        { prop: 'version', label: '模板版本', width: 110 },
        {
          prop: 'status',
          label: '模板状态',
          width: 170,
          formatter: (row: ConsentTemplate) =>
            h('div', { class: 'flex-c gap-1' }, [
              h(ElTag, { effect: 'light', type: STATUS_TAG[row.status] }, () => row.status),
              h(
                ElTag,
                { effect: 'plain', size: 'small', type: APPROVAL_TAG[row.approval] },
                () => row.approval
              )
            ])
        },
        {
          prop: 'operation',
          label: '操作',
          width: 240,
          fixed: 'right' as const,
          align: 'center' as const,
          formatter: (row: ConsentTemplate) => actionButtons(row)
        }
      ]
    }
  })

  function linkButton(label: string, onClick: () => void, disabled = false) {
    return h(
      ElButton,
      { link: true, type: 'primary', size: 'small', disabled, onClick },
      () => label
    )
  }

  function actionButtons(row: ConsentTemplate) {
    const children: Array<ReturnType<typeof h>> = []
    const editable = row.status === '草稿' && (props.scope === 'platform' || isOwnCenter(row))
    if (editable) children.push(linkButton('编辑', () => openForm(row, 'edit')))

    if (row.status === '草稿' && row.approval === '未提交') {
      children.push(linkButton('提交批准', () => submitApproval(row)))
    } else if (canPublish.value && row.status === '草稿' && row.approval === '待批准') {
      children.push(linkButton('确认批准', () => approve(row)))
    } else if (canPublish.value && row.status === '草稿' && row.approval === '已批准') {
      children.push(linkButton('发布', () => publish(row)))
    } else if (canPublish.value && row.status === '已发布') {
      children.push(linkButton('停用', () => stop(row)))
    }

    children.push(
      h(
        ElDropdown,
        { trigger: 'click' },
        {
          default: () => linkButton('更多', () => {}),
          dropdown: () =>
            h(ElDropdownMenu, {}, () => [
              h(ElDropdownItem, { onClick: () => openForm(row, 'newVersion') }, () => '另存新版本'),
              h(ElDropdownItem, { onClick: () => openPreview(row) }, () => '模板预览'),
              h(ElDropdownItem, { onClick: () => openHistory(row) }, () => '版本历史')
            ])
        }
      )
    )
    return h('div', { class: 'flex-c justify-center gap-1 flex-wrap' }, children)
  }

  function isOwnCenter(row: ConsentTemplate): boolean {
    return Boolean(props.center) && row.center === props.center
  }

  function handleSearch() {
    getData()
  }

  function handleReset() {
    resetSearchParams()
  }

  /* ------------------------------ 新增 / 编辑 / 另存版本 ------------------------------ */

  const formVisible = ref(false)
  const saving = ref(false)
  const formRef = ref<FormInstance>()
  const formMode = ref<'create' | 'edit' | 'newVersion'>('create')
  const editingId = ref('')
  const fileList = ref<UploadUserFile[]>([])
  const formModel = reactive({
    name: '',
    projectId: '',
    center: '',
    version: '',
    fileName: '',
    fileSize: ''
  })
  const formRules: FormRules = {
    name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
    projectId: [{ required: true, message: '请选择关联研究项目', trigger: 'change' }],
    version: [{ required: true, message: '请输入模板版本', trigger: 'blur' }],
    fileName: [{ required: true, message: '请选择模板文件', trigger: 'change' }]
  }

  const formTitle = computed(() => {
    if (formMode.value === 'edit') return '编辑知情同意书草稿'
    if (formMode.value === 'newVersion') return '另存知情同意书新版本'
    return '新增知情同意书模板'
  })

  function formatSize(size?: number): string {
    if (!size) return '—'
    return size >= 1024 * 1024
      ? `${(size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(size / 1024))} KB`
  }

  function handleFileChange(file: UploadFile) {
    formModel.fileName = file.name
    formModel.fileSize = formatSize(file.size)
  }

  function handleFileRemove() {
    formModel.fileName = ''
    formModel.fileSize = ''
  }

  function openForm(row?: ConsentTemplate, mode: 'create' | 'edit' | 'newVersion' = 'create') {
    formMode.value = mode
    editingId.value = row?.id ?? ''
    formModel.name = row?.name ?? ''
    formModel.projectId = row?.projectId ?? ''
    formModel.center = props.scope === 'center' ? props.center : (row?.center ?? '')
    formModel.version = mode === 'newVersion' ? '' : (row?.version ?? '')
    formModel.fileName = mode === 'newVersion' ? '' : (row?.fileName ?? '')
    formModel.fileSize = mode === 'newVersion' ? '' : (row?.fileSize ?? '')
    fileList.value =
      row?.fileName && mode !== 'newVersion'
        ? [{ name: row.fileName, uid: Date.now(), status: 'success' }]
        : []
    formVisible.value = true
  }

  async function submitForm() {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
    saving.value = true
    try {
      await fetchSaveConsentTemplate({
        id: editingId.value || undefined,
        mode: formMode.value,
        name: formModel.name.trim(),
        projectId: formModel.projectId,
        center: formModel.center,
        version: formModel.version.trim(),
        fileName: formModel.fileName.trim(),
        fileSize: formModel.fileSize,
        operator: operator.value,
        role: role.value
      })
      ElMessage.success(
        formMode.value === 'newVersion'
          ? '已另存新版本草稿，原版本及已签记录保留'
          : '模板草稿已保存'
      )
      formVisible.value = false
      await refreshData()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '模板保存失败')
    } finally {
      saving.value = false
    }
  }

  /** 通用动作执行器：统一错误提示与刷新 */
  async function runAction(action: string, fn: () => Promise<void>, success: string) {
    const confirmed = await ElMessageBox.confirm(action, '知情同意书', {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '返回'
    })
      .then(() => true)
      .catch(() => false)
    if (!confirmed) return
    try {
      await fn()
      ElMessage.success(success)
      await refreshData()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  function submitApproval(row: ConsentTemplate) {
    void runAction(
      `确认将「${row.name} ${row.version}」提交平台管理员批准？`,
      () => fetchSubmitConsentTemplateApproval(row.id, operator.value, role.value),
      '已提交批准，等待平台管理员确认'
    )
  }

  function approve(row: ConsentTemplate) {
    void runAction(
      `确认已核对「${row.name} ${row.version}」的模板内容并批准？批准后进入可发布状态。`,
      () => fetchApproveConsentTemplate(row.id, operator.value, role.value),
      '模板内容已确认批准，可发布'
    )
  }

  function publish(row: ConsentTemplate) {
    void runAction(
      `确认发布「${row.name} ${row.version}」？发布后同项目同中心的旧生效版本自动停用，患者详情仅可发放生效版本。`,
      () => fetchPublishConsentTemplate(row.id, operator.value, role.value),
      '模板已发布为生效版本'
    )
  }

  function stop(row: ConsentTemplate) {
    void runAction(
      `确认停用「${row.name} ${row.version}」？停用后不再允许发放。`,
      () => fetchStopConsentTemplate(row.id, operator.value, role.value),
      '模板已停用'
    )
  }

  /* ------------------------------ 预览与历史 ------------------------------ */

  const previewVisible = ref(false)
  const previewRow = ref<ConsentTemplate>()
  function openPreview(row: ConsentTemplate) {
    previewRow.value = row
    previewVisible.value = true
  }

  const historyVisible = ref(false)
  const historyRows = ref<ConsentTemplate['history']>([])
  function openHistory(row: ConsentTemplate) {
    historyRows.value = [...row.history].reverse()
    historyVisible.value = true
  }

  onMounted(async () => {
    const result = await fetchGetConsentTemplateOptions()
    options.projects = result.projects
    options.centers = result.centers
  })
</script>
