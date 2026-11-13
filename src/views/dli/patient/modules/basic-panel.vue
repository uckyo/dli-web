<!-- 患者详情 → 基础资料：展示 + 区域右上角「编辑基础资料」入口 [批注 02] -->
<template>
  <div class="dli-pane dli-own">
    <div class="mb-3 flex justify-end">
      <ElButton v-if="canManage" type="primary" plain @click="emit('edit')">
        编辑基础资料
      </ElButton>
    </div>
    <ElDescriptions :column="3" border size="small">
      <ElDescriptionsItem label="患者编号">{{ patient?.id ?? patientId }}</ElDescriptionsItem>
      <ElDescriptionsItem label="所属中心">{{ patient?.center ?? '—' }}</ElDescriptionsItem>
      <ElDescriptionsItem label="负责医生">{{ patient?.doctor ?? '—' }}</ElDescriptionsItem>
      <ElDescriptionsItem label="管理状态">{{ patient?.status ?? '—' }}</ElDescriptionsItem>
      <ElDescriptionsItem label="初始入口">{{ profile?.initialEntry ?? '—' }}</ElDescriptionsItem>
      <ElDescriptionsItem label="当前阶段">
        {{ profile?.stage ?? '—' }}
        <ElTag v-if="profile && !profile.stageConfirmed" type="warning" effect="plain" size="small">
          待医生确认
        </ElTag>
      </ElDescriptionsItem>
      <ElDescriptionsItem label="诊断日期">{{ profile?.diagnosisDate || '—' }}</ElDescriptionsItem>
      <ElDescriptionsItem label="诊断依据" :span="2">
        {{ profile?.diagnosisBasis || '—' }}
        <span
          v-if="profile?.initialEntry === '已确诊DLI' && !profile?.diagnosisConfirmed"
          class="text-xs text-g-500"
        >
          （诊断结论待医生确认）
        </span>
      </ElDescriptionsItem>
      <ElDescriptionsItem label="最近更新">{{ patient?.lastUpdate ?? '—' }}</ElDescriptionsItem>
      <ElDescriptionsItem label="关联项目"
        >{{ profile?.enrollments.length ?? 0 }} 个</ElDescriptionsItem
      >
      <ElDescriptionsItem label="知情同意">
        {{ patient?.consent.signed ? patient.consent.version : '未签署' }}
      </ElDescriptionsItem>
    </ElDescriptions>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { ElButton, ElDescriptions, ElDescriptionsItem, ElTag } from 'element-plus'
  import { useUserStore } from '@/store/modules/user'
  import { fetchGetPatientById } from '@/mock/dli/api'
  import { fetchGetPatientProfile } from '@/mock/dli/patient-admin'
  import type { PatientProfile, WebPatient } from '@/mock/dli/types'

  defineOptions({ name: 'PatientBasicPanel' })

  const props = defineProps<{ patientId: string; patient?: WebPatient }>()

  const emit = defineEmits<{ (e: 'edit'): void }>()

  const userStore = useUserStore()
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const canManage = computed(() => ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role.value))

  const profile = ref<PatientProfile>()
  const fallbackPatient = ref<WebPatient>()
  const patient = computed(() => props.patient ?? fallbackPatient.value)

  async function load() {
    if (!props.patientId) return
    const [base, detail] = await Promise.all([
      fetchGetPatientById(props.patientId),
      fetchGetPatientProfile(props.patientId)
    ])
    fallbackPatient.value = base
    profile.value = detail
  }

  watch(
    () => props.patientId,
    () => void load(),
    { immediate: true }
  )
  defineExpose({ load })
</script>
