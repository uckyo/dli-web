<!-- DLI 患者管理：编号 / 对话 / 诊疗历程 / 状态 / 早筛预警 / 早诊预警 / 转归预测 -->
<template>
  <div class="art-full-height">
    <!-- 搜索区 -->
    <div class="art-card px-5 pt-4 pb-0">
      <ElForm :inline="true" @submit.prevent>
        <ElFormItem label="关键词">
          <ElInput
            v-model="searchParams.keyword"
            placeholder="患者编号 / 姓名 / 主管医生"
            clearable
            style="width: 260px"
            @keyup.enter="handleSearch"
          />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect
            v-model="searchParams.status"
            placeholder="全部状态"
            clearable
            style="width: 140px"
          >
            <ElOption v-for="item in STATUS_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="预警等级">
          <ElSelect
            v-model="searchParams.warnLevel"
            placeholder="全部等级"
            clearable
            style="width: 140px"
          >
            <ElOption label="高风险" value="high" />
            <ElOption label="中风险" value="medium" />
            <ElOption label="低风险" value="low" />
            <ElOption label="未触发" value="none" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" @click="handleSearch">查询</ElButton>
          <ElButton @click="handleReset">重置</ElButton>
        </ElFormItem>
      </ElForm>
    </div>

    <!-- 表格 -->
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData" />

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <!-- 医患对话抽屉 -->
    <ChatDrawer v-model="chatVisible" :patient="activePatient" :readonly="!canReply" />

    <!-- 诊疗历程抽屉 -->
    <HistoryDrawer v-model="historyVisible" :patient="activePatient" />
  </div>
</template>

<script setup lang="ts">
  import { ElTag, ElButton } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchGetPatientList } from '@/mock/dli/api'
  import { useUserStore } from '@/store/modules/user'
  import type { WarnLevel, WebPatient } from '@/mock/dli/types'
  import ChatDrawer from './modules/chat-drawer.vue'
  import HistoryDrawer from './modules/history-drawer.vue'

  defineOptions({ name: 'DliPatient' })

  const userStore = useUserStore()

  /** 状态选项 */
  const STATUS_OPTIONS: Array<WebPatient['status']> = ['待评估', '用药中', '随访中', '已结案']

  /** 预警等级展示配置 */
  const WARN_CONFIG: Record<WarnLevel, { label: string; type: 'danger' | 'warning' | 'info' }> = {
    high: { label: '高风险', type: 'danger' },
    medium: { label: '中风险', type: 'warning' },
    low: { label: '低风险', type: 'info' },
    none: { label: '未触发', type: 'info' }
  }

  /** 状态标签类型 */
  const STATUS_TAG: Record<WebPatient['status'], 'success' | 'primary' | 'info' | 'warning'> = {
    待评估: 'warning',
    用药中: 'primary',
    随访中: 'success',
    已结案: 'info'
  }

  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')

  /** 临床角色可回复对话，管理端只读 */
  const canReply = computed(() => ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role.value))

  const chatVisible = ref(false)
  const historyVisible = ref(false)
  const activePatient = ref<WebPatient>()

  /** 渲染预警单元格 */
  const renderWarn = (warn: WebPatient['earlyScreen']) => {
    const config = WARN_CONFIG[warn.level]
    const text = warn.level === 'none' ? config.label : `${config.label} ${warn.score}`
    return h(ElTag, { type: config.type, effect: 'plain' }, () => text)
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
      apiFn: fetchGetPatientList,
      apiParams: {
        current: 1,
        size: 10,
        keyword: '',
        status: '',
        warnLevel: ''
      },
      columnsFactory: () => [
        {
          prop: 'id',
          label: '患者编号',
          width: 150
        },
        {
          prop: 'name',
          label: '姓名',
          width: 150,
          formatter: (row: WebPatient) =>
            h('div', { class: 'leading-5' }, [
              h('span', { class: 'text-g-900' }, row.name),
              h('span', { class: 'ml-1 text-xs text-g-500' }, `${row.gender} · ${row.age}岁`)
            ])
        },
        {
          prop: 'center',
          label: '所属中心',
          width: 120
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row: WebPatient) =>
            h(ElTag, { type: STATUS_TAG[row.status], effect: 'light' }, () => row.status)
        },
        {
          prop: 'earlyScreen',
          label: '早筛预警',
          width: 130,
          formatter: (row: WebPatient) => renderWarn(row.earlyScreen)
        },
        {
          prop: 'earlyDiagnosis',
          label: '早诊预警',
          width: 130,
          formatter: (row: WebPatient) => renderWarn(row.earlyDiagnosis)
        },
        {
          prop: 'outcome',
          label: '转归预测',
          minWidth: 190,
          formatter: (row: WebPatient) =>
            h('div', { class: 'leading-5' }, [
              h(
                'div',
                { class: 'text-g-900' },
                `${row.outcome.window} · ${(row.outcome.probability * 100).toFixed(0)}%`
              ),
              h('div', { class: 'text-xs text-g-500' }, row.outcome.label)
            ])
        },
        {
          prop: 'chat',
          label: '对话',
          width: 90,
          align: 'center' as const,
          formatter: (row: WebPatient) =>
            h(
              ElButton,
              {
                link: true,
                type: 'primary',
                onClick: () => openChat(row)
              },
              () => '医患对话'
            )
        },
        {
          prop: 'history',
          label: '诊疗历程',
          width: 100,
          align: 'center' as const,
          formatter: (row: WebPatient) =>
            h(
              ElButton,
              {
                link: true,
                type: 'primary',
                onClick: () => openHistory(row)
              },
              () => '查看历程'
            )
        }
      ]
    }
  })

  /** 打开对话抽屉 */
  function openChat(row: WebPatient) {
    activePatient.value = row
    chatVisible.value = true
  }

  /** 打开诊疗历程抽屉 */
  function openHistory(row: WebPatient) {
    activePatient.value = row
    historyVisible.value = true
  }

  /** 查询（回到第一页） */
  function handleSearch() {
    getData()
  }

  /** 重置搜索 */
  function handleReset() {
    resetSearchParams()
  }
</script>
