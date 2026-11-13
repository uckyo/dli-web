<!-- 患者详情 → 研究入组 [批注 03]：按项目核对条件、办理同意、确认入组、登记分组、退出研究 -->
<template>
  <div class="dli-pane dli-own">
    <div class="dli-pane-bar">
      <ElButton v-if="canManage" type="primary" @click="openApply">申请入组</ElButton>
      <span class="text-xs text-g-500 ml-2">
        建档与自动纳入管理候选队列均不等于研究入组；确认入组仅医生可操作
      </span>
    </div>

    <ArtTable
      :data="rows"
      :columns="columns"
      empty-text="暂无研究项目记录，可点击「申请入组」发起"
    />

    <!-- 申请入组 -->
    <ElDialog v-model="applyVisible" title="申请入组" width="480px" destroy-on-close>
      <ElForm label-width="100px">
        <ElFormItem label="患者编号">
          <ElInput :model-value="patientId" readonly disabled />
        </ElFormItem>
        <ElFormItem label="研究项目">
          <ElSelect v-model="applyProjectId" class="w-full" placeholder="选择有权限的研究项目">
            <ElOption
              v-for="item in availableProjects"
              :key="item.id"
              :label="`${item.name}（${item.id}）`"
              :value="item.id"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="applyVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="busy" @click="submitApply">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 核对条件：宽弹窗 -->
    <ElDialog v-model="checkVisible" title="核对入组条件" width="900px" destroy-on-close>
      <div class="mb-3 text-xs text-g-600">
        清单版本 {{ activeRow?.criteriaVersion }} · 必需纳入条件全部满足且未触发排除条件才通过；
        排除条件选「是」表示触发排除，缺资料保持待核对
      </div>
      <ElTable :data="checkRows" size="small" border max-height="360">
        <ElTableColumn prop="type" label="条件类型" width="110" />
        <ElTableColumn prop="content" label="条件内容" min-width="240" show-overflow-tooltip />
        <ElTableColumn prop="basis" label="依据资料" width="170" />
        <ElTableColumn label="是否满足该条条件" width="170">
          <template #default="{ row }">
            <ElRadioGroup v-model="row.met" size="small">
              <ElRadioButton value="是">是</ElRadioButton>
              <ElRadioButton value="否">否</ElRadioButton>
              <ElRadioButton value="待确认">待确认</ElRadioButton>
            </ElRadioGroup>
          </template>
        </ElTableColumn>
        <ElTableColumn label="核对备注" min-width="180">
          <template #default="{ row }">
            <ElInput v-model="row.note" size="small" placeholder="填写依据或说明" />
          </template>
        </ElTableColumn>
      </ElTable>
      <ElAlert
        v-if="activeRow?.rejectReason"
        class="mt-3"
        type="warning"
        :closable="false"
        show-icon
        :title="activeRow.rejectReason"
      />
      <template #footer>
        <ElButton @click="checkVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="busy" @click="submitCheck">保存核对结果</ElButton>
      </template>
    </ElDialog>

    <!-- 登记分组 -->
    <ElDialog v-model="groupVisible" title="登记分组" width="480px" destroy-on-close>
      <ElForm label-width="100px">
        <ElFormItem label="研究组别">
          <ElSelect v-model="groupForm.group" class="w-full">
            <ElOption v-for="item in groupOptions" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="分组日期">
          <ElDatePicker
            v-model="groupForm.groupDate"
            type="date"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="分组依据">
          <ElInput
            v-model="groupForm.groupBasis"
            type="textarea"
            :rows="2"
            placeholder="登记方案分配结果"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="groupVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="busy" @click="submitGroup">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 退出研究 -->
    <ElDialog v-model="exitVisible" title="退出研究" width="480px" destroy-on-close>
      <ElForm label-width="100px">
        <ElFormItem label="退出日期">
          <ElDatePicker
            v-model="exitForm.exitDate"
            type="date"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="退出原因">
          <ElInput v-model="exitForm.exitReason" type="textarea" :rows="2" />
        </ElFormItem>
      </ElForm>
      <div class="text-xs text-g-500 mb-2"
        >按方案停止或调整研究任务并保留记录，不自动终止临床管理</div
      >
      <template #footer>
        <ElButton @click="exitVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="busy" @click="submitExit">确认退出</ElButton>
      </template>
    </ElDialog>

    <!-- 患者研究记录：终点资料 / 安全事件 [批注 15] -->
    <PatientResearchRecordDrawer
      v-model="recordVisible"
      :patient-id="patientId"
      :project-id="recordProjectId"
    />
  </div>
</template>

