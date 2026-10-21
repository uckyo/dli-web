<!-- 患者批量导入（Excel）弹窗：暂为 UI 占位，实际导入逻辑待接入 -->
<template>
  <ElDialog v-model="dialogVisible" title="导入患者（Excel）" width="560px" align-center>
    <ElAlert type="info" :closable="false" show-icon>
      <p>请按照模板格式填写患者数据后上传，单次最多导入 500 条，重复数据将自动跳过。</p>
    </ElAlert>

    <!-- 操作步骤提示 -->
    <div class="mt-4 flex items-center gap-2 rounded bg-g-50 px-4 py-3 text-sm text-g-600">
      <span>1. 下载导入模板</span>
      <ElIcon><ArrowRight /></ElIcon>
      <span>2. 按模板填写数据</span>
      <ElIcon><ArrowRight /></ElIcon>
      <span>3. 上传文件开始导入</span>
    </div>

    <!-- 文件上传 -->
    <ElUpload
      v-model:file-list="fileList"
      class="mt-4"
      drag
      accept=".xlsx, .xls"
      :auto-upload="false"
      :limit="1"
      :on-exceed="handleExceed"
    >
      <div class="flex flex-col items-center gap-1 py-2">
        <ElIcon :size="32" class="text-g-400"><UploadFilled /></ElIcon>
        <p class="text-sm text-g-700">将 Excel 文件拖到此处，或点击上传</p>
        <p class="text-xs text-g-400">仅支持 .xlsx / .xls 格式，文件大小不超过 10MB</p>
      </div>
    </ElUpload>

    <template #footer>
      <div class="flex items-center justify-between">
        <ElButton text type="primary" @click="handleDownloadTemplate">下载导入模板</ElButton>
        <div class="flex gap-2">
          <ElButton @click="dialogVisible = false">取消</ElButton>
          <ElButton type="primary" :disabled="!hasFile" @click="handleImport">开始导入</ElButton>
        </div>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { UploadUserFile } from 'element-plus'
  import { ArrowRight, UploadFilled } from '@element-plus/icons-vue'

  defineOptions({ name: 'DliPatientImportDialog' })

  interface Props {
    modelValue: boolean
  }

  interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'success'): void
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

  /**
   * 超出文件数量限制时提示
   */
  const handleExceed = (): void => {
    ElMessage.warning('一次只能上传一个文件，请先移除已选文件')
  }

  /**
   * 下载导入模板（功能待接入）
   */
  const handleDownloadTemplate = (): void => {
    ElMessage.info('模板下载功能开发中，敬请期待')
  }

  /**
   * 开始导入（功能待接入）
   */
  const handleImport = (): void => {
    ElMessage.info('Excel 导入功能开发中，敬请期待')
  }

  /**
   * 弹窗打开时重置状态
   */
  watch(
    () => props.modelValue,
    (visible) => {
      if (visible) {
        fileList.value = []
      }
    }
  )
</script>
