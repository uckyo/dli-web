<!-- DLI 课题组管理（课题组管理员）：医生管理 / 用户管理（均不可删除） -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <ElTabs v-model="activeTab" class="art-card px-5 pb-5 pt-2">
      <ElTabPane label="医生管理" name="doctor">
        <div class="mb-4">
          <h4 class="font-medium text-g-900">医生管理</h4>
        </div>

        <ElForm :inline="true" @submit.prevent>
          <ElFormItem label="关键词">
            <ElInput
              v-model="searchParams.keyword"
              placeholder="姓名 / 所属课题组"
              clearable
              style="width: 240px"
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
      </ElTabPane>

      <ElTabPane label="用户管理" name="user">
        <UserManager scope="group" />
      </ElTabPane>
    </ElTabs>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElTag, ElButton } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchGetGroupDoctors, fetchToggleGroupDoctor } from '@/mock/dli/api'
  import type { GroupDoctor } from '@/mock/dli/types'
  import UserManager from '@/components/business/dli/user-manager/index.vue'

  defineOptions({ name: 'DliGroup' })

  const activeTab = ref('doctor')

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
    refreshUpdate
  } = useTable({
    core: {
      apiFn: fetchGetGroupDoctors,
      apiParams: { current: 1, size: 10, keyword: '' },
      columnsFactory: () => [
        { prop: 'id', label: '医生编号', width: 120 },
        { prop: 'name', label: '姓名', width: 120 },
        { prop: 'title', label: '职称', width: 130 },
        { prop: 'org', label: '所属课题组', minWidth: 170 },
        { prop: 'patients', label: '在管患者', width: 100, align: 'center' as const },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row: GroupDoctor) =>
            h(
              ElTag,
              { effect: 'light', type: row.status === '在职' ? 'success' : 'info' },
              () => row.status
            )
        },
        {
          prop: 'operation',
          label: '操作',
          width: 120,
          align: 'center' as const,
          formatter: (row: GroupDoctor) =>
            h(
              ElButton,
              {
                link: true,
                type: row.status === '在职' ? 'danger' : 'primary',
                onClick: () => toggleStatus(row)
              },
              () => (row.status === '在职' ? '停用' : '启用')
            )
        }
      ]
    }
  })

  /** 启停医生 */
  async function toggleStatus(row: GroupDoctor) {
    const next: GroupDoctor['status'] = row.status === '在职' ? '停用' : '在职'
    await fetchToggleGroupDoctor(row.id, next)
    ElMessage.success(`${row.name} 已${next === '在职' ? '启用' : '停用'}`)
    await refreshUpdate()
  }

  /** 搜索 */
  function handleSearch() {
    getData()
  }

  /** 重置 */
  function handleReset() {
    resetSearchParams()
  }
</script>
