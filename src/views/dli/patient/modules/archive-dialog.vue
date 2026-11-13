<!-- 患者建档 / 编辑基础资料 [批注 02]：新增与编辑共用同一个弹窗 -->
<template>
  <ElDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑基础资料' : '新增患者'"
    width="560px"
    destroy-on-close
    @update:model-value="close"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="110px">
      <ElFormItem label="患者编号">
        <ElInput :model-value="isEdit ? patientId : '保存后自动生成'" readonly disabled />
      </ElFormItem>
      <ElFormItem label="所属中心" prop="center">
        <ElSelect v-model="form.center" class="w-full" placeholder="请选择所属中心">
          <ElOption v-for="item in CENTER_OPTIONS" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="负责医生" prop="doctor">
        <ElSelect v-model="form.doctor" class="w-full" placeholder="请选择负责医生">
          <ElOption v-for="item in DOCTOR_OPTIONS" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="管理状态" prop="manageStatus">
        <ElSelect v-model="form.manageStatus" class="w-full">
          <ElOption v-for="item in MANAGE_STATUS_OPTIONS" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="初始入口" prop="initialEntry">
        <ElSelect v-model="form.initialEntry" class="w-full">
          <ElOption v-for="item in INITIAL_ENTRY_OPTIONS" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="当前阶段" prop="stage">
        <ElSelect v-model="form.stage" class="w-full">
          <ElOption v-for="item in STAGE_OPTIONS" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>
      <template v-if="form.initialEntry === '已确诊DLI'">
        <ElFormItem label="诊断日期" prop="diagnosisDate">
          <ElDatePicker
            v-model="form.diagnosisDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择诊断日期"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="诊断依据" prop="diagnosisBasis">
          <ElInput
            v-model="form.diagnosisBasis"
            type="textarea"
            :rows="2"
            placeholder="填写诊断说明；关联资料可在详情「检查资料」页签查看"
          />
        </ElFormItem>
      </template>
      <ElAlert
        v-if="!isDoctor"
        type="info"
        :closable="false"
        show-icon
        title="助理 / 护士录入的诊断与阶段需医生核对确认，不会直接成为已确认结论"
        class="mt-1"
      />
    </ElForm>

    <template #footer>
      <ElButton @click="close(false)">取消</ElButton>
      <ElButton type="primary" :loading="busy" @click="submit">
        {{ isEdit ? '保存修改' : '确认建档' }}
      </ElButton>
    </template>
  </ElDialog>
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
    ElSelect,
    type FormInstance
  } from 'element-plus'
  import { computed, reactive, ref, watch } from 'vue'
  import {
    CENTER_OPTIONS,
    DOCTOR_OPTIONS,
    INITIAL_ENTRY_OPTIONS,
    MANAGE_STATUS_OPTIONS,
    STAGE_OPTIONS,
    fetchCreatePatientV2,
    fetchGetPatientProfile,
    fetchUpdatePatientBasic,
    type ArchiveInput
  } from '@/mock/dli/patient-admin'
  import { fetchGetPatientById } from '@/mock/dli/api'
  import { useUserStore } from '@/store/modules/user'
  import type { InitialEntry, PatientStage, WebPatient } from '@/mock/dli/types'

  defineOptions({ name: 'PatientArchiveDialog' })

  const props = defineProps<{ modelValue: boolean; patientId?: string }>()
  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'saved', payload: { id: string; created: boolean }): void
  }>()

  const userStore = useUserStore()
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const isDoctor = computed(() => role.value === 'R_DOCTOR')
  const isEdit = computed(() => Boolean(props.patientId))
  const busy = ref(false)
  const formRef = ref<FormInstance>()

  const emptyForm = (): ArchiveInput => ({
    center: '',
    doctor: '',
    manageStatus: '待评估',
    initialEntry: '拟接受高危药物治疗',
    stage: '治疗前',
    diagnosisDate: '',
    diagnosisBasis: ''
  })
  const form = reactive<ArchiveInput>(emptyForm())

  const rules = {
    center: [{ required: true, message: '请选择所属中心', trigger: 'change' }],
    doctor: [{ required: true, message: '请选择负责医生', trigger: 'change' }],
    manageStatus: [{ required: true, message: '请选择管理状态', trigger: 'change' }],
    initialEntry: [{ required: true, message: '请选择初始入口', trigger: 'change' }],
    stage: [{ required: true, message: '请选择当前阶段', trigger: 'change' }]
  }

  watch(
    () => [props.modelValue, props.patientId],
    async () => {
      if (!props.modelValue) return
      Object.assign(form, emptyForm())
      formRef.value?.clearValidate()
      if (props.patientId) {
        const [patient, profile] = await Promise.all([
          fetchGetPatientById(props.patientId),
          fetchGetPatientProfile(props.patientId)
        ])
        form.center = patient.center
        form.doctor = patient.doctor
        form.manageStatus = patient.status
        form.initialEntry = profile.initialEntry as InitialEntry
        form.diagnosisDate = profile.diagnosisDate
        form.diagnosisBasis = profile.diagnosisBasis
        // 阶段由「更新阶段」单独维护，基础资料编辑不带出阶段字段
        form.stage = profile.stage as PatientStage
      }
    },
    { immediate: true }
  )

  function close(value: boolean) {
    emit('update:modelValue', value)
  }

  async function submit() {
    const valid = await formRef.value
      ?.validate()
      .then(() => true)
      .catch(() => false)
    if (!valid) return
    busy.value = true
    try {
      let id = props.patientId ?? ''
      const created = !isEdit.value
      if (isEdit.value && props.patientId) {
        await fetchUpdatePatientBasic(props.patientId, { ...form })
      } else {
        const patient: WebPatient = await fetchCreatePatientV2({ ...form })
        id = patient.id
      }
      ElMessage.success(created ? `建档成功，患者编号 ${id}` : '基础资料已更新')
      emit('saved', { id, created })
      close(false)
    } catch (error) {
      // 失败保留填写内容，不关闭弹窗
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      busy.value = false
    }
  }
</script>
