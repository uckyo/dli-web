<!-- DLI 检查管理：影像 / 病理 / 检验 / 病历 / 其他 -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
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
          <ElButton type="primary" @click="openUpload">
            <ArtSvgIcon icon="ri:upload-cloud-2-line" class="mr-1" />授权上传
          </ElButton>
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

    <!-- 授权上传 -->
    <ElDialog v-model="uploadVisible" title="授权上传" width="480px" destroy-on-close>
      <ElForm label-width="96px">
        <ElFormItem label="资料分类">
          <ElSelect v-model="uploadForm.category" class="w-full" placeholder="选择资料分类">
            <ElOption v-for="item in CATEGORY_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="资料名称">
          <ElInput v-model="uploadForm.name" maxlength="40" placeholder="请输入资料名称" />
        </ElFormItem>
        <ElFormItem label="患者编号">
          <ElInput
            v-model="uploadForm.patientId"
            maxlength="30"
            placeholder="如 DLI-2026-0347"
            :disabled="!!props.patientId"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="uploadVisible = false">取消</ElButton>
        <ElButton type="primary" @click="submitUpload">确认上传</ElButton>
      </template>
    </ElDialog>

    <!-- 脱敏查看：仅展示患者编号等非身份字段 -->
    <ElDialog v-model="maskVisible" title="脱敏查看" width="440px">
      <div v-if="maskRow" class="space-y-2 text-sm">
        <div class="flex-cb"
          ><span class="text-g-500">患者编号</span
          ><span class="font-medium text-g-900">{{ maskRow.patientId }}</span></div
        >
        <div class="flex-cb"
          ><span class="text-g-500">检查项目</span><span>{{ maskRow.item }}</span></div
        >
        <div class="flex-cb"
          ><span class="text-g-500">资料分类</span><span>{{ maskRow.category }}</span></div
        >
        <div class="flex-cb"
          ><span class="text-g-500">所属中心</span><span>{{ maskRow.center }}</span></div
        >
        <div class="flex-cb"
          ><span class="text-g-500">检查日期</span><span>{{ maskRow.date }}</span></div
        >
        <div class="flex-cb"
          ><span class="text-g-500">来源</span
          ><span>{{ sourceMap[maskRow.id] ?? '院内同步' }}</span></div
        >
      </div>
    </ElDialog>

    <!-- 识别核对 -->
    <ElDrawer v-model="recognizeVisible" title="识别核对" size="680px" destroy-on-close>
      <template v-if="activeExam">
        <div class="mb-3 flex-c gap-2">
          <span class="w-20 shrink-0 text-sm text-g-600">检查项目</span>
          <ElInput v-model="checkForm.item" maxlength="40" />
        </div>

        <div class="mb-2 flex-cb">
          <h5 class="text-sm font-medium text-g-800">原文值 / 提取值</h5>
          <ElTag v-if="manualMode" effect="plain" type="warning" size="small">人工录入模式</ElTag>
        </div>
        <ElTable :data="checkForm.fields" border class="mb-4">
          <ElTableColumn prop="name" label="字段" width="120" />
          <ElTableColumn label="原文值" minWidth="140">
            <template #default="{ row }">
              <ElInput v-model="row.raw" size="small" />
            </template>
          </ElTableColumn>
          <ElTableColumn label="提取值" minWidth="140">
            <template #default="{ row }">
              <ElInput v-model="row.extracted" size="small" />
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

        <div class="mb-2 flex-cb">
          <h5 class="text-sm font-medium text-g-800">修改记录</h5>
          <ElButton link type="primary" @click="addModifyRecord()">添加一条</ElButton>
        </div>
        <div v-for="record in checkForm.modifyRecords" :key="record.id" class="mb-2 flex-c gap-2">
          <ElInput v-model="record.field" size="small" class="w-32" placeholder="字段" />
          <ElInput v-model="record.before" size="small" class="flex-1" placeholder="修改前" />
          <ElInput v-model="record.after" size="small" class="flex-1" placeholder="修改后" />
          <span class="w-32 shrink-0 text-xs text-g-500">{{ record.time }}</span>
          <ElButton link type="danger" @click="removeModifyRecord(record.id)">删除</ElButton>
        </div>
        <p v-if="checkForm.modifyRecords.length === 0" class="text-xs text-g-500">暂无修改记录</p>
      </template>

      <template #footer>
        <div class="flex-cb w-full">
          <div class="flex-c gap-2">
            <ElButton @click="retryRecognize">重试识别</ElButton>
            <ElButton @click="manualEntry">人工录入</ElButton>
          </div>
          <div class="flex-c gap-2">
            <ElButton @click="recognizeVisible = false">取消</ElButton>
            <ElButton type="primary" @click="confirmRecognition">确认核对完成</ElButton>
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
    ElTable,
    ElTableColumn
  } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchGetExamList } from '@/mock/dli/api'
  import type { ExamCategory, ExamRecord } from '@/mock/dli/types'

  defineOptions({ name: 'DliExam' })

  /** 患者详情页嵌入模式：传入患者编号后仅展示该患者资料，全量列与功能保持不变 */
  const props = defineProps<{ patientId?: string }>()

  /** 检查分类 */
  const CATEGORY_OPTIONS: ExamCategory[] = ['影像', '病理', '检验', '病历', '其他']

  /** 识别核对默认字段 */
  const RECOGNITION_FIELDS = [
    { name: '白细胞计数', raw: 'WBC 6.8', extracted: '6.8', unit: '×10⁹/L', range: '3.5–9.5' },
    { name: '血红蛋白', raw: 'Hb 132', extracted: '132', unit: 'g/L', range: '115–150' },
    { name: '血小板计数', raw: 'PLT 210', extracted: '210', unit: '×10⁹/L', range: '125–350' }
  ]

  interface CheckField {
    name: string
    raw: string
    extracted: string
    unit: string
    range: string
  }
  interface ModifyRecord {
    id: string
    field: string
    before: string
    after: string
    time: string
  }
  interface CheckedInfo {
    operator: string
    time: string
  }
  type ExamSource = '院内同步' | '授权上传'

  const nowStr = () =>
    `${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 5)}`

  /** 解析状态标签 */
  const STATUS_TAG: Record<ExamRecord['status'], 'success' | 'primary' | 'warning'> = {
    已归档: 'success',
    待解析: 'warning',
    解析中: 'primary'
  }

  const searchItems = [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: '检查编号 / 患者编号 / 检查项目',
      span: 6
    }
  ]

  /* -------- 页面内扩展状态：不修改共享类型，按 id 关联 -------- */

  /** 授权上传新增记录，独立于接口分页数据源 */
  const extraExams = ref<ExamRecord[]>([])
  const sourceMap = reactive<Record<string, ExamSource>>({})
  const verifiedMap = reactive<Record<string, boolean>>({})
  const checkedInfo = reactive<Record<string, CheckedInfo>>({})

  /** 识别核对抽屉 */
  const recognizeVisible = ref(false)
  const activeExam = ref<ExamRecord>()
  const manualMode = ref(false)
  const checkForm = reactive({
    item: '',
    fields: [] as CheckField[],
    modifyRecords: [] as ModifyRecord[]
  })

  function addModifyRecord(field = '', before = '', after = '') {
    checkForm.modifyRecords.push({
      id: `MR-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      field,
      before,
      after,
      time: nowStr()
    })
  }
  function removeModifyRecord(id: string) {
    const index = checkForm.modifyRecords.findIndex((item) => item.id === id)
    if (index > -1) checkForm.modifyRecords.splice(index, 1)
  }

  /** 授权上传表单 */
  const uploadVisible = ref(false)
  const uploadForm = reactive({
    category: '' as ExamCategory | '',
    name: '',
    patientId: ''
  })

  /** 脱敏查看 */
  const maskVisible = ref(false)
  const maskRow = ref<ExamRecord>()

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
    refreshData,
    refreshCreate,
    refreshUpdate
  } = useTable({
    core: {
      apiFn: fetchGetExamList,
      apiParams: {
        current: 1,
        size: 10,
        keyword: '',
        patientId: props.patientId ?? ''
      },
      columnsFactory: () => [
        { prop: 'id', label: '检查编号', width: 130 },
        {
          prop: 'category',
          label: '资料分类',
          width: 100,
          formatter: (row: ExamRecord) =>
            h(ElTag, { effect: 'plain', type: 'primary' }, () => row.category)
        },
        { prop: 'item', label: '检查项目', minWidth: 170 },
        { prop: 'center', label: '所属中心', width: 120 },
        { prop: 'date', label: '检查日期', width: 120 },
        {
          prop: 'source',
          label: '来源',
          width: 110,
          formatter: (row: ExamRecord) => {
            const source = sourceMap[row.id] ?? '院内同步'
            return h(
              ElTag,
              { effect: 'plain', size: 'small', type: source === '授权上传' ? 'warning' : 'info' },
              () => source
            )
          }
        },
        {
          prop: 'status',
          label: '解析状态',
          width: 100,
          formatter: (row: ExamRecord) =>
            h(ElTag, { effect: 'light', type: STATUS_TAG[row.status] }, () => row.status)
        },
        {
          prop: 'verified',
          label: '核对状态',
          width: 130,
          formatter: (row: ExamRecord) => {
            const verified = verifiedMap[row.id] === true
            const info = checkedInfo[row.id]
            return h('div', { class: 'leading-5' }, [
              h(
                ElTag,
                { effect: 'plain', size: 'small', type: verified ? 'success' : 'info' },
                () => (verified ? '已核对' : '未核对')
              ),
              info
                ? h('div', { class: 'text-xs text-g-500' }, `${info.operator} · ${info.time}`)
                : null
            ])
          }
        },
        {
          prop: 'operation',
          label: '操作',
          width: 180,
          align: 'center' as const,
          formatter: (row: ExamRecord) =>
            h('div', { class: 'flex-c justify-center gap-3' }, [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openMaskView(row) },
                () => '脱敏查看'
              ),
              h(
                ElButton,
                {
                  link: true,
                  type: 'primary',
                  disabled: row.status === '已归档',
                  onClick: () => openRecognition(row)
                },
                () => (row.status === '已归档' ? '已解析' : '识别核对')
              )
            ])
        }
      ]
    }
  })

  /** 表格数据源：授权上传记录置顶，其余为接口分页数据 */
  const tableData = computed<ExamRecord[]>(() => {
    const extras = props.patientId
      ? extraExams.value.filter((item) => item.patientId === props.patientId)
      : extraExams.value
    return [...extras, ...data.value]
  })

  /** 查询（关键词 + 资料分类） */
  function handleSearch() {
    getData()
  }

  /** 重置分类与关键词 */
  function handleReset() {
    resetSearchParams()
  }

  /** 脱敏查看：仅展示患者编号，不展示姓名 / 手机号 / 病历号 */
  function openMaskView(row: ExamRecord) {
    maskRow.value = row
    maskVisible.value = true
  }

  /** 打开识别核对抽屉 */
  function openRecognition(row: ExamRecord) {
    activeExam.value = row
    manualMode.value = false
    checkForm.item = row.item
    checkForm.fields = RECOGNITION_FIELDS.map((field) => ({ ...field }))
    checkForm.modifyRecords = []
    recognizeVisible.value = true
  }

  /** 重试识别：解析中 → 定时回到待解析 */
  let retryTimer: number | undefined
  function retryRecognize() {
    const row = activeExam.value
    if (!row) return
    row.status = '解析中'
    ElMessage.info(`检查 ${row.id} 已重新提交识别`)
    if (retryTimer) window.clearTimeout(retryTimer)
    retryTimer = window.setTimeout(() => {
      row.status = '待解析'
      ElMessage.success('识别完成，请人工核对')
    }, 1500)
  }

  /** 人工录入：切换模式，提取值以原文为基础供人工修订，并写入修改记录 */
  function manualEntry() {
    manualMode.value = true
    checkForm.fields.forEach((field) => {
      field.extracted = field.raw
    })
    addModifyRecord('全部字段', '识别提取值', '切换人工录入')
    ElMessage.success('已切换人工录入，提取值可编辑')
  }

  /** 确认核对完成：归档、记录核对人与时间、刷新列表；未确认前保持「未核对」 */
  async function confirmRecognition() {
    const row = activeExam.value
    if (!row) return
    row.status = '已归档'
    verifiedMap[row.id] = true
    checkedInfo[row.id] = { operator: '当前医护', time: nowStr() }
    addModifyRecord('核对结论', '未核对', '已核对归档')
    recognizeVisible.value = false
    ElMessage.success('核对完成，已归档，可用于评估')
    await refreshUpdate()
  }

  /** 打开授权上传 */
  function openUpload() {
    uploadForm.category = ''
    uploadForm.name = ''
    uploadForm.patientId = props.patientId ?? ''
    uploadVisible.value = true
  }

  /** 提交授权上传：新增记录置入列表数据源并刷新 */
  async function submitUpload() {
    if (!uploadForm.category || !uploadForm.name.trim() || !uploadForm.patientId.trim()) {
      ElMessage.warning('请填写资料分类、资料名称与患者编号')
      return
    }
    const base = data.value[0] ?? extraExams.value[0]
    const row = Object.assign({}, base, {
      id: `EX-${Date.now()}`,
      patientId: props.patientId || uploadForm.patientId.trim(),
      patientName: '授权上传',
      category: uploadForm.category,
      item: uploadForm.name.trim(),
      center: '授权上传',
      date: new Date().toISOString().slice(0, 10),
      status: '待解析' as const
    }) as ExamRecord
    extraExams.value.unshift(row)
    sourceMap[row.id] = '授权上传'
    verifiedMap[row.id] = false
    uploadVisible.value = false
    ElMessage.success('资料已授权上传，待解析')
    await refreshCreate()
  }
</script>
