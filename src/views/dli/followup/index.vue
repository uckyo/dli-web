<!-- DLI 随访管理：计划列表 / 随访模板双页签 + 共用计划页面（新建/查看/编辑三态）[批注 10] -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <!-- ==================== 计划页面（三态，右侧内容区切换）==================== -->
    <template v-if="viewMode === 'plan'">
      <ElCard shadow="never" class="mb-4">
        <div class="flex-cb">
          <ElButton @click="goBackFromPlan">
            <ElIcon class="mr-1"><i class="ri-arrow-left-line" /></ElIcon>返回随访列表
          </ElButton>
          <span class="text-base font-semibold text-g-900">
            {{ planMode === 'create' ? '新建计划' : planMode === 'edit' ? '编辑计划' : '查看计划' }}
            {{ planForm.id ? `· ${planForm.id}` : '' }}
          </span>
        </div>
      </ElCard>

      <ElCard shadow="never" class="mb-4">
        <ElDescriptions v-if="planMode === 'view'" :column="3" border>
          <ElDescriptionsItem label="患者编号">{{ planForm.patientId }}</ElDescriptionsItem>
          <ElDescriptionsItem label="计划名称">{{ planForm.name }}</ElDescriptionsItem>
          <ElDescriptionsItem label="负责医生">{{ planForm.doctor }}</ElDescriptionsItem>
          <ElDescriptionsItem label="计划起止日期">
            {{ planForm.dateRange[0] }} ~ {{ planForm.dateRange[1] }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="计划来源">{{ planForm.source }}</ElDescriptionsItem>
          <ElDescriptionsItem label="计划版本">{{ activePlan?.version ?? '—' }}</ElDescriptionsItem>
        </ElDescriptions>
        <ElForm
          v-else
          ref="planFormRef"
          :model="planForm"
          :rules="planRules"
          label-width="110px"
          class="max-w-3xl"
        >
          <ElFormItem label="患者编号" prop="patientId">
            <ElInput v-model="planForm.patientId" placeholder="系统患者编号 / 研究受试者编号" />
          </ElFormItem>
          <ElFormItem label="计划名称" prop="name">
            <ElInput v-model="planForm.name" placeholder="例如：抗肿瘤治疗后 4 周随访计划" />
          </ElFormItem>
          <ElFormItem label="负责医生" prop="doctor">
            <ElInput v-model="planForm.doctor" placeholder="负责医生" />
          </ElFormItem>
          <ElFormItem label="计划起止日期" prop="dateRange">
            <ElDatePicker
              v-model="planForm.dateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              class="w-full"
            />
          </ElFormItem>
          <ElFormItem label="生效模板">
            <ElSelect
              v-model="planForm.templateId"
              class="w-full"
              clearable
              placeholder="选择生效模板（可选）"
            >
              <ElOption
                v-for="tpl in templates"
                :key="tpl.id"
                :label="`${tpl.name}（${tpl.version}）`"
                :value="tpl.id"
              />
            </ElSelect>
          </ElFormItem>
          <p class="text-xs text-g-500">
            保存草稿后由医生确认发布；模型或规则产生的计划也先为草稿。更新模板不覆盖已发布计划。
          </p>
        </ElForm>
      </ElCard>

      <!-- 下部任务表 [批注 10] -->
      <ElCard shadow="never">
        <template #header>
          <div class="flex-cb">
            <span class="font-semibold">计划任务</span>
            <ElButton
              v-if="planMode !== 'view' && planForm.id && activePlan?.status === '草稿'"
              size="small"
              type="primary"
              plain
              @click="openTaskDialog"
            >
              添加任务
            </ElButton>
          </div>
        </template>

        <ArtTable :data="planTasks" :columns="planTaskColumns" empty-text="暂无任务" />

        <div v-if="planMode !== 'view'" class="mt-4 flex justify-end gap-2">
          <ElButton @click="goBackFromPlan">取消</ElButton>
          <ElButton type="primary" :loading="savingPlan" @click="submitPlan">
            {{ planForm.id ? '保存草稿' : '存为草稿' }}
          </ElButton>
          <!-- 保存草稿后由医生确认发布 [批注 10] -->
          <ElButton
            v-if="isDoctor && planForm.id && activePlan?.status === '草稿'"
            type="success"
            :loading="publishingPlan"
            @click="publishPlan"
          >
            医生确认发布
          </ElButton>
        </div>
        <div v-else-if="activePlan?.status === '草稿'" class="mt-4 flex justify-end gap-2">
          <ElButton v-if="isDoctor" type="success" :loading="publishingPlan" @click="publishPlan">
            医生确认发布
          </ElButton>
          <p v-else class="text-xs text-g-500">助理／护士不能代医生发布安排</p>
        </div>
      </ElCard>
    </template>

    <!-- ==================== 列表模式：计划列表 / 随访模板 ==================== -->
    <template v-else>
      <ElCard class="art-table-card dli-tab-card" shadow="never">
        <ElTabs v-model="activeTab" class="dli-tabs">
          <!-- 计划列表（默认显示计划表） [批注 10] -->
          <ElTabPane label="计划列表" name="plans">
            <div class="pt-3">
              <ArtSearchBar
                v-model="planSearchParams"
                :items="planSearchItems"
                @search="loadPlans"
                @reset="resetPlanSearchParams"
              />
              <ElCard class="art-table-card" shadow="never">
                <ArtTableHeader :loading="planLoading" @refresh="loadPlans">
                  <template #left>
                    <ElButton type="primary" @click="openPlanPage('create')">新建计划</ElButton>
                  </template>
                </ArtTableHeader>
                <ArtTable :loading="planLoading" :data="planList" :columns="planColumns" />
              </ElCard>
            </div>
          </ElTabPane>

          <!-- 随访模板 [批注 10] -->
          <ElTabPane label="随访模板" name="templates" lazy>
            <div class="pt-3">
              <ElCard class="art-table-card" shadow="never">
                <ArtTableHeader :loading="templateLoading" @refresh="loadTemplates">
                  <template #left>
                    <ElButton type="primary" @click="openTemplateDialog()">新增模板</ElButton>
                  </template>
                </ArtTableHeader>
                <ArtTable :loading="templateLoading" :data="templates" :columns="templateColumns" />
              </ElCard>
            </div>
          </ElTabPane>
        </ElTabs>
      </ElCard>
    </template>

    <!-- 核对弹窗：患者反馈内容/附件、提交时间（只读）、核对结果、核对意见 [批注 10] -->
    <ElDialog v-model="checkVisible" title="核对随访任务" width="560px" destroy-on-close>
      <ElDescriptions v-if="checkTask" :column="1" border class="mb-4" size="small">
        <ElDescriptionsItem label="患者反馈内容">
          {{ checkTask.feedback || '—' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="附件">{{
          checkTask.feedbackAttachment || '—'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="提交时间（只读）">
          {{ checkTask.feedbackAt || '—' }}
        </ElDescriptionsItem>
      </ElDescriptions>
      <ElForm ref="checkFormRef" :model="checkForm" :rules="checkRules" label-width="96px">
        <ElFormItem label="核对结果" prop="result">
          <ElRadioGroup v-model="checkForm.result">
            <ElRadio value="通过">通过</ElRadio>
            <ElRadio value="要求补充">要求补充</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="核对意见" prop="note">
          <ElInput
            v-model="checkForm.note"
            type="textarea"
            :rows="3"
            :placeholder="checkForm.result === '要求补充' ? '要求补充时必填' : '可补充核对说明'"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="checkVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="checking" @click="submitCheck">保存核对结果</ElButton>
      </template>
    </ElDialog>

    <!-- 人工随访弹窗 [批注 10] -->
    <ElDialog v-model="contactVisible" title="人工随访" width="560px" destroy-on-close>
      <ElForm ref="contactFormRef" :model="contactForm" :rules="contactRules" label-width="96px">
        <ElFormItem label="随访时间" prop="contactAt">
          <ElDatePicker
            v-model="contactForm.contactAt"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm"
            placeholder="选择随访时间"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="随访方式" prop="contactWay">
          <ElSelect v-model="contactForm.contactWay" class="w-full">
            <ElOption label="电话" value="电话" />
            <ElOption label="门诊" value="门诊" />
            <ElOption label="其他" value="其他" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="联系结果" prop="contactResult">
          <ElRadioGroup v-model="contactForm.contactResult">
            <ElRadio value="已联系">已联系</ElRadio>
            <ElRadio value="未联系上">未联系上</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="随访记录" prop="record">
          <ElInput
            v-model="contactForm.record"
            type="textarea"
            :rows="3"
            placeholder="填写随访记录；不能仅记录电话就默认任务完成"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="contactVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="contacting" @click="submitContact"
          >保存随访记录</ElButton
        >
      </template>
    </ElDialog>

    <!-- 添加计划任务弹窗（草稿计划） -->
    <ElDialog v-model="taskDialogVisible" title="添加计划任务" width="560px" destroy-on-close>
      <ElForm ref="taskFormRef" :model="taskForm" :rules="taskRules" label-width="110px">
        <ElFormItem label="任务名称" prop="title">
          <ElInput v-model="taskForm.title" placeholder="例如：第 4 周肝功能复查" />
        </ElFormItem>
        <ElFormItem label="随访项目" prop="itemName">
          <ElInput v-model="taskForm.itemName" placeholder="例如：检验复查" />
        </ElFormItem>
        <ElFormItem label="计划执行时间" prop="executeAt">
          <ElDatePicker
            v-model="taskForm.executeAt"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm"
            placeholder="选择计划执行时间"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="执行要求" prop="requirement">
          <ElInput v-model="taskForm.requirement" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="完成方式" prop="completeWay">
          <ElSelect v-model="taskForm.completeWay" class="w-full">
            <ElOption label="填写反馈" value="填写反馈" />
            <ElOption label="上传报告" value="上传报告" />
            <ElOption label="医护记录" value="医护记录" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="taskDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="savingTask" @click="submitPlanTask">保存任务</ElButton>
      </template>
    </ElDialog>

    <!-- 模板新增 / 编辑弹窗 [批注 10] -->
    <ElDialog
      v-model="templateDialogVisible"
      :title="templateForm.id ? '编辑模板' : '新增模板'"
      width="600px"
      destroy-on-close
    >
      <ElForm
        ref="templateFormRef"
        :model="templateForm"
        :rules="templateRules"
        label-width="110px"
      >
        <ElFormItem label="模板名称" prop="name">
          <ElInput v-model="templateForm.name" />
        </ElFormItem>
        <ElFormItem label="适用阶段" prop="stage">
          <ElSelect v-model="templateForm.stage" class="w-full">
            <ElOption label="治疗前" value="治疗前" />
            <ElOption label="治疗中" value="治疗中" />
            <ElOption label="诊断后" value="诊断后" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="任务项目" prop="itemsText">
          <ElInput
            v-model="templateForm.itemsText"
            type="textarea"
            :rows="3"
            placeholder="每行一个任务项目"
          />
        </ElFormItem>
        <ElFormItem label="相对时点" prop="timePoints">
          <ElInput
            v-model="templateForm.timePoints"
            placeholder="例如：相对时点：治疗后 1/2/4 周"
          />
        </ElFormItem>
        <ElFormItem label="执行要求" prop="requirement">
          <ElInput v-model="templateForm.requirement" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="完成方式" prop="completeWay">
          <ElSelect v-model="templateForm.completeWay" class="w-full">
            <ElOption label="填写反馈" value="填写反馈" />
            <ElOption label="上传报告" value="上传报告" />
            <ElOption label="医护记录" value="医护记录" />
            <ElOption label="填写反馈 / 上传报告" value="填写反馈 / 上传报告" />
            <ElOption label="填写反馈 / 医护记录" value="填写反馈 / 医护记录" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="templateDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="savingTemplate" @click="submitTemplate">
          {{ templateForm.id ? '保存' : '存为草稿' }}
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElCard,
    ElTag,
    ElIcon,
    ElMessage,
    ElMessageBox,
    ElTabPane,
    ElTabs,
    ElDialog,
    ElDescriptions,
    ElDescriptionsItem,
    ElForm,
    ElFormItem,
    ElInput,
    ElSelect,
    ElOption,
    ElRadioGroup,
    ElRadio,
    ElDatePicker
  } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { useRoute } from 'vue-router'
  import { useUserStore } from '@/store/modules/user'
  import {
    fetchGetFollowupPlans,
    fetchGetFollowupPlanById,
    fetchSaveFollowupPlan,
    fetchPublishFollowupPlan,
    fetchCancelFollowupPlan,
    fetchGetFollowupTasksByPlan,
    fetchSaveFollowupTask,
    fetchCancelFollowupTask,
    fetchCheckFollowupTask,
    fetchManualFollowup,
    fetchGetFollowupTemplates,
    fetchSaveFollowupTemplate,
    fetchPublishFollowupTemplate,
    type FollowupPlanWithProgress
  } from '@/mock/dli/blueprint/api'
  import type {
    FollowupPlan,
    FollowupPlanSource,
    FollowupPlanStatus,
    FollowupStatus,
    FollowupTask,
    FollowupTemplate
  } from '@/mock/dli/blueprint/types'
  import type { ColumnOption } from '@/types/component'

  defineOptions({ name: 'DliFollowup' })

  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()

  /** 医生确认发布；助理／护士可核对、人工随访，不能代医生发布 [批注 10] */
  const isDoctor = computed(() => (userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR') === 'R_DOCTOR')
  const canAssist = computed(() =>
    ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  )
  const operatorName = computed(() => {
    const info = userStore.getUserInfo as { userName?: string; username?: string }
    return info.userName ?? info.username ?? '当前医护'
  })

  /** 外部进入来源（患者详情 / 预警），返回原入口 [批注 10] */
  const fromExternal = computed(
    () => typeof route.query.patientId === 'string' && !!route.query.patientId
  )

  const PLAN_STATUS_OPTIONS: FollowupPlanStatus[] = ['草稿', '已发布', '已完成', '已取消']
  const PLAN_STATUS_TAG: Record<FollowupPlanStatus, 'info' | 'success' | 'primary' | 'danger'> = {
    草稿: 'info',
    已发布: 'success',
    已完成: 'primary',
    已取消: 'danger'
  }
  const TASK_STATUS_TAG: Record<
    FollowupStatus,
    'primary' | 'warning' | 'danger' | 'success' | 'info'
  > = {
    待完成: 'primary',
    已提交待核对: 'warning',
    待补充: 'danger',
    已完成: 'success',
    已取消: 'info'
  }
  const TEMPLATE_STATUS_TAG: Record<FollowupTemplate['status'], 'info' | 'success' | 'danger'> = {
    草稿: 'info',
    已发布: 'success',
    已停用: 'danger'
  }

  /* ==================== 列表模式 ==================== */
  const activeTab = ref('plans')
  const viewMode = ref<'list' | 'plan'>('list')
  const planMode = ref<'create' | 'view' | 'edit'>('view')

  /** 计划筛选 [批注 10] */
  const planSearchItems = [
    {
      key: 'patientId',
      label: '患者编号',
      type: 'input',
      placeholder: '系统患者编号 / 研究受试者编号',
      // placeholder 需要约 196px 文字宽，默认 195px 会截断，单独放宽
      width: 220,
      span: 6
    },
    {
      key: 'doctor',
      label: '负责医生',
      type: 'input',
      placeholder: '负责医生',
      span: 6
    },
    {
      key: 'status',
      label: '计划状态',
      type: 'select',
      placeholder: '全部状态',
      options: PLAN_STATUS_OPTIONS.map((item) => ({ label: item, value: item }))
    },
    {
      key: 'dateRange',
      label: '日期范围',
      type: 'daterange',
      props: { type: 'daterange', 'value-format': 'YYYY-MM-DD' },
      span: 6
    },
    {
      key: 'hasOverdue',
      label: '含逾期任务',
      type: 'select',
      placeholder: '不限',
      options: [
        { label: '仅含逾期', value: '1' },
        { label: '不含', value: '0' }
      ]
    },
    {
      key: 'hasPendingCheck',
      label: '含待核对',
      type: 'select',
      placeholder: '不限',
      options: [
        { label: '仅含待核对', value: '1' },
        { label: '不含', value: '0' }
      ]
    }
  ]

  const planSearchParams = reactive({
    patientId: '',
    doctor: '',
    status: '' as FollowupPlanStatus | '',
    dateRange: [] as string[],
    hasOverdue: '',
    hasPendingCheck: ''
  })

  const planList = ref<FollowupPlanWithProgress[]>([])
  const planLoading = ref(false)

  async function loadPlans() {
    planLoading.value = true
    try {
      planList.value = await fetchGetFollowupPlans({
        patientId: planSearchParams.patientId,
        doctor: planSearchParams.doctor,
        status: planSearchParams.status,
        dateRange: planSearchParams.dateRange,
        hasOverdue: planSearchParams.hasOverdue === '1',
        hasPendingCheck: planSearchParams.hasPendingCheck === '1'
      })
    } finally {
      planLoading.value = false
    }
  }

  function resetPlanSearchParams() {
    planSearchParams.patientId = ''
    planSearchParams.doctor = ''
    planSearchParams.status = ''
    planSearchParams.dateRange = []
    planSearchParams.hasOverdue = ''
    planSearchParams.hasPendingCheck = ''
    void loadPlans()
  }

  /** 计划 8 列 [批注 10] */
  const planColumns: ColumnOption<FollowupPlanWithProgress>[] = [
    { prop: 'id', label: '计划编号', width: 110 },
    { prop: 'patientId', label: '患者编号', width: 140 },
    { prop: 'name', label: '计划名称', minWidth: 180, showOverflowTooltip: true },
    { prop: 'doctor', label: '负责医生', width: 100 },
    {
      prop: 'dateRange',
      label: '计划起止日期',
      width: 190,
      formatter: (row) => `${row.startDate} ~ ${row.endDate}`
    },
    {
      prop: 'status',
      label: '计划状态',
      width: 90,
      formatter: (row) =>
        h(ElTag, { effect: 'light', type: PLAN_STATUS_TAG[row.status] }, () => row.status)
    },
    {
      prop: 'progress',
      label: '任务完成情况',
      width: 120,
      align: 'center' as const,
      formatter: (row) => `${row.done} / ${row.total}`
    },
    {
      prop: 'operation',
      label: '操作',
      width: 150,
      fixed: 'right' as const,
      align: 'center' as const,
      formatter: (row) => {
        const btns: ReturnType<typeof h>[] = [
          h(
            ElButton,
            { link: true, type: 'primary', onClick: () => openPlanPage('view', row.id) },
            () => '查看'
          )
        ]
        if (row.status === '草稿') {
          btns.push(
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => openPlanPage('edit', row.id) },
              () => '编辑'
            )
          )
        }
        // 取消计划须确认并停后续提醒，历史版本保留 [批注 10]
        if (isDoctor.value && (row.status === '草稿' || row.status === '已发布')) {
          btns.push(
            h(
              ElButton,
              { link: true, type: 'danger', onClick: () => cancelPlan(row) },
              () => '取消'
            )
          )
        }
        return h('div', { class: 'flex-c justify-center gap-1' }, btns)
      }
    }
  ]

  /** 取消计划（列表入口） [批注 10] */
  async function cancelPlan(row: FollowupPlanWithProgress) {
    const ok = await ElMessageBox.confirm(
      `取消计划「${row.name}」将停止后续提醒，历史版本保留。是否确认？`,
      '取消计划',
      { type: 'warning', confirmButtonText: '确认取消', cancelButtonText: '返回' }
    )
      .then(() => true)
      .catch(() => false)
    if (!ok) return
    try {
      await fetchCancelFollowupPlan(row.id, operatorName.value)
      ElMessage.success('计划已取消，已停止后续提醒')
      await loadPlans()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '取消失败')
    }
  }

  /* ==================== 计划页面（三态共用） [批注 10] ==================== */
  const planFormRef = ref<FormInstance>()
  const activePlan = ref<FollowupPlan>()
  const planTasks = ref<FollowupTask[]>([])
  const savingPlan = ref(false)
  const publishingPlan = ref(false)
  const planForm = reactive({
    id: '',
    patientId: '',
    name: '',
    doctor: '',
    dateRange: [] as string[],
    source: '医生创建' as FollowupPlanSource,
    templateId: ''
  })
  const planRules: FormRules = {
    patientId: [{ required: true, message: '请输入患者编号', trigger: 'blur' }],
    name: [{ required: true, message: '请输入计划名称', trigger: 'blur' }],
    doctor: [{ required: true, message: '请输入负责医生', trigger: 'blur' }],
    dateRange: [{ required: true, message: '请选择计划起止日期', trigger: 'change' }]
  }

  function openPlanPage(mode: 'create' | 'view' | 'edit', planId = '') {
    planMode.value = mode
    viewMode.value = 'plan'
    if (mode === 'create') {
      planForm.id = ''
      planForm.patientId = typeof route.query.patientId === 'string' ? route.query.patientId : ''
      planForm.name = ''
      planForm.doctor = operatorName.value
      planForm.dateRange = []
      planForm.source = '医生创建'
      planForm.templateId = ''
      activePlan.value = undefined
      planTasks.value = []
    } else {
      void loadPlanDetail(planId)
    }
  }

  async function loadPlanDetail(planId: string) {
    const plan = await fetchGetFollowupPlanById(planId)
    if (!plan) {
      ElMessage.error('计划不存在')
      viewMode.value = 'list'
      return
    }
    activePlan.value = plan
    planForm.id = plan.id
    planForm.patientId = plan.patientId
    planForm.name = plan.name
    planForm.doctor = plan.doctor
    planForm.dateRange = [plan.startDate, plan.endDate]
    planForm.source = plan.source
    planForm.templateId = plan.templateId ?? ''
    planTasks.value = await fetchGetFollowupTasksByPlan(planId)
  }

  /** 返回原入口：外部进入（患者详情 / 预警）用路由回退，否则回随访列表 [批注 10] */
  function goBackFromPlan() {
    if (fromExternal.value) {
      void router.back()
      return
    }
    viewMode.value = 'list'
    void loadPlans()
  }

  async function submitPlan() {
    if (!planFormRef.value) return
    const valid = await planFormRef.value.validate().catch(() => false)
    if (!valid) return
    savingPlan.value = true
    try {
      const saved = await fetchSaveFollowupPlan({
        id: planForm.id || undefined,
        patientId: planForm.patientId.trim(),
        name: planForm.name.trim(),
        doctor: planForm.doctor.trim(),
        startDate: planForm.dateRange[0] as string,
        endDate: planForm.dateRange[1] as string,
        source: planForm.source,
        templateId: planForm.templateId || undefined
      })
      ElMessage.success('已存为草稿，医生确认发布后生成患者任务')
      planMode.value = 'edit'
      planForm.id = saved.id
      planForm.dateRange = [saved.startDate, saved.endDate]
      await loadPlanDetail(saved.id)
      await loadPlans()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      savingPlan.value = false
    }
  }

  async function publishPlan() {
    if (!planForm.id) return
    const ok = await ElMessageBox.confirm(
      '发布后将生成患者任务，同一任务在各入口引用。是否确认发布？',
      '医生确认发布',
      { type: 'info', confirmButtonText: '确认发布', cancelButtonText: '取消' }
    )
      .then(() => true)
      .catch(() => false)
    if (!ok) return
    publishingPlan.value = true
    try {
      await fetchPublishFollowupPlan(planForm.id, operatorName.value)
      ElMessage.success('计划已发布并生成患者任务')
      planMode.value = 'view'
      await loadPlanDetail(planForm.id)
      await loadPlans()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '发布失败')
    } finally {
      publishingPlan.value = false
    }
  }

  /** 计划任务表 8 列 [批注 10] */
  const planTaskColumns: ColumnOption<FollowupTask>[] = [
    { prop: 'title', label: '任务名称', minWidth: 150, showOverflowTooltip: true },
    { prop: 'itemName', label: '随访项目', width: 110, formatter: (row) => row.itemName || '—' },
    {
      prop: 'executeAt',
      label: '计划执行时间',
      width: 150,
      formatter: (row) => row.executeAt || row.dueDate
    },
    {
      prop: 'requirement',
      label: '执行要求',
      minWidth: 150,
      showOverflowTooltip: true,
      formatter: (row) => row.requirement || '—'
    },
    {
      prop: 'completeWay',
      label: '完成方式',
      width: 100,
      formatter: (row) => row.completeWay || '—'
    },
    {
      prop: 'status',
      label: '任务状态',
      width: 120,
      formatter: (row) =>
        h(ElTag, { effect: 'light', type: TASK_STATUS_TAG[row.status] }, () => row.status)
    },
    {
      prop: 'overdue',
      label: '逾期标识',
      width: 90,
      align: 'center' as const,
      formatter: (row) =>
        row.overdue
          ? h(ElTag, { effect: 'light', type: 'danger' }, () => '逾期')
          : h('span', { class: 'text-xs text-g-400' }, () => '—')
    },
    {
      prop: 'operation',
      label: '操作',
      width: 150,
      fixed: 'right' as const,
      align: 'center' as const,
      formatter: (row) => {
        const btns: ReturnType<typeof h>[] = []
        // 助理／护士可核对和人工随访 [批注 10]
        if (row.status === '已提交待核对' && canAssist.value) {
          btns.push(
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => openCheck(row) },
              () => '核对'
            )
          )
        }
        if ((row.status === '待完成' || row.status === '待补充') && canAssist.value) {
          btns.push(
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => openContact(row) },
              () => '人工随访'
            )
          )
        }
        if (row.status !== '已取消' && row.status !== '已完成' && planMode.value === 'edit') {
          btns.push(
            h(
              ElButton,
              { link: true, type: 'danger', onClick: () => cancelPlanTask(row) },
              () => '取消任务'
            )
          )
        }
        if (!btns.length) return h('span', { class: 'text-xs text-g-500' }, () => '—')
        return h('div', { class: 'flex-c justify-center gap-1' }, btns)
      }
    }
  ]

  /* ---------------- 核对弹窗 [批注 10] ---------------- */
  const checkVisible = ref(false)
  const checking = ref(false)
  const checkTask = ref<FollowupTask>()
  const checkFormRef = ref<FormInstance>()
  const checkForm = reactive({ result: '通过' as '通过' | '要求补充', note: '' })
  const checkRules: FormRules = {
    note: [
      {
        validator: (_rule, value: string, callback) => {
          if (checkForm.result === '要求补充' && !(value ?? '').trim()) {
            callback(new Error('要求补充时核对意见必填'))
          } else callback()
        },
        trigger: 'blur'
      }
    ]
  }

  function openCheck(row: FollowupTask) {
    checkTask.value = row
    checkForm.result = '通过'
    checkForm.note = ''
    checkVisible.value = true
  }

  async function submitCheck() {
    if (!checkFormRef.value || !checkTask.value) return
    const valid = await checkFormRef.value.validate().catch(() => false)
    if (!valid) return
    checking.value = true
    try {
      await fetchCheckFollowupTask(checkTask.value.id, {
        result: checkForm.result,
        note: checkForm.note,
        operator: operatorName.value
      })
      ElMessage.success(`核对完成：${checkForm.result}`)
      checkVisible.value = false
      await loadPlanDetail(planForm.id)
      await loadPlans()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '核对失败')
    } finally {
      checking.value = false
    }
  }

  /* ---------------- 人工随访弹窗 [批注 10] ---------------- */
  const contactVisible = ref(false)
  const contacting = ref(false)
  const contactTask = ref<FollowupTask>()
  const contactFormRef = ref<FormInstance>()
  const contactForm = reactive({
    contactAt: '',
    contactWay: '电话',
    contactResult: '已联系' as '已联系' | '未联系上',
    record: ''
  })
  const contactRules: FormRules = {
    contactAt: [{ required: true, message: '请选择随访时间', trigger: 'change' }],
    contactWay: [{ required: true, message: '请选择随访方式', trigger: 'change' }],
    record: [{ required: true, message: '请填写随访记录', trigger: 'blur' }]
  }

  function openContact(row: FollowupTask) {
    contactTask.value = row
    contactForm.contactAt = ''
    contactForm.contactWay = '电话'
    contactForm.contactResult = '已联系'
    contactForm.record = ''
    contactVisible.value = true
  }

  async function submitContact() {
    if (!contactFormRef.value || !contactTask.value) return
    const valid = await contactFormRef.value.validate().catch(() => false)
    if (!valid) return
    contacting.value = true
    try {
      await fetchManualFollowup(contactTask.value.id, {
        contactAt: contactForm.contactAt,
        contactWay: contactForm.contactWay,
        contactResult: contactForm.contactResult,
        record: contactForm.record,
        operator: operatorName.value
      })
      ElMessage.success('随访记录已保存，任务状态已更新')
      contactVisible.value = false
      await loadPlanDetail(planForm.id)
      await loadPlans()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      contacting.value = false
    }
  }

  /* ---------------- 添加计划任务（草稿） ---------------- */
  const taskDialogVisible = ref(false)
  const savingTask = ref(false)
  const taskFormRef = ref<FormInstance>()
  const taskForm = reactive({
    title: '',
    itemName: '',
    executeAt: '',
    requirement: '',
    completeWay: '填写反馈'
  })
  const taskRules: FormRules = {
    title: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
    itemName: [{ required: true, message: '请输入随访项目', trigger: 'blur' }],
    executeAt: [{ required: true, message: '请选择计划执行时间', trigger: 'change' }],
    requirement: [{ required: true, message: '请输入执行要求', trigger: 'blur' }]
  }

  function openTaskDialog() {
    taskForm.title = ''
    taskForm.itemName = ''
    taskForm.executeAt = ''
    taskForm.requirement = ''
    taskForm.completeWay = '填写反馈'
    taskDialogVisible.value = true
  }

  async function submitPlanTask() {
    if (!taskFormRef.value || !planForm.id) return
    const valid = await taskFormRef.value.validate().catch(() => false)
    if (!valid) return
    savingTask.value = true
    try {
      await fetchSaveFollowupTask({
        planId: planForm.id,
        patientId: planForm.patientId,
        title: taskForm.title.trim(),
        type: '人工随访',
        dueDate: taskForm.executeAt.slice(0, 10)
      })
      ElMessage.success('任务已加入计划')
      taskDialogVisible.value = false
      await loadPlanDetail(planForm.id)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      savingTask.value = false
    }
  }

  async function cancelPlanTask(row: FollowupTask) {
    const ok = await ElMessageBox.confirm(
      `确定取消任务「${row.title}」？变更将留痕。`,
      '取消任务',
      { type: 'warning', confirmButtonText: '确认取消', cancelButtonText: '返回' }
    )
      .then(() => true)
      .catch(() => false)
    if (!ok) return
    await fetchCancelFollowupTask(row.id)
    ElMessage.success('任务已取消，变更已留痕')
    await loadPlanDetail(planForm.id)
    await loadPlans()
  }

  /* ==================== 随访模板 [批注 10] ==================== */
  const templates = ref<FollowupTemplate[]>([])
  const templateLoading = ref(false)
  const templateDialogVisible = ref(false)
  const savingTemplate = ref(false)
  const templateFormRef = ref<FormInstance>()
  const templateForm = reactive({
    id: '',
    name: '',
    stage: '治疗中' as FollowupTemplate['stage'],
    itemsText: '',
    timePoints: '',
    requirement: '',
    completeWay: '填写反馈'
  })
  const templateRules: FormRules = {
    name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
    stage: [{ required: true, message: '请选择适用阶段', trigger: 'change' }],
    itemsText: [{ required: true, message: '请输入任务项目', trigger: 'blur' }],
    timePoints: [{ required: true, message: '请输入相对时点', trigger: 'blur' }],
    requirement: [{ required: true, message: '请输入执行要求', trigger: 'blur' }],
    completeWay: [{ required: true, message: '请选择完成方式', trigger: 'change' }]
  }

  async function loadTemplates() {
    templateLoading.value = true
    try {
      templates.value = await fetchGetFollowupTemplates()
    } finally {
      templateLoading.value = false
    }
  }

  function openTemplateDialog(row?: FollowupTemplate) {
    templateForm.id = row?.id ?? ''
    templateForm.name = row?.name ?? ''
    templateForm.stage = row?.stage ?? '治疗中'
    templateForm.itemsText = row?.items.join('\n') ?? ''
    templateForm.timePoints = row?.timePoints ?? ''
    templateForm.requirement = row?.requirement ?? ''
    templateForm.completeWay = row?.completeWay ?? '填写反馈'
    templateDialogVisible.value = true
  }

  async function submitTemplate() {
    if (!templateFormRef.value) return
    const valid = await templateFormRef.value.validate().catch(() => false)
    if (!valid) return
    savingTemplate.value = true
    try {
      await fetchSaveFollowupTemplate({
        id: templateForm.id || undefined,
        name: templateForm.name.trim(),
        stage: templateForm.stage,
        version: templateForm.id
          ? (templates.value.find((t) => t.id === templateForm.id)?.version ?? 'V1.0')
          : 'V1.0（草稿）',
        status: templateForm.id
          ? (templates.value.find((t) => t.id === templateForm.id)?.status ?? '草稿')
          : '草稿',
        items: templateForm.itemsText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        timePoints: templateForm.timePoints.trim(),
        requirement: templateForm.requirement.trim(),
        completeWay: templateForm.completeWay,
        operator: operatorName.value
      })
      ElMessage.success(templateForm.id ? '模板已保存' : '模板已存为草稿，获授权医生确认版本后发布')
      templateDialogVisible.value = false
      await loadTemplates()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      savingTemplate.value = false
    }
  }

  async function publishTemplate(row: FollowupTemplate) {
    try {
      await fetchPublishFollowupTemplate(row.id, operatorName.value)
      ElMessage.success('模板已发布；更新模板不覆盖已发布计划')
      await loadTemplates()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '发布失败')
    }
  }

  /** 模板 5 列 [批注 10] */
  const templateColumns: ColumnOption<FollowupTemplate>[] = [
    { prop: 'name', label: '模板名称', minWidth: 200, showOverflowTooltip: true },
    { prop: 'stage', label: '适用阶段', width: 100 },
    { prop: 'version', label: '模板版本', width: 110 },
    {
      prop: 'status',
      label: '模板状态',
      width: 100,
      formatter: (row) =>
        h(ElTag, { effect: 'light', type: TEMPLATE_STATUS_TAG[row.status] }, () => row.status)
    },
    { prop: 'updatedAt', label: '最近更新时间', width: 170 },
    {
      prop: 'operation',
      label: '操作',
      width: 130,
      fixed: 'right' as const,
      align: 'center' as const,
      formatter: (row) =>
        h('div', { class: 'flex-c justify-center gap-1' }, [
          h(
            ElButton,
            { link: true, type: 'primary', onClick: () => openTemplateDialog(row) },
            () => '编辑'
          ),
          ...(isDoctor.value && row.status === '草稿'
            ? [
                h(
                  ElButton,
                  { link: true, type: 'success', onClick: () => publishTemplate(row) },
                  () => '发布'
                )
              ]
            : [])
        ])
    }
  ]

  /** 外部带入患者编号：预填患者筛选 [批注 10] */
  onMounted(() => {
    if (typeof route.query.patientId === 'string' && route.query.patientId) {
      planSearchParams.patientId = route.query.patientId
    }
    void loadPlans()
    void loadTemplates()
  })
</script>
