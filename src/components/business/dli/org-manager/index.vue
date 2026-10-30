<!-- DLI 组织管理：中心（平台端，可删除）/ 课题组（中心端，不可删除）/ 平台（系统端，可暂停服务） -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <ArtSearchBar
      v-model="searchParams"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader :loading="loading" layout="refresh,fullscreen,settings" @refresh="loadData">
        <template v-if="kind !== 'platform'" #left>
          <ElButton type="primary" @click="openEdit()">
            <ArtSvgIcon icon="ri:add-line" class="mr-1" />{{
              kind === 'center' ? '新增中心' : '新增课题组'
            }}
          </ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable :loading="loading" :data="tableData" :columns="columns">
        <template #status="{ row }">
          <ElTag :type="row.status === '运行中' ? 'success' : 'info'" effect="light">
            {{ row.status }}
          </ElTag>
        </template>
        <template #operation="{ row }">
          <template v-if="kind === 'platform'">
            <ElButton
              link
              :type="row.status === '运行中' ? 'danger' : 'primary'"
              @click="toggleService(row)"
            >
              {{ row.status === '运行中' ? '暂停服务' : '恢复服务' }}
            </ElButton>
          </template>
          <template v-else>
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton v-if="kind === 'center'" link type="danger" @click="removeOrg(row)">
              删除
            </ElButton>
            <ElTooltip v-else content="中心管理端不可删除课题组" placement="top">
              <span><ElButton link disabled>删除</ElButton></span>
            </ElTooltip>
          </template>
        </template>
      </ArtTable>
    </ElCard>

    <!-- 新增 / 编辑组织 -->
    <ElDialog
      v-model="editVisible"
      :title="`${orgForm.id ? '编辑' : '新增'}${kind === 'center' ? '中心' : '课题组'}`"
      width="520px"
      destroy-on-close
    >
      <ElForm ref="formRef" :model="orgForm" :rules="rules" label-width="92px">
        <ElFormItem label="名称" prop="name">
          <ElInput v-model="orgForm.name" maxlength="30" placeholder="请输入名称" />
        </ElFormItem>
        <ElFormItem label="上级组织" prop="parent">
          <ElInput v-model="orgForm.parent" maxlength="30" />
        </ElFormItem>
        <ElFormItem label="负责人" prop="leader">
          <ElInput v-model="orgForm.leader" maxlength="20" placeholder="请输入负责人姓名" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElRadioGroup v-model="orgForm.status">
            <ElRadio value="运行中">运行中</ElRadio>
            <ElRadio value="已停用">已停用</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="editVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submitOrg">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import {
    fetchDeleteCenter,
    fetchGetCenters,
    fetchGetGroups,
    fetchGetPlatforms,
    fetchSaveCenter,
    fetchSaveGroup,
    fetchTogglePlatformService
  } from '@/mock/dli/api'
  import type { OrgItem, PlatformItem } from '@/mock/dli/types'

  defineOptions({ name: 'DliOrgManager' })

  const props = defineProps<{ kind: 'center' | 'group' | 'platform' }>()

  const searchParams = reactive({ keyword: '' })
  const appliedKeyword = ref('')

  const searchItems = computed(() => [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: props.kind === 'platform' ? '平台编号 / 平台名称' : '编号 / 名称 / 负责人',
      span: 6
    }
  ])

  function handleSearch() {
    appliedKeyword.value = searchParams.keyword.trim().toLowerCase()
  }

  function handleReset() {
    searchParams.keyword = ''
    appliedKeyword.value = ''
  }

  function matchKeyword(values: string[]) {
    const keyword = appliedKeyword.value
    if (!keyword) return true
    return values.join(' ').toLowerCase().includes(keyword)
  }

  const tableData = computed(() => {
    if (props.kind === 'platform') {
      return platformList.value.filter((item) => matchKeyword([item.id, item.name, item.createdAt]))
    }
    return orgList.value.filter((item) =>
      matchKeyword([item.id, item.name, item.parent, item.leader])
    )
  })

  const columns = computed(() =>
    props.kind === 'platform'
      ? [
          { prop: 'id', label: '平台编号', width: 120 },
          { prop: 'name', label: '平台名称', minWidth: 200 },
          { prop: 'centers', label: '中心数', width: 100, align: 'center' as const },
          { prop: 'users', label: '用户数', width: 100, align: 'center' as const },
          { prop: 'status', label: '服务状态', width: 110, useSlot: true },
          { prop: 'createdAt', label: '创建日期', width: 120 },
          { prop: 'operation', label: '操作', width: 150, align: 'center' as const, useSlot: true }
        ]
      : [
          { prop: 'id', label: '编号', width: 110 },
          { prop: 'name', label: '名称', minWidth: 170 },
          { prop: 'parent', label: '上级组织', minWidth: 150 },
          { prop: 'leader', label: '负责人', width: 110 },
          { prop: 'members', label: '成员数', width: 90, align: 'center' as const },
          { prop: 'status', label: '状态', width: 100, useSlot: true },
          { prop: 'createdAt', label: '创建日期', width: 120 },
          { prop: 'operation', label: '操作', width: 150, align: 'center' as const, useSlot: true }
        ]
  )

  const loading = ref(true)
  const orgList = ref<OrgItem[]>([])
  const platformList = ref<PlatformItem[]>([])
  const editVisible = ref(false)
  const saving = ref(false)
  const formRef = ref<FormInstance>()

  const orgForm = reactive<{
    id: string
    name: string
    parent: string
    leader: string
    status: OrgItem['status']
  }>({
    id: '',
    name: '',
    parent: '',
    leader: '',
    status: '运行中'
  })

  const rules: FormRules = {
    name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
    parent: [{ required: true, message: '请输入上级组织', trigger: 'blur' }],
    leader: [{ required: true, message: '请输入负责人', trigger: 'blur' }]
  }

  /** 加载组织列表 */
  async function loadData() {
    loading.value = true
    try {
      if (props.kind === 'platform') {
        platformList.value = await fetchGetPlatforms()
      } else if (props.kind === 'center') {
        orgList.value = await fetchGetCenters()
      } else {
        orgList.value = await fetchGetGroups()
      }
    } finally {
      loading.value = false
    }
  }

  /** 打开新增 / 编辑 */
  function openEdit(row?: OrgItem) {
    orgForm.id = row?.id ?? ''
    orgForm.name = row?.name ?? ''
    orgForm.parent = row?.parent ?? (props.kind === 'center' ? 'DLI 智能管理平台' : '华东中心')
    orgForm.leader = row?.leader ?? ''
    orgForm.status = row?.status ?? '运行中'
    editVisible.value = true
  }

  /** 保存组织 */
  async function submitOrg() {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    saving.value = true
    try {
      const payload = {
        id: orgForm.id || undefined,
        name: orgForm.name.trim(),
        parent: orgForm.parent.trim(),
        leader: orgForm.leader.trim(),
        status: orgForm.status
      }
      if (props.kind === 'center') {
        await fetchSaveCenter(payload)
      } else {
        await fetchSaveGroup(payload)
      }
      ElMessage.success('已保存')
      editVisible.value = false
      await loadData()
    } finally {
      saving.value = false
    }
  }

  /** 删除中心 */
  async function removeOrg(row: OrgItem) {
    await ElMessageBox.confirm(
      `确认删除中心「${row.name}」？删除后其下课题组与用户需重新归属。`,
      '删除确认',
      { type: 'warning' }
    )
    await fetchDeleteCenter(row.id)
    ElMessage.success('已删除')
    await loadData()
  }

  /** 暂停 / 恢复平台服务 */
  async function toggleService(row: PlatformItem) {
    const running = row.status === '运行中'
    await ElMessageBox.confirm(
      running
        ? `确认暂停「${row.name}」服务？暂停期间该平台下所有中心不可访问。`
        : `确认恢复「${row.name}」服务？`,
      running ? '暂停服务' : '恢复服务',
      { type: 'warning' }
    )
    await fetchTogglePlatformService(row.id, running ? '已暂停' : '运行中')
    ElMessage.success(`已${running ? '暂停' : '恢复'}服务`)
    await loadData()
  }

  onMounted(loadData)
</script>
