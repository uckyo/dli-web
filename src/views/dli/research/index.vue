<!-- DLI 研究管理 [批注 08/12]：项目列表 + 独立项目详情；管理端只读查看共享项目 -->
<template>
  <div class="art-full-height">
    <!-- 搜索区 -->
    <div class="art-card px-5 pt-4 pb-0">
      <ElForm :inline="true" @submit.prevent>
        <ElFormItem label="关键词">
          <ElInput
            v-model="searchParams.keyword"
            placeholder="研究编号 / 名称 / 负责人"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
          />
        </ElFormItem>
        <ElFormItem label="项目状态">
          <ElSelect
            v-model="searchParams.status"
            placeholder="全部状态"
            clearable
            style="width: 140px"
          >
            <ElOption label="进行中" value="进行中" />
            <ElOption label="已结题" value="已结题" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="共享范围">
          <ElSelect
            v-model="searchParams.shareLevel"
            placeholder="全部范围"
            clearable
            style="width: 150px"
          >
            <ElOption v-for="item in SHARE_LEVEL_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" @click="handleSearch">查询</ElButton>
          <ElButton @click="handleReset">重置</ElButton>
        </ElFormItem>
      </ElForm>
    </div>

    <ElCard class="art-table-card">
      <ArtTableHeader
        v-model:columns="columnChecks"
        :loading="loading"
        class="mb-2"
        @refresh="refreshData"
      >
        <template #left>
          <ElButton v-if="isClinical" type="primary" @click="openCreate">
            <ArtSvgIcon icon="ri:add-line" class="mr-1" />新建研究
          </ElButton>
          <ElTag v-else effect="plain" type="info" size="small">管理端共享查看 · 只读</ElTag>
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

    <!-- Agent 对话：列表沿用弹窗，不传条件时用项目默认配置 -->
    <ResearchChat v-model="chatVisible" :research="activeResearch" :readonly="!isClinical" />

    <!-- 共享设置：列表行内与项目详情右上角复用同一弹窗 [批注 12] -->
    <ResearchShareDialog
      v-model="shareVisible"
      :research="activeResearch"
      @saved="handleShareSaved"
    />

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
            <div v-if="form.shared" class="mt-2">
              <ElRadioGroup v-model="form.shareLevel">
                <ElRadio value="课题组">课题组</ElRadio>
                <ElRadio value="中心">中心</ElRadio>
                <ElRadio value="平台">平台</ElRadio>
              </ElRadioGroup>
            </div>
          </div>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="createVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submitCreate">创建研究</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElCard,
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElMessage,
    ElOption,
    ElRadio,
    ElRadioGroup,
    ElSelect,
    ElSwitch,
    ElTag
  } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { computed, onMounted, reactive, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchCreateResearch, fetchGetResearchList } from '@/mock/dli/api'
  import type { ResearchItem } from '@/mock/dli/types'
  import { getAccountByRole } from '@/mock/dli/users'
  import { useUserStore } from '@/store/modules/user'
  import ResearchChat from './modules/research-chat.vue'
  import ResearchShareDialog from './modules/research-share-dialog.vue'

  defineOptions({ name: 'DliResearch' })

  const LIST_STATE_KEY = 'dli-research-list-state'
  const CLINICAL_ROLES = ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE']
  const SHARE_LEVEL_OPTIONS: ResearchItem['shareLevel'][] = ['课题组', '中心', '平台']
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

  const router = useRouter()
  const userStore = useUserStore()
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const isClinical = computed(() => CLINICAL_ROLES.includes(role.value))
  const viewerName = userStore.getUserInfo.userName ?? '本账号'
  const viewerOrg = getAccountByRole(role.value)?.orgName ?? ''

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
    refreshCreate
  } = useTable({
    core: {
      apiFn: fetchGetResearchList,
      apiParams: {
        current: 1,
        size: 10,
        keyword: '',
        status: '',
        shareLevel: '',
        onlyShared: !isClinical.value,
        viewerName,
        viewerOrg
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
        { prop: 'members', label: '成员数量', width: 100, align: 'center' as const },
        {
          prop: 'shared',
          label: '共享范围',
          minWidth: 190,
          formatter: (row: ResearchItem) =>
            h('div', { class: 'leading-5' }, [
              h(
                ElTag,
                {
                  effect: row.shared ? 'light' : 'plain',
                  type: row.shared ? 'success' : 'info',
                  size: 'small'
                },
                () => (row.shared ? `已共享 · ${row.shareLevel}` : '未共享')
              ),
              h('div', { class: 'text-xs text-g-500' }, row.actualVisibleScope ?? '仅项目成员可见')
            ])
        },
        { prop: 'updatedAt', label: '最近更新时间', width: 140 },
        {
          prop: 'operation',
          label: '操作',
          width: 250,
          fixed: 'right' as const,
          align: 'center' as const,
          formatter: (row: ResearchItem) =>
            h('div', { class: 'flex-c justify-center gap-2' }, [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => goDetail(row) },
                () => '项目详情'
              ),
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openChat(row) },
                () => 'Agent 对话'
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

  /** 返回详情时保留筛选与页码 */
  watch(
    searchParams,
    () => sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify({ ...searchParams })),
    { deep: true }
  )

  onMounted(() => {
    try {
      const raw = sessionStorage.getItem(LIST_STATE_KEY)
      if (raw) Object.assign(searchParams, JSON.parse(raw))
    } catch {
      sessionStorage.removeItem(LIST_STATE_KEY)
    }
    void getData()
  })

  function handleSearch() {
    searchParams.current = 1
    void getData()
  }

  function handleReset() {
    resetSearchParams()
    searchParams.status = ''
    searchParams.shareLevel = ''
    sessionStorage.removeItem(LIST_STATE_KEY)
    void getData()
  }

  /** 项目详情：独立页面（隐藏路由），左侧仍选中研究管理 [批注 08] */
  function goDetail(row: ResearchItem) {
    sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify({ ...searchParams }))
    void router.push({ name: 'DliResearchDetail', params: { id: row.id } })
  }

  function openChat(row: ResearchItem) {
    activeResearch.value = row
    chatVisible.value = true
  }

  function openShare(row: ResearchItem) {
    activeResearch.value = row
    shareVisible.value = true
  }

  function handleShareSaved() {
    void refreshData()
  }

  function openCreate() {
    form.name = ''
    form.groupBy = []
    form.indicators = []
    form.shared = false
    form.shareLevel = '课题组'
    createVisible.value = true
  }

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
        owner: viewerName,
        center: viewerOrg.split(' · ')[0] || '本中心'
      })
      ElMessage.success('研究已创建，可进入项目详情开展分析')
      createVisible.value = false
      await refreshCreate()
    } finally {
      saving.value = false
    }
  }
</script>
