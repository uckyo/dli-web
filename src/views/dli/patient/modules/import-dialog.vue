<!-- 患者导入 [批注 04]：上传文件 → 预览校验 → 确认保存 -->
<template>
  <ElDialog
    :model-value="modelValue"
    title="导入患者表格"
    width="900px"
    destroy-on-close
    @update:model-value="close"
  >
    <div class="flex-c gap-2 mb-3">
      <ElUpload
        accept=".csv,.txt"
        :auto-upload="false"
        :show-file-list="false"
        :limit="1"
        @change="handleFile"
      >
        <ElButton type="primary" plain>上传 CSV 文件</ElButton>
      </ElUpload>
      <ElButton plain @click="downloadTemplate">下载模板</ElButton>
      <span class="text-xs text-g-500">
        模板列：患者编号, 所属中心, 负责医生, 管理状态, 初始入口, 当前阶段, 诊断日期, 诊断依据
      </span>
    </div>

    <ElInput
      v-model="pasted"
      type="textarea"
      :rows="3"
      placeholder="也可直接粘贴 CSV 内容（首行为表头），然后点击「预览校验」"
    />
    <div class="flex-c gap-2 my-3">
      <ElButton type="primary" plain :loading="previewBusy" @click="preview">预览校验</ElButton>
      <span v-if="fileName" class="text-xs text-g-500">当前文件：{{ fileName }}</span>
    </div>

    <ElTable v-if="previewRows.length" :data="previewRows" size="small" border max-height="300">
      <ElTableColumn prop="lineNo" label="文件行号" width="90" />
      <ElTableColumn prop="patientId" label="患者编号" width="150">
        <template #default="{ row }">{{ row.patientId || '（新建时生成）' }}</template>
      </ElTableColumn>
      <ElTableColumn prop="center" label="所属中心" width="105" />
      <ElTableColumn prop="doctor" label="负责医生" width="100" />
      <ElTableColumn prop="manageStatus" label="管理状态" width="100" />
      <ElTableColumn prop="initialEntry" label="初始入口" width="150" />
      <ElTableColumn prop="stage" label="当前阶段" width="90" />
      <ElTableColumn label="校验结果" width="100">
        <template #default="{ row }">
          <ElTag :type="row.result === '通过' ? 'success' : 'danger'" effect="plain">
            {{ row.result }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="reason" label="错误说明" min-width="200" show-overflow-tooltip />
    </ElTable>
    <ElEmpty v-else description="上传文件或粘贴内容后预览校验" :image-size="60" />

    <div v-if="submitResult" class="mt-3">
      <ElAlert
        :type="submitResult.failed ? 'warning' : 'success'"
        :closable="false"
        show-icon
        :title="`导入完成：成功 ${submitResult.created} 条，失败 ${submitResult.failed} 条`"
      />
      <div v-if="submitResult.errors.length" class="text-xs text-g-600 mt-2">
        <div v-for="item in submitResult.errors" :key="item.lineNo">
          第 {{ item.lineNo }} 行：{{ item.reason }}
        </div>
      </div>
    </div>

    <template #footer>
      <ElButton @click="close(false)">关闭</ElButton>
      <ElButton type="primary" :disabled="!passedCount" :loading="submitBusy" @click="submit">
        确认保存（{{ passedCount }} 条）
      </ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import {
    ElAlert,
    ElButton,
    ElDialog,
    ElEmpty,
    ElInput,
    ElMessage,
    ElTable,
    ElTableColumn,
    ElTag,
    ElUpload,
    type UploadFile
  } from 'element-plus'
  import { computed, ref, watch } from 'vue'
  import {
    TEMPLATE_FIELDS,
    buildTemplateCsv,
    fetchPreviewImportV2,
    fetchSubmitImportV2,
    type ImportPreviewRow,
    type ImportRow,
    type ImportSubmitResult
  } from '@/mock/dli/patient-admin'
  import { useUserStore } from '@/store/modules/user'

  defineOptions({ name: 'PatientImportDialog' })

  const props = defineProps<{ modelValue: boolean }>()
  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'saved'): void
  }>()

  const userStore = useUserStore()
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const pasted = ref('')
  const fileName = ref('')
  const previewRows = ref<ImportPreviewRow[]>([])
  const previewBusy = ref(false)
  const submitBusy = ref(false)
  const submitResult = ref<ImportSubmitResult>()

  const passedCount = computed(
    () => previewRows.value.filter((item) => item.result === '通过').length
  )

  watch(
    () => props.modelValue,
    (value) => {
      if (value) return
      pasted.value = ''
      fileName.value = ''
      previewRows.value = []
      submitResult.value = undefined
    }
  )

  function close(value: boolean) {
    emit('update:modelValue', value)
  }

  /** 下载当前已发布字段模板（不含姓名 / 手机号 / 病历号） */
  function downloadTemplate() {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '患者导入模板.csv'
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('模板已下载')
  }

  function handleFile(file: UploadFile) {
    const raw = file.raw
    if (!raw) return
    fileName.value = file.name
    const reader = new FileReader()
    reader.onload = () => {
      pasted.value = String(reader.result ?? '')
      void preview()
    }
    reader.readAsText(raw, 'UTF-8')
  }

  /** 轻量 CSV 解析：支持引号包裹与转义引号，不引入第三方依赖 */
  function parseCsv(text: string): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let cell = ''
    let quoted = false
    const source = text.replace(/^\uFEFF/, '')
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i]
      if (quoted) {
        if (char === '"' && source[i + 1] === '"') {
          cell += '"'
          i += 1
        } else if (char === '"') {
          quoted = false
        } else {
          cell += char
        }
      } else if (char === '"') {
        quoted = true
      } else if (char === ',') {
        row.push(cell.trim())
        cell = ''
      } else if (char === '\n') {
        row.push(cell.trim())
        if (row.some((item) => item)) rows.push(row)
        row = []
        cell = ''
      } else if (char !== '\r') {
        cell += char
      }
    }
    row.push(cell.trim())
    if (row.some((item) => item)) rows.push(row)
    return rows
  }

  function toRows(text: string): ImportRow[] {
    const lines = parseCsv(text)
    if (!lines.length) return []
    const header = lines[0]
    const indexOf = (label: string) => header.indexOf(label)
    return lines.slice(1).map((cells, position) => ({
      lineNo: position + 2,
      patientId: cells[indexOf('患者编号')] ?? '',
      center: cells[indexOf('所属中心')] ?? '',
      doctor: cells[indexOf('负责医生')] ?? '',
      manageStatus: cells[indexOf('管理状态')] ?? '',
      initialEntry: cells[indexOf('初始入口')] ?? '',
      stage: cells[indexOf('当前阶段')] ?? '',
      diagnosisDate: cells[indexOf('诊断日期')] ?? '',
      diagnosisBasis: cells[indexOf('诊断依据')] ?? ''
    }))
  }

  async function preview() {
    if (!pasted.value.trim()) {
      ElMessage.warning('请先上传文件或粘贴 CSV 内容')
      return
    }
    const header = parseCsv(pasted.value)[0] ?? []
    const missing = TEMPLATE_FIELDS.filter((item) => item.required && !header.includes(item.label))
    if (missing.length) {
      ElMessage.error(`模板缺少必填列：${missing.map((item) => item.label).join('、')}`)
      return
    }
    previewBusy.value = true
    submitResult.value = undefined
    try {
      previewRows.value = await fetchPreviewImportV2(toRows(pasted.value))
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '预览校验失败')
    } finally {
      previewBusy.value = false
    }
  }

  async function submit() {
    submitBusy.value = true
    try {
      const result = await fetchSubmitImportV2(previewRows.value, role.value)
      submitResult.value = result
      if (result.created) emit('saved')
      // 已成功导入的行从预览移除，避免重复提交重复建档
      const createdKeys = new Set(result.ids)
      previewRows.value = previewRows.value.filter(
        (item) => !(item.result === '通过' && createdKeys.has(item.patientId))
      )
      ElMessage.success(`成功 ${result.created} 条，失败 ${result.failed} 条`)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '导入失败')
    } finally {
      submitBusy.value = false
    }
  }
</script>
