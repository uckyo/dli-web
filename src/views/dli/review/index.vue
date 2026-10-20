<!-- DLI 审核发布：CDSS 建议确认留痕 / 随访与干预建议发布至患者端 -->
<template>
  <div class="review-page art-full-height">
    <ElAlert
      title="审核发布说明"
      description="AI 建议须医生确认后生效；发布后患者端同步收到消息提醒"
      type="info"
      show-icon
      closable
      class="shrink-0"
    />

    <ElCard class="art-table-card">
      <ElTabs v-model="activeTab" class="review-tabs">
        <!-- 待确认建议 -->
        <ElTabPane name="review">
          <template #label>
            <span class="flex-c gap-2">
              待确认建议
              <ElBadge :value="reviews.length" :hidden="reviews.length === 0" />
            </span>
          </template>
          <div v-loading="reviewsLoading" class="h-full overflow-y-auto">
            <div v-if="reviews.length" class="flex flex-col gap-4 pb-2">
              <div v-for="item in reviews" :key="item.id" class="art-card p-5">
                <div class="flex-cb flex-wrap gap-2">
                  <div class="flex-c flex-wrap gap-2 min-w-0">
                    <span class="text-base font-medium text-g-900">{{ item.patientName }}</span>
                    <ElTag :type="PHASE_CONFIG[item.phase].tagType" size="small">
                      {{ PHASE_CONFIG[item.phase].label }}
                    </ElTag>
                    <span class="text-xs text-g-500">{{ item.id }}</span>
                  </div>
                  <div class="flex-c flex-wrap gap-3 text-xs text-g-500">
                    <span>{{ item.modelVersion }}</span>
                    <span>提交于 {{ item.submitTime }}</span>
                  </div>
                </div>
                <p class="mt-3 text-sm leading-7 text-g-700">{{ item.content }}</p>
                <div class="mt-4 pt-3 border-t border-full-d flex justify-end gap-2">
                  <ElButton type="primary" @click="openConfirm(item, 'agree')">采纳</ElButton>
                  <ElButton type="warning" plain @click="openConfirm(item, 'modify')"
                    >修改</ElButton
                  >
                  <ElButton type="danger" plain @click="openConfirm(item, 'reject')"
                    >不采纳</ElButton
                  >
                </div>
              </div>
            </div>
            <ElEmpty v-else-if="!reviewsLoading" description="暂无待确认建议" :image-size="120" />
          </div>
        </ElTabPane>

        <!-- 待发布 -->
        <ElTabPane name="publish">
          <template #label>
            <span class="flex-c gap-2">
              待发布
              <ElBadge :value="publications.length" :hidden="publications.length === 0" />
            </span>
          </template>
          <div v-loading="publicationsLoading" class="h-full">
            <ArtTable
              :data="publications"
              :columns="publicationColumns"
              :show-table-header="false"
              empty-text="暂无待发布内容"
            />
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <!-- 确认建议弹窗 -->
    <ElDialog
      v-model="dialogVisible"
      :title="currentActionConfig.title"
      width="520px"
      :close-on-click-modal="false"
    >
      <div v-if="currentReview">
        <p class="mb-2 text-sm text-g-600">建议摘要</p>
        <div class="rounded-md bg-g-100 p-3 text-sm leading-6 text-g-700">
          {{ currentReview.content }}
        </div>
        <p class="mt-4 mb-2 text-sm text-g-700">{{ currentActionConfig.opinionLabel }}</p>
        <ElInput
          v-model="opinion"
          type="textarea"
          :rows="4"
          maxlength="200"
          show-word-limit
          :placeholder="currentActionConfig.placeholder"
        />
      </div>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submitConfirm">确认提交</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchConfirmReview,
    fetchGetPendingPublications,
    fetchGetPendingReviews,
    fetchPublishItem
  } from '@/mock/dli/api'
  import type { AssessPhase, PendingReview } from '@/mock/dli/types'
  import type { ColumnOption } from '@/types/component'
  import { ElButton, ElMessageBox, ElTag } from 'element-plus'

  defineOptions({ name: 'DliReview' })

  type TagType = 'success' | 'warning' | 'info' | 'danger' | 'primary'
  type ReviewAction = 'agree' | 'modify' | 'reject'
  type PendingPublication = Awaited<ReturnType<typeof fetchGetPendingPublications>>[number]

  /** 评估阶段展示配置 */
  const PHASE_CONFIG: Record<AssessPhase, { label: string; tagType: TagType }> = {
    pre: { label: '治疗前', tagType: 'primary' },
    during: { label: '治疗中', tagType: 'warning' },
    post: { label: '诊断后', tagType: 'success' }
  }

  /** 确认动作弹窗配置 */
  const ACTION_CONFIG: Record<
    ReviewAction,
    { title: string; opinionLabel: string; placeholder: string; success: string }
  > = {
    agree: {
      title: '采纳建议',
      opinionLabel: '确认意见（选填）',
      placeholder: '可补充采纳说明',
      success: '已采纳该建议并留痕'
    },
    modify: {
      title: '修改建议',
      opinionLabel: '修改意见（必填）',
      placeholder: '请填写修改后的建议内容',
      success: '已提交修改意见并留痕'
    },
    reject: {
      title: '不采纳建议',
      opinionLabel: '不采纳理由（必填）',
      placeholder: '请填写不采纳理由',
      success: '已提交不采纳意见并留痕'
    }
  }

  const activeTab = ref('review')

  // 待确认建议
  const reviews = ref<PendingReview[]>([])
  const reviewsLoading = ref(true)

  // 待发布内容
  const publications = ref<PendingPublication[]>([])
  const publicationsLoading = ref(true)

  // 确认弹窗
  const dialogVisible = ref(false)
  const currentReview = ref<PendingReview>()
  const currentAction = ref<ReviewAction>('agree')
  const opinion = ref('')
  const submitting = ref(false)

  const currentActionConfig = computed(() => ACTION_CONFIG[currentAction.value])

  /** 待发布列表列配置 */
  const publicationColumns: ColumnOption<PendingPublication>[] = [
    {
      prop: 'type',
      label: '类型',
      width: 120,
      formatter: (row) =>
        h(ElTag, { type: row.type === '随访计划' ? 'primary' : 'warning' }, () => row.type)
    },
    { prop: 'patientName', label: '患者', minWidth: 190 },
    { prop: 'content', label: '发布内容', minWidth: 300, showOverflowTooltip: true },
    { prop: 'confirmDoctor', label: '确认医生', width: 120 },
    { prop: 'confirmTime', label: '确认时间', width: 160 },
    {
      prop: 'operation',
      label: '操作',
      width: 100,
      fixed: 'right',
      formatter: (row) =>
        h(ElButton, { link: true, type: 'primary', onClick: () => publishItem(row) }, () => '发布')
    }
  ]

  /**
   * 加载待确认建议与待发布内容
   */
  const loadData = async (): Promise<void> => {
    try {
      const [reviewRes, publicationRes] = await Promise.all([
        fetchGetPendingReviews(),
        fetchGetPendingPublications()
      ])
      reviews.value = reviewRes
      publications.value = publicationRes
    } finally {
      reviewsLoading.value = false
      publicationsLoading.value = false
    }
  }

  /**
   * 打开确认弹窗
   */
  const openConfirm = (review: PendingReview, action: ReviewAction): void => {
    currentReview.value = review
    currentAction.value = action
    opinion.value = ''
    dialogVisible.value = true
  }

  /**
   * 提交确认意见（修改 / 不采纳必填意见）
   */
  const submitConfirm = async (): Promise<void> => {
    const review = currentReview.value
    if (!review) return

    const action = currentAction.value
    const text = opinion.value.trim()
    if (action !== 'agree' && !text) {
      ElMessage.warning(action === 'modify' ? '请填写修改意见' : '请填写不采纳理由')
      return
    }

    submitting.value = true
    try {
      await fetchConfirmReview(review.id, action, text)
      reviews.value = reviews.value.filter((item) => item.id !== review.id)
      ElMessage.success(ACTION_CONFIG[action].success)
      dialogVisible.value = false
    } finally {
      submitting.value = false
    }
  }

  /**
   * 发布至患者端
   */
  const publishItem = (row: PendingPublication): void => {
    ElMessageBox.confirm(`确认将「${row.content}」发布至患者端？`, '发布确认', {
      confirmButtonText: '确认发布',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        await fetchPublishItem(row.id)
        publications.value = publications.value.filter((item) => item.id !== row.id)
        ElMessage.success('已发布至患者端，患者将收到消息提醒')
      })
      .catch(() => {})
  }

  onMounted(loadData)
</script>

<style lang="scss" scoped>
  .review-tabs {
    display: flex;
    flex-direction: column;
    height: 100%;

    :deep(.el-tabs__content) {
      flex: 1;
      min-height: 0;
    }

    :deep(.el-tab-pane) {
      height: 100%;
    }
  }
</style>
