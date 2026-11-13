<!-- DLI 评估报告完整详情页：五分区 + 顶部返回按钮，关闭回列表不另建 Tab [批注 05] -->
<template>
  <div class="art-full-height overflow-y-auto pb-6">
    <ElCard shadow="never" class="mb-4">
      <div class="flex-cb gap-3">
        <div class="flex-c gap-3">
          <ElButton @click="goBack">
            <ElIcon class="mr-1"><i class="ri-arrow-left-line" /></ElIcon>返回
          </ElButton>
          <span class="text-base font-semibold text-g-900">
            评估报告详情 · {{ report?.id ?? route.params.id }}
          </span>
        </div>
        <div v-if="report && isDoctor" class="flex gap-2">
          <ElButton type="primary" plain @click="openOpinion">记录意见</ElButton>
          <ElButton type="primary" @click="rerunReport">重新评估</ElButton>
        </div>
      </div>
    </ElCard>

    <template v-if="report">
      <ElCard shadow="never" class="mb-4">
        <ElDescriptions :column="3" border>
          <ElDescriptionsItem label="患者编号">{{ report.patientId }}</ElDescriptionsItem>
          <ElDescriptionsItem label="评估阶段">
            <ElTag :type="STAGE_TAG[report.stage]" effect="light">{{ report.stage }}</ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="模型用途">
            <ElTag effect="plain" type="primary">{{ report.modelUsage }}</ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="评估时间">{{ report.assessedAt }}</ElDescriptionsItem>
          <ElDescriptionsItem label="模型版本">{{ report.modelVersion }}</ElDescriptionsItem>
          <ElDescriptionsItem label="来源">{{ report.source }}</ElDescriptionsItem>
          <ElDescriptionsItem label="医生确认状态">
            <ElTag :type="confirmed ? 'success' : 'warning'" effect="light">
              {{ confirmed ? '已确认' : '待确认' }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="评估依据" :span="2">{{ report.basis }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <!-- 一、输入资料 [批注 05] -->
      <ElCard shadow="never" class="mb-4">
        <template #header><span class="font-semibold">输入资料</span></template>
        <ElTable :data="tableOf(report.inputs)" border size="small">
          <ElTableColumn prop="text" label="资料项" />
        </ElTable>
      </ElCard>

      <!-- 二、评估结果：具体字段以模型接口为准，不统一写成准确率 [批注 05] -->
      <ElCard shadow="never" class="mb-4">
        <template #header><span class="font-semibold">评估结果</span></template>
        <div class="dli-rd-result">{{ report.result }}</div>
      </ElCard>

      <!-- 三、依据来源 [批注 05] -->
      <ElCard shadow="never" class="mb-4">
        <template #header><span class="font-semibold">依据来源</span></template>
        <ElTable :data="tableOf(report.evidence)" border size="small">
          <ElTableColumn prop="text" label="依据项" />
        </ElTable>
      </ElCard>

      <!-- 四、个体化建议 [批注 05] -->
      <ElCard shadow="never" class="mb-4">
        <template #header><span class="font-semibold">个体化建议</span></template>
        <ElTable :data="tableOf(report.suggestions)" border size="small">
          <ElTableColumn prop="text" label="建议项" />
        </ElTable>
      </ElCard>

      <!-- 五、医生意见：采纳结果、说明、确认医生、确认时间 [批注 05] -->
      <ElCard shadow="never">
        <template #header><span class="font-semibold">医生意见</span></template>
        <template v-if="report.opinion">
          <ElDescriptions :column="2" border>
            <ElDescriptionsItem label="采纳结果">
              <ElTag
                :type="
                  report.opinion.adoption === '采纳'
                    ? 'success'
                    : report.opinion.adoption === '修改后采纳'
                      ? 'warning'
                      : 'danger'
                "
                effect="light"
              >
                {{ report.opinion.adoption }}
              </ElTag>
            </ElDescriptionsItem>
            <ElDescriptionsItem label="确认医生">{{ report.opinion.doctor }}</ElDescriptionsItem>
            <ElDescriptionsItem label="医生说明" :span="2">{{
              report.opinion.note
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="确认时间" :span="2">
              {{ report.opinion.confirmedAt }}
            </ElDescriptionsItem>
          </ElDescriptions>
        </template>
        <p v-else class="text-sm text-g-500">暂无医生意见，待确认</p>
      </ElCard>
    </template>

    <!-- 记录意见弹窗 [批注 05] -->
    <ElDialog v-model="opinionVisible" title="记录意见" width="560px" destroy-on-close>
      <ElForm ref="opinionFormRef" :model="opinionForm" :rules="opinionRules" label-width="110px">
        <ElFormItem label="采纳结果" prop="adoption">
          <ElRadioGroup v-model="opinionForm.adoption">
            <ElRadio v-for="item in ADOPTION_OPTIONS" :key="item" :value="item">{{ item }}</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="医生说明" prop="note">
          <ElInput
            v-model="opinionForm.note"
            type="textarea"
            :rows="3"
            :placeholder="
              opinionForm.adoption === '采纳'
                ? '可补充说明（选填）'
                : '修改或不采纳须写明内容 / 原因'
            "
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="opinionVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="savingOpinion" @click="submitOpinion">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElCard,
    ElTag,
    ElMessage,
    ElMessageBox,
    ElDialog,
    ElDescriptions,
    ElDescriptionsItem,
    ElTable,
    ElTableColumn,
    ElForm,
    ElFormItem,
    ElInput,
    ElRadioGroup,
    ElRadio
  } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { useRoute, useRouter } from 'vue-router'
  import { useUserStore } from '@/store/modules/user'
  import {
    fetchGetAssessmentReportById,
    fetchRecordReportOpinion,
    fetchRerunAssessment
  } from '@/mock/dli/blueprint/api'
  import type {
    AssessmentReport,
    AssessmentStage,
    ReportAdoption
  } from '@/mock/dli/blueprint/types'

  defineOptions({ name: 'DliAssessmentReportDetail' })

  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()

  const isDoctor = computed(() => (userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR') === 'R_DOCTOR')
  const operatorName = computed(() => {
    const info = userStore.getUserInfo as { userName?: string; username?: string }
    return info.userName ?? info.username ?? '当前医生'
  })

  const STAGE_TAG: Record<AssessmentStage, 'warning' | 'primary' | 'success'> = {
    治疗前: 'warning',
    治疗中: 'primary',
    诊断后: 'success'
  }
  const ADOPTION_OPTIONS: ReportAdoption[] = ['采纳', '修改后采纳', '不采纳']

  const report = ref<AssessmentReport>()
  const confirmed = computed(() => !!report.value?.opinion || report.value?.status === '已确认')

  /** 顶部返回按钮：回到原入口（列表 / 患者详情 / 预警处理）[批注 05] */
  function goBack() {
    router.back()
  }

  function tableOf(list: string[] | undefined) {
    return (list ?? []).map((text) => ({ text }))
  }

  async function load() {
    const id = String(route.params.id ?? '')
    if (!id) return
    try {
      report.value = await fetchGetAssessmentReportById(id)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '报告不存在')
    }
  }

  /* ---------------- 记录意见 [批注 05] ---------------- */
  const opinionVisible = ref(false)
  const savingOpinion = ref(false)
  const opinionFormRef = ref<FormInstance>()
  const opinionForm = reactive({ adoption: '采纳' as ReportAdoption, note: '' })
  const opinionRules: FormRules = {
    note: [
      {
        validator: (_rule, value: string, callback) => {
          if (opinionForm.adoption !== '采纳' && !(value ?? '').trim()) {
            callback(new Error('修改或不采纳必须写明内容 / 原因'))
          } else callback()
        },
        trigger: 'blur'
      }
    ]
  }

  function openOpinion() {
    if (!report.value) return
    opinionForm.adoption = report.value.opinion?.adoption ?? '采纳'
    opinionForm.note = report.value.opinion?.note ?? ''
    opinionVisible.value = true
  }

  async function submitOpinion() {
    if (!opinionFormRef.value || !report.value) return
    const valid = await opinionFormRef.value.validate().catch(() => false)
    if (!valid) return
    savingOpinion.value = true
    try {
      report.value = await fetchRecordReportOpinion(report.value.id, {
        adoption: opinionForm.adoption,
        note: opinionForm.note,
        doctor: operatorName.value
      })
      ElMessage.success('医生意见已保存，确认状态已更新')
      opinionVisible.value = false
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      savingOpinion.value = false
    }
  }

  /* ---------------- 重新评估：生成新报告，原报告保留 [批注 05] ---------------- */
  async function rerunReport() {
    if (!report.value) return
    const ok = await ElMessageBox.confirm(
      `将基于报告 ${report.value.id} 重新评估，生成新报告并保留原报告。是否继续？`,
      '重新评估',
      { confirmButtonText: '发起重新评估', cancelButtonText: '取消', type: 'info' }
    )
      .then(() => true)
      .catch(() => false)
    if (!ok) return
    try {
      const created = await fetchRerunAssessment(report.value.id, operatorName.value)
      ElMessage.success(`已生成新报告 ${created.id}，原报告保留`)
      void router.replace({ name: 'DliAssessmentReportDetail', params: { id: created.id } })
      report.value = created
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '重新评估失败')
    }
  }

  watch(
    () => route.params.id,
    () => void load(),
    { immediate: true }
  )
</script>
