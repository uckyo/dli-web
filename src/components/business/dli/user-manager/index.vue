<!-- DLI 用户管理：各级管理端按范围维护用户，平台管理端可删除 -->
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
            <ArtSvgIcon icon="ri:user-add-line" class="mr-1" />新增用户
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

    <!-- 新增用户 -->
    <ElDialog v-model="addVisible" title="新增用户" width="540px" destroy-on-close>
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="96px">
        <ElFormItem label="姓名" prop="name">
          <ElInput v-model="form.name" maxlength="20" placeholder="请输入姓名" />
        </ElFormItem>
        <ElFormItem label="用户类型" prop="type">
          <ElSelect v-model="form.type" class="w-full" placeholder="选择用户类型">
            <ElOption v-for="item in allowedTypes" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="所属组织" prop="org">
          <ElInput v-model="form.org" maxlength="40" placeholder="中心 / 课题组名称" />
        </ElFormItem>
        <ElFormItem label="手机号" prop="phone">
          <ElInput v-model="form.phone" maxlength="11" placeholder="用于登录与接收通知" />
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
  import { ElMessage, ElMessageBox, ElTag, ElButton, ElTooltip } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchAddUser, fetchDeleteUser, fetchGetUserList, fetchToggleUser } from '@/mock/dli/api'
  import type { UserType, WebUserItem } from '@/mock/dli/types'

  defineOptions({ name: 'DliUserManager' })

  type ManagerScope = 'platform' | 'center' | 'group' | 'system'

  const props = defineProps<{ scope: ManagerScope }>()

  /** 各管理端可管理的用户类型 */
  const SCOPE_TYPES: Record<ManagerScope, UserType[]> = {
    platform: ['中心负责人', '课题组负责人', '医生', '医生助理', '护士', '患者', '患者家属'],
    center: ['课题组负责人', '医生', '医生助理', '护士', '患者', '患者家属'],
    group: ['医生', '医生助理', '护士', '患者', '患者家属'],
    system: [
      '平台负责人',
      '中心负责人',
      '课题组负责人',
      '医生',
      '医生助理',
      '护士',
      '患者',
      '患者家属'
    ]
  }

  const allowedTypes = computed(() => SCOPE_TYPES[props.scope])
  const deletable = computed(() => props.scope === 'platform')

  const searchItems = computed(() => [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: '姓名 / 手机号 / 所属组织',
      span: 6
    },
    {
      key: 'type',
      label: '用户类型',
      type: 'select',
      placeholder: '全部类型',
      span: 6,
      props: { options: allowedTypes.value.map((item) => ({ label: item, value: item })) }
    }
  ])

  /** 用户类型标签色 */
  const TYPE_TAG: Record<UserType, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
    平台负责人: 'danger',
    中心负责人: 'warning',
    课题组负责人: 'warning',
    医生: 'primary',
    医生助理: 'primary',
    护士: 'success',
    患者: 'info',
    患者家属: 'info'
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
    refreshData,
    refreshCreate,
    refreshUpdate,
    refreshRemove
  } = useTable({
    core: {
      apiFn: fetchGetUserList,
      apiParams: {
        current: 1,
        size: 10,
        keyword: '',
        type: '' as UserType | '',
        types: SCOPE_TYPES[props.scope]
      },
      columnsFactory: () => [
        { prop: 'id', label: '用户编号', width: 120 },
        { prop: 'name', label: '姓名', width: 120 },
        {
          prop: 'type',
          label: '用户类型',
          width: 130,
          formatter: (row: WebUserItem) =>
            h(ElTag, { effect: 'plain', type: TYPE_TAG[row.type] }, () => row.type)
        },
        { prop: 'org', label: '所属组织', minWidth: 170 },
        { prop: 'phone', label: '手机号', width: 140 },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row: WebUserItem) => {
            const map: Record<WebUserItem['status'], 'success' | 'warning' | 'info'> = {
              正常: 'success',
              待激活: 'warning',
              已停用: 'info'
            }
            return h(ElTag, { effect: 'light', type: map[row.status] }, () => row.status)
          }
        },
        { prop: 'createdAt', label: '创建日期', width: 120 },
        {
          prop: 'operation',
          label: '操作',
          width: 150,
          align: 'center' as const,
          formatter: (row: WebUserItem) =>
            h('div', { class: 'flex-c justify-center gap-3' }, [
              h(
                ElButton,
                {
                  link: true,
                  type: row.status === '已停用' ? 'primary' : 'warning',
                  onClick: () => toggleStatus(row)
                },
                () => (row.status === '已停用' ? '启用' : '停用')
              ),
              deletable.value
                ? h(
                    ElButton,
                    { link: true, type: 'danger', onClick: () => removeUser(row) },
                    () => '删除'
                  )
                : h(ElTooltip, { content: '该管理端不可删除用户', placement: 'top' }, () =>
                    h('span', null, [h(ElButton, { link: true, disabled: true }, () => '删除')])
                  )
            ])
        }
      ]
    }
  })

  /** 搜索 */
  function handleSearch() {
    getData()
  }

  /** 重置 */
  function handleReset() {
    resetSearchParams()
  }

  /** 启用 / 停用 */
  async function toggleStatus(row: WebUserItem) {
    const next: WebUserItem['status'] = row.status === '已停用' ? '正常' : '已停用'
    await fetchToggleUser(row.id, next)
    ElMessage.success(`${row.name} 已${next === '正常' ? '启用' : '停用'}`)
    await refreshUpdate()
  }

  /** 删除用户 */
  async function removeUser(row: WebUserItem) {
    await ElMessageBox.confirm(
      `确认删除用户「${row.name}」？删除后其账号与数据访问权限将同步失效。`,
      '删除确认',
      { type: 'warning' }
    )
    await fetchDeleteUser(row.id)
    ElMessage.success('已删除')
    await refreshRemove()
  }

  /* ------------------------------ 新增用户 ------------------------------ */

  const addVisible = ref(false)
  const saving = ref(false)
  const formRef = ref<FormInstance>()
  const form = reactive({
    name: '',
    type: '' as UserType | '',
    org: '',
    phone: ''
  })

  const rules: FormRules = {
    name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
    type: [{ required: true, message: '请选择用户类型', trigger: 'change' }],
    org: [{ required: true, message: '请输入所属组织', trigger: 'blur' }],
    phone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1\d{10}$/, message: '请输入 11 位手机号', trigger: 'blur' }
    ]
  }

  /** 打开新增弹窗 */
  function openAdd() {
    form.name = ''
    form.type = ''
    form.org = ''
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
      await fetchAddUser({
        name: form.name.trim(),
        type: form.type as UserType,
        org: form.org.trim(),
        phone: form.phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2'),
        status: '待激活'
      })
      ElMessage.success('用户已新增，激活后可登录')
      addVisible.value = false
      await refreshCreate()
    } finally {
      saving.value = false
    }
  }
</script>
