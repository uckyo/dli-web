<!-- 研究共享设置弹窗 [批注 12]：列表行内与项目详情右上角复用同一弹窗 -->
<template>
  <ElDialog v-model="visible" title="共享设置" width="560px" destroy-on-close>
    <template v-if="research">
      <p class="mb-2 text-sm font-medium text-g-900">{{ research.name }}</p>
      <p class="mb-4 text-xs text-g-500"
        >{{ research.id }} · {{ research.owner }} · {{ research.center }}</p
      >

      <ElForm label-width="110px">
        <ElFormItem label="开启共享">
          <ElSwitch v-model="form.shared" active-text="开" inactive-text="关" />
        </ElFormItem>
        <template v-if="form.shared">
          <ElFormItem label="共享级别">
            <ElRadioGroup v-model="form.shareLevel">
              <ElRadio value="课题组">课题组</ElRadio>
              <ElRadio value="中心">中心</ElRadio>
              <ElRadio value="平台">平台</ElRadio>
            </ElRadioGroup>
          </ElFormItem>
          <ElFormItem label="共享对象">
            <ElSelect
              v-model="form.shareTargets"
              multiple
              class="w-full"
              placeholder="选择当前级别下的授权范围"
            >
              <ElOption
                v-for="item in shareTargetOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="共享内容">
            <ElSelect
              v-model="form.shareContents"
              multiple
              class="w-full"
              placeholder="选择获准共享内容"
            >
              <ElOption
                v-for="item in SHARE_CONTENT_OPTIONS"
                :key="item"
                :label="item"
                :value="item"
              />
            </ElSelect>
          </ElFormItem>
        </template>
        <ElFormItem label="实际可见范围">
          <ElInput :model-value="actualVisibleScope" type="textarea" :rows="2" readonly />
        </ElFormItem>
      </ElForm>
      <p class="text-xs leading-5 text-g-500">
        共享仅开放获准概况和结果，不自动开放患者明细、编辑或导出；保存关闭共享才收回访问。
      </p>
    </template>
    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton type="primary" :loading="saving" @click="submit">保存</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElMessage,
    ElOption,
    ElRadio,
    ElRadioGroup,
    ElSelect,
    ElSwitch
  } from 'element-plus'
  import { computed, reactive, ref, watch } from 'vue'
  import { fetchUpdateResearchShareV2 } from '@/mock/dli/api'
  import type { ResearchItem, ResearchShareContentValue } from '@/mock/dli/types'
  import {
    fetchEnsureResearchProjectDetail,
    fetchUpdateResearchProjectShare
  } from '@/mock/dli/blueprint/api'
  import type { ResearchShareSetting } from '@/mock/dli/blueprint/types'
  import { useUserStore } from '@/store/modules/user'

  defineOptions({ name: 'ResearchShareDialog' })

  const props = defineProps<{
    modelValue: boolean
    research?: ResearchItem
  }>()
  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    saved: []
  }>()

  const userStore = useUserStore()
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const operator = computed(() => userStore.getUserInfo.userName ?? '本账号')
  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  const saving = ref(false)

  const SHARE_CONTENT_OPTIONS: ResearchShareContentValue[] = [
    '项目概况',
    '进度汇总',
    '已确认研究结果'
  ]

  const form = reactive({
    shared: false,
    shareLevel: '课题组' as ResearchItem['shareLevel'],
    shareTargets: [] as string[],
    shareContents: [] as ResearchShareContentValue[]
  })

  const shareTargetOptions = computed(() => {
    if (form.shareLevel === '平台') return ['全平台', props.research?.center ?? '本中心']
    if (form.shareLevel === '中心') return [props.research?.center ?? '本中心']
    return ['当前课题组', props.research?.owner ?? '项目负责人']
  })

  const actualVisibleScope = computed(() => {
    if (!form.shared) return '仅项目成员可见；未共享项目不向管理端开放'
    const targets = form.shareTargets.length ? form.shareTargets.join('、') : '未指定共享对象'
    const contents = form.shareContents.length ? form.shareContents.join('、') : '未选择共享内容'
    return `${form.shareLevel}内：${targets} 可见 ${contents}；患者明细 / 编辑 / 导出不开放`
  })

  function reset() {
    if (!props.research) return
    form.shared = props.research.shared
    form.shareLevel = props.research.shareLevel
    form.shareTargets = [...(props.research.shareTargets ?? [props.research.center])]
    form.shareContents = [...(props.research.shareContents ?? [])]
  }

  async function submit() {
    if (!props.research) return
    if (!['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE'].includes(role.value)) {
      ElMessage.error('管理员共享视图只读')
      return
    }
    if (form.shared && !form.shareTargets.length) {
      ElMessage.warning('请选择共享对象')
      return
    }
    if (form.shared && !form.shareContents.length) {
      ElMessage.warning('请选择共享内容')
      return
    }
    const setting: ResearchShareSetting = {
      shared: form.shared,
      level: form.shared ? form.shareLevel : '未共享',
      targets: [...form.shareTargets],
      contents: [...form.shareContents],
      actualVisibleScope: actualVisibleScope.value
    }
    saving.value = true
    try {
      // 列表行内直接打开共享时，项目详情可能尚未创建
      await fetchEnsureResearchProjectDetail(props.research)
      await fetchUpdateResearchShareV2(props.research.id, {
        shared: form.shared,
        shareLevel: form.shareLevel,
        shareTargets: [...form.shareTargets],
        shareContents: [...form.shareContents],
        actualVisibleScope: actualVisibleScope.value,
        operator: operator.value,
        role: role.value
      })
      await fetchUpdateResearchProjectShare(props.research.id, setting, role.value)
      ElMessage.success(form.shared ? '共享设置已更新' : '已取消共享并收回共享访问')
      visible.value = false
      emit('saved')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      saving.value = false
    }
  }

  watch(
    () => [props.modelValue, props.research?.id],
    ([open]) => {
      if (open) reset()
    },
    { immediate: true }
  )

  watch(
    () => form.shareLevel,
    () => {
      form.shareTargets = [...shareTargetOptions.value]
    }
  )
</script>
