<!-- DLI 研究项目详情独立页面 [批注 08/12/15]：顶部项目信息 + 数据分析 / 研究进度 / 研究资料 -->
<template>
  <div class="dli-rd-page art-full-height overflow-y-auto pb-5">
    <!-- 面包屑 -->
    <div class="dli-rd-crumb">
      <ElButton link @click="goBack">
        <ArtSvgIcon icon="ri:arrow-left-s-line" class="dli-rd-back-icon" />返回
      </ElButton>
      <span class="dli-rd-crumb-sep">/</span>
      <span>研究管理</span>
      <span class="dli-rd-crumb-sep">/</span>
      <span>项目详情</span>
    </div>

    <!-- 项目概览：吸顶常驻 -->
    <section class="dli-rd-hero">
      <div class="dli-rd-hero-main">
        <div class="dli-rd-icon"><ArtSvgIcon icon="ri:flask-line" /></div>
        <div class="dli-rd-hero-id">
          <div class="dli-rd-title">
            <h1>{{ research?.name ?? '研究项目' }}</h1>
            <ElTag effect="light" type="primary">{{ research?.id ?? projectId }}</ElTag>
            <ElTag effect="plain">{{ research?.status ?? '—' }}</ElTag>
            <ElTag effect="plain" :type="research?.shared ? 'success' : 'info'">
              {{ research?.shared ? `已共享 · ${research.shareLevel}` : '未共享' }}
            </ElTag>
            <ElTag v-if="!isClinical" effect="plain" type="warning">管理端只读</ElTag>
          </div>
          <p class="dli-rd-sub">
            分组维度 {{ research?.groupBy.join('、') || '—' }}
            <span class="dli-rd-dot">·</span>
            观察指标 {{ research?.indicators.join('、') || '—' }}
          </p>
        </div>
        <div class="dli-rd-actions">
          <ElButton @click="openChat">Agent 对话</ElButton>
          <ElButton v-if="isClinical" type="primary" @click="openShare">共享设置</ElButton>
        </div>
      </div>
      <div class="dli-rd-metrics">
        <div v-for="item in metrics" :key="item.label" class="dli-rd-metric">
          <p class="dli-rd-metric-label">{{ item.label }}</p>
          <p class="dli-rd-metric-value">{{ item.value }}</p>
        </div>
      </div>
    </section>

    <!-- 三页签：Tab 放在卡片内，与患者详情保持一致的视觉语言；详情数据就绪后再挂载面板 -->
    <ElCard v-if="research && !loading" class="dli-rd-card">
      <ElTabs v-model="activeTab" class="dli-rd-tabs">
        <ElTabPane label="数据分析" name="analysis">
          <AnalysisPanel
            :project-id="projectId"
            :research="research"
            :readonly="!isClinical"
            :refresh-key="refreshKey"
            @condition-change="handleConditionChange"
            @open-agent="openChat"
          />
        </ElTabPane>
        <ElTabPane label="研究进度" name="progress">
          <ProgressPanel :project-id="projectId" :readonly="!isClinical" />
        </ElTabPane>
        <ElTabPane label="研究资料" name="material">
          <MaterialPanel :project-id="projectId" :readonly="!isClinical" />
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <!-- Agent 对话：带入项目及当前所选分析条件 -->
    <ResearchChat
      v-model="chatVisible"
      :research="research"
      :readonly="!isClinical"
      :condition="analysisCondition"
      @saved="handleResultSaved"
    />

    <!-- 共享设置：与列表行内复用同一弹窗 -->
    <ResearchShareDialog v-model="shareVisible" :research="research" @saved="reloadResearch" />
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElCard, ElMessage, ElTabPane, ElTabs, ElTag } from 'element-plus'
  import { computed, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { fetchGetResearchById } from '@/mock/dli/api'
  import type { ResearchItem } from '@/mock/dli/types'
  import { fetchEnsureResearchProjectDetail } from '@/mock/dli/blueprint/api'
  import type { AnalysisCondition } from '@/mock/dli/blueprint/types'
  import { useUserStore } from '@/store/modules/user'
  import AnalysisPanel from './modules/analysis-panel.vue'
  import MaterialPanel from './modules/material-panel.vue'
  import ProgressPanel from './modules/progress-panel.vue'
  import ResearchChat from './modules/research-chat.vue'
  import ResearchShareDialog from './modules/research-share-dialog.vue'

  defineOptions({ name: 'DliResearchDetail' })

  const CLINICAL_ROLES = ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE']
  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const isClinical = computed(() => CLINICAL_ROLES.includes(role.value))

  const projectId = computed(() => String(route.params.id ?? ''))
  const research = ref<ResearchItem>()
  const loading = ref(true)
  const activeTab = ref('analysis')
  const refreshKey = ref(0)

  const chatVisible = ref(false)
  const shareVisible = ref(false)
  const analysisCondition = ref<AnalysisCondition>()

  const metrics = computed(() => [
    { label: '研究编号', value: research.value?.id ?? '—' },
    { label: '项目负责人', value: research.value?.owner ?? '—' },
    { label: '所属中心', value: research.value?.center ?? '—' },
    { label: '成员数量', value: String(research.value?.members ?? '—') },
    { label: '共享范围', value: research.value?.shared ? research.value.shareLevel : '仅项目成员' },
    { label: '最近更新时间', value: research.value?.updatedAt ?? '—' }
  ])

  /** 返回上一页：从列表进入回列表并保留筛选，其它入口回来源页；直开 URL 兜底回列表 */
  function goBack() {
    const back = (window.history.state as { back?: string } | null)?.back
    if (back) {
      router.back()
    } else {
      void router.push('/dli/research')
    }
  }

  function handleConditionChange(condition: AnalysisCondition) {
    analysisCondition.value = condition
  }

  function openChat() {
    chatVisible.value = true
  }

  function openShare() {
    shareVisible.value = true
  }

  function handleResultSaved() {
    refreshKey.value += 1
  }

  async function reloadResearch() {
    const row = await fetchGetResearchById(projectId.value)
    if (row) research.value = row
  }

  onMounted(async () => {
    if (!projectId.value) {
      ElMessage.error('缺少研究项目编号')
      void router.replace('/dli/research')
      return
    }
    try {
      const row = await fetchGetResearchById(projectId.value)
      if (!row) {
        ElMessage.error('研究项目不存在')
        void router.replace('/dli/research')
        return
      }
      research.value = row
      // 列表项目首次进入详情时补齐详情 / 进度 / 资料 / 清单数据
      await fetchEnsureResearchProjectDetail(row)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '研究项目加载失败')
    } finally {
      loading.value = false
    }
  })