<script setup lang="ts">
  import {
    ElAlert,
    ElButton,
    ElDatePicker,
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElMessage,
    ElOption,
    ElRadioButton,
    ElRadioGroup,
    ElSelect,
    ElTable,
    ElTableColumn,
    ElTag,
    ElTooltip
  } from 'element-plus'
  import { computed, reactive, ref, watch } from 'vue'
  import {
    PROJECTS,
    fetchApplyEnrollment,
    fetchConfirmEnrollmentV2,
    fetchExitEnrollment,
    fetchGetEnrollCriteria,
    fetchGetEnrollments,
    fetchRegisterGroup,
    fetchSaveCriteriaCheck,
    findProject,
    type ExitInput,
    type GroupInput
  } from '@/mock/dli/patient-admin'
  import { useUserStore } from '@/store/modules/user'
  import PatientResearchRecordDrawer from '@/views/dli/research/modules/patient-research-record-drawer.vue'
  import type { ColumnOption } from '@/types/component'
  import type { CriterionCheck, PatientEnrollment } from '@/mock/dli/types'

  defineOptions({ name: 'PatientEnrollmentPanel' })

  const props = defineProps<{ patientId: string }>()
  const emit = defineEmits<{ (e: 'go-consent', projectId: string): void }>()

  const userStore = useUserStore()
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const isDoctor = computed(() => role.value === 'R_DOCTOR')
  const canManage = computed(() => ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role.value))

  const rows = ref<PatientEnrollment[]>([])
  const busy = ref(false)
  const applyVisible = ref(false)
  const checkVisible = ref(false)
  const groupVisible = ref(false)
  const exitVisible = ref(false)
  const applyProjectId = ref('')
  const activeRow = ref<PatientEnrollment>()
  const recordVisible = ref(false)
  const recordProjectId = ref('')
  const checkRows = ref<Array<CriterionCheck & { type: string; content: string; basis: string }>>(
    []
  )

  const groupForm = reactive<GroupInput>({ group: '', groupDate: '', groupBasis: '' })
  const exitForm = reactive<ExitInput>({ exitDate: '', exitReason: '' })

  const availableProjects = computed(() =>
    PROJECTS.filter((item) => !rows.value.some((row) => row.projectId === item.id))
  )
  const groupOptions = computed(() => findProject(activeRow.value?.projectId ?? '')?.groups ?? [])

  const TAG_TYPE: Record<string, 'success' | 'primary' | 'warning' | 'danger' | 'info'> = {
    待核对: 'warning',
    符合: 'success',
    不符合: 'danger',
    未发放: 'info',
    待发放: 'info',
    待签署: 'warning',
    已签待核对: 'primary',
    核对通过: 'success',
    需补充: 'warning',
    已拒绝: 'danger',
    撤回处理中: 'warning',
    已撤回: 'info',
    待确认: 'primary',
    已签署: 'success',
    未申请: 'info',
    待分组: 'warning',
    已入组: 'success',
    已退出: 'info'
  }

  function tag(value: string) {
    return h(ElTag, { type: TAG_TYPE[value] ?? 'info', effect: 'plain' }, () => value)
  }

  function gaps(row: PatientEnrollment): string[] {
    const list: string[] = []
    if (row.criteriaStatus !== '符合') list.push('条件核对未通过')
    if (row.consentStatus !== '核对通过') list.push('知情同意未核对通过')
    if (row.status !== '待确认') list.push('当前状态不是待确认')
    return list
  }

  const columns: ColumnOption<PatientEnrollment>[] = [
    {
      prop: 'projectId',
      label: '研究项目',
      minWidth: 240,
      formatter: (row: PatientEnrollment) => {
        const project = findProject(row.projectId)
        return h('div', { class: 'leading-5' }, [
          h('div', { class: 'text-g-900' }, project?.name ?? row.projectId),
          h('div', { class: 'text-xs text-g-500' }, row.projectId)
        ])
      }
    },
    {
      prop: 'criteriaStatus',
      label: '条件核对状态',
      width: 125,
      formatter: (row: PatientEnrollment) => tag(row.criteriaStatus)
    },
    {
      prop: 'consentStatus',
      label: '知情同意状态',
      width: 125,
      formatter: (row: PatientEnrollment) => tag(row.consentStatus)
    },
    {
      prop: 'status',
      label: '入组状态',
      width: 110,
      formatter: (row: PatientEnrollment) => tag(row.status)
    },
    {
      prop: 'group',
      label: '研究组别',
      width: 145,
      formatter: (row: PatientEnrollment) =>
        h(
          'span',
          { class: row.group ? '' : 'text-g-400' },
          row.status === '已入组' && !row.group ? '待分组' : row.group || '—'
        )
    },
    {
      prop: 'researchNo',
      label: '研究受试者编号',
      width: 165,
      formatter: (row: PatientEnrollment) =>
        h('span', { class: row.researchNo ? '' : 'text-g-400' }, row.researchNo || '—')
    },
    {
      prop: 'enrollDate',
      label: '入组日期',
      width: 120,
      formatter: (row: PatientEnrollment) =>
        h('span', { class: row.enrollDate ? '' : 'text-g-400' }, row.enrollDate || '—')
    },
    {
      prop: 'operation',
      label: '操作',
      width: 360,
      fixed: 'right' as const,
      formatter: (row: PatientEnrollment) => {
        const buttons: Array<ReturnType<typeof h> | null> = []
        if (canManage.value && ['待核对', '待确认', '不符合'].includes(row.status)) {
          buttons.push(
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => openCheck(row) },
              () => '核对条件'
            )
          )
          buttons.push(
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => emit('go-consent', row.projectId) },
              () => '办理知情同意'
            )
          )
        }
        if (isDoctor.value && ['待核对', '待确认'].includes(row.status)) {
          const missing = gaps(row)
          buttons.push(
            h(
              ElTooltip,
              {
                content: missing.length ? `缺项：${missing.join('、')}` : '条件与同意书均已通过',
                disabled: missing.length === 0,
                placement: 'top'
              },
              () =>
                h('span', {}, [
                  h(
                    ElButton,
                    {
                      link: true,
                      type: 'primary',
                      disabled: missing.length > 0,
                      onClick: () => confirmEnroll(row)
                    },
                    () => '确认入组'
                  )
                ])
            )
          )
        }
        if (isDoctor.value && row.status === '已入组') {
          if (!row.group) {
            buttons.push(
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openGroup(row) },
                () => '登记分组'
              )
            )
          }
          buttons.push(
            h(
              ElButton,
              { link: true, type: 'danger', onClick: () => openExit(row) },
              () => '退出研究'
            )
          )
        }
        buttons.push(
          h(
            ElButton,
            { link: true, type: 'primary', onClick: () => openRecord(row) },
            () => '研究记录'
          )
        )
        if (!buttons.length) return h('span', { class: 'text-xs text-g-400' }, '—')
        return h('div', { class: 'flex-c gap-1 flex-wrap' }, buttons)
      }
    }
  ]

  async function load() {
    if (!props.patientId) return
    rows.value = await fetchGetEnrollments(props.patientId)
  }

  function showError(error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败')
  }

  function openApply() {
    applyProjectId.value = availableProjects.value[0]?.id ?? ''
    applyVisible.value = true
  }

  async function submitApply() {
    if (!applyProjectId.value) {
      ElMessage.warning('请选择研究项目')
      return
    }
    busy.value = true
    try {
      await fetchApplyEnrollment(props.patientId, applyProjectId.value, role.value)
      applyVisible.value = false
      await load()
      ElMessage.success('已生成待核对记录，请继续核对条件')
    } catch (error) {
      showError(error)
    } finally {
      busy.value = false
    }
  }

  async function openCheck(row: PatientEnrollment) {
    activeRow.value = row
    const criteria = await fetchGetEnrollCriteria(row.projectId, row.criteriaVersion)
    checkRows.value = criteria.map((item) => {
      const saved = row.checks.find((check) => check.criterionId === item.id)
      return {
        criterionId: item.id,
        met: saved?.met ?? '待确认',
        note: saved?.note ?? '',
        type: item.type,
        content: item.content,
        basis: item.basis
      }
    })
    checkVisible.value = true
  }

  async function submitCheck() {
    if (!activeRow.value) return
    busy.value = true
    try {
      await fetchSaveCriteriaCheck(
        props.patientId,
        activeRow.value.id,
        checkRows.value.map((item) => ({
          criterionId: item.criterionId,
          met: item.met,
          note: item.note
        })),
        role.value
      )
      checkVisible.value = false
      await load()
      ElMessage.success('核对结果已保存，未直接完成入组')
    } catch (error) {
      showError(error)
    } finally {
      busy.value = false
    }
  }

  function openRecord(row: PatientEnrollment) {
    recordProjectId.value = row.projectId
    recordVisible.value = true
  }

  async function confirmEnroll(row: PatientEnrollment) {
    busy.value = true
    try {
      await fetchConfirmEnrollmentV2(props.patientId, row.id, role.value)
      await load()
      ElMessage.success('已确认入组并生成研究受试者编号')
    } catch (error) {
      showError(error)
      await load()
    } finally {
      busy.value = false
    }
  }

  function openGroup(row: PatientEnrollment) {
    activeRow.value = row
    groupForm.group = groupOptions.value[0] ?? ''
    groupForm.groupDate = new Date().toISOString().slice(0, 10)
    groupForm.groupBasis = ''
    groupVisible.value = true
  }

  async function submitGroup() {
    if (!activeRow.value) return
    busy.value = true
    try {
      await fetchRegisterGroup(props.patientId, activeRow.value.id, { ...groupForm }, role.value)
      groupVisible.value = false
      await load()
      ElMessage.success('分组结果已登记')
    } catch (error) {
      showError(error)
    } finally {
      busy.value = false
    }
  }

  function openExit(row: PatientEnrollment) {
    activeRow.value = row
    exitForm.exitDate = new Date().toISOString().slice(0, 10)
    exitForm.exitReason = ''
    exitVisible.value = true
  }

  async function submitExit() {
    if (!activeRow.value) return
    busy.value = true
    try {
      await fetchExitEnrollment(props.patientId, activeRow.value.id, { ...exitForm }, role.value)
      exitVisible.value = false
      await load()
      ElMessage.success('已退出研究，临床管理继续保留')
    } catch (error) {
      showError(error)
    } finally {
      busy.value = false
    }
  }

  watch(
    () => props.patientId,
    () => void load(),
    { immediate: true }
  )
  defineExpose({ load })
</script>
