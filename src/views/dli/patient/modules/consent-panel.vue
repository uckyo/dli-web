<!-- 患者详情 → 知情同意 [批注 03/16]：发放、签署、核对、拒绝、撤回，按项目记录 -->
<template>
  <div class="dli-pane dli-own">
    <ElAlert
      v-if="focusProjectId"
      class="mb-3"
      type="info"
      :closable="false"
      show-icon
      :title="`已从研究入组带入项目：${focusProjectName}`"
    />
    <div class="mb-3 text-xs text-g-500">
      同意书按研究项目分别发放与核对；模板及版本取自已发布配置，签署不以普通勾选替代
    </div>

    <ArtTable :data="rows" :columns="columns" empty-text="暂无知情同意记录" />

    <!-- 发放 / 签署 / 拒绝 / 撤回 -->
    <ElDialog v-model="actionVisible" :title="dialogTitle" width="520px" destroy-on-close>
      <template v-if="activeRow">
        <ElForm label-width="110px">
          <ElFormItem label="研究项目">
            <ElInput :model-value="projectName(activeRow)" readonly disabled />
          </ElFormItem>
          <template v-if="dialogMode === '发放'">
            <ElAlert
              v-if="!publishedTemplates.length"
              class="mb-3"
              type="warning"
              :closable="false"
              show-icon
              title="该项目暂无生效模板，请先由平台管理员批准并发布"
            />
            <ElFormItem label="生效模板">
              <ElSelect v-model="form.templateId" class="w-full">
                <ElOption
                  v-for="item in publishedTemplates"
                  :key="item.id"
                  :label="`${item.name}（${item.version}）`"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="模板版本">
              <div class="flex-cb gap-2">
                <ElInput :model-value="selectedTemplate?.version ?? '—'" readonly disabled />
                <ElButton
                  link
                  type="primary"
                  :disabled="!selectedTemplate"
                  @click="openPreview(activeRow)"
                >
                  模板预览
                </ElButton>
              </div>
            </ElFormItem>
          </template>
          <template v-else-if="dialogMode === '签署'">
            <ElFormItem label="签署日期">
              <ElDatePicker
                v-model="form.signDate"
                type="date"
                value-format="YYYY-MM-DD"
                class="w-full"
              />
            </ElFormItem>
            <ElFormItem label="签署方式">
              <ElSelect v-model="form.method" class="w-full">
                <ElOption label="App签署" value="App签署" />
                <ElOption label="纸质签署" value="纸质签署" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="签署文件">
              <div class="flex-c gap-2">
                <ElUpload
                  :auto-upload="false"
                  :limit="1"
                  :show-file-list="false"
                  accept=".pdf,.jpg,.jpeg,.png"
                  :on-change="handleFileChange"
                >
                  <ElButton plain>选择文件</ElButton>
                </ElUpload>
                <span class="text-xs text-g-500">{{ form.fileName || '未选择文件' }}</span>
              </div>
            </ElFormItem>
          </template>
          <ElFormItem v-else-if="dialogMode === '拒绝'" label="拒绝说明">
            <ElInput v-model="form.note" type="textarea" :rows="2" placeholder="登记拒绝说明" />
          </ElFormItem>
          <ElFormItem v-else-if="dialogMode === '申请撤回'" label="撤回原因">
            <ElInput v-model="form.reason" type="textarea" :rows="2" placeholder="填写撤回原因" />
          </ElFormItem>
          <ElFormItem v-else-if="dialogMode === '完成撤回'" label="处理结果">
            <ElInput v-model="form.note" type="textarea" :rows="2" placeholder="记录医生处理结果" />
          </ElFormItem>
        </ElForm>
      </template>
      <template #footer>
        <ElButton @click="actionVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="busy" @click="submitAction">确认</ElButton>
      </template>
    </ElDialog>

    <!-- 核对签署：版本及核验结果 -->
    <ElDrawer v-model="checkVisible" title="核对签署" size="520px" append-to-body destroy-on-close>
      <template v-if="activeRow">
        <ElDescriptions :column="1" border class="mb-4">
          <ElDescriptionsItem label="研究项目">{{ projectName(activeRow) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="同意书名称">{{
            activeRow.consentTemplateName || '—'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="模板版本">{{
            activeRow.consentVersion || '—'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="签署方式">{{
            activeRow.consentMethod || '—'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="签署文件">{{
            activeRow.consentFileName || '—'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="签署日期">{{
            activeRow.consentDate || '—'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="签署核验结果">{{
            activeRow.consentCheckResult || '未核对'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="核对人">{{
            activeRow.consentCheckedBy || '—'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="核对日期">{{
            activeRow.consentCheckedAt || '—'
          }}</ElDescriptionsItem>
        </ElDescriptions>
        <ElForm label-width="110px">
          <ElFormItem label="核对结果">
            <ElRadioGroup v-model="form.result">
              <ElRadio value="通过">通过</ElRadio>
              <ElRadio value="需补充">需补充</ElRadio>
            </ElRadioGroup>
          </ElFormItem>
          <ElFormItem label="核对意见">
            <ElInput
              v-model="form.note"
              type="textarea"
              :rows="3"
              placeholder="需补充时请填写原因和补件要求"
            />
          </ElFormItem>
        </ElForm>
      </template>
      <template #footer>
        <div class="flex-c justify-end gap-2">
          <ElButton @click="checkVisible = false">取消</ElButton>
          <ElButton type="primary" :loading="busy" @click="submitCheck">保存核对结果</ElButton>
        </div>
      </template>
    </ElDrawer>
    <!-- 模板 / 签署原件受控预览（mock）：只展示文件信息，不展示真实文件内容 -->
    <ElDialog v-model="previewVisible" title="知情同意文件" width="560px" append-to-body>
      <ElDescriptions :column="1" border>
        <ElDescriptionsItem label="研究项目">{{
          previewRow ? projectName(previewRow) : '—'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="同意书名称">{{
          previewTemplate?.name || (previewRow ? consentName(previewRow) : '—')
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="模板版本">{{
          previewTemplate?.version || previewRow?.consentVersion || '—'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="关联研究项目">{{
          previewTemplate?.projectId || '通用模板'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="适用中心">{{
          previewTemplate?.center || '全部中心'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="模板文件">{{
          previewTemplate?.fileName || '—'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="模板状态">{{
          previewTemplate ? `${previewTemplate.status} / ${previewTemplate.approval}` : '—'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="发放时间">{{
          previewRow?.consentIssuedAt || '—'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="签署方式">{{
          previewRow?.consentMethod || '—'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="签署文件">{{
          previewRow?.consentFileName || '—'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="签署时间">{{
          previewRow?.consentDate || '—'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="知情同意状态">{{
          previewRow?.consentStatus || '—'
        }}</ElDescriptionsItem>
      </ElDescriptions>
      <p class="mt-3 text-xs leading-5 text-g-500">
        演示环境仅保存文件信息，不展示真实文件内容；已签署记录保留当时发放的模板版本，
        改模板只另存新版本，不回溯覆盖。
      </p>
      <template #footer>
        <ElButton type="primary" @click="previewVisible = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    ElAlert,
    ElButton,
    ElDatePicker,
    ElDescriptions,
    ElDescriptionsItem,
    ElDialog,
    ElDrawer,
    ElForm,
    ElFormItem,
    ElInput,
    ElMessage,
    ElMessageBox,
    ElOption,
    ElRadio,
    ElRadioGroup,
    ElSelect,
    ElTag,
    ElUpload
  } from 'element-plus'
  import { computed, reactive, ref, watch } from 'vue'
  import { PATIENTS } from '@/mock/dli/data'
  import { CONSENT_TEMPLATES } from '@/mock/dli/blueprint/data'
  import { fetchGetEffectiveConsentTemplates } from '@/mock/dli/blueprint/api'
  import type { ConsentTemplate } from '@/mock/dli/blueprint/types'
  import {
    fetchGetEnrollments,
    fetchSetConsent,
    findProject,
    type ConsentAction,
    type ConsentActionInput
  } from '@/mock/dli/patient-admin'
  import { useUserStore } from '@/store/modules/user'
  import type { ColumnOption } from '@/types/component'
  import type { ConsentSignMethod, ConsentStatus, PatientEnrollment } from '@/mock/dli/types'

  defineOptions({ name: 'PatientConsentPanel' })

  const props = defineProps<{ patientId: string; focusProjectId?: string }>()

  const userStore = useUserStore()
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const canManage = computed(() => ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role.value))
  const isDoctor = computed(() => role.value === 'R_DOCTOR')
  const rows = ref<PatientEnrollment[]>([])
  const busy = ref(false)
  const actionVisible = ref(false)
  const checkVisible = ref(false)
  const dialogMode = ref<ConsentAction | ''>('')
  const activeRow = ref<PatientEnrollment>()
  const previewVisible = ref(false)
  const previewRow = ref<PatientEnrollment>()
  const previewTemplate = computed(() => {
    const templateId =
      dialogMode.value === '发放' && actionVisible.value
        ? form.templateId
        : (previewRow.value?.consentTemplateId ?? '')
    return (
      CONSENT_TEMPLATES.find((item) => item.id === templateId) ??
      CONSENT_TEMPLATES.find((item) => item.version === previewRow.value?.consentVersion)
    )
  })
  const focusProjectName = computed(
    () => findProject(props.focusProjectId ?? '')?.name ?? props.focusProjectId ?? ''
  )
  const patientCenter = computed(
    () => PATIENTS.find((item) => item.id === props.patientId)?.center ?? ''
  )
  /** 发放时按「关联研究项目 + 患者所属中心」过滤生效模板（已发布且已批准）[批注 16] */
  const publishedTemplates = ref<ConsentTemplate[]>([])
  const selectedTemplate = computed(() =>
    publishedTemplates.value.find((item) => item.id === form.templateId)
  )

  const form = reactive({
    templateId: '',
    signDate: '',
    method: 'App签署' as ConsentSignMethod,
    fileName: '',
    note: '',
    reason: '',
    result: '通过' as '通过' | '需补充'
  })

  const STATUS_TAG: Record<ConsentStatus, 'success' | 'primary' | 'warning' | 'danger' | 'info'> = {
    未发放: 'info',
    待签署: 'warning',
    已签待核对: 'primary',
    核对通过: 'success',
    需补充: 'warning',
    已拒绝: 'danger',
    撤回处理中: 'warning',
    已撤回: 'info'
  }

  const DIALOG_TITLE: Record<ConsentAction, string> = {
    发放: '发放同意书',
    签署: '上传签署件',
    核对: '核对签署',
    拒绝: '登记拒绝',
    申请撤回: '申请撤回',
    完成撤回: '完成撤回处理'
  }
  const dialogTitle = computed(() =>
    dialogMode.value ? DIALOG_TITLE[dialogMode.value] : '知情同意操作'
  )

  function projectName(row: PatientEnrollment) {
    return findProject(row.projectId)?.name ?? row.projectId
  }

  function consentName(row: PatientEnrollment) {
    if (row.consentTemplateName) return row.consentTemplateName
    const template = CONSENT_TEMPLATES.find((item) => item.version === row.consentVersion)
    return template?.name ?? '—'
  }

  function tag(value: ConsentStatus) {
    return h(ElTag, { type: STATUS_TAG[value], effect: 'plain' }, () => value)
  }

  function actionButton(row: PatientEnrollment, action: ConsentAction, label: string) {
    return h(
      ElButton,
      { link: true, type: 'primary', onClick: () => openAction(row, action) },
      () => label
    )
  }

  const columns: ColumnOption<PatientEnrollment>[] = [
    {
      prop: 'projectId',
      label: '研究项目',
      minWidth: 250,
      formatter: (row: PatientEnrollment) => {
        const project = findProject(row.projectId)
        return h('div', { class: 'leading-5' }, [
          h('div', { class: 'text-g-900' }, project?.name ?? row.projectId),
          h('div', { class: 'text-xs text-g-500' }, row.projectId)
        ])
      }
    },
    {
      prop: 'consentTemplateName',
      label: '同意书名称',
      minWidth: 180,
      formatter: (row: PatientEnrollment) => h('span', {}, consentName(row))
    },
    {
      prop: 'consentVersion',
      label: '模板版本',
      width: 110,
      formatter: (row: PatientEnrollment) =>
        h('span', { class: row.consentVersion ? '' : 'text-g-400' }, row.consentVersion || '—')
    },
    {
      prop: 'consentIssuedAt',
      label: '发放时间',
      width: 120,
      formatter: (row: PatientEnrollment) =>
        h('span', { class: row.consentIssuedAt ? '' : 'text-g-400' }, row.consentIssuedAt || '—')
    },
    {
      prop: 'consentMethod',
      label: '签署方式',
      width: 120,
      formatter: (row: PatientEnrollment) =>
        h('span', { class: row.consentMethod ? '' : 'text-g-400' }, row.consentMethod || '—')
    },
    {
      prop: 'consentDate',
      label: '签署时间',
      width: 120,
      formatter: (row: PatientEnrollment) =>
        h('span', { class: row.consentDate ? '' : 'text-g-400' }, row.consentDate || '—')
    },
    {
      prop: 'consentStatus',
      label: '知情同意状态',
      width: 140,
      formatter: (row: PatientEnrollment) => tag(row.consentStatus)
    },
    {
      prop: 'operation',
      label: '操作',
      width: 260,
      fixed: 'right' as const,
      formatter: (row: PatientEnrollment) => {
        // 只读角色也能受控查看模板 / 签署件信息，不展示原件内容
        const buttons: Array<ReturnType<typeof h>> = [
          h(
            ElButton,
            { link: true, type: 'primary', onClick: () => openPreview(row) },
            () => '查看'
          )
        ]
        if (!canManage.value) return h('div', { class: 'flex-c gap-1' }, buttons)
        if (row.consentStatus === '未发放') {
          buttons.push(actionButton(row, '发放', '发放同意书'))
        } else if (row.consentStatus === '待签署') {
          buttons.push(actionButton(row, '签署', '上传签署件'))
          buttons.push(actionButton(row, '拒绝', '登记拒绝'))
        } else if (row.consentStatus === '已签待核对') {
          buttons.push(actionButton(row, '核对', '核对签署'))
          buttons.push(actionButton(row, '拒绝', '登记拒绝'))
        } else if (row.consentStatus === '核对通过') {
          buttons.push(actionButton(row, '申请撤回', '申请撤回'))
        } else if (row.consentStatus === '需补充') {
          buttons.push(actionButton(row, '签署', '上传补件'))
          buttons.push(actionButton(row, '发放', '重新发放'))
          buttons.push(actionButton(row, '拒绝', '登记拒绝'))
        } else if (row.consentStatus === '已拒绝') {
          buttons.push(actionButton(row, '发放', '重新发放'))
        } else if (row.consentStatus === '撤回处理中' && isDoctor.value) {
          buttons.push(actionButton(row, '完成撤回', '完成撤回'))
        } else {
          return h('span', { class: 'text-xs text-g-500' }, '按授权查看')
        }
        return h('div', { class: 'flex-c gap-1 flex-wrap' }, buttons)
      }
    }
  ]

  async function load() {
    if (!props.patientId) return
    const list = await fetchGetEnrollments(props.patientId)
    rows.value = props.focusProjectId
      ? [
          ...list.filter((item) => item.projectId === props.focusProjectId),
          ...list.filter((item) => item.projectId !== props.focusProjectId)
        ]
      : list
  }

  function resetForm() {
    form.templateId = ''
    form.signDate = new Date().toISOString().slice(0, 10)
    form.method = 'App签署'
    form.fileName = ''
    form.note = ''
    form.reason = ''
    form.result = '通过'
  }

  function openPreview(row?: PatientEnrollment) {
    previewRow.value = row
    previewVisible.value = true
  }

  async function openAction(row: PatientEnrollment, action: ConsentAction) {
    activeRow.value = row
    resetForm()
    form.method = row.consentMethod || 'App签署'
    dialogMode.value = action
    if (action === '核对') {
      checkVisible.value = true
      return
    }
    if (action === '发放') {
      publishedTemplates.value = await fetchGetEffectiveConsentTemplates(
        row.projectId,
        patientCenter.value
      )
      form.templateId =
        publishedTemplates.value.find((item) => item.id === row.consentTemplateId)?.id ??
        publishedTemplates.value[0]?.id ??
        ''
    }
    actionVisible.value = true
  }

  function handleFileChange(file: { name?: string }) {
    form.fileName = file.name ?? ''
  }

  function buildInput(): ConsentActionInput {
    return {
      templateId: form.templateId,
      signDate: form.signDate,
      method: form.method,
      fileName: form.fileName,
      note: form.note,
      reason: form.reason,
      result: form.result
    }
  }

  async function submitAction() {
    if (!activeRow.value || !dialogMode.value) return
    const action = dialogMode.value
    if (action === '发放' && !form.templateId) {
      ElMessage.warning('该项目暂无生效模板，请先由平台管理员批准并发布')
      return
    }
    if (action === '拒绝') {
      const ok = await ElMessageBox.confirm('确认登记受试者拒绝签署吗？', '登记拒绝', {
        type: 'warning'
      })
        .then(() => true)
        .catch(() => false)
      if (!ok) return
    }
    busy.value = true
    try {
      await fetchSetConsent(props.patientId, activeRow.value.id, action, role.value, buildInput())
      actionVisible.value = false
      await load()
      ElMessage.success(`${DIALOG_TITLE[action]}已保存`)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      busy.value = false
    }
  }

  async function submitCheck() {
    if (!activeRow.value) return
    if (form.result === '需补充' && !form.note.trim()) {
      ElMessage.warning('需补充时请填写核对意见')
      return
    }
    busy.value = true
    try {
      await fetchSetConsent(props.patientId, activeRow.value.id, '核对', role.value, {
        result: form.result,
        note: form.note
      })
      checkVisible.value = false
      await load()
      ElMessage.success('核对结果已保存')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      busy.value = false
    }
  }

  watch(
    () => [props.patientId, props.focusProjectId],
    () => void load(),
    { immediate: true }
  )
  defineExpose({ load })
</script>
