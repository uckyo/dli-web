<!-- DLI 编码规则配置（批注 18）：规则表 5 列 + 编辑弹窗（7 段 + 编号预览）+ 校验并发布；平台/中心/课题组三路由复用 -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <ArtSearchBar
      v-model="ruleSearchParams"
      :items="ruleSearchItems"
      @search="handleRuleSearch"
      @reset="handleRuleReset"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader
        v-model:columns="ruleColumnChecks"
        :loading="ruleLoading"
        @refresh="refreshRuleData"
      >
        <template #left>
          <ElButton v-if="canMaintain" type="primary" @click="openRuleForm()">新增规则</ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="ruleLoading"
        :data="ruleData"
        :columns="ruleColumns"
        :pagination="rulePagination"
        @pagination:size-change="handleRuleSizeChange"
        @pagination:current-change="handleRuleCurrentChange"
      />
    </ElCard>

    <!-- 编辑弹窗：编号前缀/中心代码段/项目代码段/日期格式/流水号位数/流水重置周期/适用范围 + 编号预览 [批注 18] -->
    <ElDialog
      v-model="formVisible"
      :title="formModel.id ? '编辑编码规则（草稿）' : '新增编码规则'"
      width="620px"
      destroy-on-close
    >
      <ElForm ref="ruleFormRef" :model="formModel" :rules="ruleFormRules" label-width="110px">
        <ElFormItem label="编号类型" prop="target">
          <ElSelect v-model="formModel.target" class="w-full" :disabled="!!formModel.id">
            <ElOption v-for="item in TARGET_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
          <div class="w-full text-xs text-g-500">
            {{
              formModel.target === '系统患者编号'
                ? '建档时生成，系统内唯一'
                : '正式研究入组时生成，按项目唯一'
            }}
          </div>
        </ElFormItem>
        <ElFormItem label="编号前缀" prop="prefix">
          <ElInput v-model="formModel.prefix" placeholder="例如：DLI / RS" />
        </ElFormItem>
        <ElFormItem label="中心代码段" prop="centerCode">
          <ElInput v-model="formModel.centerCode" placeholder="例如：01" />
        </ElFormItem>
        <ElFormItem
          v-if="formModel.target === '研究受试者编号'"
          label="项目代码段"
          prop="projectCode"
        >
          <ElInput v-model="formModel.projectCode" placeholder="例如：R01（按项目唯一）" />
        </ElFormItem>
        <ElFormItem v-else label="项目代码段">
          <!-- 各编号类型仅开放适用段：系统患者编号不开放项目代码段 [批注 18] -->
          <ElInput disabled placeholder="系统患者编号不开放项目代码段" />
        </ElFormItem>
        <ElFormItem label="日期格式" prop="dateFormat">
          <ElSelect v-model="formModel.dateFormat" class="w-full">
            <ElOption label="YYYY（年）" value="YYYY" />
            <ElOption label="YYYYMM（年月）" value="YYYYMM" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="流水号位数" prop="serialDigits">
          <ElSelect v-model="formModel.serialDigits" class="w-full">
            <ElOption
              v-for="digits in DIGIT_OPTIONS"
              :key="digits"
              :label="`${digits} 位`"
              :value="digits"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="流水重置周期" prop="resetCycle">
          <ElSelect v-model="formModel.resetCycle" class="w-full">
            <ElOption v-for="item in CYCLE_OPTIONS" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="适用范围" prop="effectiveScope">
          <ElInput v-model="formModel.effectiveScope" placeholder="例如：全平台 / 研究项目 R01" />
        </ElFormItem>
        <!-- 编号预览：只读生成值 [批注 18] -->
        <ElFormItem label="编号预览">
          <ElTag v-if="previewSample" effect="plain" type="primary" size="large">
            {{ previewSample }}
          </ElTag>
          <span v-else class="text-xs text-g-500">填写前缀与各代码段后自动生成</span>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="formVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submitRuleForm">保存草稿</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElTag,
    ElMessage,
    ElMessageBox,
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElSelect,
    ElOption
  } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { useUserStore } from '@/store/modules/user'
  import {
    fetchGetCodeRules,
    fetchSaveCodeRule,
    fetchValidateAndPublishCodeRule,
    fetchToggleCodeRule,
    fetchPreviewCodeRule
  } from '@/mock/dli/blueprint/api'
  import type { CodeRule, CodeTarget, PublishStatus } from '@/mock/dli/blueprint/types'

  defineOptions({ name: 'DliCode' })

  const stripNote = (text: string) => text.replace(/\[(?:批注|源)[^\]]*\]/g, '').trim()

  const TARGET_OPTIONS: CodeTarget[] = ['系统患者编号', '研究受试者编号']
  const CYCLE_OPTIONS: CodeRule['resetCycle'][] = ['不重置', '按日', '按月', '按年']
  const DIGIT_OPTIONS = [2, 3, 4, 5, 6, 8]
  const STATUS_TAG: Record<PublishStatus, 'warning' | 'success' | 'info'> = {
    草稿: 'warning',
    已发布: 'success',
    已停用: 'info'
  }

  const userStore = useUserStore()
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  /** 中心／课题组使用适用规则，编号服务由平台管理员／系统管理员维护 [批注 18] */
  const canMaintain = computed(() => ['R_PLATFORM', 'R_SYS'].includes(role.value))
  const operatorName = computed(() => {
    const info = userStore.getUserInfo as { userName?: string; username?: string }
    return info?.userName ?? info?.username ?? '平台管理员'
  })

  /** 筛选：关键词 + 编号类型 + 规则状态 [批注 18] */
  const ruleSearchItems = [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: '规则编号 / 前缀 / 版本 / 适用范围',
      span: 6
    },
    {
      key: 'target',
      label: '编号类型',
      type: 'select',
      placeholder: '全部类型',
      options: TARGET_OPTIONS.map((item) => ({ label: item, value: item }))
    },
    {
      key: 'status',
      label: '规则状态',
      type: 'select',
      placeholder: '全部状态',
      options: (['草稿', '已发布', '已停用'] as PublishStatus[]).map((item) => ({
        label: item,
        value: item
      }))
    }
  ]

  const {
    columns: ruleColumns,
    columnChecks: ruleColumnChecks,
    data: ruleData,
    loading: ruleLoading,
    pagination: rulePagination,
    searchParams: ruleSearchParams,
    getData: getRuleData,
    resetSearchParams: resetRuleSearchParams,
    handleSizeChange: handleRuleSizeChange,
    handleCurrentChange: handleRuleCurrentChange,
    refreshData: refreshRuleData
  } = useTable({
    core: {
      apiFn: fetchGetCodeRules,
      apiParams: {
        current: 1,
        size: 10,
        keyword: '',
        target: '' as CodeTarget | '',
        status: '' as PublishStatus | ''
      },
      // 规则表 5 列：编号类型/适用范围/规则版本/规则状态/操作 [批注 18]
      columnsFactory: () => [
        { prop: 'target', label: '编号类型', width: 150 },
        {
          prop: 'effectiveScope',
          label: '适用范围',
          minWidth: 200,
          showOverflowTooltip: true
        },
        { prop: 'version', label: '规则版本', width: 130, align: 'center' as const },
        {
          prop: 'status',
          label: '规则状态',
          width: 110,
          align: 'center' as const,
          formatter: (row: CodeRule) =>
            h(ElTag, { effect: 'light', type: STATUS_TAG[row.status] }, () => row.status)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 190,
          fixed: 'right' as const,
          align: 'center' as const,
          formatter: (row: CodeRule) => {
            if (!canMaintain.value) return h('span', { class: 'text-xs text-g-400' }, () => '查看')
            const btns: ReturnType<typeof h>[] = []
            if (row.status === '草稿') {
              btns.push(
                h(
                  ElButton,
                  { link: true, type: 'primary', onClick: () => openRuleForm(row) },
                  () => '编辑'
                ),
                h(
                  ElButton,
                  { link: true, type: 'success', onClick: () => validateAndPublish(row) },
                  () => '校验并发布'
                )
              )
            }
            if (row.status === '已发布' || row.status === '已停用') {
              btns.push(
                h(
                  ElButton,
                  {
                    link: true,
                    type: row.status === '已停用' ? 'success' : 'danger',
                    onClick: () => toggleRule(row)
                  },
                  () => (row.status === '已停用' ? '启用' : '停用')
                )
              )
            }
            return h(
              'div',
              { class: 'flex-c justify-center gap-1' },
              btns.length ? btns : [h('span', { class: 'text-xs text-g-400' }, () => '—')]
            )
          }
        }
      ]
    }
  })

  function handleRuleSearch() {
    getRuleData()
  }

  function handleRuleReset() {
    resetRuleSearchParams()
  }

  /** 编辑弹窗：仅草稿可编辑；取消不改，保存形成草稿 [批注 18] */
  interface RuleFormModel {
    id: string
    target: CodeTarget
    prefix: string
    centerCode: string
    projectCode: string
    dateFormat: CodeRule['dateFormat']
    serialDigits: number
    resetCycle: CodeRule['resetCycle']
    effectiveScope: string
  }

  const formVisible = ref(false)
  const saving = ref(false)
  const ruleFormRef = ref<FormInstance>()
  const formModel = reactive<RuleFormModel>({
    id: '',
    target: '系统患者编号',
    prefix: '',
    centerCode: '',
    projectCode: '',
    dateFormat: 'YYYY',
    serialDigits: 4,
    resetCycle: '按年',
    effectiveScope: ''
  })
  const ruleFormRules: FormRules = {
    target: [{ required: true, message: '请选择编号类型', trigger: 'change' }],
    prefix: [
      {
        required: true,
        pattern: /^[A-Za-z0-9]{1,8}$/,
        message: '前缀须为 1~8 位字母或数字',
        trigger: 'blur'
      }
    ],
    centerCode: [{ required: true, message: '中心代码段不能为空', trigger: 'blur' }],
    projectCode: [
      {
        validator: (_rule, value: string, callback) => {
          if (formModel.target === '研究受试者编号' && !value?.trim())
            callback(new Error('研究受试者编号按项目唯一，必须填写项目代码段'))
          else callback()
        },
        trigger: 'blur'
      }
    ],
    effectiveScope: [{ required: true, message: '请填写适用范围', trigger: 'blur' }]
  }

  /** 编号预览：只读生成值，随表单联动 [批注 18] */
  const previewSample = ref('')
  watch(
    () => [
      formModel.prefix,
      formModel.centerCode,
      formModel.projectCode,
      formModel.dateFormat,
      formModel.serialDigits
    ],
    async () => {
      if (!formModel.prefix || !formModel.centerCode) {
        previewSample.value = ''
        return
      }
      previewSample.value = await fetchPreviewCodeRule({
        prefix: formModel.prefix.trim(),
        centerCode: formModel.centerCode.trim(),
        // 系统患者编号不开放项目代码段，预览同样忽略 [批注 18]
        projectCode: formModel.target === '研究受试者编号' ? formModel.projectCode.trim() : '',
        dateFormat: formModel.dateFormat,
        serialDigits: formModel.serialDigits
      })
    },
    { immediate: true }
  )

  function openRuleForm(row?: CodeRule) {
    formModel.id = row?.id ?? ''
    formModel.target = row?.target ?? '系统患者编号'
    formModel.prefix = row?.prefix ?? ''
    formModel.centerCode = row?.centerCode ?? ''
    formModel.projectCode = row?.projectCode ?? ''
    formModel.dateFormat = row?.dateFormat ?? 'YYYY'
    formModel.serialDigits = row?.serialDigits ?? 4
    formModel.resetCycle = row?.resetCycle ?? '按年'
    formModel.effectiveScope = row?.effectiveScope ?? ''
    formVisible.value = true
  }

  async function submitRuleForm() {
    if (!ruleFormRef.value) return
    const valid = await ruleFormRef.value.validate().catch(() => false)
    if (!valid) return
    saving.value = true
    try {
      const saved = await fetchSaveCodeRule({
        id: formModel.id || undefined,
        target: formModel.target,
        prefix: formModel.prefix.trim(),
        centerCode: formModel.centerCode.trim(),
        projectCode: formModel.target === '研究受试者编号' ? formModel.projectCode.trim() : '',
        dateFormat: formModel.dateFormat,
        serialDigits: formModel.serialDigits,
        resetCycle: formModel.resetCycle,
        effectiveScope: formModel.effectiveScope.trim(),
        operator: operatorName.value
      })
      ElMessage.success(`已保存草稿（${saved.id}），可在表内「校验并发布」`)
      formVisible.value = false
      await getRuleData()
    } catch (error) {
      ElMessage.error(error instanceof Error ? stripNote(error.message) : '保存失败')
    } finally {
      saving.value = false
    }
  }

  /** 校验并发布：检查格式和唯一性，失败显示原因并阻止发布；成功更新规则版本 [批注 18] */
  async function validateAndPublish(row: CodeRule) {
    const confirmed = await ElMessageBox.confirm(
      `对规则「${row.id}」（${row.target}）执行校验并发布？校验通过后更新规则版本，仅作用于后续新编号。`,
      '校验并发布',
      { type: 'warning', confirmButtonText: '开始校验并发布', cancelButtonText: '返回' }
    )
      .then(() => true)
      .catch(() => false)
    if (!confirmed) return
    try {
      const published = await fetchValidateAndPublishCodeRule(
        row.id,
        operatorName.value,
        role.value
      )
      ElMessage.success(
        `校验通过，规则已发布（${published.version}）；新版本只作用于新编号，不改历史关联`
      )
      await refreshRuleData()
    } catch (error) {
      // 校验失败显示原因并阻止发布 [批注 18]
      ElMessage.error({
        message: error instanceof Error ? stripNote(error.message) : '校验未通过',
        duration: 6000,
        showClose: true
      })
    }
  }

  /** 停用保留历史，历史编号关联不变 [批注 18] */
  async function toggleRule(row: CodeRule) {
    const stopping = row.status === '已发布'
    const confirmed = await ElMessageBox.confirm(
      stopping
        ? `停用规则「${row.id}」？停用保留历史，历史编号关联不变。`
        : `重新启用规则「${row.id}」？启用后仅作用于后续新编号。`,
      stopping ? '停用规则' : '启用规则',
      {
        type: 'warning',
        confirmButtonText: stopping ? '确认停用' : '确认启用',
        cancelButtonText: '返回'
      }
    )
      .then(() => true)
      .catch(() => false)
    if (!confirmed) return
    try {
      await fetchToggleCodeRule(row.id, operatorName.value, role.value)
      ElMessage.success(stopping ? '规则已停用，历史编号关联不变' : '规则已重新启用')
      await refreshRuleData()
    } catch (error) {
      ElMessage.error(error instanceof Error ? stripNote(error.message) : '操作失败')
    }
  }
</script>
