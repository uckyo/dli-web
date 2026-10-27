<!-- DLI 生物样本 · 检测管理 -->
<template>
  <div class="art-full-height">
    <ElCard class="art-table-card">
      <ElForm :inline="true" @submit.prevent>
        <ElFormItem label="关键词">
          <ElInput
            v-model="searchParams.keyword"
            placeholder="检测编号 / 样本编号 / 患者姓名"
            clearable
            style="width: 280px"
            @keyup.enter="getData()"
          />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" @click="getData()">查询</ElButton>
          <ElButton @click="resetSearchParams()">重置</ElButton>
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
  import { ElTag } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchGetSampleTestList } from '@/mock/dli/api'
  import type { SampleTestRecord } from '@/mock/dli/types'

  defineOptions({ name: 'DliSampleTest' })

  /** 检测状态标签 */
  const TEST_STATUS_TAG: Record<SampleTestRecord['status'], 'success' | 'primary' | 'danger'> = {
    已完成: 'success',
    检测中: 'primary',
    异常: 'danger'
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
      apiFn: fetchGetSampleTestList,
      apiParams: { current: 1, size: 10, keyword: '' },
      columnsFactory: () => [
        { prop: 'id', label: '检测编号', width: 130 },
        { prop: 'sampleId', label: '样本编号', width: 130 },
        { prop: 'patientName', label: '患者姓名', minWidth: 120 },
        { prop: 'item', label: '检测项目', minWidth: 180 },
        { prop: 'result', label: '检测结果', minWidth: 140 },
        { prop: 'testedAt', label: '检测日期', width: 120 },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row: SampleTestRecord) =>
            h(ElTag, { effect: 'light', type: TEST_STATUS_TAG[row.status] }, () => row.status)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 110,
          align: 'center' as const,
          formatter: (row: SampleTestRecord) =>
            h(
              'span',
              { class: 'cursor-pointer text-primary', onClick: () => viewTestReport(row) },
              '查看报告'
            )
        }
      ]
    }
  })

  /** 查看检测报告（演示） */
  function viewTestReport(row: SampleTestRecord) {
    ElMessage.info(`${row.patientName} · ${row.item}：${row.result}（演示）`)
  }
</script>
