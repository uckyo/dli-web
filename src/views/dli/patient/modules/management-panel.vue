<!-- 患者详情 → 管理计划：仅保留管理安排 [批注 05]；上报归属见检查资料，安全事件归属见研究入组→研究记录 [批注 14/15] -->
<template>
  <div class="dli-pane dli-own">
    <!-- 管理安排：安排名称 / 类型 / 执行时间 / 发布状态 / 操作 [批注 05] -->
    <div class="dli-section-title">管理安排</div>
    <div class="dli-pane-bar mb-2">
      <ElButton type="primary" plain @click="openPlanDialog()">新增安排</ElButton>
    </div>
    <ArtTable :data="planTableData" :columns="managementColumns" empty-text="暂无管理安排" />

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
  import {
    fetchCancelManagementPlan,
    fetchGetManagementPlans,
    fetchPublishManagementPlan,
    fetchSaveManagementPlan
  } from '@/mock/dli/blueprint/api'
  import { useUserStore } from '@/store/modules/user'
  import type { ColumnOption } from '@/types/component'
  import type { ManagementPlan } from '@/mock/dli/blueprint/types'

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

  const userStore = useUserStore()
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const isDoctor = computed(() => role.value === 'R_DOCTOR')
  const operatorName = computed(() => {
    const info = userStore.getUserInfo as {
      userName?: string
      username?: string
      nickName?: string
    }
    return info.userName ?? info.username ?? info.nickName ?? '当前医护'
  })

  function showError(error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败')
  }

  async function load() {
    if (!props.patientId) return
    try {
      managementList.value = await fetchGetManagementPlans(props.patientId)
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