</script>

<style lang="scss">
  /* 研究项目详情页 + 三个页签面板共用，类名全部带 dli- 前缀 */

  .dli-rd-page {
    padding: 16px 18px 20px;
  }

  .dli-rd-crumb {
    display: flex;
    flex: 0 0 auto;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;
    font-size: 12px;
    color: var(--art-gray-600);
  }

  .dli-rd-crumb .el-button {
    height: auto;
    padding: 0;
    font-size: 12px;
  }

  .dli-rd-back-icon {
    margin-right: 2px;
    font-size: 15px;
  }

  .dli-rd-crumb-sep {
    color: var(--art-gray-400);
  }

  .dli-rd-hero {
    position: sticky;
    top: 0;
    z-index: 12;
    flex: 0 0 auto;
    margin-bottom: 16px;
    overflow: hidden;
    background: var(--default-box-color);
    border: 1px solid var(--art-card-border);
    border-radius: 10px;
    box-shadow: 0 4px 18px rgb(0 0 0 / 3.5%);
  }

  .dli-rd-hero-main {
    display: flex;
    gap: 16px;
    align-items: center;
    padding: 18px 20px 16px;
  }

  .dli-rd-icon {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    font-size: 22px;
    color: #fff;
    background: linear-gradient(135deg, var(--el-color-primary), var(--art-secondary));
    border-radius: 13px;
  }

  .dli-rd-hero-id {
    flex: 1;
    min-width: 0;
  }

  .dli-rd-title {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
    align-items: center;
  }

  .dli-rd-title h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--art-gray-900);
    letter-spacing: 0.2px;
  }

  .dli-rd-title .el-tag {
    border-radius: 999px;
  }

  .dli-rd-sub {
    margin: 7px 0 0;
    font-size: 12px;
    color: var(--art-gray-600);
  }

  .dli-rd-dot {
    margin: 0 6px;
    color: var(--art-gray-400);
  }

  .dli-rd-actions {
    display: flex;
    flex: none;
    gap: 8px;
  }

  .dli-rd-metrics {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    background: var(--art-gray-100);
    border-top: 1px solid var(--art-gray-200);
  }

  .dli-rd-metric {
    min-width: 0;
    padding: 11px 16px 12px;
    border-right: 1px solid var(--art-gray-200);

    &:last-child {
      border-right: none;
    }
  }

  .dli-rd-metric-label {
    margin: 0 0 3px;
    font-size: 11px;
    color: var(--art-gray-500);
  }

  .dli-rd-metric-value {
    margin: 0;
    overflow: hidden;
    font-size: 13px;
    font-weight: 600;
    color: var(--art-gray-900);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dli-rd-card {
    flex: 0 0 auto;
    border: 1px solid var(--art-card-border);
    border-radius: 10px;
    box-shadow: 0 4px 18px rgb(0 0 0 / 3.5%);
  }

  .dli-rd-tabs {
    > .el-tabs__header {
      margin-bottom: 16px;
    }
  }

  .dli-research-panel {
    min-height: 420px;
  }

  .dli-research-filter {
    padding: 12px 14px 0;
    margin-bottom: 10px;
    background: var(--art-gray-100);
    border-radius: 8px;
  }

  .dli-research-hint {
    margin: 0 0 14px;
    font-size: 12px;
    line-height: 20px;
    color: var(--art-gray-500);
  }

  .dli-research-section-head {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .dli-research-section-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--art-gray-900);
  }

  .dli-research-toolbar {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .dli-research-criteria-head {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  @media (width <= 1200px) {
    .dli-rd-metrics {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .dli-rd-metric:nth-child(3n) {
      border-right: none;
    }
  }
</style>
