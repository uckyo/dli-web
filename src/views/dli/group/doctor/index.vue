<!-- DLI 课题组管理 · 医生管理：同一课题组内医生的在管患者与启停 -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <ArtSearchBar
      v-model="searchParams"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton type="primary" @click="openAdd">
            <ArtSvgIcon icon="ri:user-add-line" class="mr-1" />新增医生
          </ElButton>
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

    <!-- 新增医生 -->
    <ElDialog v-model="addVisible" title="新增医生" width="520px" destroy-on-close>
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="96px">
        <ElFormItem label="姓名" prop="name">
          <ElInput v-model="form.name" maxlength="20" placeholder="请输入姓名" />
        </ElFormItem>
        <ElFormItem label="职称" prop="title">
          <ElSelect v-model="form.title" class="w-full" placeholder="选择职称">
            <ElOption v-for="item in TITLES" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="所属课题组" prop="org">
          <ElInput v-model="form.org" maxlength="30" placeholder="请输入课题组名称" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="addVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submitAdd">确认新增</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElTag, ElButton } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchAddGroupDoctor, fetchGetGroupDoctors, fetchToggleGroupDoctor } from '@/mock/dli/api'
  import type { GroupDoctor } from '@/mock/dli/types'

  defineOptions({ name: 'DliGroupDoctor' })

  const TITLES = ['主任医师', '副主任医师', '主治医师', '住院医师']

  const searchItems = [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: '姓名 / 所属课题组',
      span: 6
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
    refreshData,
    refreshCreate,
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

  /* ------------------------------ 新增医生 ------------------------------ */

  const addVisible = ref(false)
  const saving = ref(false)
  const formRef = ref<FormInstance>()
  const form = reactive({
    name: '',
    title: '',
    org: ''
  })

  const rules: FormRules = {
    name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
    title: [{ required: true, message: '请选择职称', trigger: 'change' }],
    org: [{ required: true, message: '请输入所属课题组', trigger: 'blur' }]
  }

  /** 打开新增弹窗 */
  function openAdd() {
    form.name = ''
    form.title = ''
    form.org = ''
    addVisible.value = true
  }

  /** 提交新增 */
  async function submitAdd() {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    saving.value = true
    try {
      await fetchAddGroupDoctor({
        name: form.name.trim(),
        title: form.title,
        org: form.org.trim()
      })
      ElMessage.success('医生已新增')
      addVisible.value = false
      await refreshCreate()
    } finally {
      saving.value = false
    }
  }
</script>
