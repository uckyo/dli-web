<!-- 检查报告详情页：左侧原文件预览，右侧资料信息与识别结果核对 [批注 06] -->
<template>
  <div class="report-detail art-full-height overflow-y-auto pb-5">
    <template v-if="record">
      <div class="report-crumb">
        <ElButton link :title="backText" @click="goBack">
          <ArtSvgIcon icon="ri:arrow-left-s-line" class="report-back-icon" />返回
        </ElButton>
        <span class="report-crumb-sep">/</span>
        <span>{{ backLabel }}</span>
        <span class="report-crumb-sep">/</span>
        <span>检查报告详情</span>
      </div>

      <div class="report-header mb-4">
        <div class="min-w-0">
          <div class="report-title-row">
            <h2 class="report-title">{{ record.id }}</h2>
            <ElTag effect="light" type="primary">{{ record.category }}</ElTag>
            <ElTag effect="light" :type="PARSE_TAG[record.parseStatus]">
              解析状态：{{ record.parseStatus }}
            </ElTag>
            <ElTag effect="light" :type="CHECK_TAG[record.checkStatus]">
              核对状态：{{ record.checkStatus }}
            </ElTag>
          </div>
          <p class="report-subtitle">
            {{ record.item }} · {{ record.patientId }} · {{ record.date }} · {{ record.source }}
          </p>
        </div>

        <div class="report-header-actions">
          <ElButton v-if="!canView && isManager" plain @click="requestDataPermission">
            申请数据权限
          </ElButton>
          <ElButton
            type="primary"
            :disabled="!canManage || checked"
            :loading="confirming"
            @click="confirmCheck"
          >
            {{ checked ? '已核对' : '确认核对' }}
          </ElButton>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(340px,0.9fr)_minmax(560px,1.3fr)]">
        <!-- 左侧：脱敏后的原文件预览区域 -->
        <ElCard class="shrink-0" shadow="never">
          <template #header>
            <div class="flex-cb">
              <span>原文件预览</span>
              <ElTag v-if="previewAllowed" effect="plain" size="small" type="success">已脱敏</ElTag>
              <ElTag v-else effect="plain" size="small" type="warning">暂不开放</ElTag>
            </div>
          </template>

          <div v-if="!previewAllowed" class="preview-empty">
            <ArtSvgIcon icon="ri:file-lock-2-line" class="text-4xl text-g-400" />
            <p class="mt-3 text-sm text-g-800">解析完成后开放预览</p>
            <p class="mt-1 text-xs text-g-500">附件先脱敏；未完成解析前不开放原文件预览</p>
          </div>

          <template v-else-if="record.category === '影像'">
            <div class="preview-empty">
              <ArtSvgIcon icon="ri:image-2-line" class="text-4xl text-g-400" />
              <p class="mt-3 text-sm text-g-800">{{ record.attachment.name }}</p>
              <p class="mt-1 text-xs text-g-500"> 影像原图由院内影像系统提供，不按报告文字识别 </p>
              <ElButton class="mt-4" type="primary" plain @click="imageVisible = true">
                查看影像
              </ElButton>
            </div>
          </template>

          <template v-else>
            <div class="preview-file">
              <div class="preview-file-head">
                <ArtSvgIcon icon="ri:file-text-line" class="mr-2" />
                <span>{{ record.attachment.name }}</span>
              </div>
              <div class="preview-meta">
                {{ record.attachment.type }} · {{ record.attachment.size }} · 演示环境仅展示脱敏预览
              </div>
              <div class="preview-page">
                <div class="preview-page-title">报告原文（脱敏预览）</div>
                <p v-if="!previewLines.length" class="text-xs text-g-500">
                  原文内容暂未结构化，请以附件原文件为准
                </p>
                <p v-for="(line, index) in previewLines" :key="index" class="preview-line">
                  {{ line }}
                </p>
              </div>
            </div>
          </template>
        </ElCard>

        <div class="flex min-w-0 flex-col gap-4">
          <ElCard class="shrink-0" shadow="never">
            <template #header>资料信息</template>
            <ElDescriptions :column="2" border size="small">
              <ElDescriptionsItem label="检查记录编号">{{ record.id }}</ElDescriptionsItem>
              <ElDescriptionsItem label="患者编号">{{ record.patientId }}</ElDescriptionsItem>
              <ElDescriptionsItem label="资料分类">{{ record.category }}</ElDescriptionsItem>
              <ElDescriptionsItem label="检查项目／资料名称">{{ record.item }}</ElDescriptionsItem>
              <ElDescriptionsItem label="检查日期">{{ record.date }}</ElDescriptionsItem>
              <ElDescriptionsItem label="所属中心">{{ record.center }}</ElDescriptionsItem>
              <ElDescriptionsItem label="资料来源">{{ record.source }}</ElDescriptionsItem>
              <ElDescriptionsItem label="解析状态">{{ record.parseStatus }}</ElDescriptionsItem>
              <ElDescriptionsItem label="核对状态">{{ record.checkStatus }}</ElDescriptionsItem>
              <ElDescriptionsItem label="上传／同步人">{{ record.uploader }}</ElDescriptionsItem>
              <ElDescriptionsItem label="核对人">{{ record.checkedBy || '—' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="核对时间">{{
                record.checkedAt || '—'
              }}</ElDescriptionsItem>
            </ElDescriptions>
          </ElCard>

          <ElCard v-if="isReportExam(record.category)" class="shrink-0" shadow="never">
            <template #header>
              <div class="flex-cb">
                <span>识别结果</span>
                <ElButton
                  v-if="canManage && record.parseStatus !== '解析完成' && !checked"
                  link
                  type="primary"
                  :loading="parsing"
                  @click="startParsing"
                >
                  {{ record.parseStatus === '解析失败' ? '重试解析' : '发起解析' }}
                </ElButton>
              </div>
            </template>

            <div
              v-if="record.parseStatus !== '解析完成'"
              class="py-6 text-center text-sm text-g-500"
            >
              {{
                record.parseStatus === '解析中'
                  ? '解析中，请稍后刷新查看详情'
                  : '尚未完成解析，请先发起解析'
              }}
            </div>

            <template v-else>
              <ElTable :data="fields" border size="small">
                <ElTableColumn label="字段／指标名称" min-width="150">
                  <template #default="{ row }">
                    <ElInput v-model="row.name" size="small" placeholder="字段／指标名称" />
                    <ElButton
                      class="mt-1"
                      link
                      type="danger"
                      :disabled="!canManage || checked"
                      @click="removeField(row)"
                    >
                      删除
                    </ElButton>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="识别值" min-width="130">
                  <template #default="{ row }">
                    <span :class="row.extracted ? 'text-g-900' : 'text-danger'">
                      {{ row.extracted || '—' }}
                    </span>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="核对后值" min-width="150">
                  <template #default="{ row }">
                    <ElInput
                      v-model="row.checkedValue"
                      size="small"
                      :disabled="!canManage || checked"
                      placeholder="填写核对后值"
                    />
                  </template>
                </ElTableColumn>
                <ElTableColumn label="单位" width="120">
                  <template #default="{ row }">
                    <ElInput
                      v-model="row.unit"
                      size="small"
                      :disabled="!canManage || checked"
                      placeholder="单位"
                    />
                  </template>
                </ElTableColumn>
                <ElTableColumn label="核对提示" min-width="210">
                  <template #default="{ row }">
                    <ElInput
                      v-model="row.hint"
                      type="textarea"
                      :autosize="{ minRows: 2, maxRows: 4 }"
                      size="small"
                      :disabled="!canManage || checked"
                      placeholder="缺项或核对注意点"
                    />
                  </template>
                </ElTableColumn>
              </ElTable>
              <ElButton
                class="mt-3"
                link
                type="primary"
                :disabled="!canManage || checked"
                @click="addField"
              >
                新增指标行
              </ElButton>
              <p class="mt-2 text-xs text-g-500">
                缺项标在对应行；识别失败可重试解析或人工录入，不自动补造缺失内容。
              </p>
            </template>
          </ElCard>

          <ElCard v-else class="shrink-0" shadow="never">
            <template #header>资料说明</template>
            <p class="mb-3 text-sm text-g-700">非结构化资料不强套指标表，仅记录核对说明。</p>
            <ElInput
              v-model="nonStructNote"
              type="textarea"
              :rows="4"
              :disabled="!canManage || checked"
              placeholder="填写核对说明（可选）"
            />
          </ElCard>

          <ElCard class="shrink-0" shadow="never">
            <template #header>
              <div class="flex-cb">
                <span>修改记录</span>
                <ElButton
                  link
                  type="primary"
                  :disabled="!canManage || checked"
                  @click="addModifyRecord"
                >
                  添加一条
                </ElButton>
              </div>
            </template>
            <div v-for="item in modifyRecords" :key="item.id" class="mb-2 flex-c gap-2">
              <ElInput
                v-model="item.field"
                size="small"
                class="w-32"
                :disabled="!canManage || checked"
                placeholder="字段"
              />
              <ElInput
                v-model="item.before"
                size="small"
                class="flex-1"
                :disabled="!canManage || checked"
                placeholder="修改前"
              />
              <ElInput
                v-model="item.after"
                size="small"
                class="flex-1"
                :disabled="!canManage || checked"
                placeholder="修改后"
              />
              <ElButton
                link
                type="danger"
                :disabled="!canManage || checked"
                @click="removeModifyRecord(item.id)"
              >
                删除
              </ElButton>
            </div>
            <p v-if="!modifyRecords.length" class="text-xs text-g-500">暂无修改记录</p>
          </ElCard>

          <ElCard class="shrink-0" shadow="never">
            <template #header>流转记录</template>
            <ElTimeline>
              <ElTimelineItem
                v-for="log in record.logs"
                :key="log.id"
                :timestamp="log.time"
                placement="top"
              >
                <div class="text-sm text-g-900">{{ log.action }} · {{ log.operator }}</div>
                <p v-if="log.detail" class="mt-1 text-xs text-g-500">{{ log.detail }}</p>
              </ElTimelineItem>
            </ElTimeline>
          </ElCard>
        </div>
      </div>
    </template>

    <ElDialog v-model="imageVisible" title="影像查看" width="520px">
      <div class="rounded-lg border border-dashed border-full-d px-4 py-8 text-center">
        <ArtSvgIcon icon="ri:image-2-line" class="text-4xl text-g-400" />
        <p class="mt-3 text-sm text-g-800">{{ record?.attachment.name }}</p>
        <p class="mt-1 text-xs text-g-500">
          影像原图由院内影像系统提供，检查管理仅保留查看入口与脱敏索引
        </p>
      </div>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import {
    ElButton,
    ElCard,
    ElDescriptions,
    ElDescriptionsItem,
    ElDialog,
    ElInput,
    ElMessage,
    ElTable,
    ElTableColumn,
    ElTag,
    ElTimeline,
    ElTimelineItem
  } from 'element-plus'
  import { useUserStore } from '@/store/modules/user'
  import {
    fetchConfirmExamRecognition,
    fetchGetExamDetail,
    fetchStartExamRecognition,
    isReportExam
  } from '@/mock/dli/api'
  import type {
    ExamCheckStatus,
    ExamModifyRecord,
    ExamParseStatus,
    ExamRecognitionField,
    ExamRecord
  } from '@/mock/dli/types'

  defineOptions({ name: 'DliExamReportDetail' })

  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()

  const CLINICAL_ROLES = ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE']
  const MANAGER_ROLES = ['R_PLATFORM', 'R_CENTER', 'R_GROUP', 'R_SYS']
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const canManage = computed(() => CLINICAL_ROLES.includes(role.value))
  const isManager = computed(() => MANAGER_ROLES.includes(role.value))
  const dataGranted = ref(false)
  const canView = computed(() => canManage.value || dataGranted.value)
  const operatorName = computed(() => userStore.getUserInfo.userName || '当前医护')

  const PARSE_TAG: Record<ExamParseStatus, 'success' | 'primary' | 'warning' | 'danger' | 'info'> =
    {
      未解析: 'warning',
      解析中: 'primary',
      解析完成: 'success',
      解析失败: 'danger',
      无需解析: 'info'
    }
  const CHECK_TAG: Record<ExamCheckStatus, 'success' | 'warning'> = {
    待核对: 'warning',
    已核对: 'success'
  }

  const record = ref<ExamRecord>()
  const fields = reactive<ExamRecognitionField[]>([])
  const modifyRecords = reactive<ExamModifyRecord[]>([])
  const nonStructNote = ref('')
  const parsing = ref(false)
  const confirming = ref(false)
  const imageVisible = ref(false)

  const checked = computed(() => record.value?.checkStatus === '已核对')

  /** 从患者详情跳转时，面包屑和返回按钮按来源显示，不再固定写「检查管理」 */
  const fromPatient = computed(() => {
    const from = route.query.from
    return typeof from === 'string' && from.includes('/dli/patient/')
  })
  const backLabel = computed(() => (fromPatient.value ? '患者详情' : '检查管理'))
  const backText = computed(() => (fromPatient.value ? '返回患者详情' : '返回列表'))

  const previewAllowed = computed(() => {
    const item = record.value
    if (!item) return false
    return item.parseStatus === '解析完成' || item.parseStatus === '无需解析'
  })

  const previewLines = computed(() =>
    (record.value?.recognitionFields ?? [])
      .map((field) => field.raw.trim())
      .filter((line) => Boolean(line))
  )

  function requestDataPermission() {
    if (!isManager.value) return
    dataGranted.value = true
    ElMessage.success('数据权限申请已通过（演示），现可查看资料详情')
  }

  async function loadDetail() {
    const id = String(route.params.id ?? '')
    if (!id) {
      ElMessage.warning('缺少检查记录编号')
      return
    }
    const data = await fetchGetExamDetail(id)
    record.value = data
    fields.splice(0, fields.length, ...data.recognitionFields.map((item) => ({ ...item })))
    modifyRecords.splice(
      0,
      modifyRecords.length,
      ...data.modifyRecords.map((item) => ({ ...item }))
    )
    nonStructNote.value = ''
  }

  onMounted(() => {
    void loadDetail()
  })

  function goBack() {
    const from = route.query.from
    if (typeof from === 'string' && from) router.push(from)
    else router.push({ name: 'DliExam' })
  }

  function addField() {
    fields.push({
      name: '',
      raw: '',
      extracted: '',
      checkedValue: '',
      unit: '',
      range: '',
      hint: '人工录入，请填写核对后值'
    })
  }

  function removeField(row: ExamRecognitionField) {
    const index = fields.findIndex((item) => item === row)
    if (index > -1) fields.splice(index, 1)
  }

  function addModifyRecord() {
    modifyRecords.push({
      id: `MR-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      field: '',
      before: '',
      after: '',
      operator: operatorName.value,
      time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    })
  }

  function removeModifyRecord(id: string) {
    const index = modifyRecords.findIndex((item) => item.id === id)
    if (index > -1) modifyRecords.splice(index, 1)
  }

  async function startParsing() {
    const item = record.value
    if (!item) return
    parsing.value = true
    try {
      const updated = await fetchStartExamRecognition(item.id, operatorName.value)
      Object.assign(item, updated)
      fields.splice(0, fields.length, ...updated.recognitionFields.map((field) => ({ ...field })))
      ElMessage.success('解析完成，请逐项核对识别结果')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '发起解析失败')
    } finally {
      parsing.value = false
    }
  }

  async function confirmCheck() {
    const item = record.value
    if (!item) return
    if (isReportExam(item.category) && fields.some((field) => !field.checkedValue.trim())) {
      ElMessage.warning('存在未填写核对后值的指标，请先补齐或删除该行')
      return
    }
    confirming.value = true
    try {
      const validRecords = modifyRecords.filter(
        (log) => log.field.trim() || log.before.trim() || log.after.trim()
      )
      const updated = await fetchConfirmExamRecognition(item.id, {
        fields: isReportExam(item.category) ? fields.map((field) => ({ ...field })) : [],
        modifyRecords: validRecords.map((log) => ({ ...log })),
        operator: operatorName.value
      })
      Object.assign(item, updated)
      await loadDetail()
      ElMessage.success('核对完成，结果可用于评估')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '确认核对失败')
    } finally {
      confirming.value = false
    }
  }
</script>

<style scoped>
  .preview-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 320px;
    text-align: center;
  }

  .preview-file-head {
    display: flex;
    align-items: center;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .preview-meta {
    margin-top: 6px;
    margin-bottom: 16px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .preview-page {
    min-height: 320px;
    padding: 24px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
  }

  .preview-page-title {
    margin-bottom: 16px;
    font-size: 14px;
    font-weight: 600;
    text-align: center;
  }

  .preview-line {
    padding-bottom: 8px;
    margin-bottom: 10px;
    font-size: 13px;
    line-height: 1.6;
    border-bottom: 1px dashed var(--el-border-color-lighter);
  }

  .report-detail {
    padding: 16px 18px 20px;
  }

  .report-crumb {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;
    font-size: 12px;
    color: var(--art-gray-600);
  }

  .report-crumb .el-button {
    height: auto;
    padding: 0;
    font-size: 12px;
  }

  .report-back-icon {
    margin-right: 2px;
    font-size: 15px;
  }

  .report-crumb-sep {
    color: var(--art-gray-400);
  }

  .report-header {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-start;
    justify-content: space-between;
    padding: 16px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
  }

  .report-title-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .report-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .report-subtitle {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .report-header-actions {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
    align-items: center;
  }
</style>
