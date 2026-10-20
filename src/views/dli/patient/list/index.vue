<!-- 患者列表页面 -->
<!-- art-full-height 自动计算出页面剩余高度 -->
<!-- art-table-card 一个符合系统样式的 class，同时自动撑满剩余高度 -->
<template>
  <div class="patient-page art-full-height">
    <!-- 搜索栏 -->
    <PatientSearch v-model="searchForm" @search="handleSearch" @reset="resetSearchParams" />

    <ElCard class="art-table-card">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton @click="showDialog('add')" v-ripple>新增患者</ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
      </ArtTable>

      <!-- 患者弹窗 -->
      <PatientDialog
        v-model="dialogVisible"
        :type="dialogType"
        :patient-data="currentPatientData"
        @submit="handleDialogSubmit"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchDeletePatient, fetchGetPatientList } from '@/mock/dli/api'
  import type { DliPatient, RiskLevel } from '@/mock/dli/types'
  import {
    GROUP_TYPE_CONFIG,
    MED_STATUS_CONFIG,
    RISK_LEVEL_CONFIG,
    type PatientSearchForm
  } from '@/views/dli/patient/constants'
  import PatientSearch from './modules/patient-search.vue'
  import PatientDialog from './modules/patient-dialog.vue'
  import { ElTag, ElMessageBox } from 'element-plus'
  import { DialogType } from '@/types'

  defineOptions({ name: 'DliPatientList' })

  type TagType = 'success' | 'warning' | 'info' | 'danger' | 'primary'

  const router = useRouter()

  // 弹窗相关
  const dialogType = ref<DialogType>('add')
  const dialogVisible = ref(false)
  const currentPatientData = ref<Partial<DliPatient>>({})

  // 搜索表单
  const searchForm = ref<PatientSearchForm>({
    keyword: undefined,
    riskLevel: undefined,
    medStatus: undefined,
    groupType: undefined
  })

  // 风险分层标签类型（L3 使用主题色）
  const RISK_TAG_TYPE: Record<RiskLevel, TagType> = {
    L1: 'danger',
    L2: 'warning',
    L3: 'primary',
    L4: 'success'
  }

  /**
   * 渲染患者姓名 + 编号
   */
  const renderPatient = (row: DliPatient) =>
    h('div', [
      h('p', { class: 'font-medium text-g-900' }, row.name),
      h('p', { class: 'mt-0.5 text-xs text-g-500' }, row.id)
    ])

  /**
   * 渲染高危药物标签（最多展示 2 个，其余折叠为 +N）
   */
  const renderDrugs = (drugs: string[]) => {
    if (!drugs.length) return h('span', { class: 'text-g-500' }, '—')

    const tags = drugs
      .slice(0, 2)
      .map((drug) => h(ElTag, { type: 'danger', effect: 'plain', size: 'small' }, () => drug))
    if (drugs.length > 2) {
      tags.push(
        h(ElTag, { type: 'info', effect: 'plain', size: 'small' }, () => `+${drugs.length - 2}`)
      )
    }
    return h('div', { class: 'flex flex-wrap gap-1 py-1' }, tags)
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    replaceSearchParams,
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
        ...searchForm.value
      },
      columnsFactory: () => [
        {
          prop: 'name',
          label: '患者',
          minWidth: 170,
          formatter: (row) => renderPatient(row)
        },
        {
          prop: 'sex',
          label: '性别/年龄',
          width: 110,
          formatter: (row) => `${row.sex === 'male' ? '男' : '女'} · ${row.age} 岁`
        },
        {
          prop: 'center',
          label: '所属中心',
          minWidth: 170,
          showOverflowTooltip: true
        },
        {
          prop: 'groupType',
          label: '入组分组',
          width: 110,
          formatter: (row) => {
            const config = GROUP_TYPE_CONFIG[row.groupType]
            return h(ElTag, { type: config.tagType }, () => config.label)
          }
        },
        {
          prop: 'medStatus',
          label: '用药状态',
          width: 110,
          formatter: (row) => {
            const config = MED_STATUS_CONFIG[row.medStatus]
            return h(ElTag, { type: config.tagType }, () => config.label)
          }
        },
        {
          prop: 'riskLevel',
          label: '风险分层',
          width: 110,
          formatter: (row) =>
            h(
              ElTag,
              { type: RISK_TAG_TYPE[row.riskLevel] },
              () => RISK_LEVEL_CONFIG[row.riskLevel].label
            )
        },
        {
          prop: 'drugs',
          label: '高危药物',
          minWidth: 190,
          formatter: (row) => renderDrugs(row.drugs)
        },
        {
          prop: 'lastAssessTime',
          label: '最近评估时间',
          width: 150,
          sortable: true
        },
        {
          prop: 'unreadReports',
          label: '未读上报',
          width: 100,
          sortable: true,
          formatter: (row) =>
            row.unreadReports > 0
              ? h(
                  'span',
                  {
                    class:
                      'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-danger text-xs font-medium text-white'
                  },
                  String(row.unreadReports)
                )
              : h('span', { class: 'text-g-500' }, '-')
        },
        {
          prop: 'operation',
          label: '操作',
          width: 160,
          fixed: 'right',
          formatter: (row) =>
            h('div', { class: 'flex' }, [
              h(ArtButtonTable, {
                type: 'view',
                onClick: () => goDetail(row)
              }),
              h(ArtButtonTable, {
                type: 'edit',
                onClick: () => showDialog('edit', row)
              }),
              h(ArtButtonTable, {
                type: 'delete',
                onClick: () => deletePatient(row)
              })
            ])
        }
      ]
    }
  })

  /**
   * 搜索处理
   * @param params 搜索参数
   */
  const handleSearch = (params: PatientSearchForm) => {
    replaceSearchParams(params)
    getData()
  }

  /**
   * 跳转患者详情
   */
  const goDetail = (row: DliPatient): void => {
    router.push(`/dli/patient/detail/${row.id}`)
  }

  /**
   * 显示患者弹窗
   */
  const showDialog = (type: DialogType, row?: DliPatient): void => {
    dialogType.value = type
    currentPatientData.value = row || {}
    nextTick(() => {
      dialogVisible.value = true
    })
  }

  /**
   * 删除患者
   */
  const deletePatient = (row: DliPatient): void => {
    ElMessageBox.confirm('确定要删除该患者吗？', '删除患者', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        await fetchDeletePatient(row.id)
        ElMessage.success('删除成功')
        getData()
      })
      .catch(() => {})
  }

  /**
   * 处理弹窗提交事件
   */
  const handleDialogSubmit = (): void => {
    currentPatientData.value = {}
    getData()
  }
</script>
