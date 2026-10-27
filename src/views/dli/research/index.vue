<!-- DLI 研究管理：临床角色按分组与指标开展 Agent 研究并设置共享；管理端只读查看共享项目 -->
<template>
  <div class="art-full-height">
    <div v-if="isClinical" class="art-card mb-5 px-5 py-4">
      <div class="flex-cb flex-wrap gap-3">
        <div>
          <h3 class="text-lg font-medium text-g-900">研究管理</h3>
        </div>
        <ElButton type="primary" @click="openCreate">
          <ArtSvgIcon icon="ri:add-line" class="mr-1" />新建研究
        </ElButton>
      </div>
    </div>

    <ElCard class="art-table-card">
      <ElForm :inline="true" @submit.prevent>
        <ElFormItem label="关键词">
          <ElInput
            v-model="searchParams.keyword"
            placeholder="研究编号 / 名称 / 负责人"
            clearable
            style="width: 260px"
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

    <!-- Agent 对话 -->
    <ResearchChat v-model="chatVisible" :research="activeResearch" :readonly="!isClinical" />

    <!-- 新建研究 -->
    <ElDialog v-model="createVisible" title="新建研究" width="620px" destroy-on-close>
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="96px">
        <ElFormItem label="研究名称" prop="name">
          <ElInput
            v-model="form.name"
            maxlength="40"
            show-word-limit
            placeholder="例如：DLI 转归预测多中心验证"
          />
        </ElFormItem>
        <ElFormItem label="分组维度" prop="groupBy">
          <ElSelect
            v-model="form.groupBy"
            multiple
            placeholder="选择用于分层的研究维度"
            class="w-full"
          >
            <ElOption v-for="item in GROUP_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="观察指标" prop="indicators">
          <ElSelect
            v-model="form.indicators"
            multiple
            placeholder="选择需要分析的指标"
            class="w-full"
          >
            <ElOption v-for="item in INDICATOR_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="共享设置">
          <div class="w-full">
            <ElSwitch v-model="form.shared" />
            <span class="ml-2 text-sm text-g-600">共享后管理端可查看该项目（只读）</span>
            <ElRadioGroup v-if="form.shared" v-model="form.shareLevel" class="mt-2 block">
              <ElRadio value="课题组">课题组</ElRadio>
              <ElRadio value="中心">中心</ElRadio>
              <ElRadio value="平台">平台</ElRadio>
            </ElRadioGroup>
          </div>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="createVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submitCreate">创建研究</ElButton>
      </template>
    </ElDialog>

    <!-- 共享设置 -->
    <ElDialog v-model="shareVisible" title="共享设置" width="460px">
      <template v-if="activeResearch">
        <p class="mb-2 text-sm font-medium text-g-900">{{ activeResearch.name }}</p>
        <p class="mb-3 text-xs text-g-500">{{ activeResearch.id }} · {{ activeResearch.owner }}</p>
        <ElSwitch v-model="shareForm.shared" active-text="开启共享" />
        <ElRadioGroup v-if="shareForm.shared" v-model="shareForm.shareLevel" class="mt-3 block">
          <ElRadio value="课题组">课题组</ElRadio>
          <ElRadio value="中心">中心</ElRadio>
          <ElRadio value="平台">平台</ElRadio>
        </ElRadioGroup>
        <p class="mt-3 rounded-lg bg-g-100 px-3 py-2 text-xs text-g-600">
          共享级别决定哪些管理端可见：课题组 → 本课题组管理端；中心 → 本中心及上级；平台 →
          平台与系统管理端。
        </p>
      </template>
      <template #footer>
        <ElButton @click="shareVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submitShare">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElTag, ElButton } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import {
    fetchCreateResearch,
    fetchGetResearchList,
    fetchUpdateResearchShare
  } from '@/mock/dli/api'
  import type { ResearchItem } from '@/mock/dli/types'
  import { getAccountByRole } from '@/mock/dli/users'
  import { useUserStore } from '@/store/modules/user'
  import ResearchChat from './modules/research-chat.vue'

  defineOptions({ name: 'DliResearch' })

  const userStore = useUserStore()

  /** 可新建研究并设置共享的角色 */
  const CLINICAL_ROLES = ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE']

  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const isClinical = computed(() => CLINICAL_ROLES.includes(role.value))

  const GROUP_OPTIONS = ['年龄分层', '性别', '中心', 'AI/常规组', '用药方案', '分期', '基线风险']
  const INDICATOR_OPTIONS = [
    'HRCT 磨玻璃影变化',
    'FVC 下降率',
    'DLCO 变化',
    'IL-6 水平',
    '早筛灵敏度',
    '早筛特异度',
    'AUC',
    '血药浓度',
    '6 个月转归概率'
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
      apiFn: fetchGetResearchList,
      apiParams: {
        current: 1,
        size: 10,
        keyword: '',
        onlyShared: !isClinical.value
      },
      columnsFactory: () => [
        { prop: 'id', label: '研究编号', width: 130 },
        {
          prop: 'name',
          label: '研究项目',
          minWidth: 240,
          formatter: (row: ResearchItem) =>
            h('div', { class: 'leading-5' }, [
              h('div', { class: 'text-g-900' }, row.name),
              h('div', { class: 'text-xs text-g-500' }, `${row.owner} · ${row.center}`)
            ])
        },
        {
          prop: 'groupBy',
          label: '分组维度',
          minWidth: 190,
          formatter: (row: ResearchItem) =>
            h(
              'div',
              { class: 'flex flex-wrap gap-1' },
              row.groupBy.map((item) =>
                h(ElTag, { key: item, size: 'small', effect: 'plain' }, () => item)
              )
            )
        },
        {
          prop: 'indicators',
          label: '观察指标',
          minWidth: 200,
          formatter: (row: ResearchItem) => {
            const shown = row.indicators.slice(0, 2)
            const rest = row.indicators.length - shown.length
            return h('div', { class: 'leading-5' }, [
              h('div', { class: 'text-g-700' }, shown.join('、')),
              rest > 0 ? h('div', { class: 'text-xs text-g-500' }, `另 ${rest} 项指标`) : null
            ])
          }
        },
        { prop: 'members', label: '成员', width: 80, align: 'center' as const },
        {
          prop: 'shared',
          label: '共享',
          width: 130,
          formatter: (row: ResearchItem) =>
            h(
              ElTag,
              { effect: row.shared ? 'light' : 'plain', type: row.shared ? 'success' : 'info' },
              () => (row.shared ? `已共享 · ${row.shareLevel}` : '未共享')
            )
        },
        { prop: 'updatedAt', label: '最近更新', width: 120 },
        {
          prop: 'operation',
          label: '操作',
          width: 190,
          align: 'center' as const,
          formatter: (row: ResearchItem) =>
            h('div', { class: 'flex-c justify-center gap-3' }, [
              h(ElButton, { link: true, type: 'primary', onClick: () => openChat(row) }, () =>
                isClinical.value ? 'Agent 对话' : '查看详情'
              ),
              isClinical.value
                ? h(
                    ElButton,
                    { link: true, type: 'primary', onClick: () => openShare(row) },
                    () => '共享设置'
                  )
                : null
            ])
        }
      ]
    }
  })

  const chatVisible = ref(false)
  const shareVisible = ref(false)
  const createVisible = ref(false)
  const saving = ref(false)
  const activeResearch = ref<ResearchItem>()

  /** 共享设置表单 */
  const shareForm = reactive<{ shared: boolean; shareLevel: ResearchItem['shareLevel'] }>({
    shared: false,
    shareLevel: '课题组'
  })

  /** 新建研究表单 */
  const formRef = ref<FormInstance>()
  const form = reactive({
    name: '',
    groupBy: [] as string[],
    indicators: [] as string[],
    shared: false,
    shareLevel: '课题组' as ResearchItem['shareLevel']
  })

  const rules: FormRules = {
    name: [{ required: true, message: '请输入研究名称', trigger: 'blur' }],
    groupBy: [
      { required: true, type: 'array', min: 1, message: '至少选择一个分组维度', trigger: 'change' }
    ],
    indicators: [
      { required: true, type: 'array', min: 1, message: '至少选择一个观察指标', trigger: 'change' }
    ]
  }

  /** 搜索 */
  function handleSearch() {
    getData()
  }

  /** 重置 */
  function handleReset() {
    resetSearchParams()
  }

  /** 打开 Agent 对话 */
  function openChat(row: ResearchItem) {
    activeResearch.value = row
    chatVisible.value = true
  }

  /** 打开共享设置 */
  function openShare(row: ResearchItem) {
    activeResearch.value = row
    shareForm.shared = row.shared
    shareForm.shareLevel = row.shareLevel
    shareVisible.value = true
  }

  /** 保存共享设置 */
  async function submitShare() {
    if (!activeResearch.value) return
    saving.value = true
    try {
      await fetchUpdateResearchShare(
        activeResearch.value.id,
        shareForm.shared,
        shareForm.shareLevel
      )
      ElMessage.success(shareForm.shared ? '共享设置已更新' : '已取消共享')
      shareVisible.value = false
      await refreshUpdate()
    } finally {
      saving.value = false
    }
  }

  /** 打开新建研究 */
  function openCreate() {
    form.name = ''
    form.groupBy = []
    form.indicators = []
    form.shared = false
    form.shareLevel = '课题组'
    createVisible.value = true
  }

  /** 提交新建研究 */
  async function submitCreate() {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    saving.value = true
    try {
      await fetchCreateResearch({
        name: form.name.trim(),
        groupBy: [...form.groupBy],
        indicators: [...form.indicators],
        shared: form.shared,
        shareLevel: form.shareLevel,
        owner: userStore.getUserInfo.userName ?? '本账号',
        center: getAccountByRole(role.value)?.orgName.split(' · ')[0] ?? '本中心'
      })
      ElMessage.success('研究已创建，可进入 Agent 对话开展分析')
      createVisible.value = false
      await refreshCreate()
    } finally {
      saving.value = false
    }
  }
</script>
