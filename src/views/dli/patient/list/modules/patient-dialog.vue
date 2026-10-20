<!-- 患者新增 / 编辑弹窗 -->
<template>
  <ElDialog
    v-model="dialogVisible"
    :title="dialogType === 'add' ? '新增患者' : '编辑患者'"
    width="580px"
    align-center
  >
    <ElForm ref="formRef" :model="formData" :rules="rules" label-width="100px">
      <ElFormItem label="姓名" prop="name">
        <ElInput v-model="formData.name" placeholder="请输入患者姓名（脱敏）" />
      </ElFormItem>

      <ElRow :gutter="12">
        <ElCol :span="12">
          <ElFormItem label="性别" prop="sex">
            <ElRadioGroup v-model="formData.sex">
              <ElRadio value="male">男</ElRadio>
              <ElRadio value="female">女</ElRadio>
            </ElRadioGroup>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="年龄" prop="age">
            <ElInputNumber v-model="formData.age" :min="0" :max="120" class="!w-full" />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElFormItem label="所属中心" prop="center">
        <ElInput v-model="formData.center" placeholder="请输入所属中心" />
      </ElFormItem>

      <ElRow :gutter="12">
        <ElCol :span="12">
          <ElFormItem label="入组入口" prop="entryType">
            <ElSelect v-model="formData.entryType" class="!w-full" placeholder="请选择入组入口">
              <ElOption
                v-for="option in entryTypeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </ElSelect>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="入组分组" prop="groupType">
            <ElSelect v-model="formData.groupType" class="!w-full" placeholder="请选择入组分组">
              <ElOption
                v-for="option in groupOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </ElSelect>
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="12">
        <ElCol :span="12">
          <ElFormItem label="用药状态" prop="medStatus">
            <ElSelect v-model="formData.medStatus" class="!w-full" placeholder="请选择用药状态">
              <ElOption
                v-for="option in medStatusOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </ElSelect>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="风险分层" prop="riskLevel">
            <ElSelect v-model="formData.riskLevel" class="!w-full" placeholder="请选择风险分层">
              <ElOption
                v-for="option in riskLevelOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </ElSelect>
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="12">
        <ElCol :span="12">
          <ElFormItem label="知情同意" prop="consentStatus">
            <ElSelect
              v-model="formData.consentStatus"
              class="!w-full"
              placeholder="请选择知情同意状态"
            >
              <ElOption
                v-for="option in consentOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </ElSelect>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="主管医生" prop="doctor">
            <ElInput v-model="formData.doctor" placeholder="请输入主管医生" />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <p v-if="formData.entryType === 'diagnosed'" class="ml-[100px] text-xs text-g-500">
        已确诊 DLI 患者建档后直接进入诊断后管理，无需完成治疗前、治疗中阶段。
      </p>
    </ElForm>

    <template #footer>
      <div class="flex justify-end gap-2">
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitLoading" @click="handleSubmit">提交</ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { DliPatient } from '@/mock/dli/types'
  import { fetchSavePatient } from '@/mock/dli/api'
  import {
    CONSENT_STATUS_CONFIG,
    ENTRY_TYPE_CONFIG,
    GROUP_TYPE_CONFIG,
    MED_STATUS_CONFIG,
    RISK_LEVEL_CONFIG
  } from '@/views/dli/patient/constants'
  import { DialogType } from '@/types'
  import type { FormInstance, FormRules } from 'element-plus'

  defineOptions({ name: 'DliPatientDialog' })

  interface Props {
    modelValue: boolean
    type: DialogType
    patientData?: Partial<DliPatient>
  }

  interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'submit', form: Partial<DliPatient>): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 对话框显示控制
  const dialogVisible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const dialogType = computed(() => props.type)

  // 表单实例
  const formRef = ref<FormInstance>()

  // 提交加载状态
  const submitLoading = ref(false)

  // 表单数据
  const formData = reactive({
    id: undefined as string | undefined,
    name: '',
    sex: 'male' as DliPatient['sex'],
    age: 50,
    center: '',
    entryType: 'premed' as DliPatient['entryType'],
    groupType: 'ai' as DliPatient['groupType'],
    medStatus: 'before' as DliPatient['medStatus'],
    riskLevel: 'L3' as DliPatient['riskLevel'],
    consentStatus: 'unsigned' as DliPatient['consentStatus'],
    doctor: ''
  })

  /**
   * 由枚举配置生成下拉选项
   */
  const toOptions = (config: Record<string, { label: string }>) =>
    Object.entries(config).map(([value, item]) => ({ label: item.label, value }))

  const riskLevelOptions = computed(() => toOptions(RISK_LEVEL_CONFIG))
  const medStatusOptions = computed(() => toOptions(MED_STATUS_CONFIG))
  const groupOptions = computed(() => toOptions(GROUP_TYPE_CONFIG))
  const consentOptions = computed(() => toOptions(CONSENT_STATUS_CONFIG))
  const entryTypeOptions = computed(() => toOptions(ENTRY_TYPE_CONFIG))

  // 表单验证规则
  const rules: FormRules = {
    name: [{ required: true, message: '请输入患者姓名', trigger: 'blur' }],
    sex: [{ required: true, message: '请选择性别', trigger: 'change' }],
    age: [{ required: true, message: '请输入年龄', trigger: 'blur' }],
    center: [{ required: true, message: '请输入所属中心', trigger: 'blur' }],
    entryType: [{ required: true, message: '请选择入组入口', trigger: 'change' }],
    groupType: [{ required: true, message: '请选择入组分组', trigger: 'change' }],
    medStatus: [{ required: true, message: '请选择用药状态', trigger: 'change' }],
    riskLevel: [{ required: true, message: '请选择风险分层', trigger: 'change' }],
    consentStatus: [{ required: true, message: '请选择知情同意状态', trigger: 'change' }],
    doctor: [{ required: true, message: '请输入主管医生', trigger: 'blur' }]
  }

  /**
   * 初始化表单数据
   * 根据对话框类型（新增/编辑）填充表单
   */
  const initFormData = () => {
    const row = props.type === 'edit' ? props.patientData : undefined

    Object.assign(formData, {
      id: row?.id,
      name: row?.name ?? '',
      sex: row?.sex ?? 'male',
      age: row?.age ?? 50,
      center: row?.center ?? '',
      entryType: row?.entryType ?? 'premed',
      groupType: row?.groupType ?? 'ai',
      medStatus: row?.medStatus ?? 'before',
      riskLevel: row?.riskLevel ?? 'L3',
      consentStatus: row?.consentStatus ?? 'unsigned',
      doctor: row?.doctor ?? ''
    })
  }

  /**
   * 监听对话框打开，初始化表单并清除校验状态
   */
  watch(
    () => [props.modelValue, props.type, props.patientData],
    ([visible]) => {
      if (visible) {
        initFormData()
        nextTick(() => {
          formRef.value?.clearValidate()
        })
      }
    },
    { immediate: true }
  )

  /**
   * 提交表单
   * 校验通过后调用保存接口，成功关闭弹窗并通知父组件刷新
   */
  const handleSubmit = async () => {
    if (!formRef.value) return

    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    submitLoading.value = true
    try {
      const payload: Partial<DliPatient> = { ...formData }
      await fetchSavePatient(payload)
      ElMessage.success(dialogType.value === 'add' ? '新增患者成功' : '更新患者成功')
      dialogVisible.value = false
      emit('submit', payload)
    } finally {
      submitLoading.value = false
    }
  }
</script>
