<!-- DLI 检查管理：影像 / 病理 / 检验 / 病历 / 其他 [批注 03] -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <!-- 患者详情页嵌入模式不显示筛选栏 -->
    <ArtSearchBar
      v-if="!props.patientId"
      v-model="searchParams"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton v-if="canManage" type="primary" @click="openUpload">
            <ArtSvgIcon icon="ri:upload-cloud-2-line" class="mr-1" />授权上传
          </ElButton>
          <ElButton v-else plain @click="requestDataPermission">申请数据权限</ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="tableData"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <!-- 授权上传：附件 + 完整资料字段 [批注 03-1] -->
    <ElDialog v-model="uploadVisible" title="授权上传" width="560px" destroy-on-close>
      <ElForm label-width="100px">
        <ElFormItem label="资料附件">
          <ElUpload
            drag
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            accept=".pdf,.jpg,.jpeg,.png,.dcm"
            :on-change="handleFileChange"
          >
            <div class="py-3">
              <ArtSvgIcon icon="ri:upload-cloud-2-line" class="text-3xl text-g-400" />
              <p class="mt-2 text-sm text-g-700">
                {{ uploadForm.attachment.name || '将文件拖到此处，或点击选择' }}
              </p>
              <p class="mt-1 text-xs text-g-500">支持 PDF / 图片 / DICOM，演示环境仅记录附件信息</p>
            </div>
          </ElUpload>
        </ElFormItem>
        <ElFormItem label="资料分类">
          <ElSelect v-model="uploadForm.category" class="w-full" placeholder="选择资料分类">
            <ElOption v-for="item in CATEGORY_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="项目／名称">
          <ElInput v-model="uploadForm.item" maxlength="40" placeholder="请输入项目／名称" />
        </ElFormItem>
        <ElFormItem label="患者编号">
          <ElInput
            v-model="uploadForm.patientId"
            maxlength="30"
            placeholder="如 DLI-2026-0012"
            :disabled="!!props.patientId"
          />
        </ElFormItem>
        <ElFormItem label="所属中心">
          <ElSelect v-model="uploadForm.center" class="w-full" placeholder="选择所属中心">
            <ElOption v-for="item in CENTER_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="检查／资料日期">
          <ElDatePicker
            v-model="uploadForm.date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            class="w-full"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="uploadVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="uploading" @click="submitUpload">确认上传</ElButton>
      </template>
    </ElDialog>

    <!-- 资料详情：脱敏字段 + 附件 + 上传 / 核对记录 [批注 03-2] -->
    <ElDrawer v-model="detailVisible" title="资料详情" size="620px" destroy-on-close>
      <template v-if="detailRow">
        <ElDescriptions :column="2" border size="small" class="mb-4">
          <ElDescriptionsItem label="资料编号">{{ detailRow.id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="患者编号">{{ detailRow.patientId }}</ElDescriptionsItem>
          <ElDescriptionsItem label="资料分类">{{ detailRow.category }}</ElDescriptionsItem>
          <ElDescriptionsItem label="项目／名称">{{ detailRow.item }}</ElDescriptionsItem>
          <ElDescriptionsItem label="所属中心">{{ detailRow.center }}</ElDescriptionsItem>
          <ElDescriptionsItem label="检查／资料日期">{{ detailRow.date }}</ElDescriptionsItem>
          <ElDescriptionsItem label="来源">{{ detailRow.source }}</ElDescriptionsItem>
          <ElDescriptionsItem label="处理状态">{{ detailRow.status }}</ElDescriptionsItem>
        </ElDescriptions>

        <div class="mb-2 text-sm font-medium text-g-800">附件</div>
        <div class="mb-4 flex-cb rounded-lg border border-full-d px-3 py-2">
          <div class="text-sm">
            <div class="text-g-900">{{ detailRow.attachment.name }}</div>
            <div class="mt-1 text-xs text-g-500">
              {{ detailRow.attachment.type }} · {{ detailRow.attachment.size }}
            </div>
          </div>
          <ElButton link type="primary" @click="previewAttachment(detailRow)">
            {{ detailRow.category === '影像' ? '影像查看入口' : '查看附件' }}
          </ElButton>
        </div>

        <div class="mb-2 text-sm font-medium text-g-800">上传与核对记录</div>
        <ElTimeline>
          <ElTimelineItem
            v-for="log in detailRow.logs"
            :key="log.id"
            :timestamp="log.time"
            placement="top"
          >
            <div class="text-sm text-g-900">{{ log.action }} · {{ log.operator }}</div>
            <p v-if="log.detail" class="mt-1 text-xs text-g-500">{{ log.detail }}</p>
          </ElTimelineItem>
        </ElTimeline>

        <template v-if="detailRow.modifyRecords.length">
          <div class="mb-2 mt-4 text-sm font-medium text-g-800">字段修改记录</div>
          <div
            v-for="record in detailRow.modifyRecords"
            :key="record.id"
            class="mb-2 rounded-lg bg-g-100/60 px-3 py-2 text-xs text-g-700"
          >
            {{ record.field }}：{{ record.before || '空' }} → {{ record.after || '空' }}
            <span class="ml-2 text-g-500">{{ record.operator }} · {{ record.time }}</span>
          </div>
        </template>
      </template>
    </ElDrawer>

    <!-- 影像查看入口：原图通过院内影像系统访问 [批注 03-3] -->
    <ElDialog v-model="imageVisible" title="影像查看" width="520px">
      <div class="rounded-lg border border-dashed border-full-d px-4 py-8 text-center">
        <ArtSvgIcon icon="ri:image-2-line" class="text-4xl text-g-400" />
        <p class="mt-3 text-sm text-g-800">{{ imageRow?.attachment.name }}</p>
        <p class="mt-1 text-xs text-g-500">
          影像原图由院内影像系统提供，检查管理仅保留查看入口与脱敏索引
        </p>
      </div>
    </ElDialog>

    <!-- 识别核对：报告图片 / PDF 按需识别，原文与提取字段对照 [批注 03-3] -->
    <ElDrawer v-model="recognizeVisible" title="识别核对" size="760px" destroy-on-close>
      <template v-if="activeExam">
        <div class="mb-4 rounded-lg bg-g-100/60 px-3 py-2 text-sm">
          <span class="text-g-500">识别原文附件：</span>
          <span class="text-g-900">{{ activeExam.attachment.name }}</span>
          <span class="ml-2 text-xs text-g-500">（{{ activeExam.attachment.type }}）</span>
        </div>

        <div class="mb-2 flex-cb">
          <h5 class="text-sm font-medium text-g-800">原文值 / 提取值对照</h5>
          <ElTag v-if="manualMode" effect="plain" type="warning" size="small">人工录入模式</ElTag>
        </div>
        <ElTable :data="checkForm.fields" border class="mb-3">
          <ElTableColumn label="字段" width="130">
            <template #default="{ row }">
              <ElInput v-model="row.name" size="small" placeholder="字段名" />
            </template>
          </ElTableColumn>
          <ElTableColumn label="原文值" minWidth="150">
            <template #default="{ row }">
              <ElInput v-model="row.raw" size="small" placeholder="原文（缺失留空）" />
            </template>
          </ElTableColumn>
          <ElTableColumn label="提取值" minWidth="150">
            <template #default="{ row }">
              <ElInput v-model="row.extracted" size="small" placeholder="待核对 / 人工录入" />
            </template>
          </ElTableColumn>
          <ElTableColumn label="单位" width="130">
            <template #default="{ row }">
              <ElInput v-model="row.unit" size="small" />
            </template>
          </ElTableColumn>
          <ElTableColumn label="参考范围" width="140">
            <template #default="{ row }">
              <ElInput v-model="row.range" size="small" />
            </template>
          </ElTableColumn>
        </ElTable>
        <p class="mb-4 text-xs text-g-500">
          缺失内容不自动补造；原文或提取值为空时不能确认核对，请重试识别或人工录入。
        </p>

        <div class="mb-2 flex-cb">
          <h5 class="text-sm font-medium text-g-800">修改记录</h5>
          <ElButton link type="primary" @click="addModifyRecord()">添加一条</ElButton>
        </div>
        <div v-for="record in checkForm.modifyRecords" :key="record.id" class="mb-2 flex-c gap-2">
          <ElInput v-model="record.field" size="small" class="w-32" placeholder="字段" />
          <ElInput v-model="record.before" size="small" class="flex-1" placeholder="修改前" />
          <ElInput v-model="record.after" size="small" class="flex-1" placeholder="修改后" />
          <ElButton link type="danger" @click="removeModifyRecord(record.id)">删除</ElButton>
        </div>
        <p v-if="checkForm.modifyRecords.length === 0" class="text-xs text-g-500">暂无修改记录</p>
      </template>

      <template #footer>
        <div class="flex-cb w-full">
          <div class="flex-c gap-2">
            <ElButton :loading="recognizing" @click="retryRecognize">重试识别</ElButton>
            <ElButton @click="manualEntry">人工录入</ElButton>
          </div>
          <div class="flex-c gap-2">
            <ElButton @click="recognizeVisible = false">取消</ElButton>
            <ElButton type="primary" :loading="confirming" @click="confirmRecognition"
              >确认核对完成</ElButton
            >
          </div>
        </div>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    ElCard,
    ElTag,
    ElButton,
    ElMessage,
    ElDrawer,
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElSelect,
    ElOption,
    ElDatePicker,
    ElUpload,
    ElTable,
    ElTableColumn,
    ElDescriptions,
    ElDescriptionsItem,
    ElTimeline,
    ElTimelineItem
  } from 'element-plus'
  import type { UploadFile } from 'element-plus'
  import { useRouter } from 'vue-router'
  import { useTable } from '@/hooks/core/useTable'
  import { useUserStore } from '@/store/modules/user'
  import {
    fetchGetExamList,
    fetchCreateExamUpload,
    fetchGetExamDetail,
    fetchRetryExamRecognition,
    fetchManualExamEntry,
    fetchConfirmExamRecognition,
    isReportExam
  } from '@/mock/dli/api'
  import type {
    ExamAttachment,
    ExamCategory,
    ExamModifyRecord,
    ExamProcessStatus,
    ExamRecognitionField,
    ExamRecord,
    ExamSource
  } from '@/mock/dli/types'

  defineOptions({ name: 'DliExam' })

  /** 患者详情页嵌入模式：同一资料源按患者编号过滤，且不显示筛选栏 */
  const props = defineProps<{ patientId?: string }>()

  const router = useRouter()
  const userStore = useUserStore()

  /** 角色：临床三角色按授权上传核对；四类管理员需另获数据权限后查看 [批注 03-角色] */
  const CLINICAL_ROLES = ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE']
  const MANAGER_ROLES = ['R_PLATFORM', 'R_CENTER', 'R_GROUP', 'R_SYS']
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const canManage = computed(() => CLINICAL_ROLES.includes(role.value))
  const isManager = computed(() => MANAGER_ROLES.includes(role.value))
  const dataGranted = ref(false)
  const canView = computed(() => canManage.value || dataGranted.value)
  const operatorName = computed(() => userStore.getUserInfo.userName || '当前医护')

  function requestDataPermission() {
    if (!isManager.value) return
    dataGranted.value = true
    ElMessage.success('数据权限申请已通过（演示），现可查看资料详情')
  }

  const CATEGORY_OPTIONS: ExamCategory[] = ['影像', '病理', '检验', '病历', '其他']
  const CENTER_OPTIONS = ['华东中心', '华北中心', '华南中心', '西南中心']
  const SOURCE_OPTIONS: ExamSource[] = ['院内同步', '授权上传']
  const STATUS_OPTIONS: ExamProcessStatus[] = [
    '待识别',
    '识别中',
    '识别失败',
    '待核对',
    '已核对归档'
  ]

  const STATUS_TAG: Record<ExamProcessStatus, 'success' | 'primary' | 'warning' | 'danger'> = {
    待识别: 'warning',
    识别中: 'primary',
    识别失败: 'danger',
    待核对: 'warning',
    已核对归档: 'success'
  }

  /** 独立页顶部筛选：分类 / 来源 / 处理状态（嵌入模式整块隐藏） */
  const searchItems = [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: '资料编号 / 患者编号 / 项目',
      span: 6
    },
    {
      key: 'category',
      label: '资料分类',
      type: 'select',
      placeholder: '全部分类',
      options: CATEGORY_OPTIONS.map((item) => ({ label: item, value: item }))
    },
    {
      key: 'source',
      label: '来源',
      type: 'select',
      placeholder: '全部来源',
      options: SOURCE_OPTIONS.map((item) => ({ label: item, value: item }))
    },
    {
      key: 'status',
      label: '处理状态',
      type: 'select',
      placeholder: '全部状态',
      options: STATUS_OPTIONS.map((item) => ({ label: item, value: item }))
    }
  ]

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
      apiFn: fetchGetExamList,
      apiParams: {
        current: 1,
        size: 10,
        keyword: '',
        category: '',
        source: '',
        status: '',
        patientId: props.patientId ?? ''
      },
      columnsFactory: () => [
        { prop: 'id', label: '资料编号', width: 150 },
        {
          prop: 'patientId',
          label: '患者编号',
          width: 150,
          formatter: (row: ExamRecord) =>
            props.patientId
              ? h('span', row.patientId)
              : h(
                  ElButton,
                  { link: true, type: 'primary', onClick: () => goPatientDetail(row) },
                  () => row.patientId
                )
        },
        { prop: 'center', label: '所属中心', width: 120 },
        {
          prop: 'category',
          label: '分类',
          width: 90,
          formatter: (row: ExamRecord) =>
            h(ElTag, { effect: 'plain', type: 'primary' }, () => row.category)
        },
        { prop: 'item', label: '项目／名称', minWidth: 170, showOverflowTooltip: true },
        { prop: 'date', label: '检查／资料日期', width: 140 },
        {
          prop: 'source',
          label: '来源',
          width: 110,
          formatter: (row: ExamRecord) =>
            h(
              ElTag,
              {
                effect: 'plain',
                size: 'small',
                type: row.source === '授权上传' ? 'warning' : 'info'
              },
              () => row.source
            )
        },
        {
          prop: 'status',
          label: '处理状态',
          width: 120,
          formatter: (row: ExamRecord) =>
            h(ElTag, { effect: 'light', type: STATUS_TAG[row.status] }, () => row.status)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 200,
          fixed: 'right' as const,
          align: 'center' as const,
          formatter: (row: ExamRecord) =>
            h('div', { class: 'flex-c justify-center gap-2' }, [
              h(
                ElButton,
                {
                  link: true,
                  type: 'primary',
                  disabled: !canView.value,
                  onClick: () => openDetail(row)
                },
                () => '详情'
              ),
              ...(row.category === '影像'
                ? [
                    h(
                      ElButton,
                      {
                        link: true,
                        type: 'primary',
                        disabled: !canView.value,
                        onClick: () => openImageView(row)
                      },
                      () => '影像查看'
                    )
                  ]
                : []),
              ...(canManage.value && isReportExam(row.category) && !row.verified
                ? [
                    h(
                      ElButton,
                      { link: true, type: 'primary', onClick: () => openRecognition(row) },
                      () => '识别核对'
                    )
                  ]
                : [])
            ])
        }
      ]
    }
  })

  /** 数据全部来自共享接口，检查管理与患者详情看到的是同一份资料 */
  const tableData = computed<ExamRecord[]>(() => data.value)

  function handleSearch() {
    getData()
  }

  function handleReset() {
    resetSearchParams()
  }

  function goPatientDetail(row: ExamRecord) {
    router.push({ name: 'DliPatientDetail', params: { id: row.patientId } })
  }

  /* ------------------------------ 授权上传 ------------------------------ */
  const uploadVisible = ref(false)
  const uploading = ref(false)
  const uploadForm = reactive({
    category: '' as ExamCategory | '',
    item: '',
    patientId: '',
    center: '',
    date: new Date().toISOString().slice(0, 10),
    attachment: { name: '', type: '', size: '' } as ExamAttachment
  })

  function openUpload() {
    uploadForm.category = ''
    uploadForm.item = ''
    uploadForm.patientId = props.patientId ?? ''
    uploadForm.center = ''
    uploadForm.date = new Date().toISOString().slice(0, 10)
    uploadForm.attachment = { name: '', type: '', size: '' }
    uploadVisible.value = true
  }

  function handleFileChange(file: UploadFile) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    uploadForm.attachment = {
      name: file.name,
      type: ext === 'dcm' ? 'DICOM 原图' : ext === 'pdf' ? 'PDF 报告' : '图片报告',
      size: file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : '—'
    }
    if (!uploadForm.item.trim()) uploadForm.item = file.name.replace(/\.[^.]+$/, '')
  }

  async function submitUpload() {
    if (
      !uploadForm.category ||
      !uploadForm.item.trim() ||
      !uploadForm.patientId.trim() ||
      !uploadForm.center ||
      !uploadForm.date ||
      !uploadForm.attachment.name
    ) {
      ElMessage.warning('请填写分类、项目／名称、患者编号、所属中心、日期并选择附件')
      return
    }
    uploading.value = true
    try {
      await fetchCreateExamUpload({
        patientId: uploadForm.patientId.trim(),
        category: uploadForm.category as ExamCategory,
        item: uploadForm.item.trim(),
        center: uploadForm.center,
        date: uploadForm.date,
        attachment: { ...uploadForm.attachment },
        operator: operatorName.value
      })
      ElMessage.success('资料已授权上传，进入待识别 / 待核对')
      uploadVisible.value = false
      await getData()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '上传失败')
    } finally {
      uploading.value = false
    }
  }

  /* ------------------------------ 资料详情 / 影像查看 ------------------------------ */
  const detailVisible = ref(false)
  const detailRow = ref<ExamRecord>()
  const imageVisible = ref(false)
  const imageRow = ref<ExamRecord>()

  async function openDetail(row: ExamRecord) {
    if (!canView.value) {
      ElMessage.warning('请先申请数据权限')
      return
    }
    detailRow.value = await fetchGetExamDetail(row.id)
    detailVisible.value = true
  }

  function openImageView(row: ExamRecord) {
    if (!canView.value) {
      ElMessage.warning('请先申请数据权限')
      return
    }
    imageRow.value = row
    imageVisible.value = true
  }

  function previewAttachment(row: ExamRecord) {
    if (row.category === '影像') {
      openImageView(row)
    } else {
      ElMessage.info('演示环境不预览真实文件')
    }
  }

  /* ------------------------------ 识别核对 ------------------------------ */
  const recognizeVisible = ref(false)
  const activeExam = ref<ExamRecord>()
  const manualMode = ref(false)
  const recognizing = ref(false)
  const confirming = ref(false)
  const checkForm = reactive({
    fields: [] as ExamRecognitionField[],
    modifyRecords: [] as ExamModifyRecord[]
  })

  async function openRecognition(row: ExamRecord) {
    const detail = await fetchGetExamDetail(row.id)
    activeExam.value = detail
    manualMode.value = false
    checkForm.fields = detail.recognitionFields.map((field) => ({ ...field }))
    checkForm.modifyRecords = detail.modifyRecords.map((record) => ({ ...record }))
    recognizeVisible.value = true
  }

  function addModifyRecord(field = '', before = '', after = '') {
    checkForm.modifyRecords.push({
      id: `MR-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      field,
      before,
      after,
      operator: operatorName.value,
      time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    })
  }

  function removeModifyRecord(id: string) {
    const index = checkForm.modifyRecords.findIndex((item) => item.id === id)
    if (index > -1) checkForm.modifyRecords.splice(index, 1)
  }

  async function retryRecognize() {
    const row = activeExam.value
    if (!row) return
    recognizing.value = true
    try {
      const updated = await fetchRetryExamRecognition(row.id, operatorName.value)
      activeExam.value = updated
      ElMessage.success('识别完成，请逐项核对原文与提取值')
      await getData()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '重试识别失败')
    } finally {
      recognizing.value = false
    }
  }

  async function manualEntry() {
    const row = activeExam.value
    if (!row) return
    manualMode.value = true
    // 仅新增空白行由医护填写，不自动填充任何缺失内容
    checkForm.fields.push({ name: '', raw: '', extracted: '', unit: '', range: '' })
    addModifyRecord('人工录入', '识别提取值', '新增空白字段行')
    await fetchManualExamEntry(row.id, operatorName.value)
    ElMessage.info('已切换人工录入，请填写原文与提取值')
  }

  async function confirmRecognition() {
    const row = activeExam.value
    if (!row) return
    confirming.value = true
    try {
      await fetchConfirmExamRecognition(row.id, {
        fields: checkForm.fields,
        modifyRecords: checkForm.modifyRecords,
        operator: operatorName.value
      })
      ElMessage.success('核对完成，可用于评估')
      recognizeVisible.value = false
      await getData()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '核对失败')
    } finally {
      confirming.value = false
    }
  }
</script>
