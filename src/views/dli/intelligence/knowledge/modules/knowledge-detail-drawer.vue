<!-- 知识库详情：文档 / 检索测试 / 设置 / 更新日志 -->
<template>
  <AiDetailDrawer
    :model-value="modelValue"
    :title="detail?.name ?? '知识库详情'"
    :subtitle="subtitle"
    :loading="loading"
    width="880px"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <template #extra>
      <ElTag v-if="detail" :type="detail.enabled ? 'success' : 'info'" effect="plain">
        {{ detail.enabled ? '已启用' : '已停用' }}
      </ElTag>
    </template>

    <MetricStrip v-if="detail" :items="metricItems" class="mb-4" />

    <ElTabs v-if="detail" v-model="activeTab">
      <!-- 文档 -->
      <ElTabPane label="文档" name="docs">
        <div class="mb-3 flex-cb flex-wrap gap-2">
          <div class="flex-c gap-2">
            <ElInput
              v-model="docKeyword"
              placeholder="搜索文档名称"
              clearable
              style="width: 220px"
              @keyup.enter="searchDocs"
              @clear="searchDocs"
            />
            <ElButton @click="searchDocs">搜索</ElButton>
          </div>
          <ElButton v-if="isAdmin" type="primary" size="small" @click="openUpload">
            <ArtSvgIcon icon="ri:upload-2-line" class="mr-1" />上传文档
          </ElButton>
        </div>

        <ElTable v-loading="docsLoading" :data="docs" size="small" border>
          <ElTableColumn prop="name" label="文档名称" min-width="240" show-overflow-tooltip />
          <ElTableColumn label="类型" width="70">
            <template #default="{ row }">
              <ElTag size="small" effect="plain">{{ row.type.toUpperCase() }}</ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="大小" width="85" align="right">
            <template #default="{ row }">{{ formatBytes(row.sizeBytes) }}</template>
          </ElTableColumn>
          <ElTableColumn prop="chunks" label="分块" width="70" align="right" />
          <ElTableColumn label="状态" width="90">
            <template #default="{ row }">
              <ElTag :type="docStatusTag(row.status)" size="small" effect="plain">
                {{ row.status }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="uploader" label="上传人" width="90" />
          <ElTableColumn label="上传时间" width="145">
            <template #default="{ row }">{{ row.uploadedAt }}</template>
          </ElTableColumn>
          <ElTableColumn v-if="isAdmin" label="操作" width="70" align="center">
            <template #default="{ row }">
              <ElButton link type="danger" @click="handleDeleteDoc(row)">删除</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>

        <div v-if="docTotal" class="mt-3 flex justify-end">
          <ElPagination
            v-model:current-page="docPage"
            v-model:page-size="docSize"
            :total="docTotal"
            :page-sizes="[6, 10, 20]"
            layout="total, sizes, prev, pager, next"
            small
            background
            @current-change="() => loadDocs()"
            @size-change="handleDocSizeChange"
          />
        </div>
        <ElEmpty
          v-else-if="!docsLoading"
          description="暂无文档，上传后即可用于检索"
          :image-size="80"
        />
      </ElTabPane>

      <!-- 检索测试 -->
      <ElTabPane label="检索测试" name="retrieval">
        <div class="mb-3 flex-c flex-wrap gap-2">
          <ElInput
            v-model="query"
            placeholder="输入患者问题或关键词，如：激素冲击治疗的禁忌证"
            clearable
            class="min-w-[260px] flex-1"
            @keyup.enter="runTest"
          />
          <div class="flex-c gap-1 text-sm text-g-500">
            <span>TopK</span>
            <ElInputNumber v-model="topK" :min="1" :max="10" size="small" style="width: 90px" />
          </div>
          <ElButton type="primary" :loading="testing" @click="runTest">检索</ElButton>
        </div>

        <ElAlert
          v-if="!detail.enabled"
          type="warning"
          :closable="false"
          show-icon
          title="知识库已停用"
          description="停用状态下不会返回检索结果，请在设置中启用后再试。"
          class="mb-3"
        />

        <template v-if="testResult">
          <div class="mb-2 flex-cb text-xs text-g-500">
            <span>命中 {{ testResult.hits.length }} 个片段</span>
            <span v-if="testResult.elapsed">耗时 {{ testResult.elapsed }}ms</span>
          </div>
          <div v-if="testResult.hits.length" class="space-y-2">
            <div
              v-for="hit in testResult.hits"
              :key="hit.id"
              class="rounded-lg border border-full-d px-3 py-2.5"
            >
              <div class="flex-cb gap-2">
                <span class="truncate text-sm text-g-900">{{ hit.docName }}</span>
                <ElTag size="small" effect="plain">score {{ hit.score.toFixed(3) }}</ElTag>
              </div>
              <p class="mt-1.5 text-xs leading-5 text-g-600">{{ hit.snippet }}</p>
              <p class="mt-1 text-xs text-g-400">片段 #{{ hit.chunkIndex }}</p>
            </div>
          </div>
          <ElEmpty v-else description="未命中内容，可调整查询语句或相似度阈值" :image-size="80" />
        </template>
        <ElEmpty v-else description="输入查询语句，验证召回效果" :image-size="90" />
      </ElTabPane>

      <!-- 设置 -->
      <ElTabPane label="设置" name="settings">
        <ElForm label-width="110px" class="max-w-[560px]">
          <ElFormItem label="向量模型">
            <ElSelect v-model="settings.embedding" :disabled="!isAdmin" class="w-full">
              <ElOption v-for="item in EMBEDDING_OPTIONS" :key="item" :label="item" :value="item" />
            </ElSelect>
          </ElFormItem>
          <div class="grid grid-cols-2 gap-x-4">
            <ElFormItem label="切片长度">
              <ElInputNumber
                v-model="settings.chunkSize"
                :min="200"
                :max="2000"
                :step="100"
                :disabled="!isAdmin"
                class="w-full"
              />
            </ElFormItem>
            <ElFormItem label="切片重叠">
              <ElInputNumber
                v-model="settings.chunkOverlap"
                :min="0"
                :max="500"
                :step="20"
                :disabled="!isAdmin"
                class="w-full"
              />
            </ElFormItem>
            <ElFormItem label="召回 TopK">
              <ElInputNumber
                v-model="settings.topK"
                :min="1"
                :max="10"
                :disabled="!isAdmin"
                class="w-full"
              />
            </ElFormItem>
            <ElFormItem label="相似度阈值">
              <ElInputNumber
                v-model="settings.scoreThreshold"
                :min="0"
                :max="1"
                :step="0.01"
                :precision="2"
                :disabled="!isAdmin"
                class="w-full"
              />
            </ElFormItem>
          </div>
          <ElFormItem label="可见范围">
            <ElSelect v-model="settings.scope" :disabled="!isAdmin" class="w-full">
              <ElOption v-for="item in SCOPE_OPTIONS" :key="item" :label="item" :value="item" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="维护人">
            <ElInput v-model="settings.maintainer" :disabled="!isAdmin" />
          </ElFormItem>
          <ElFormItem v-if="isAdmin">
            <ElButton type="primary" :loading="savingSettings" @click="saveSettings">
              保存设置
            </ElButton>
          </ElFormItem>
        </ElForm>
      </ElTabPane>

      <!-- 更新日志 -->
      <ElTabPane label="更新日志" name="logs">
        <ElTimeline v-if="detail.changeLogs.length">
          <ElTimelineItem
            v-for="log in detail.changeLogs"
            :key="log.id"
            :timestamp="log.time"
            placement="top"
          >
            <div class="flex-c flex-wrap gap-2">
              <ElTag size="small" effect="plain">{{ log.action }}</ElTag>
              <span class="text-sm font-medium text-g-900">{{ log.target }}</span>
              <span class="text-xs text-g-500">{{ log.operator }}</span>
            </div>
            <p class="mt-1 text-sm text-g-700">{{ log.note }}</p>
          </ElTimelineItem>
        </ElTimeline>
        <ElEmpty v-else description="暂无更新记录" :image-size="80" />
      </ElTabPane>
    </ElTabs>

    <ElEmpty v-else description="暂无知识库数据" :image-size="100" />

    <template #footer>
      <div class="flex-cb w-full">
        <span class="text-xs text-g-500">文档与参数变更会写入更新日志</span>
        <div class="flex-c gap-2">
          <ElButton @click="emit('update:modelValue', false)">关闭</ElButton>
          <ElButton v-if="isAdmin && detail" type="primary" @click="emit('edit', detail)">
            编辑知识库
          </ElButton>
        </div>
      </div>
    </template>
  </AiDetailDrawer>

  <!-- 上传文档 -->
  <ElDialog v-model="uploadVisible" title="上传文档" width="520px" destroy-on-close>
    <ElUpload
      drag
      action="#"
      :auto-upload="false"
      :show-file-list="false"
      accept=".pdf,.docx,.md,.txt,.xlsx"
      :on-change="handleFileChange"
    >
      <div class="py-4">
        <ArtSvgIcon icon="ri:upload-cloud-2-line" class="text-3xl text-g-400" />
        <p class="mt-2 text-sm text-g-700">
          {{ uploadForm.name || '将文件拖到此处，或点击选择' }}
        </p>
        <p class="mt-1 text-xs text-g-500">支持 PDF / DOCX / MD / TXT / XLSX</p>
      </div>
    </ElUpload>
    <p class="mt-2 rounded-lg bg-g-100 px-3 py-2 text-xs text-g-600">
      演示环境不会上传真实文件，仅记录文件名与大小并模拟切片入库。
    </p>
    <template #footer>
      <ElButton @click="uploadVisible = false">取消</ElButton>
      <ElButton
        type="primary"
        :loading="uploading"
        :disabled="!uploadForm.name"
        @click="submitUpload"
      >
        上传并入库
      </ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { reactive, ref, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import type { UploadFile } from 'element-plus'
  import AiDetailDrawer from '../../modules/ai-detail-drawer.vue'
  import MetricStrip from '../../modules/metric-strip.vue'
  import {
    fetchDeleteKnowledgeDoc,
    fetchGetKnowledgeDetail,
    fetchGetKnowledgeDocs,
    fetchTestKnowledge,
    fetchUpdateKnowledge,
    fetchUploadKnowledgeDoc
  } from '@/mock/dli/api'
  import type {
    KnowledgeDetail,
    KnowledgeDoc,
    KnowledgeItem,
    KnowledgeTestResult,
    VisibleScope
  } from '@/mock/dli/types'
  import { formatBytes, formatInt, formatPercent } from '../../format'

  defineOptions({ name: 'KnowledgeDetailDrawer' })

  const props = defineProps<{
    modelValue: boolean
    knowledgeId: string
    isAdmin: boolean
    tab?: string
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    refresh: []
    edit: [knowledge: KnowledgeItem]
  }>()

  const SCOPE_OPTIONS: VisibleScope[] = ['全平台', '本中心', '课题组']
  const EMBEDDING_OPTIONS = [
    'bge-large-zh-v1.5',
    'bge-m3',
    'bge-small-zh-v1.5',
    'text-embedding-3-large'
  ]

  const detail = ref<KnowledgeDetail | null>(null)
  const loading = ref(false)
  const activeTab = ref('docs')

  const docs = ref<KnowledgeDoc[]>([])
  const docsLoading = ref(false)
  const docTotal = ref(0)
  const docPage = ref(1)
  const docSize = ref(6)
  const docKeyword = ref('')

  const query = ref('')
  const topK = ref(5)
  const testing = ref(false)
  const testResult = ref<KnowledgeTestResult | null>(null)

  const settings = reactive({
    embedding: '',
    chunkSize: 800,
    chunkOverlap: 120,
    topK: 5,
    scoreThreshold: 0.7,
    scope: '全平台' as VisibleScope,
    maintainer: ''
  })
  const savingSettings = ref(false)

  const uploadVisible = ref(false)
  const uploading = ref(false)
  const uploadForm = reactive<{
    name: string
    type: KnowledgeDoc['type']
    sizeBytes: number
  }>({ name: '', type: 'pdf', sizeBytes: 0 })

  const subtitle = computed(() =>
    detail.value ? `${detail.value.id} · ${detail.value.embedding}` : ''
  )

  const metricItems = computed(() => {
    if (!detail.value) return []
    return [
      { label: '文档数', value: formatInt(detail.value.docs) },
      { label: '容量', value: formatBytes(detail.value.sizeBytes) },
      { label: '检索向量', value: formatInt(detail.value.vectorCount) },
      {
        label: '命中率',
        value: formatPercent(detail.value.hitRate),
        tone: detail.value.hitRate >= 85 ? ('success' as const) : ('warning' as const)
      }
    ]
  })

  const docStatusTag = (status: string): 'success' | 'warning' | 'danger' => {
    if (status === '已入库') return 'success'
    if (status === '解析中') return 'warning'
    return 'danger'
  }

  watch(
    () => [props.modelValue, props.knowledgeId] as const,
    ([visible, id]) => {
      if (!visible) return
      activeTab.value = props.tab || 'docs'
      docKeyword.value = ''
      docPage.value = 1
      query.value = ''
      testResult.value = null
      if (id) {
        loadDetail(id)
        loadDocs(id)
      }
    },
    { immediate: true }
  )

  async function loadDetail(id: string) {
    loading.value = true
    try {
      detail.value = await fetchGetKnowledgeDetail(id)
      topK.value = detail.value.topK
      Object.assign(settings, {
        embedding: detail.value.embedding,
        chunkSize: detail.value.chunkSize,
        chunkOverlap: detail.value.chunkOverlap,
        topK: detail.value.topK,
        scoreThreshold: detail.value.scoreThreshold,
        scope: detail.value.scope,
        maintainer: detail.value.maintainer
      })
    } finally {
      loading.value = false
    }
  }

  async function loadDocs(id = props.knowledgeId) {
    if (!id) return
    docsLoading.value = true
    try {
      const res = await fetchGetKnowledgeDocs({
        knowledgeId: id,
        current: docPage.value,
        size: docSize.value,
        keyword: docKeyword.value
      })
      docs.value = res.records
      docTotal.value = res.total
    } finally {
      docsLoading.value = false
    }
  }

  function searchDocs() {
    docPage.value = 1
    loadDocs()
  }

  function handleDocSizeChange() {
    docPage.value = 1
    loadDocs()
  }

  async function refreshAll() {
    await loadDetail(props.knowledgeId)
    await loadDocs()
    emit('refresh')
  }

  async function runTest() {
    if (!detail.value) return
    if (!query.value.trim()) {
      ElMessage.warning('请输入检索语句')
      return
    }
    testing.value = true
    try {
      testResult.value = await fetchTestKnowledge(detail.value.id, query.value.trim(), topK.value)
    } finally {
      testing.value = false
    }
  }

  async function saveSettings() {
    if (!detail.value) return
    savingSettings.value = true
    try {
      await fetchUpdateKnowledge(detail.value.id, {
        name: detail.value.name,
        description: detail.value.description,
        maintainer: settings.maintainer,
        scope: settings.scope,
        embedding: settings.embedding,
        chunkSize: settings.chunkSize,
        chunkOverlap: settings.chunkOverlap,
        topK: settings.topK,
        scoreThreshold: settings.scoreThreshold,
        enabled: detail.value.enabled
      })
      ElMessage.success('检索参数已保存')
      await refreshAll()
    } finally {
      savingSettings.value = false
    }
  }

  function openUpload() {
    uploadForm.name = ''
    uploadForm.type = 'pdf'
    uploadForm.sizeBytes = 0
    uploadVisible.value = true
  }

  function handleFileChange(file: UploadFile) {
    uploadForm.name = file.name
    uploadForm.sizeBytes = file.size || Math.round(1.5 * 1024 * 1024)
    const ext = file.name.split('.').pop()?.toLowerCase()
    const typeMap: Record<string, KnowledgeDoc['type']> = {
      pdf: 'pdf',
      docx: 'docx',
      md: 'md',
      txt: 'txt',
      xlsx: 'xlsx'
    }
    uploadForm.type = typeMap[ext ?? ''] ?? 'pdf'
  }

  async function submitUpload() {
    if (!detail.value || !uploadForm.name) return
    uploading.value = true
    try {
      await fetchUploadKnowledgeDoc(detail.value.id, {
        name: uploadForm.name,
        type: uploadForm.type,
        sizeBytes: uploadForm.sizeBytes,
        uploader: detail.value.maintainer
      })
      ElMessage.success('文档已入库')
      uploadVisible.value = false
      docPage.value = 1
      await refreshAll()
    } finally {
      uploading.value = false
    }
  }

  async function handleDeleteDoc(doc: KnowledgeDoc) {
    const confirmed = await ElMessageBox.confirm(`确定删除文档「${doc.name}」？`, '删除文档', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
      .then(() => true)
      .catch(() => false)
    if (!confirmed) return
    await fetchDeleteKnowledgeDoc(doc.id)
    ElMessage.success('文档已删除')
    if (docs.value.length === 1 && docPage.value > 1) docPage.value -= 1
    await refreshAll()
  }
</script>
