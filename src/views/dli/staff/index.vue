<!-- DLI 人员管理：医生维护助理与护士（仅临床角色） -->
<template>
  <div class="art-full-height">
    <ElCard class="art-table-card">
      <ElTabs v-model="searchParams.role" class="mb-3" @tab-change="handleTabChange">
        <ElTabPane label="医生助理" name="助理" />
        <ElTabPane label="护士" name="护士" />
      </ElTabs>

      <ElForm :inline="true" @submit.prevent>
        <ElFormItem label="关键词">
          <ElInput
            v-model="searchParams.keyword"
            placeholder="姓名 / 归属医生"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
          />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" @click="handleSearch">查询</ElButton>
          <ElButton @click="handleReset">重置</ElButton>
        </ElFormItem>
      </ElForm>

      <ArtTableHeader
        v-model:columns="columnChecks"
        :loading="loading"
        class="mb-2"
        @refresh="refreshData"
      >
        <template #left>
          <ElButton type="primary" @click="openAdd">
            <ArtSvgIcon icon="ri:user-add-line" class="mr-1" />新增人员
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

    <!-- 新增人员 -->
    <ElDialog v-model="addVisible" title="新增人员" width="520px" destroy-on-close>
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="88px">
        <ElFormItem label="姓名" prop="name">
          <ElInput v-model="form.name" maxlength="20" placeholder="请输入姓名" />
        </ElFormItem>
        <ElFormItem label="角色" prop="role">
          <ElRadioGroup v-model="form.role">
            <ElRadio value="助理">医生助理</ElRadio>
            <ElRadio value="护士">护士</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="归属医生" prop="doctor">
          <ElSelect v-model="form.doctor" class="w-full" placeholder="选择归属医生">
            <ElOption v-for="item in DOCTOR_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="手机号" prop="phone">
          <ElInput v-model="form.phone" maxlength="11" placeholder="用于登录与接收任务" />
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
  import { fetchAddStaff, fetchGetStaffList, fetchToggleStaff } from '@/mock/dli/api'
  import type { StaffItem } from '@/mock/dli/types'

  defineOptions({ name: 'DliStaff' })

  /** 归属医生候选（演示） */
  const DOCTOR_OPTIONS = ['陈明远', '周雅琴', '刘志远', '孙可欣']

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
      apiFn: fetchGetStaffList,
      apiParams: {
        current: 1,
        size: 10,
        keyword: '',
        role: '助理' as StaffItem['role']
      },
      columnsFactory: () => [
        { prop: 'id', label: '人员编号', width: 120 },
        { prop: 'name', label: '姓名', minWidth: 140 },
        {
          prop: 'role',
          label: '角色',
          width: 110,
          formatter: (row: StaffItem) =>
            h(ElTag, { effect: 'plain', type: row.role === '助理' ? 'primary' : 'success' }, () =>
              row.role === '助理' ? '医生助理' : '护士'
            )
        },
        { prop: 'doctor', label: '归属医生', minWidth: 140 },
        { prop: 'phone', label: '手机号', minWidth: 150 },
        { prop: 'patients', label: '在管患者', minWidth: 110, align: 'center' as const },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row: StaffItem) =>
            h(
              ElTag,
              { effect: 'light', type: row.status === '在职' ? 'success' : 'info' },
              () => row.status
            )
        },
        {
          prop: 'operation',
          label: '操作',
          width: 130,
          align: 'center' as const,
          formatter: (row: StaffItem) =>
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

  /** 启停人员 */
  async function toggleStatus(row: StaffItem) {
    const next: StaffItem['status'] = row.status === '在职' ? '停用' : '在职'
    await fetchToggleStaff(row.id, next)
    ElMessage.success(`${row.name} 已${next === '在职' ? '启用' : '停用'}`)
    await refreshUpdate()
  }

  /** 切换助理 / 护士 */
  function handleTabChange() {
    getData()
  }

  /** 搜索 */
  function handleSearch() {
    getData()
  }

  /** 重置 */
  function handleReset() {
    resetSearchParams()
  }

  /* ------------------------------ 新增人员 ------------------------------ */

  const addVisible = ref(false)
  const saving = ref(false)
  const formRef = ref<FormInstance>()
  const form = reactive({
    name: '',
    role: '助理' as StaffItem['role'],
    doctor: '',
    phone: ''
  })

  const rules: FormRules = {
    name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
    role: [{ required: true, message: '请选择角色', trigger: 'change' }],
    doctor: [{ required: true, message: '请选择归属医生', trigger: 'change' }],
    phone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1\d{10}$/, message: '请输入 11 位手机号', trigger: 'blur' }
    ]
  }

  /** 打开新增弹窗 */
  function openAdd() {
    form.name = ''
    form.role = searchParams.role as StaffItem['role']
    form.doctor = ''
    form.phone = ''
    addVisible.value = true
  }

  /** 提交新增 */
  async function submitAdd() {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    saving.value = true
    try {
      await fetchAddStaff({
        name: form.name.trim(),
        role: form.role,
        doctor: form.doctor,
        phone: form.phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2'),
        patients: 0,
        status: '在职'
      })
      ElMessage.success('人员已新增，可使用手机号登录')
      addVisible.value = false
      await refreshCreate()
    } finally {
      saving.value = false
    }
  }
</script>
