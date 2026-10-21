<!-- 患者智能导入（AI 识别报告）弹窗：暂为 UI 占位，AI 识别服务待接入 -->
<template>
  <ElDialog v-model="dialogVisible" title="智能导入（AI 识别）" width="640px" align-center>
    <ElAlert type="info" :closable="false" show-icon>
      <p>上传检查报告截图，AI 将自动识别关键信息，识别完成后请人工核对确认后再导入。</p>
    </ElAlert>

    <!-- 截图上传 -->
    <ElUpload
      v-model:file-list="fileList"
      class="mt-4"
      drag
      accept="image/png, image/jpeg, image/webp"
      list-type="picture"
      :auto-upload="false"
      :limit="1"
      :on-exceed="handleExceed"
    >
      <div class="flex flex-col items-center gap-1 py-2">
        <ElIcon :size="32" class="text-g-400"><Picture /></ElIcon>
        <p class="text-sm text-g-700">将报告截图拖到此处，或点击上传</p>
        <p class="text-xs text-g-400">支持 PNG / JPG / WebP 格式，单张不超过 20MB</p>
      </div>
    </ElUpload>

    <!-- 识别操作 -->
    <div class="mt-4 flex justify-center">
      <ElButton
        type="primary"
        plain
        :disabled="!hasFile"
        :loading="recognizing"
        @click="handleRecognize"
      >
        {{ recognized ? '重新识别' : '开始识别' }}
      </ElButton>
    </div>

    <!-- 识别结果（示例数据，AI 服务待接入） -->
    <template v-if="recognized">
      <ElDivider content-position="left">识别结果（请人工核对确认）</ElDivider>
      <ElAlert type="warning" :closable="false" show-icon class="mb-3">
        <p>当前为示例数据，AI 识别服务暂未接入，正式上线后将展示真实识别结果。</p>
      </ElAlert>

      <div class="flex flex-col gap-3">
        <div v-for="item in recognizedFields" :key="item.field" class="flex items-center gap-3">
          <ElCheckbox v-model="item.checked" class="!mr-0">{{ item.field }}</ElCheckbox>
          <ElInput v-model="item.value" size="small" class="flex-1" />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :disabled="!hasConfirmed" @click="handleConfirm">
          确认导入
        </ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { UploadUserFile } from 'element-plus'
  import { Picture } from '@element-plus/icons-vue'

  defineOptions({ name: 'DliPatientAiImportDialog' })

  interface Props {
    modelValue: boolean
  }

  interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'confirm'): void
  }

  interface RecognizedField {
    /** 字段名称 */
    field: string
    /** 识别出的值 */
    value: string
    /** 是否人工确认 */
    checked: boolean
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const dialogVisible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  // 上传文件列表（仅前端占位，不做真实上传）
  const fileList = ref<UploadUserFile[]>([])

  const hasFile = computed(() => fileList.value.length > 0)

  // 识别状态
  const recognizing = ref(false)
  const recognized = ref(false)
  const recognizedFields = ref<RecognizedField[]>([])

  /** 是否有已确认的字段 */
  const hasConfirmed = computed(() => recognizedFields.value.some((item) => item.checked))

  /**
   * 超出文件数量限制时提示
   */
  const handleExceed = (): void => {
    ElMessage.warning('一次只能上传一张截图，请先移除已选图片')
  }

  /**
   * 开始识别（模拟流程，AI 服务待接入）
   */
  const handleRecognize = (): void => {
    recognizing.value = true

    // 模拟 AI 识别耗时，正式实现替换为接口调用
    setTimeout(() => {
      recognizedFields.value = [
        { field: '患者姓名', value: '张*', checked: true },
        { field: '性别', value: '男', checked: true },
        { field: '年龄', value: '62', checked: true },
        { field: '检查项目', value: '血常规', checked: false },
        { field: '白细胞计数', value: '6.5 × 10⁹/L', checked: false },
        { field: '中性粒细胞比例', value: '72%', checked: false }
      ]
      recognized.value = true
      recognizing.value = false
    }, 1500)
  }

  /**
   * 确认导入（功能待接入）
   */
  const handleConfirm = (): void => {
    ElMessage.info('AI 智能导入功能开发中，敬请期待')
  }

  /**
   * 弹窗打开时重置状态
   */
  watch(
    () => props.modelValue,
    (visible) => {
      if (visible) {
        fileList.value = []
        recognized.value = false
        recognizedFields.value = []
      }
    }
  )
</script>
