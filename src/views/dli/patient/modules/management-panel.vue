<!-- 患者详情 → 管理计划：管理安排 + 随访计划 + 待核对上报 + 安全事件 [批注 05] -->
<template>
  <div class="dli-pane dli-own">
    <!-- 管理安排：安排名称 / 类型 / 执行时间 / 发布状态 / 操作 [批注 05] -->
    <div class="dli-section-title">管理安排</div>
    <div class="dli-pane-bar mb-2">
      <ElButton type="primary" plain @click="openPlanDialog()">新增安排</ElButton>
    </div>
    <ArtTable
      :data="planTableData"
      :columns="managementColumns"
      empty-text="暂无管理安排"
      class="mb-5"
    />

    <div class="dli-section-title">随访计划 · 关联任务</div>
    <ArtTable :data="planList" :columns="planColumns" empty-text="暂无关联随访任务" class="mb-5" />
    <div class="dli-pane-bar">
      <ElButton type="primary" plain @click="goFollowup">制定随访</ElButton>
    </div>

    <div class="dli-section-title">待核对上报</div>
    <ArtTable :data="reportList" :columns="reportColumns" empty-text="暂无上报记录" class="mb-5" />

    <div class="dli-section-title">安全事件</div>
    <div class="dli-pane-bar">
      <ElButton v-if="canManage" type="primary" @click="safetyDialogVisible = true">
        登记事件
      </ElButton>
    </div>
    <ArtTable :data="safetyList" :columns="safetyColumns" empty-text="暂无安全事件" />

    <!-- 管理安排新增 / 编辑弹窗：安排名称、类型、具体内容、执行时间、执行要求 [批注 05] -->
    <ElDialog
      v-model="planDialogVisible"
      :title="planForm.id ? '编辑安排' : '新增安排'"
      width="560px"
      destroy-on-close
    >
      <ElForm ref="planFormRef" :model="planForm" :rules="planRules" label-width="96px">
        <ElFormItem label="安排名称" prop="name">
          <ElInput v-model="planForm.name" placeholder="例如：保肝用药调整" />
        </ElFormItem>
        <ElFormItem label="安排类型" prop="type">
          <ElSelect v-model="planForm.type" class="w-full">
            <ElOption label="用药" value="用药" />
            <ElOption label="复查" value="复查" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="具体内容" prop="content">
          <ElInput
            v-model="planForm.content"
            type="textarea"
            :rows="2"
            placeholder="填写具体内容"
          />
        </ElFormItem>
        <ElFormItem label="执行时间" prop="executeAt">
          <ElDatePicker
            v-model="planForm.executeAt"
            type="datetime"
            placeholder="选择执行时间"
            value-format="YYYY-MM-DD HH:mm"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="执行要求" prop="requirement">
          <ElInput
            v-model="planForm.requirement"
            type="textarea"
            :rows="2"
            placeholder="填写执行要求"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="planDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="savingPlan" @click="submitPlan">
          {{ planForm.id ? '保存' : '存为草稿' }}
        </ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="safetyDialogVisible" title="登记安全事件" width="440px" destroy-on-close>
      <ElForm label-width="96px">
        <ElFormItem label="事件类型">
          <ElSelect v-model="safetyForm.type" class="w-full">
            <ElOption v-for="item in SAFETY_TYPES" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="级别">
          <ElSelect v-model="safetyForm.level" class="w-full">
            <ElOption v-for="item in SAFETY_LEVELS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="safetyDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="submitSafetyEvent">确认登记</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElDatePicker,
    ElMessage,
    ElOption,
    ElSelect,
    ElTag
  } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { computed, reactive, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import {
    fetchAddSafetyEvent,
    fetchConfirmSafetyEvent,
    fetchGetPatientReports,
    fetchGetPatientSafetyEvents,
    fetchReviewPatientReport
  } from '@/mock/dli/api'
  import {
    fetchCancelManagementPlan,
    fetchGetManagementPlans,
    fetchPublishManagementPlan,
    fetchSaveManagementPlan
  } from '@/mock/dli/blueprint/api'
  import { FOLLOWUP_PLANS, FOLLOWUP_TASKS } from '@/mock/dli/blueprint/data'
  import { useUserStore } from '@/store/modules/user'
  import type { ColumnOption } from '@/types/component'
  import type { ManagementPlan } from '@/mock/dli/blueprint/types'
  import type { PatientReport, SafetyEvent } from '@/mock/dli/types'

  defineOptions({ name: 'PatientManagementPanel' })

  const props = defineProps<{ patientId: string }>()

  /* ---------------- 管理安排（管理计划表）[批注 05] ---------------- */
  const managementList = ref<ManagementPlan[]>([])

  const PLAN_STATUS_TAG: Record<ManagementPlan['status'], 'info' | 'success' | 'danger'> = {
    草稿: 'info',
    已发布: 'success',
    已取消: 'danger'
  }

  const managementColumns: ColumnOption<ManagementPlan>[] = [
    { prop: 'name', label: '安排名称', minWidth: 160, showOverflowTooltip: true },
    {
      prop: 'type',
      label: '安排类型',
      width: 100,
      formatter: (row) => h(ElTag, { effect: 'plain', size: 'small' }, () => row.type)
    },
    { prop: 'executeAt', label: '执行时间', width: 150 },
    {
      prop: 'status',
      label: '发布状态',
      width: 100,
      formatter: (row) =>
        h(ElTag, { effect: 'light', type: PLAN_STATUS_TAG[row.status] }, () => row.status)
    },
    {
      prop: 'taskId',
      label: '患者任务',
      width: 120,
      formatter: (row) => row.taskId ?? '—'
    },
    {
      prop: 'operation',
      label: '操作',
      width: 150,
      formatter: (row) => {
        const btns: ReturnType<typeof h>[] = []
        if (row.status === '草稿') {
          btns.push(
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => openPlanDialog(row) },
              () => '编辑'
            )
          )
          // 医生发布后生成患者任务，同一任务在各入口引用，不重复下发 [批注 05]
          if (isDoctor.value) {
            btns.push(
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => publishPlan(row) },
                () => '发布'
              )
            )
          }
        }
        if (row.status !== '已取消') {
          btns.push(
            h(
              ElButton,
              { link: true, type: 'danger', onClick: () => cancelPlan(row) },
              () => '取消'
            )
          )
        }
        if (!btns.length) return h('span', { class: 'text-xs text-g-500' }, () => '—')
        return h('div', { class: 'flex-c gap-1' }, btns)
      }
    }
  ]

  const planDialogVisible = ref(false)
  const savingPlan = ref(false)
  const planFormRef = ref<FormInstance>()
  const planForm = reactive({
    id: '',
    name: '',
    type: '复查' as ManagementPlan['type'],
    content: '',
    executeAt: '',
    requirement: ''
  })
  const planRules: FormRules = {
    name: [{ required: true, message: '请输入安排名称', trigger: 'blur' }],
    type: [{ required: true, message: '请选择安排类型', trigger: 'change' }],
    content: [{ required: true, message: '请输入具体内容', trigger: 'blur' }],
    executeAt: [{ required: true, message: '请选择执行时间', trigger: 'change' }],
    requirement: [{ required: true, message: '请输入执行要求', trigger: 'blur' }]
  }

  function openPlanDialog(row?: ManagementPlan) {
    planForm.id = row?.id ?? ''
    planForm.name = row?.name ?? ''
    planForm.type = row?.type ?? '复查'
    planForm.content = row?.content ?? ''
    planForm.executeAt = row?.executeAt ?? ''
    planForm.requirement = row?.requirement ?? ''
    planDialogVisible.value = true
  }

  async function submitPlan() {
    if (!planFormRef.value) return
    const valid = await planFormRef.value.validate().catch(() => false)
    if (!valid) return
    savingPlan.value = true
    try {
      await fetchSaveManagementPlan({
        id: planForm.id || undefined,
        patientId: props.patientId,
        name: planForm.name.trim(),
        type: planForm.type,
        content: planForm.content.trim(),
        executeAt: planForm.executeAt,
        requirement: planForm.requirement.trim(),
        operator: operatorName.value
      })
      ElMessage.success(planForm.id ? '安排已保存' : '已存为草稿，发布后生成患者任务')
      planDialogVisible.value = false
      managementList.value = await fetchGetManagementPlans(props.patientId)
    } catch (error) {
      showError(error)
    } finally {
      savingPlan.value = false
    }
  }

  async function publishPlan(row: ManagementPlan) {
    try {
      await fetchPublishManagementPlan(row.id, operatorName.value)
      ElMessage.success(`已发布并生成患者任务 ${row.taskId ?? ''}（同一任务在各入口引用）`)
      managementList.value = await fetchGetManagementPlans(props.patientId)
    } catch (error) {
      showError(error)
    }
  }

  async function cancelPlan(row: ManagementPlan) {
    try {
      await fetchCancelManagementPlan(row.id)
      ElMessage.success('安排已取消')
      managementList.value = await fetchGetManagementPlans(props.patientId)
    } catch (error) {
      showError(error)
    }
  }

  const planTableData = computed(() => managementList.value)

  const router = useRouter()
  const userStore = useUserStore()
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const isDoctor = computed(() => role.value === 'R_DOCTOR')
  const canManage = computed(() => ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role.value))
  const operatorName = computed(() => {
    const info = userStore.getUserInfo as {
      userName?: string
      username?: string
      nickName?: string
    }
    return info.userName ?? info.username ?? info.nickName ?? '当前医护'
  })

  const reportList = ref<PatientReport[]>([])
  const safetyList = ref<SafetyEvent[]>([])
  const planList = computed(() =>
    FOLLOWUP_TASKS.filter((item) => item.patientId === props.patientId)
  )

  const planColumns: ColumnOption<(typeof FOLLOWUP_TASKS)[number]>[] = [
    { prop: 'id', label: '任务编号', width: 130 },
    {
      prop: 'title',
      label: '随访事项',
      minWidth: 180,
      formatter: (row) => h('span', {}, row.title)
    },
    {
      prop: 'planId',
      label: '所属计划',
      width: 180,
      formatter: (row) =>
        h('span', {}, FOLLOWUP_PLANS.find((item) => item.id === row.planId)?.name ?? row.planId)
    },
    { prop: 'status', label: '任务状态', width: 110 },
    { prop: 'dueDate', label: '计划日期', width: 130 },
    { prop: 'assignee', label: '负责人', width: 110 }
  ]

  const SAFETY_TYPES = ['药物相关肝酶升高', '间质性肺病加重', '感染', '皮疹', '其他']
  const SAFETY_LEVELS: Array<SafetyEvent['level']> = ['轻度', '中度', '重度']
  const safetyDialogVisible = ref(false)
  const safetyForm = reactive({
    type: '药物相关肝酶升高',
    level: '轻度' as SafetyEvent['level']
  })

  const reportColumns: ColumnOption<PatientReport>[] = [
    { prop: 'date', label: '上报日期', width: 130 },
    { prop: 'type', label: '类型', width: 140 },
    { prop: 'content', label: '内容', minWidth: 220, showOverflowTooltip: true },
    {
      prop: 'status',
      label: '状态',
      width: 110,
      formatter: (row: PatientReport) =>
        h(
          ElTag,
          {
            type:
              row.status === '已核对' ? 'success' : row.status === '已退回' ? 'danger' : 'warning',
            effect: 'light'
          },
          () => row.status
        )
    },
    {
      prop: 'operation',
      label: '操作',
      width: 150,
      formatter: (row: PatientReport) => {
        if (row.status === '待核对' && canManage.value) {
          return h('div', { class: 'flex-c gap-1' }, [
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => reviewReport(row, '已核对') },
              () => '通过'
            ),
            h(
              ElButton,
              { link: true, type: 'danger', onClick: () => reviewReport(row, '已退回') },
              () => '退回'
            )
          ])
        }
        return h('span', { class: 'text-xs text-g-500' }, () => row.reviewer)
      }
    }
  ]

  const safetyColumns: ColumnOption<SafetyEvent>[] = [
    { prop: 'date', label: '日期', width: 130 },
    { prop: 'type', label: '事件类型', minWidth: 190, showOverflowTooltip: true },
    { prop: 'level', label: '级别', width: 100 },
    {
      prop: 'confirmedBy',
      label: '医生确认',
      width: 130,
      formatter: (row: SafetyEvent) =>
        h(ElTag, { type: row.confirmed ? 'success' : 'warning', effect: 'light' }, () =>
          row.confirmed ? row.confirmedBy : '待确认'
        )
    },
    {
      prop: 'operation',
      label: '操作',
      width: 110,
      formatter: (row: SafetyEvent) => {
        if (!row.confirmed && isDoctor.value) {
          return h(
            ElButton,
            { link: true, type: 'primary', onClick: () => confirmSafetyEvent(row) },
            () => '确认'
          )
        }
        if (!row.confirmed) return h('span', { class: 'text-xs text-g-500' }, () => '仅医生可确认')
        return h('span', { class: 'text-xs text-g-500' }, () => '已确认')
      }
    }
  ]

  function showError(error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败')
  }

  function goFollowup() {
    router.push({ name: 'DliFollowup', query: { patientId: props.patientId } })
  }

  async function load() {
    if (!props.patientId) return
    try {
      const [reports, events, plans] = await Promise.all([
        fetchGetPatientReports(props.patientId),
        fetchGetPatientSafetyEvents(props.patientId),
        fetchGetManagementPlans(props.patientId)
      ])
      reportList.value = reports
      safetyList.value = events
      managementList.value = plans
    } catch (error) {
      showError(error)
    }
  }

  async function reviewReport(row: PatientReport, action: '已核对' | '已退回') {
    try {
      const updated = await fetchReviewPatientReport(row.id, action, operatorName.value)
      const target = reportList.value.find((item) => item.id === row.id)
      if (target) Object.assign(target, updated)
      ElMessage.success(`上报已${action}`)
    } catch (error) {
      showError(error)
    }
  }

  async function submitSafetyEvent() {
    try {
      await fetchAddSafetyEvent(props.patientId, { ...safetyForm })
      safetyDialogVisible.value = false
      safetyList.value = await fetchGetPatientSafetyEvents(props.patientId)
      ElMessage.success('安全事件已登记，等待医生确认')
    } catch (error) {
      showError(error)
    }
  }

  async function confirmSafetyEvent(row: SafetyEvent) {
    try {
      await fetchConfirmSafetyEvent(props.patientId, row.id, operatorName.value)
      safetyList.value = await fetchGetPatientSafetyEvents(props.patientId)
      ElMessage.success('医生已确认该安全事件')
    } catch (error) {
      showError(error)
    }
  }

  watch(
    () => props.patientId,
    () => void load(),
    { immediate: true }
  )
  defineExpose({ load })
</script>

<style lang="scss">
  .dli-section-title {
    margin: 4px 0 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--art-gray-800);
  }
</style>
