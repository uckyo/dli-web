<!-- DLI 患者管理：建档 / 研究入组 / 核对 / 脱敏导出 / 预警 / 诊疗历程 -->
<template>
  <div class="art-full-height">
    <!-- 搜索区 -->
    <div class="art-card px-5 pt-4 pb-0">
      <ElForm :inline="true" @submit.prevent>
        <ElFormItem label="关键词">
          <ElInput
            v-model="searchParams.keyword"
            placeholder="患者编号 / 研究编号 / 主管医生"
            clearable
            style="width: 260px"
            @keyup.enter="handleSearch"
          />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect
            v-model="searchParams.status"
            placeholder="全部状态"
            clearable
            style="width: 140px"
          >
            <ElOption v-for="item in STATUS_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="预警等级">
          <ElSelect
            v-model="searchParams.warnLevel"
            placeholder="全部等级"
            clearable
            style="width: 140px"
          >
            <ElOption label="高风险" value="high" />
            <ElOption label="中风险" value="medium" />
            <ElOption label="低风险" value="low" />
            <ElOption label="未触发" value="none" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="入组入口">
          <ElSelect
            v-model="searchParams.enrollEntry"
            placeholder="全部入口"
            clearable
            style="width: 190px"
          >
            <ElOption
              v-for="item in ENROLL_ENTRY_OPTIONS"
              :key="item"
              :label="item"
              :value="item"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="研究组别">
          <ElSelect
            v-model="searchParams.researchGroup"
            placeholder="全部组别"
            clearable
            style="width: 150px"
          >
            <ElOption
              v-for="item in RESEARCH_GROUP_OPTIONS"
              :key="item"
              :label="item"
              :value="item"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="入组状态">
          <ElSelect
            v-model="searchParams.enrolled"
            placeholder="全部"
            clearable
            style="width: 130px"
          >
            <ElOption label="已入组" value="yes" />
            <ElOption label="仅建档" value="no" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" @click="handleSearch">查询</ElButton>
          <ElButton @click="handleReset">重置</ElButton>
        </ElFormItem>
      </ElForm>
    </div>

    <!-- 表格 -->
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <div class="flex-c gap-2">
            <ElButton type="primary" @click="openArchive">新建患者档案</ElButton>
            <ElButton plain @click="openImport">导入患者表格</ElButton>
            <ElButton plain @click="handleExport">按筛选导出</ElButton>
          </div>
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

    <!-- 医患对话抽屉 -->
    <ChatDrawer v-model="chatVisible" :patient="activePatient" :readonly="!canReply" />

    <!-- 诊疗历程抽屉 -->
    <HistoryDrawer v-model="historyVisible" :patient="activePatient" />

    <!-- 新建患者档案：建档不产生研究入组 -->
    <ElDialog v-model="archiveVisible" title="新建患者档案" width="480px" destroy-on-close>
      <ElForm label-width="110px">
        <ElFormItem label="所属中心">
          <ElSelect v-model="archiveForm.center" class="w-full">
            <ElOption v-for="item in CENTER_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="主管医生">
          <ElSelect v-model="archiveForm.doctor" class="w-full">
            <ElOption v-for="item in DOCTOR_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="患者状态">
          <ElSelect v-model="archiveForm.status" class="w-full">
            <ElOption v-for="item in STATUS_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="诊疗分组">
          <ElSelect v-model="archiveForm.group" class="w-full">
            <ElOption
              v-for="item in RESEARCH_GROUP_OPTIONS"
              :key="item"
              :label="item"
              :value="item"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="archiveVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="archiveBusy" @click="submitArchive">确认建档</ElButton>
      </template>
    </ElDialog>

    <!-- 核对入组：条件核对 + 知情同意 + 确认入组 -->
    <ElDialog v-model="enrollVisible" title="核对入组条件" width="680px" destroy-on-close>
      <div class="mb-3 flex-c gap-3">
        <ElSelect
          v-model="enrollForm.entry"
          placeholder="选择入组入口"
          style="width: 240px"
          @change="runEnrollCheck"
        >
          <ElOption v-for="item in ENROLL_ENTRY_OPTIONS" :key="item" :label="item" :value="item" />
        </ElSelect>
        <ElSelect v-model="enrollForm.group" style="width: 180px">
          <ElOption
            v-for="item in RESEARCH_GROUP_OPTIONS"
            :key="item"
            :label="item"
            :value="item"
          />
        </ElSelect>
        <span class="text-xs text-g-500">{{ activePatient?.id }}</span>
      </div>

      <ElTable :data="enrollChecks" size="small" border>
        <ElTableColumn prop="label" label="核对条件" minWidth="180" />
        <ElTableColumn prop="detail" label="当前值" minWidth="190" />
        <ElTableColumn label="结果" width="90">
          <template #default="{ row }">
            <ElTag :type="row.passed ? 'success' : 'danger'" effect="plain">
              {{ row.passed ? '通过' : '未通过' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="处理" width="150">
          <template #default="{ row }">
            <ElButton
              v-if="!row.passed && row.label === '知情同意已签署'"
              link
              type="primary"
              @click="signConsent"
            >
              签署 v2.1
            </ElButton>
            <ElButton
              v-if="!row.passed && row.label === '基线检查资料已归档'"
              link
              type="primary"
              @click="addBaseline"
            >
              补录基线检查
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <template #footer>
        <ElButton @click="enrollVisible = false">取消</ElButton>
        <ElButton
          type="primary"
          :disabled="!allChecksPassed"
          :loading="enrollBusy"
          @click="confirmEnroll"
        >
          确认入组
        </ElButton>
      </template>
    </ElDialog>

    <!-- 导入患者表格：模板 / 预览去重 / 错误反馈 / 覆盖确认 / 提交 -->
    <ElDialog v-model="importVisible" title="导入患者表格" width="780px" destroy-on-close>
      <div class="mb-2 flex-c gap-2">
        <ElButton plain @click="downloadTemplate">下载导入模板</ElButton>
        <ElButton plain @click="fillImportSample">填入示例数据</ElButton>
        <span class="text-xs text-g-500"
          >CSV 列：患者编号, 研究编号, 所属中心, 主管医生, 状态, 入组入口</span
        >
      </div>
      <ElInput
        v-model="importText"
        type="textarea"
        :rows="5"
        placeholder="每行一条，使用英文逗号分隔"
      />
      <div class="my-3 flex-c gap-2">
        <ElButton type="primary" plain @click="previewImport">预览去重与校验</ElButton>
        <ElCheckbox v-model="importOverwrite">覆盖已有数据（仅作用于重复行）</ElCheckbox>
      </div>
      <ElTable
        v-if="importPreview.length"
        :data="importPreview"
        size="small"
        border
        max-height="260"
      >
        <ElTableColumn prop="id" label="患者编号" width="160" />
        <ElTableColumn prop="center" label="所属中心" width="110" />
        <ElTableColumn prop="doctor" label="主管医生" width="100" />
        <ElTableColumn label="校验结果" width="100">
          <template #default="{ row }">
            <ElTag
              :type="
                row.result === '新增' ? 'success' : row.result === '重复' ? 'warning' : 'danger'
              "
              effect="plain"
            >
              {{ row.result }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="reason" label="原因" minWidth="180" />
      </ElTable>
      <template #footer>
        <ElButton @click="importVisible = false">取消</ElButton>
        <ElButton
          type="primary"
          :disabled="!importPreview.length"
          :loading="importBusy"
          @click="submitImport"
        >
          确认导入
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    ElTag,
    ElButton,
    ElDialog,
    ElMessage,
    ElMessageBox,
    ElSelect,
    ElOption,
    ElInput,
    ElForm,
    ElFormItem,
    ElTable,
    ElTableColumn,
    ElCheckbox
  } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import {
    fetchAddBaselineExam,
    fetchCheckEnrollEligibility,
    fetchConfirmEnrollment,
    fetchCreatePatientArchive,
    fetchGetPatientList,
    fetchPreviewPatientImport,
    fetchSignConsent,
    fetchSubmitPatientImport,
    type EnrollCheckItem,
    type PatientImportPreview,
    type PatientImportRow
  } from '@/mock/dli/api'
  import { useRouter } from 'vue-router'
  import { useUserStore } from '@/store/modules/user'
  import type { EnrollEntry, WarnLevel, WebPatient } from '@/mock/dli/types'
  import ChatDrawer from './modules/chat-drawer.vue'
  import HistoryDrawer from './modules/history-drawer.vue'

  defineOptions({ name: 'DliPatient' })

  const userStore = useUserStore()
  const router = useRouter()

  const STATUS_OPTIONS: Array<WebPatient['status']> = ['待评估', '用药中', '随访中', '已结案']
  const ENROLL_ENTRY_OPTIONS: EnrollEntry[] = ['拟接受高危药物治疗', '已确诊 DLI']
  const RESEARCH_GROUP_OPTIONS: Array<WebPatient['group']> = ['AI 组', '常规组']
  const CENTER_OPTIONS = ['华东中心', '华北中心', '华南中心', '西南中心']
  const DOCTOR_OPTIONS = ['陈明远', '周雅琴', '刘志远', '孙可欣']

  const WARN_CONFIG: Record<WarnLevel, { label: string; type: 'danger' | 'warning' | 'info' }> = {
    high: { label: '高风险', type: 'danger' },
    medium: { label: '中风险', type: 'warning' },
    low: { label: '低风险', type: 'info' },
    none: { label: '未触发', type: 'info' }
  }

  const STATUS_TAG: Record<WebPatient['status'], 'success' | 'primary' | 'info' | 'warning'> = {
    待评估: 'warning',
    用药中: 'primary',
    随访中: 'success',
    已结案: 'info'
  }

  interface PatientSearchParams {
    current: number
    size: number
    keyword: string
    status: WebPatient['status'] | ''
    warnLevel: WarnLevel | ''
    enrollEntry: EnrollEntry | ''
    researchGroup: WebPatient['group'] | ''
    enrolled: '' | 'yes' | 'no'
  }

  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const canReply = computed(() => ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role.value))

  const chatVisible = ref(false)
  const historyVisible = ref(false)
  const activePatient = ref<WebPatient>()

  /** 组别限制：常规组依方案不开放 AI 报告、预警与患者消息 */
  const isAiGroup = (row: WebPatient) => row.group === 'AI 组'

  function showError(error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败')
  }

  function renderWarn(row: WebPatient, field: 'earlyScreen' | 'earlyDiagnosis') {
    if (!isAiGroup(row)) return h('span', { class: 'text-xs text-g-400' }, '依方案不开放')
    const warn = row[field]
    const config = WARN_CONFIG[warn.level]
    const text = warn.level === 'none' ? config.label : `${config.label} ${warn.score}`
    return h(ElTag, { type: config.type, effect: 'plain' }, () => text)
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    searchParams: tableSearchParams,
    getData,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: fetchGetPatientList,
      apiParams: {
        current: 1,
        size: 10,
        keyword: '',
        status: '',
        warnLevel: '',
        enrollEntry: '',
        researchGroup: '',
        enrolled: ''
      } as PatientSearchParams,
      columnsFactory: () => [
        { prop: 'id', label: '患者编号', width: 160 },
        { prop: 'researchNo', label: '研究受试者编号', width: 165 },
        { prop: 'center', label: '所属中心', width: 115 },
        { prop: 'doctor', label: '主管医生', width: 105 },
        { prop: 'enrollEntry', label: '入组入口', width: 165 },
        { prop: 'group', label: '研究组别', width: 110 },
        { prop: 'enrollDate', label: '入组日期', width: 120 },
        {
          prop: 'status',
          label: '状态',
          width: 95,
          formatter: (row: WebPatient) =>
            h(ElTag, { type: STATUS_TAG[row.status], effect: 'light' }, () => row.status)
        },
        {
          prop: 'consent',
          label: '知情同意',
          width: 110,
          formatter: (row: WebPatient) =>
            h(ElTag, { type: row.consent.signed ? 'success' : 'warning', effect: 'plain' }, () =>
              row.consent.signed ? row.consent.version : '未签署'
            )
        },
        {
          prop: 'earlyScreen',
          label: '早筛预警',
          width: 130,
          formatter: (row: WebPatient) => renderWarn(row, 'earlyScreen')
        },
        {
          prop: 'earlyDiagnosis',
          label: '早诊预警',
          width: 130,
          formatter: (row: WebPatient) => renderWarn(row, 'earlyDiagnosis')
        },
        {
          prop: 'outcome',
          label: '转归预测',
          minWidth: 170,
          formatter: (row: WebPatient) =>
            isAiGroup(row)
              ? h('div', { class: 'leading-5' }, [
                  h(
                    'div',
                    { class: 'text-g-900' },
                    `${row.outcome.window} · ${(row.outcome.probability * 100).toFixed(0)}%`
                  ),
                  h('div', { class: 'text-xs text-g-500' }, row.outcome.label)
                ])
              : h('span', { class: 'text-xs text-g-400' }, '依方案不开放')
        },
        {
          prop: 'chat',
          label: '对话',
          width: 120,
          align: 'center' as const,
          formatter: (row: WebPatient) =>
            isAiGroup(row)
              ? h(
                  ElButton,
                  { link: true, type: 'primary', onClick: () => openChat(row) },
                  () => '医患对话'
                )
              : h('span', { class: 'text-xs text-g-400' }, '依方案不开放')
        },
        {
          prop: 'history',
          label: '诊疗历程',
          width: 100,
          align: 'center' as const,
          formatter: (row: WebPatient) =>
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => openHistory(row) },
              () => '查看历程'
            )
        },
        {
          prop: 'action',
          label: '操作',
          width: 165,
          fixed: 'right' as const,
          formatter: (row: WebPatient) => {
            const buttons = [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => goPatientDetail(row) },
                () => '患者详情'
              )
            ]
            if (!row.enrolled) {
              buttons.unshift(
                h(
                  ElButton,
                  { link: true, type: 'warning', onClick: () => openEnroll(row) },
                  () => '核对入组'
                )
              )
            }
            return h('div', { class: 'flex-c gap-1' }, buttons)
          }
        }
      ]
    }
  })

  const searchParams = tableSearchParams as PatientSearchParams

  function openChat(row: WebPatient) {
    activePatient.value = row
    chatVisible.value = true
  }

  function openHistory(row: WebPatient) {
    activePatient.value = row
    historyVisible.value = true
  }

  function goPatientDetail(row: WebPatient) {
    router.push({ name: 'DliPatientDetail', params: { id: row.id } })
  }

  function handleSearch() {
    searchParams.current = 1
    getData()
  }

  function handleReset() {
    resetSearchParams()
  }

  /* ------------------------------ 建档 ------------------------------ */

  const archiveVisible = ref(false)
  const archiveBusy = ref(false)
  const archiveForm = reactive({
    center: '华东中心',
    doctor: '陈明远',
    status: '待评估' as WebPatient['status'],
    group: 'AI 组' as WebPatient['group']
  })

  function openArchive() {
    archiveVisible.value = true
  }

  async function submitArchive() {
    archiveBusy.value = true
    try {
      const patient = await fetchCreatePatientArchive({ ...archiveForm })
      archiveVisible.value = false
      await refreshData()
      ElMessage.success(`已建档 ${patient.id}，尚未入组，请单独核对入组条件`)
    } catch (error) {
      showError(error)
    } finally {
      archiveBusy.value = false
    }
  }

  /* ------------------------------ 核对入组 ------------------------------ */

  const enrollVisible = ref(false)
  const enrollBusy = ref(false)
  const enrollChecks = ref<EnrollCheckItem[]>([])
  const enrollForm = reactive({
    entry: '' as EnrollEntry | '',
    group: 'AI 组' as WebPatient['group']
  })
  const allChecksPassed = computed(
    () => enrollChecks.value.length > 0 && enrollChecks.value.every((item) => item.passed)
  )

  async function openEnroll(row: WebPatient) {
    activePatient.value = row
    enrollForm.entry = row.enrollEntry || ''
    enrollForm.group = row.group
    enrollVisible.value = true
    await runEnrollCheck()
  }

  async function runEnrollCheck() {
    if (!activePatient.value || !enrollForm.entry) {
      enrollChecks.value = []
      return
    }
    try {
      enrollChecks.value = await fetchCheckEnrollEligibility(
        activePatient.value.id,
        enrollForm.entry
      )
    } catch (error) {
      showError(error)
    }
  }

  async function signConsent() {
    if (!activePatient.value) return
    try {
      const patient = await fetchSignConsent(activePatient.value.id, 'v2.1')
      activePatient.value.consent = { ...patient.consent }
      await runEnrollCheck()
      ElMessage.success('知情同意已签署 v2.1')
    } catch (error) {
      showError(error)
    }
  }

  async function addBaseline() {
    if (!activePatient.value) return
    try {
      await fetchAddBaselineExam(activePatient.value.id)
      await runEnrollCheck()
      ElMessage.success('已补录基线检查资料并归档')
    } catch (error) {
      showError(error)
    }
  }

  async function confirmEnroll() {
    if (!activePatient.value || !enrollForm.entry) return
    enrollBusy.value = true
    try {
      const patient = await fetchConfirmEnrollment({
        id: activePatient.value.id,
        entry: enrollForm.entry,
        group: enrollForm.group
      })
      Object.assign(activePatient.value, patient)
      enrollVisible.value = false
      await refreshData()
      ElMessage.success(`入组成功，研究受试者编号 ${patient.researchNo}`)
    } catch (error) {
      showError(error)
      await runEnrollCheck()
    } finally {
      enrollBusy.value = false
    }
  }

  /* ------------------------------ 导入 ------------------------------ */

  const importVisible = ref(false)
  const importBusy = ref(false)
  const importText = ref('')
  const importPreview = ref<PatientImportPreview[]>([])
  const importOverwrite = ref(false)

  const IMPORT_HEADER = '患者编号,研究编号,所属中心,主管医生,状态,入组入口'

  function openImport() {
    importText.value = ''
    importPreview.value = []
    importOverwrite.value = false
    importVisible.value = true
  }

  function downloadCsv(filename: string, lines: string[]) {
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function downloadTemplate() {
    downloadCsv('患者导入模板.csv', [
      IMPORT_HEADER,
      'DLI-2026-9001,,华东中心,陈明远,待评估,拟接受高危药物治疗'
    ])
    ElMessage.success('模板已下载')
  }

  function fillImportSample() {
    importText.value = [
      IMPORT_HEADER,
      'DLI-2026-9001,,华东中心,陈明远,待评估,拟接受高危药物治疗',
      'DLI-2026-9002,,华北中心,周雅琴,用药中,已确诊 DLI',
      'DLI-2026-0001,,华南中心,刘志远,随访中,已确诊 DLI',
      'DLI-2026-9001,,西南中心,孙可欣,用药中,已确诊 DLI',
      'BAD-ID,,华东中心,陈明远,用药中,已确诊 DLI',
      'DLI-2026-9003,,,陈明远,待评估,拟接受高危药物治疗'
    ].join('\n')
    importPreview.value = []
  }

  function parseImportText(): PatientImportRow[] {
    return importText.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('患者编号'))
      .map((line) => {
        const [id, researchNo, center, doctor, status, enrollEntry] = line
          .split(',')
          .map((cell) => (cell ?? '').trim())
        return { id, researchNo, center, doctor, status, enrollEntry }
      })
  }

  async function previewImport() {
    const rows = parseImportText()
    if (!rows.length) {
      ElMessage.warning('请先填写或粘贴待导入数据')
      return
    }
    try {
      importPreview.value = await fetchPreviewPatientImport(rows)
      const errors = importPreview.value.filter((item) => item.result === '错误').length
      const duplicates = importPreview.value.filter((item) => item.result === '重复').length
      ElMessage.info(
        `预览完成：新增 ${importPreview.value.length - errors - duplicates} 条，重复 ${duplicates} 条，错误 ${errors} 条`
      )
    } catch (error) {
      showError(error)
    }
  }

  async function submitImport() {
    importBusy.value = true
    try {
      const result = await fetchSubmitPatientImport(importPreview.value, importOverwrite.value)
      importVisible.value = false
      await refreshData()
      ElMessage.success(
        `导入完成：新增 ${result.created} 条，覆盖更新 ${result.updated} 条，跳过 ${result.skipped} 条`
      )
    } catch (error) {
      showError(error)
    } finally {
      importBusy.value = false
    }
  }

  /* ------------------------------ 导出 ------------------------------ */

  async function handleExport() {
    try {
      await ElMessageBox.confirm(
        '导出内容仅包含患者编号、研究编号、中心、医生、组别、入组与状态字段，不含姓名、手机号、病历号。确认按当前筛选条件导出？',
        '导出授权确认',
        { type: 'warning' }
      )
    } catch {
      return
    }
    try {
      const response = await fetchGetPatientList({ ...searchParams, current: 1, size: 10000 })
      const rows = response.records.map((patient) =>
        [
          patient.id,
          patient.researchNo,
          patient.center,
          patient.doctor,
          patient.group,
          patient.enrollEntry,
          patient.enrollDate,
          patient.status
        ].join(',')
      )
      downloadCsv(`患者列表_${new Date().toISOString().slice(0, 10)}.csv`, [
        '患者编号,研究受试者编号,所属中心,主管医生,研究组别,入组入口,入组日期,状态',
        ...rows
      ])
      ElMessage.success(`已导出 ${response.records.length} 条脱敏记录`)
    } catch (error) {
      showError(error)
    }
  }
</script>
