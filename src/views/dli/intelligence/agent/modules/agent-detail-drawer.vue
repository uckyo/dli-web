<!-- 智能体详情：概览 / 配置 / 版本与发布 / 会话记录 -->
<template>
  <AiDetailDrawer
    :model-value="modelValue"
    :title="detail?.name ?? '智能体详情'"
    :subtitle="subtitle"
    :loading="loading"
    width="820px"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <template #extra>
      <ElTag v-if="detail?.builtin" type="primary" effect="plain" size="small">内置</ElTag>
      <ElTag v-if="detail" :type="detail.enabled ? 'success' : 'info'" effect="plain" size="small">
        {{ detail.enabled ? '已启用' : '已停用' }}
      </ElTag>
    </template>

    <ElTabs v-if="detail" v-model="activeTab">
      <ElTabPane label="概览" name="overview">
        <MetricStrip :items="metricItems" class="mb-4" />
        <ElDescriptions :column="2" border size="small" class="mb-4">
          <ElDescriptionsItem label="智能体编号">{{ detail.id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="当前版本">{{ detail.version }}</ElDescriptionsItem>
          <ElDescriptionsItem label="绑定模型">{{ detail.model }}</ElDescriptionsItem>
          <ElDescriptionsItem label="可见范围">
            <ElTag :type="SCOPE_TAG[detail.scope]" size="small" effect="plain">
              {{ detail.scope }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="知识库">{{
            detail.knowledge.join('、') || '—'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="更新时间">{{ detail.updatedAt }}</ElDescriptionsItem>
          <ElDescriptionsItem label="兜底策略" :span="2">
            {{ detail.fallback }}
          </ElDescriptionsItem>
        </ElDescriptions>

        <TrendPanel
          title="近 7 日会话量"
          :x-axis="detail.trend.map((item) => item.date)"
          :series="trendSeries"
        />
      </ElTabPane>

      <ElTabPane label="配置" name="config">
        <p v-if="!isAdmin" class="mb-3 text-xs text-g-500"
          >当前角色仅可查看配置，修改需平台管理员权限。</p
        >
        <ElForm label-width="100px">
          <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <ElFormItem label="绑定模型">
              <ElSelect v-model="config.model" :disabled="!isAdmin" class="w-full">
                <ElOption v-for="item in modelOptions" :key="item" :label="item" :value="item" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="可见范围">
              <ElSelect v-model="config.scope" :disabled="!isAdmin" class="w-full">
                <ElOption v-for="item in SCOPE_OPTIONS" :key="item" :label="item" :value="item" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="Temperature">
              <ElInputNumber
                v-model="config.temperature"
                :min="0"
                :max="1"
                :step="0.1"
                :precision="1"
                :disabled="!isAdmin"
                class="w-full"
              />
            </ElFormItem>
            <ElFormItem label="Top P">
              <ElInputNumber
                v-model="config.topP"
                :min="0.1"
                :max="1"
                :step="0.05"
                :precision="2"
                :disabled="!isAdmin"
                class="w-full"
              />
            </ElFormItem>
            <ElFormItem label="最大轮次">
              <ElInputNumber
                v-model="config.maxRounds"
                :min="1"
                :max="30"
                :disabled="!isAdmin"
                class="w-full"
              />
            </ElFormItem>
          </div>

          <ElFormItem label="关联技能">
            <ElSelect
              v-model="config.skills"
              multiple
              filterable
              :disabled="!isAdmin"
              class="w-full"
            >
              <ElOption v-for="item in skillOptions" :key="item" :label="item" :value="item" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="关联知识库">
            <ElSelect
              v-model="config.knowledge"
              multiple
              filterable
              :disabled="!isAdmin"
              class="w-full"
            >
              <ElOption v-for="item in knowledgeOptions" :key="item" :label="item" :value="item" />
            </ElSelect>
          </ElFormItem>

          <ElFormItem label="系统提示词">
            <ElInput
              v-model="config.prompt"
              type="textarea"
              :rows="6"
              maxlength="800"
              show-word-limit
              :disabled="!isAdmin"
            />
          </ElFormItem>
          <ElFormItem label="兜底策略">
            <ElInput
              v-model="config.fallback"
              type="textarea"
              :rows="2"
              maxlength="160"
              :disabled="!isAdmin"
            />
          </ElFormItem>

          <ElFormItem v-if="isAdmin">
            <ElButton type="primary" :loading="saving" @click="saveConfig">保存配置</ElButton>
            <ElButton @click="emit('edit', detail)">编辑基础信息</ElButton>
          </ElFormItem>
        </ElForm>
      </ElTabPane>

      <ElTabPane label="版本与发布" name="versions">
        <div class="mb-3 flex-cb">
          <p class="text-sm text-g-500"
            >共 {{ detail.versions.length }} 个版本，当前生效版本已高亮</p
          >
          <ElButton v-if="isAdmin" type="primary" size="small" @click="openPublish">
            发布新版本
          </ElButton>
        </div>
        <ElTimeline>
          <ElTimelineItem
            v-for="item in detail.versions"
            :key="`${item.version}-${item.publishedAt}`"
            :timestamp="item.publishedAt"
            :type="item.active ? 'primary' : 'info'"
            placement="top"
          >
            <div class="flex-cb flex-wrap gap-2">
              <div class="flex-c flex-wrap items-center gap-2">
                <span class="text-sm font-medium text-g-900">{{ item.version }}</span>
                <ElTag v-if="item.active" type="success" size="small" effect="plain">
                  当前版本
                </ElTag>
                <span class="text-xs text-g-500">{{ item.publisher }}</span>
              </div>
              <div class="flex-c gap-1">
                <ElButton link type="primary" size="small" @click="openSnapshot(item)">
                  提示词快照
                </ElButton>
                <ElButton
                  v-if="isAdmin && !item.active"
                  link
                  type="warning"
                  size="small"
                  @click="handleRollback(item)"
                >
                  回滚至此版本
                </ElButton>
              </div>
            </div>
            <p class="mt-1 text-sm text-g-700">{{ item.note }}</p>
          </ElTimelineItem>
        </ElTimeline>
        <ElEmpty v-if="!detail.versions.length" description="暂无版本记录" :image-size="70" />
      </ElTabPane>

      <ElTabPane label="会话记录" name="sessions">
        <div class="mb-3 flex-c flex-wrap gap-2">
          <ElInput
            v-model="sessionKeyword"
            placeholder="患者 / 医生 / 会话号"
            clearable
            style="width: 220px"
            @keyup.enter="handleSessionSearch"
            @clear="handleSessionSearch"
          />
          <ElButton @click="handleSessionSearch">查询</ElButton>
          <ElRadioGroup v-model="sessionStatus" size="small">
            <ElRadioButton value="">全部</ElRadioButton>
            <ElRadioButton value="进行中">进行中</ElRadioButton>
            <ElRadioButton value="已结束">已结束</ElRadioButton>
            <ElRadioButton value="转人工">转人工</ElRadioButton>
          </ElRadioGroup>
          <span class="text-xs text-g-500">共 {{ sessionTotal }} 条</span>
        </div>

        <ElTable v-loading="sessionLoading" :data="sessionList" size="small" border>
          <ElTableColumn prop="id" label="会话号" width="140" />
          <ElTableColumn prop="patient" label="患者" width="90" />
          <ElTableColumn prop="doctor" label="医生" width="95" />
          <ElTableColumn prop="channel" label="渠道" width="70" />
          <ElTableColumn label="轮次" width="65" align="right">
            <template #default="{ row }">{{ row.rounds }}</template>
          </ElTableColumn>
          <ElTableColumn label="时长" width="75" align="right">
            <template #default="{ row }">{{ row.duration }} 分</template>
          </ElTableColumn>
          <ElTableColumn label="满意度" width="80" align="right">
            <template #default="{ row }">{{ formatPercent(row.satisfaction) }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" width="85">
            <template #default="{ row }">
              <ElTag :type="sessionStatusTag(row.status)" size="small" effect="plain">
                {{ row.status }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="startedAt" label="开始时间" width="150" />
        </ElTable>

        <div v-if="sessionTotal" class="mt-3 flex justify-end">
          <ElPagination
            v-model:current-page="sessionPage"
            :page-size="SESSION_PAGE_SIZE"
            :total="sessionTotal"
            layout="prev, pager, next"
            small
            background
            @current-change="loadSessions"
          />
        </div>
        <ElEmpty
          v-else-if="!sessionLoading"
          description="暂无会话记录"
          :image-size="70"
          class="mt-4"
        />
      </ElTabPane>
    </ElTabs>

    <ElEmpty v-else description="暂无智能体数据" :image-size="100" />

    <template #footer>
      <div class="flex-cb w-full">
        <span class="text-xs text-g-500">配置修改会写入版本记录，便于追溯</span>
        <div class="flex-c gap-2">
          <ElButton @click="emit('update:modelValue', false)">关闭</ElButton>
          <ElButton v-if="isAdmin && detail" type="primary" @click="emit('edit', detail)">
            编辑基础信息
          </ElButton>
        </div>
      </div>
    </template>
  </AiDetailDrawer>

  <!-- 提示词快照 -->
  <ElDialog v-model="snapshotVisible" :title="snapshotTitle" width="640px">
    <pre
      class="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-g-100 p-3 text-xs leading-5 text-g-700"
      >{{ snapshot?.prompt || '该版本未记录提示词快照' }}</pre
    >
    <template #footer>
      <ElButton @click="snapshotVisible = false">关闭</ElButton>
    </template>
  </ElDialog>

  <!-- 发布新版本 -->
  <ElDialog v-model="publishVisible" title="发布新版本" width="560px">
    <ElForm label-width="80px">
      <ElFormItem label="版本号">
        <ElInput v-model="publishForm.version" placeholder="如：v2.4.0" />
      </ElFormItem>
      <ElFormItem label="变更说明">
        <ElInput
          v-model="publishForm.note"
          type="textarea"
          :rows="2"
          maxlength="120"
          show-word-limit
          placeholder="说明本次版本的主要变更"
        />
      </ElFormItem>
      <ElFormItem label="提示词快照">
        <ElInput v-model="publishForm.prompt" type="textarea" :rows="8" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="publishVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="publishing" @click="submitPublish">发布</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { computed, reactive, ref, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import AiDetailDrawer from '../../modules/ai-detail-drawer.vue'
  import MetricStrip from '../../modules/metric-strip.vue'
  import TrendPanel from '../../modules/trend-panel.vue'
  import { KNOWLEDGE, LLMS, SKILLS } from '@/mock/dli/data'
  import {
    fetchGetAgentDetail,
    fetchGetAgentSessions,
    fetchPublishAgentVersion,
    fetchRollbackAgentVersion,
    fetchUpdateAgent
  } from '@/mock/dli/api'
  import type {
    AgentDetail,
    AgentItem,
    AgentSession,
    AgentVersion,
    VisibleScope
  } from '@/mock/dli/types'
  import { formatInt, formatPercent, SCOPE_TAG, SESSION_STATUS_TAG } from '../../format'

  defineOptions({ name: 'AgentDetailDrawer' })

  const props = defineProps<{
    modelValue: boolean
    agentId: string
    isAdmin: boolean
    tab?: string
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    refresh: []
    edit: [agent: AgentItem]
  }>()

  const SESSION_PAGE_SIZE = 6

  const sessionStatusTag = (status: AgentSession['status']) => SESSION_STATUS_TAG[status] ?? 'info'

  const detail = ref<AgentDetail | null>(null)
  const loading = ref(false)
  const activeTab = ref('overview')
  const saving = ref(false)

  const modelOptions = LLMS.map((item) => item.name)
  const skillOptions = SKILLS.map((item) => item.name)
  const knowledgeOptions = KNOWLEDGE.map((item) => item.name)
  const SCOPE_OPTIONS: VisibleScope[] = ['全平台', '本中心', '课题组']

  const config = reactive({
    model: '',
    scope: '全平台' as VisibleScope,
    temperature: 0.3,
    topP: 0.85,
    maxRounds: 8,
    skills: [] as string[],
    knowledge: [] as string[],
    prompt: '',
    fallback: ''
  })

  const subtitle = computed(() =>
    detail.value ? `${detail.value.id} · ${detail.value.model} · ${detail.value.version}` : ''
  )

  const metricItems = computed(() => {
    if (!detail.value) return []
    return [
      { label: '今日会话', value: formatInt(detail.value.sessions), tone: 'default' as const },
      {
        label: '近 30 天会话',
        value: formatInt(detail.value.sessions30d),
        tone: 'default' as const
      },
      {
        label: '满意度',
        value: formatPercent(detail.value.satisfaction),
        tone: detail.value.satisfaction >= 92 ? ('success' as const) : ('warning' as const)
      },
      { label: '关联技能', value: detail.value.skills.length, tone: 'default' as const }
    ]
  })

  const trendSeries = computed(() => {
    if (!detail.value) return []
    return [{ name: '会话量', data: detail.value.trend.map((item) => item.sessions) }]
  })

  const sessionStatus = ref<'' | AgentSession['status']>('')
  const sessionKeyword = ref('')
  const sessionPage = ref(1)
  const sessionList = ref<AgentSession[]>([])
  const sessionTotal = ref(0)
  const sessionLoading = ref(false)

  watch(
    () => [props.modelValue, props.agentId] as const,
    ([visible, id]) => {
      if (!visible) return
      activeTab.value = props.tab || 'overview'
      sessionStatus.value = ''
      sessionKeyword.value = ''
      sessionPage.value = 1
      sessionList.value = []
      sessionTotal.value = 0
      if (id) loadDetail(id)
    },
    { immediate: true }
  )

  watch(
    () => props.tab,
    (tab) => {
      if (props.modelValue && tab) activeTab.value = tab
    }
  )

  watch(activeTab, (tab) => {
    if (tab === 'sessions' && detail.value && !sessionList.value.length) loadSessions()
  })

  watch(sessionStatus, () => {
    sessionPage.value = 1
    loadSessions()
  })

  async function loadDetail(id: string) {
    loading.value = true
    try {
      detail.value = await fetchGetAgentDetail(id)
      Object.assign(config, {
        model: detail.value.model,
        scope: detail.value.scope,
        temperature: detail.value.temperature,
        topP: detail.value.topP,
        maxRounds: detail.value.maxRounds,
        skills: [...detail.value.skills],
        knowledge: [...detail.value.knowledge],
        prompt: detail.value.prompt,
        fallback: detail.value.fallback
      })
      if (activeTab.value === 'sessions') loadSessions()
    } finally {
      loading.value = false
    }
  }

  async function loadSessions() {
    if (!detail.value) return
    sessionLoading.value = true
    try {
      const res = await fetchGetAgentSessions({
        agentId: detail.value.id,
        current: sessionPage.value,
        size: SESSION_PAGE_SIZE,
        status: sessionStatus.value,
        keyword: sessionKeyword.value.trim()
      })
      sessionList.value = res.records
      sessionTotal.value = res.total
    } finally {
      sessionLoading.value = false
    }
  }

  function handleSessionSearch() {
    sessionPage.value = 1
    loadSessions()
  }

  async function saveConfig() {
    if (!detail.value) return
    if (!config.prompt.trim() || !config.fallback.trim()) {
      ElMessage.warning('系统提示词与兜底策略不能为空')
      return
    }
    saving.value = true
    try {
      await fetchUpdateAgent(detail.value.id, {
        name: detail.value.name,
        role: detail.value.role,
        description: detail.value.description,
        model: config.model,
        knowledge: [...config.knowledge],
        skills: [...config.skills],
        scope: config.scope,
        temperature: config.temperature,
        topP: config.topP,
        maxRounds: config.maxRounds,
        prompt: config.prompt.trim(),
        fallback: config.fallback.trim(),
        enabled: detail.value.enabled
      })
      ElMessage.success('配置已保存')
      await loadDetail(detail.value.id)
      emit('refresh')
    } finally {
      saving.value = false
    }
  }

  const snapshotVisible = ref(false)
  const snapshot = ref<AgentVersion | null>(null)
  const snapshotTitle = computed(() =>
    snapshot.value ? `提示词快照 · ${snapshot.value.version}` : '提示词快照'
  )

  function openSnapshot(item: AgentVersion) {
    snapshot.value = item
    snapshotVisible.value = true
  }

  const publishVisible = ref(false)
  const publishing = ref(false)
  const publishForm = reactive({ version: '', note: '', prompt: '' })

  function openPublish() {
    const current = detail.value?.version ?? 'v1.0.0'
    const [major, minor] = current.slice(1).split('.').map(Number)
    publishForm.version = `v${major}.${(minor || 0) + 1}.0`
    publishForm.note = ''
    publishForm.prompt = detail.value?.prompt ?? ''
    publishVisible.value = true
  }

  async function submitPublish() {
    if (!detail.value) return
    if (!publishForm.version.trim() || !publishForm.note.trim()) {
      ElMessage.warning('请填写版本号与变更说明')
      return
    }
    publishing.value = true
    try {
      await fetchPublishAgentVersion(detail.value.id, {
        version: publishForm.version.trim(),
        note: publishForm.note.trim(),
        prompt: publishForm.prompt
      })
      ElMessage.success('新版本已发布')
      publishVisible.value = false
      await loadDetail(detail.value.id)
      emit('refresh')
    } finally {
      publishing.value = false
    }
  }

  async function handleRollback(item: AgentVersion) {
    if (!detail.value) return
    const confirmed = await ElMessageBox.confirm(
      `回滚后系统提示词将恢复为 ${item.version} 的快照，当前版本 ${detail.value.version} 将被标记为历史版本。确定回滚？`,
      '回滚版本',
      { type: 'warning', confirmButtonText: '回滚', cancelButtonText: '取消' }
    )
      .then(() => true)
      .catch(() => false)
    if (!confirmed) return

    await fetchRollbackAgentVersion(detail.value.id, item.version)
    ElMessage.success(`已回滚至 ${item.version}`)
    await loadDetail(detail.value.id)
    emit('refresh')
  }
</script>
