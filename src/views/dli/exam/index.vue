<!-- DLI 检查管理：影像 / 病理 / 检验 / 病历 / 其他 -->
<template>
  <div class="art-full-height">
    <ElCard class="art-table-card">
      <ElTabs v-model="searchParams.category" class="mb-3" @tab-change="handleCategoryChange">
        <ElTabPane label="全部" name="" />
        <ElTabPane v-for="item in CATEGORY_OPTIONS" :key="item" :label="item" :name="item" />
      </ElTabs>

      <ElForm :inline="true" @submit.prevent>
        <ElFormItem label="关键词">
          <ElInput
            v-model="searchParams.keyword"
            placeholder="检查编号 / 患者姓名 / 检查项目"
            clearable
            style="width: 280px"
            @keyup.enter="handleSearch"
          />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" @click="handleSearch">查询</ElButton>
          <ElButton @click="handleReset">重置</ElButton>
        </ElFormItem>
        <ElFormItem>
          <ArtTableHeader
            v-model:columns="columnChecks"
            :loading="loading"
            @refresh="refreshData"
          />
        </ElFormItem>
      </ElForm>

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElTag, ElButton } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchGetExamList } from '@/mock/dli/api'
  import type { ExamCategory, ExamRecord } from '@/mock/dli/types'

  defineOptions({ name: 'DliExam' })

  /** 检查分类 */
  const CATEGORY_OPTIONS: ExamCategory[] = ['影像', '病理', '检验', '病历', '其他']

  /** 解析状态标签 */
  const STATUS_TAG: Record<ExamRecord['status'], 'success' | 'primary' | 'warning'> = {
    已归档: 'success',
    待解析: 'warning',
    解析中: 'primary'
  }

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
        category: ''
      },
      columnsFactory: () => [
        { prop: 'id', label: '检查编号', width: 130 },
        {
          prop: 'patientName',
          label: '患者',
          width: 150,
          formatter: (row: ExamRecord) =>
            h('div', { class: 'leading-5' }, [
              h('div', { class: 'text-g-900' }, row.patientName),
              h('div', { class: 'text-xs text-g-500' }, row.patientId)
            ])
        },
        {
          prop: 'category',
          label: '类型',
          width: 100,
          formatter: (row: ExamRecord) =>
            h(ElTag, { effect: 'plain', type: 'primary' }, () => row.category)
        },
        { prop: 'item', label: '检查项目', minWidth: 200 },
        { prop: 'center', label: '所属中心', width: 130 },
        { prop: 'date', label: '检查日期', width: 130 },
        {
          prop: 'status',
          label: '解析状态',
          width: 110,
          formatter: (row: ExamRecord) =>
            h(ElTag, { effect: 'light', type: STATUS_TAG[row.status] }, () => row.status)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 160,
          align: 'center' as const,
          formatter: (row: ExamRecord) =>
            h('div', { class: 'flex-c justify-center gap-3' }, [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => viewReport(row) },
                () => '查看报告'
              ),
              h(
                ElButton,
                {
                  link: true,
                  type: 'primary',
                  disabled: row.status === '已归档',
                  onClick: () => parseExam(row)
                },
                () => (row.status === '已归档' ? '已解析' : '发起解析')
              )
            ])
        }
      ]
    }
  })

  /** 切换分类后重新查询（回到第一页） */
  function handleCategoryChange() {
    getData()
  }

  /** 查询 */
  function handleSearch() {
    getData()
  }

  /** 重置分类与关键词 */
  function handleReset() {
    resetSearchParams()
  }

  /** 查看报告（演示） */
  function viewReport(row: ExamRecord) {
    ElMessage.info(`打开 ${row.patientName} 的「${row.item}」报告（演示）`)
  }

  /** 发起解析（演示） */
  function parseExam(row: ExamRecord) {
    row.status = '解析中'
    ElMessage.success(`已提交「${row.item}」解析任务（演示）`)
  }
</script>
