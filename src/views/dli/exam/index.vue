<!-- DLI 检查管理：分类筛选 + 上传资料 + 查看报告 / 发起解析 [批注 06] -->
<template>
  <div class="art-full-height">
    <!-- 患者详情页嵌入模式不显示筛选栏 -->
    <ArtListControls>
      <template #actions>
        <ElButton v-if="canManage" type="primary" :loading="syncing" @click="syncFromHis">
          <ArtSvgIcon icon="ri:refresh-line" class="mr-1" />同步
        </ElButton>
        <ElButton v-else plain @click="requestDataPermission">
          <ArtSvgIcon icon="ri:shield-keyhole-line" class="mr-1" />申请数据权限
        </ElButton>
      </template>
      <ArtSearchBar
        v-if="!props.patientId"
        v-model="searchParams"
        :items="searchItems"
        @search="handleSearch"
        @reset="handleReset"
      />
    </ArtListControls>

    <ArtTable
      list-layout
      :loading="loading"
      :data="tableData"
      :columns="columns"
      :pagination="pagination"
      @pagination:size-change="handleSizeChange"
      @pagination:current-change="handleCurrentChange"
    />

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
  import ArtListControls from '@/components/core/tables/art-list-controls/index.vue'
  import { computed, h, onActivated, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElButton, ElDialog, ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { useUserStore } from '@/store/modules/user'
  import { fetchGetExamList, fetchStartExamRecognition, isReportExam } from '@/mock/dli/api'
  import type {
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
    data,
    loading,
    pagination,
    searchParams,
    getData,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange
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
            h(ElTag, { effect: 'light', type: 'primary' }, () => row.category)
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
                effect: 'light',
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

  /* ------------------------------ 从 HIS 同步检查资料 ------------------------------ */
  /** 演示：确认后走本地刷新，不产生真实外部写入 */
  const syncing = ref(false)
  async function syncFromHis() {
    const confirmed = await ElMessageBox.confirm('从医院 HIS 系统同步检查资料。', '同步检查资料', {
      type: 'warning',
      confirmButtonText: '开始同步',
      cancelButtonText: '取消'
    })
      .then(() => true)
      .catch(() => false)
    if (!confirmed || syncing.value) return
    syncing.value = true
    try {
      await getData()
      ElMessage.success('已从医院 HIS 系统同步检查资料')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '同步失败')
    } finally {
      syncing.value = false
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
