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

    <!-- 操作留痕 -->
    <ElCard class="art-table-card mt-5">
      <div class="mb-3 flex-cb">
        <h4 class="font-medium text-g-900">操作留痕</h4>
        <span class="text-xs text-g-500">共 {{ auditLogs.length }} 条</span>
      </div>
      <ElTable :data="auditLogs" border stripe max-height="260">
        <ElTableColumn prop="time" label="时间" width="170" />
        <ElTableColumn prop="operator" label="操作人" width="120" />
        <ElTableColumn prop="action" label="操作类型" width="120" />
        <ElTableColumn prop="targetId" label="目标账号编号" width="140" />
        <ElTableColumn prop="result" label="结果" minWidth="220" />
      </ElTable>
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

    <!-- 角色设置弹窗：当前角色只读 / 分配角色 / 可见菜单 / 可用操作 / 数据范围，分别设置 [批注 19] -->
    <ElDialog v-model="roleVisible" title="角色设置" width="560px" destroy-on-close>
      <ElForm label-width="100px">
        <ElFormItem label="目标账号"> {{ roleTarget?.name }}（{{ roleTarget?.id }}） </ElFormItem>
        <ElFormItem label="当前角色">
          <ElTag effect="plain" type="info">{{ roleTarget?.type }}</ElTag>
        </ElFormItem>
        <ElFormItem label="分配角色">
          <ElSelect v-model="roleValue" class="w-full" placeholder="从已有角色中按可授范围选择">
            <ElOption v-for="item in grantableRoles" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="可见菜单">
          <ElCheckboxGroup v-model="roleMenus">
            <ElCheckbox v-for="item in MENU_OPTIONS" :key="item" :value="item">
              {{ item }}
            </ElCheckbox>
          </ElCheckboxGroup>
        </ElFormItem>
        <ElFormItem label="可用操作">
          <ElCheckboxGroup v-model="roleActions">
            <ElCheckbox v-for="item in ACTION_OPTIONS" :key="item" :value="item">
              {{ item }}
            </ElCheckbox>
          </ElCheckboxGroup>
        </ElFormItem>
        <ElFormItem label="数据范围">
          <ElSelect v-model="roleDataScope" class="w-full" placeholder="按角色适用范围选择">
            <ElOption v-for="item in DATA_SCOPE_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <p class="text-xs text-g-500">
        菜单、操作和数据范围分别设置；不因能看菜单就能操作所有按钮。管理员不因组织管理身份取得诊疗确认权。
      </p>
      <template #footer>
        <ElButton @click="roleVisible = false">取消</ElButton>
        <ElButton type="primary" @click="submitRoleAssign">保存并生效</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    ElMessage,
    ElMessageBox,
    ElTag,
    ElButton,
    ElCard,
    ElDialog,
    ElSelect,
    ElOption,
    ElCheckbox,
    ElCheckboxGroup,
    ElTable,
    ElTableColumn,
    ElForm,
    ElFormItem,
    ElInput,
    ElDropdown,
    ElDropdownMenu,
    ElDropdownItem
  } from 'element-plus'
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

  const nowStr = () =>
    `${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 5)}`

  /**
   * 手机号掩码：患者 / 患者家属账号的手机号按最小必要原则掩码。
   * 仅在展示层处理，不改 mock 数据。
   */
  function maskPhone(phone: string): string {
    return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
  }

  /** 患者 / 患者家属行手机号脱敏，其它账号保持原样 */
  function displayPhone(row: WebUserItem): string {
    return row.type === '患者' || row.type === '患者家属' ? maskPhone(row.phone) : row.phone
  }

  /** 角色设置：九个已有角色按可授范围选择 [批注 19] */
  const ROLE_OPTIONS: UserType[] = [
    '平台负责人',
    '中心负责人',
    '课题组负责人',
    '医生',
    '医生助理',
    '护士',
    '患者',
    '患者家属'
  ]
  /** 可见菜单 / 可用操作 / 数据范围分别设置 [批注 19] */
  const MENU_OPTIONS = [
    '仪表台',
    '患者管理',
    '检查管理',
    '生物样本',
    '研究管理',
    '智能管理',
    '状态管理',
    '随访管理',
    '人员管理'
  ]
  const ACTION_OPTIONS = ['新增', '编辑', '导出', '发布', '确认诊断', '核对', '配置管理']
  const DATA_SCOPE_OPTIONS = ['本平台', '本中心', '本课题组', '负责患者']
  const roleVisible = ref(false)
  const roleTarget = ref<WebUserItem>()
  const roleValue = ref<UserType | ''>('')
  const roleMenus = ref<string[]>([])
  const roleActions = ref<string[]>([])
  const roleDataScope = ref('')
  /** WebUserItem 无角色 / 权限字段，用页面内 Map 维护并在表格列展示 */
  const roleMap = reactive<
    Record<string, { role: UserType; menus: string[]; actions: string[]; dataScope: string }>
  >({})

  /** 按当前管理端裁剪可授角色范围 [批注 19] */
  const grantableRoles = computed(() => {
    if (props.scope === 'platform' || props.scope === 'system') return ROLE_OPTIONS
    if (props.scope === 'center') return ROLE_OPTIONS.filter((r) => r !== '平台负责人')
    return ROLE_OPTIONS.filter((r) => r !== '平台负责人' && r !== '中心负责人')
  })

  /** 操作留痕 */
  interface AuditLog {
    id: string
    time: string
    operator: string
    action: '密码重置' | '账号恢复' | '角色变更' | '停用' | '启用' | '新增' | '删除'
    targetId: string
    result: string
  }
  const auditLogs = reactive<AuditLog[]>([])
  function pushLog(action: AuditLog['action'], targetId: string, result: string) {
    auditLogs.unshift({
      id: `LOG-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      time: nowStr(),
      operator: '当前管理员',
      action,
      targetId,
      result
    })
  }

  /** 重置密码：确认弹窗说明重置方式，不显示旧密码 [批注 19] */
  async function resetAccount(row: WebUserItem) {
    const confirmed = await ElMessageBox.confirm(
      `将为账号「${row.name}」（${row.id}）发送密码重置链接至预留手机／邮箱，重置后旧密码立即失效，不显示旧密码。本人改密仍在个人中心。是否继续？`,
      '重置密码',
      { type: 'warning', confirmButtonText: '确认重置', cancelButtonText: '返回' }
    )
      .then(() => true)
      .catch(() => false)
    if (!confirmed) return
    const action: AuditLog['action'] = row.status === '已停用' ? '账号恢复' : '密码重置'
    if (row.status === '已停用') await fetchToggleUser(row.id, '正常')
    pushLog(action, row.id, '重置链接已发送，旧密码失效；账号状态恢复为正常')
    ElMessage.success('重置链接已发送，旧密码已失效')
    await refreshUpdate()
  }

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

  /** 患者 / 患者家属行不暴露姓名、手机号、病历号，姓名列显示关系化描述 [批注 19] */
  function displayName(row: WebUserItem): string {
    return row.type === '患者' || row.type === '患者家属'
      ? `${row.org || '关联患者'} · ${row.type}`
      : row.name
  }

  /** 患者 / 患者家属行显示关联患者编号（系统患者编号，非病历号）[批注 19] */
  function linkedPatientId(row: WebUserItem): string {
    if (row.type !== '患者' && row.type !== '患者家属') return '—'
    const seq = Number(row.id.replace(/\D/g, '')) % 40 || 21
    return `DLI-2026-${String(seq).padStart(4, '0')}`
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
        size: 50,
        keyword: '',
        type: '' as UserType | '',
        types: SCOPE_TYPES[props.scope]
      },
      columnsFactory: () => [
        // 用户表列名保留用户编号、所属组织、角色、账号状态及已有登录信息 [批注 19]
        { prop: 'id', label: '用户编号', width: 120 },
        {
          prop: 'name',
          label: '姓名 / 关联账号',
          minWidth: 150,
          showOverflowTooltip: true,
          formatter: (row: WebUserItem) => displayName(row)
        },
        {
          prop: 'type',
          label: '角色',
          width: 130,
          formatter: (row: WebUserItem) => {
            const cfg = roleMap[row.id]
            return h(ElTag, { effect: 'plain', type: TYPE_TAG[row.type] }, () =>
              cfg ? cfg.role : row.type
            )
          }
        },
        { prop: 'org', label: '所属组织', minWidth: 170 },
        {
          prop: 'phone',
          label: '手机号',
          width: 140,
          formatter: (row: WebUserItem) => displayPhone(row)
        },
        {
          prop: 'linkedPatient',
          label: '关联患者编号 / 绑定关系',
          minWidth: 170,
          formatter: (row: WebUserItem) =>
            row.type === '患者家属'
              ? `${linkedPatientId(row)} · 家属绑定`
              : row.type === '患者'
                ? `${linkedPatientId(row)} · 本人`
                : '—'
        },
        {
          prop: 'status',
          label: '账号状态',
          width: 100,
          formatter: (row: WebUserItem) => {
            const map: Record<WebUserItem['status'], 'success' | 'warning' | 'info'> = {
              正常: 'success',
              待激活: 'warning',
              已停用: 'info'
            }
            const textMap: Record<WebUserItem['status'], string> = {
              正常: '启用',
              待激活: '待激活',
              已停用: '停用'
            }
            return h(ElTag, { effect: 'light', type: map[row.status] }, () => textMap[row.status])
          }
        },
        {
          prop: 'roleScope',
          label: '权限配置',
          minWidth: 180,
          formatter: (row: WebUserItem) => {
            const cfg = roleMap[row.id]
            if (!cfg) return h('span', { class: 'text-xs text-g-500' }, '按角色默认')
            return h('div', { class: 'text-xs leading-5' }, [
              h(
                'div',
                { class: 'text-g-800' },
                `菜单 ${cfg.menus.length} 项 · 操作 ${cfg.actions.length} 项`
              ),
              h('div', { class: 'text-g-500' }, `数据范围：${cfg.dataScope || '按角色默认'}`)
            ])
          }
        },
        { prop: 'createdAt', label: '创建日期', width: 120 },
        {
          prop: 'operation',
          label: '操作',
          width: 170,
          fixed: 'right' as const,
          align: 'center' as const,
          // 行内「角色设置、重置密码、停用／恢复」操作多时收进「更多」[批注 19]
          formatter: (row: WebUserItem) => {
            const stopLabel = row.status === '已停用' ? '恢复' : '停用'
            return h('div', { class: 'flex-c justify-center gap-1' }, [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openRoleAssign(row) },
                () => '角色设置'
              ),
              h(
                ElDropdown,
                {
                  trigger: 'click',
                  onCommand: (command: string) => {
                    if (command === 'reset') resetAccount(row)
                    if (command === 'toggle') toggleStatus(row)
                    if (command === 'delete') removeUser(row)
                  }
                },
                () => [
                  h(ElButton, { link: true, type: 'primary' }, () => '更多'),
                  h(ElDropdownMenu, { slot: 'dropdown' } as Record<string, unknown>, () => [
                    h(ElDropdownItem, { command: 'reset' }, () => '重置密码'),
                    h(ElDropdownItem, { command: 'toggle' }, () => stopLabel),
                    ...(deletable.value
                      ? [h(ElDropdownItem, { command: 'delete' }, () => '删除')]
                      : [])
                  ])
                ]
              )
            ])
          }
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

  /** 停用 / 恢复：弹窗说明登录影响，确认后更新状态 [批注 19] */
  async function toggleStatus(row: WebUserItem) {
    const next: WebUserItem['status'] = row.status === '已停用' ? '正常' : '已停用'
    const stopping = next === '已停用'
    const confirmed = await ElMessageBox.confirm(
      stopping
        ? `确认停用账号「${displayName(row)}」？停用后立即终止登录会话并保留历史业务记录，接口执行同样权限。`
        : `确认恢复账号「${displayName(row)}」？恢复后可重新登录，历史业务记录不变。`,
      stopping ? '停用账号' : '恢复账号',
      {
        type: 'warning',
        confirmButtonText: stopping ? '确认停用' : '确认恢复',
        cancelButtonText: '返回'
      }
    )
      .then(() => true)
      .catch(() => false)
    if (!confirmed) return
    await fetchToggleUser(row.id, next)
    pushLog(
      stopping ? '停用' : '启用',
      row.id,
      stopping ? '停用终止会话并保留历史业务记录' : '账号已恢复登录'
    )
    ElMessage.success(stopping ? '账号已停用，会话已终止' : '账号已恢复登录')
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
    pushLog('删除', row.id, '账号与数据访问权限已失效')
    ElMessage.success('已删除')
    await refreshRemove()
  }

  /** 打开角色设置 [批注 19] */
  function openRoleAssign(row: WebUserItem) {
    roleTarget.value = row
    roleValue.value = row.type
    const cfg = roleMap[row.id]
    roleMenus.value = cfg ? [...cfg.menus] : []
    roleActions.value = cfg ? [...cfg.actions] : []
    roleDataScope.value = cfg?.dataScope ?? ''
    roleVisible.value = true
  }

  /** 提交角色设置：菜单、操作和数据范围分别设置；保存刷新用户行并提示生效 [批注 19] */
  async function submitRoleAssign() {
    const target = roleTarget.value
    if (!target) return
    if (!roleValue.value) {
      ElMessage.warning('请先选择分配角色')
      return
    }
    roleMap[target.id] = {
      role: roleValue.value as UserType,
      menus: [...roleMenus.value],
      actions: [...roleActions.value],
      dataScope: roleDataScope.value
    }
    pushLog(
      '角色变更',
      target.id,
      `角色「${roleValue.value}」，可见菜单 ${roleMenus.value.length} 项，可用操作 ${roleActions.value.length} 项，数据范围：${roleDataScope.value || '按角色默认'}`
    )
    roleVisible.value = false
    ElMessage.success('角色设置已保存并生效')
    await refreshUpdate()
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
      pushLog('新增', form.phone, '新增待激活账号')
      ElMessage.success('用户已新增，激活后可登录')
      addVisible.value = false
      await refreshCreate()
    } finally {
      saving.value = false
    }
  }
</script>
