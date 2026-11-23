<!-- DLI 检查管理：分类筛选 + 上传资料 + 查看报告 / 发起解析 [批注 06] -->
<template>
  <div class="art-full-height">
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
            <ArtSvgIcon icon="ri:upload-cloud-2-line" class="mr-1" />上传资料
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

    <!-- 上传弹窗：患者编号 / 分类 / 项目 / 日期 / 文件；来源由系统记录 [批注 06] -->
    <ElDialog v-model="uploadVisible" title="上传资料" width="560px" destroy-on-close>
      <ElForm label-width="100px">
        <ElFormItem label="患者编号">
          <ElInput
            v-model="uploadForm.patientId"
            maxlength="30"
            placeholder="如 DLI-2026-0012"
            :disabled="!!props.patientId"
          />
        </ElFormItem>
        <ElFormItem label="资料分类">
          <ElSelect v-model="uploadForm.category" class="w-full" placeholder="选择资料分类">
            <ElOption v-for="item in CATEGORY_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="项目／名称">
          <ElInput
            v-model="uploadForm.item"
            maxlength="40"
            placeholder="请输入检查项目／资料名称"
          />
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
        <ElFormItem label="资料文件">
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
      </ElForm>
      <template #footer>
        <ElButton @click="uploadVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="uploading" @click="submitUpload">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 影像原图仍走影像查看入口，不按报告文字识别 [批注 06] -->
    <ElDialog v-model="imageVisible" title="影像查看" width="520px">
      <div class="rounded-lg border border-dashed border-full-d px-4 py-8 text-center">
        <ArtSvgIcon icon="ri:image-2-line" class="text-4xl text-g-400" />
        <p class="mt-3 text-sm text-g-800">{{ imageRow?.attachment.name }}</p>
        <p class="mt-1 text-xs text-g-500">
          影像原图由院内影像系统提供，检查管理仅保留查看入口与脱敏索引
        </p>
      </div>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { computed, h, onActivated, reactive, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import {
    ElButton,
    ElCard,
    ElDatePicker,
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElMessage,
    ElOption,
    ElSelect,
    ElTag,
    ElUpload
  } from 'element-plus'
  import type { UploadFile } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { useUserStore } from '@/store/modules/user'
  import {
    fetchCreateExamUpload,
    fetchGetExamList,
    fetchStartExamRecognition,
    isReportExam
  } from '@/mock/dli/api'
  import type {
    ExamAttachment,
    ExamCategory,
    ExamCheckStatus,
    ExamParseStatus,
    ExamRecord,
    ExamSource
  } from '@/mock/dli/types'

  defineOptions({ name: 'DliExam' })

  /** 患者详情页嵌入模式：同一资料源按患者编号过滤，返回后仍回到患者详情 */
  const props = defineProps<{ patientId?: string }>()

  const router = useRouter()
  const route = useRoute()
  const userStore = useUserStore()

  /** 医生 / 助理 / 护士按授权核对；管理员需另获数据权限后查看 [批注 06-角色] */
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
  const SOURCE_OPTIONS: ExamSource[] = ['院内同步', '医护上传', '患者上传']
  const CHECK_OPTIONS: ExamCheckStatus[] = ['待核对', '已核对']

  const PARSE_TAG: Record<ExamParseStatus, 'success' | 'primary' | 'warning' | 'danger' | 'info'> =
    {
      未解析: 'warning',
      解析中: 'primary',
      解析完成: 'success',
      解析失败: 'danger',
      无需解析: 'info'
    }
  const CHECK_TAG: Record<ExamCheckStatus, 'success' | 'warning'> = {
    待核对: 'warning',
    已核对: 'success'
  }

  /** 分类、患者编号、来源、核对状态统一放在筛选栏 [批注 06] */
  const searchItems = [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: '检查记录编号 / 项目',
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
      key: 'patientId',
      label: '患者编号',
      type: 'input',
      placeholder: '请输入患者编号',
      width: 220
    },
    {
      key: 'source',
      label: '来源',
      type: 'select',
      placeholder: '全部来源',
      options: SOURCE_OPTIONS.map((item) => ({ label: item, value: item }))
    },
    {
      key: 'checkStatus',
      label: '核对状态',
      type: 'select',
      placeholder: '全部状态',
      options: CHECK_OPTIONS.map((item) => ({ label: item, value: item }))
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
        patientId: props.patientId ?? '',
        source: '',
        checkStatus: '',
        category: ''
      },
      columnsFactory: () => [
        { prop: 'id', label: '检查记录编号', width: 125 },
        {
          prop: 'patientId',
          label: '患者编号',
          width: 140,
          formatter: (row: ExamRecord) =>
            props.patientId
              ? h('span', row.patientId)
              : h(
                  ElButton,
                  { link: true, type: 'primary', onClick: () => goPatientDetail(row) },
                  () => row.patientId
                )
        },
        { prop: 'center', label: '所属中心', width: 95 },
        {
          prop: 'category',
          label: '资料分类',
          width: 80,
          formatter: (row: ExamRecord) =>
            h(ElTag, { effect: 'plain', type: 'primary' }, () => row.category)
        },
        { prop: 'item', label: '检查项目／资料名称', minWidth: 145, showOverflowTooltip: true },
        { prop: 'date', label: '检查日期', width: 110 },
        {
          prop: 'source',
          label: '资料来源',
          width: 100,
          formatter: (row: ExamRecord) =>
            h(
              ElTag,
              {
                effect: 'plain',
                size: 'small',
                type:
                  row.source === '院内同步'
                    ? 'info'
                    : row.source === '患者上传'
                      ? 'warning'
                      : 'primary'
              },
              () => row.source
            )
        },
        {
          prop: 'parseStatus',
          label: '解析状态',
          width: 100,
          formatter: (row: ExamRecord) =>
            h(ElTag, { effect: 'light', type: PARSE_TAG[row.parseStatus] }, () => row.parseStatus)
        },
        {
          prop: 'checkStatus',
          label: '核对状态',
          width: 90,
          formatter: (row: ExamRecord) =>
            h(ElTag, { effect: 'light', type: CHECK_TAG[row.checkStatus] }, () => row.checkStatus)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 185,
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
                  onClick: () => openReport(row)
                },
                () => '查看报告'
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
                      () => '查看影像'
                    )
                  ]
                : []),
              ...(canManage.value &&
              isReportExam(row.category) &&
              row.checkStatus === '待核对' &&
              ['未解析', '解析失败'].includes(row.parseStatus)
                ? [
                    h(
                      ElButton,
                      { link: true, type: 'primary', onClick: () => startParsing(row) },
                      () => '发起解析'
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

  onActivated(() => {
    void getData()
  })

  function handleSearch() {
    void getData()
  }

  function handleReset() {
    resetSearchParams()
    void getData()
  }

  function goPatientDetail(row: ExamRecord) {
    router.push({ name: 'DliPatientDetail', params: { id: row.patientId } })
  }

  function openReport(row: ExamRecord) {
    if (!canView.value) {
      ElMessage.warning('请先申请数据权限')
      return
    }
    router.push({
      name: 'DliExamReportDetail',
      params: { id: row.id },
      query: { from: route.fullPath }
    })
  }

  async function startParsing(row: ExamRecord) {
    try {
      const updated = await fetchStartExamRecognition(row.id, operatorName.value)
      const target = tableData.value.find((item) => item.id === row.id)
      if (target) Object.assign(target, updated)
      ElMessage.success('解析完成，已进入待核对')
      await getData()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '发起解析失败')
    }
  }

  /* ------------------------------ 上传资料 ------------------------------ */
  const uploadVisible = ref(false)
  const uploading = ref(false)
  const uploadForm = reactive({
    category: '' as ExamCategory | '',
    item: '',
    patientId: '',
    date: new Date().toISOString().slice(0, 10),
    attachment: { name: '', type: '', size: '' } as ExamAttachment
  })

  function openUpload() {
    uploadForm.category = ''
    uploadForm.item = ''
    uploadForm.patientId = props.patientId ?? ''
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
      !uploadForm.date ||
      !uploadForm.attachment.name
    ) {
      ElMessage.warning('请填写患者编号、资料分类、项目／名称、日期并选择文件')
      return
    }
    uploading.value = true
    try {
      await fetchCreateExamUpload({
        patientId: uploadForm.patientId.trim(),
        category: uploadForm.category as ExamCategory,
        item: uploadForm.item.trim(),
        date: uploadForm.date,
        attachment: { ...uploadForm.attachment },
        operator: operatorName.value
      })
      ElMessage.success('资料已上传，等待解析 / 核对')
      uploadVisible.value = false
      await getData()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '上传失败')
    } finally {
      uploading.value = false
    }
  }

  /* ------------------------------ 影像查看 ------------------------------ */
  const imageVisible = ref(false)
  const imageRow = ref<ExamRecord>()

  function openImageView(row: ExamRecord) {
    if (!canView.value) {
      ElMessage.warning('请先申请数据权限')
      return
    }
    imageRow.value = row
    imageVisible.value = true
  }
</script>
