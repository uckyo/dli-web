<!-- 检测详情抽屉：批次对应关系、多指标、SOP、质控与附件受控预览 [批注 07] -->
<template>
  <ElDrawer
    v-model="visible"
    :title="`检测详情 · ${detail?.item ?? record?.item ?? ''}`"
    size="720px"
  >
    <div v-if="detail" class="flex h-full flex-col">
      <ElTabs v-model="tab" class="flex-1 overflow-hidden">
        <ElTabPane label="基本信息" name="detail">
          <div class="h-full overflow-y-auto pr-1">
            <ElDescriptions :column="2" border size="small" label-width="92px">
              <ElDescriptionsItem label="检测编号" :span="2">
                {{ detail.id }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="检测类型">{{ detail.type }}</ElDescriptionsItem>
              <ElDescriptionsItem label="检测项目">{{ detail.item }}</ElDescriptionsItem>
              <ElDescriptionsItem label="检测批次">{{ detail.batch }}</ElDescriptionsItem>
              <ElDescriptionsItem label="所属中心">{{ detail.center }}</ElDescriptionsItem>
              <ElDescriptionsItem label="主关联样本" :span="2">
                {{ sample?.name ?? '—' }}（{{ detail.sampleId }}）
              </ElDescriptionsItem>
              <ElDescriptionsItem label="采集时点">{{ detail.collectedAt }}</ElDescriptionsItem>
              <ElDescriptionsItem label="检测时间">{{ detail.testedAt }}</ElDescriptionsItem>
              <ElDescriptionsItem label="检测状态">
                <ElTag :type="TEST_STATUS_TAG[detail.status]" effect="light" size="small">
                  {{ detail.status }}
                </ElTag>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="操作者">{{ detail.operator }}</ElDescriptionsItem>
              <ElDescriptionsItem label="结果录入" :span="2">
                {{ detail.recordedAt }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="SOP 名称" :span="2">
                {{ detail.sopName }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="SOP 版本">{{ detail.sopVersion }}</ElDescriptionsItem>
              <ElDescriptionsItem label="来源系统">{{ detail.sourceSystem }}</ElDescriptionsItem>
              <ElDescriptionsItem label="最近同步时间">
                {{ detail.lastSyncedAt }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="同步状态">
                <ElTag :type="SYNC_STATUS_TAG[detail.syncStatus]" effect="plain" size="small">
                  {{ detail.syncStatus }}
                </ElTag>
              </ElDescriptionsItem>
              <ElDescriptionsItem v-if="detail.syncNote" label="核对说明" :span="2">
                {{ detail.syncNote }}
              </ElDescriptionsItem>
            </ElDescriptions>

            <div class="mt-5">
              <p class="mb-2 text-sm font-medium text-g-900">
                样本-患者对应关系（{{ detail.linkedSamples.length }} 份）
              </p>
              <ElTable :data="detail.linkedSamples" size="small" border>
                <ElTableColumn prop="sampleId" label="样本编号" min-width="205" />
                <ElTableColumn prop="patientId" label="患者编号" width="130" />
                <ElTableColumn prop="center" label="所属中心" width="100" />
                <ElTableColumn prop="type" label="样本类型" width="90" />
                <ElTableColumn prop="collectedAt" label="采集时点" width="150" />
                <ElTableColumn prop="role" label="批次内角色" width="110" />
              </ElTable>
            </div>

            <div class="mt-5">
              <p class="mb-2 text-sm font-medium text-g-900">检测指标</p>
              <ElTable :data="detail.indicators" size="small" border>
                <ElTableColumn prop="name" label="指标名称" min-width="160" />
                <ElTableColumn prop="result" label="结果" width="100" />
                <ElTableColumn prop="unit" label="单位" width="100" />
                <ElTableColumn prop="range" label="参考范围" width="120" />
              </ElTable>
            </div>

            <div class="mt-5">
              <p class="mb-2 text-sm font-medium text-g-900">检测 SOP</p>
              <ElDescriptions :column="1" border size="small" label-width="88px">
                <ElDescriptionsItem
                  v-for="step in detail.sop"
                  :key="step.stage"
                  :label="step.stage"
                >
                  {{ step.content }}
                </ElDescriptionsItem>
              </ElDescriptions>
            </div>
          </div>
        </ElTabPane>

        <ElTabPane label="质控与数据" name="report">
          <div class="h-full overflow-y-auto pr-1">
            <ElDescriptions :column="1" border size="small" label-width="92px">
              <ElDescriptionsItem label="质控结论">
                <ElTag :type="QC_TAG[detail.qc]" effect="light" size="small">
                  {{ detail.qc }}
                </ElTag>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="表达谱">{{ detail.expression }}</ElDescriptionsItem>
              <ElDescriptionsItem label="共享级别">{{ detail.shareLevel }}</ElDescriptionsItem>
            </ElDescriptions>

            <div class="mt-5">
              <p class="mb-2 text-sm font-medium text-g-900">报告／数据文件（受控预览）</p>
              <ElTable :data="previewFiles" size="small" border>
                <ElTableColumn prop="name" label="文件名称" min-width="220" show-overflow-tooltip />
                <ElTableColumn prop="type" label="文件类型" width="120" />
                <ElTableColumn prop="size" label="文件体量" width="110" />
                <ElTableColumn prop="access" label="访问方式" width="110" />
                <ElTableColumn prop="download" label="下载" width="90" />
              </ElTable>
            </div>
          </div>
        </ElTabPane>
      </ElTabs>

      <div v-if="canHandleSync" class="flex-c gap-2 pt-3">
        <ElTag :type="SYNC_STATUS_TAG[detail.syncStatus]" effect="plain" size="small">
          同步{{ detail.syncStatus }}
        </ElTag>
        <ElButton size="small" type="primary" :loading="syncing" @click="openSyncCheck">
          标记已核对
        </ElButton>
        <ElButton size="small" :loading="syncing" @click="resync">重新同步</ElButton>
      </div>
    </div>

    <ElDialog v-model="syncDialogVisible" title="标记已核对" width="420px" append-to-body>
      <ElForm label-width="88px">
        <ElFormItem label="核对说明">
          <ElInput v-model="syncNoteInput" type="textarea" :rows="3" placeholder="填写核对说明" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="syncDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="syncing" @click="submitSyncCheck">确认</ElButton>
      </template>
    </ElDialog>
  </ElDrawer>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { fetchGetSampleById, fetchHandleSampleSync } from '@/mock/dli/api'
  import type { SampleSyncAction } from '@/mock/dli/api'
  import type { SampleRecord, SampleTestRecord } from '@/mock/dli/types'
  import { useUserStore } from '@/store/modules/user'
  import { QC_TAG, SYNC_STATUS_TAG, TEST_STATUS_TAG } from '../../format'

  defineOptions({ name: 'SampleTestDetailDrawer' })

  const props = defineProps<{
    modelValue: boolean
    record?: SampleTestRecord
    tab?: 'detail' | 'report'
    /** 患者详情嵌入模式：对应关系只保留该患者，不重新拉取完整批次 */
    patientId?: string
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    synced: []
  }>()

  const userStore = useUserStore()
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const operatorName = computed(() => userStore.getUserInfo.userName || '当前医护')

  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const tab = ref<'detail' | 'report'>(props.tab ?? 'detail')
  const detail = ref<SampleTestRecord>()
  const sample = ref<SampleRecord>()
  const syncDialogVisible = ref(false)
  const syncNoteInput = ref('')
  const syncing = ref(false)

  const canHandleSync = computed(
    () => role.value === 'R_SYS' && Boolean(detail.value && detail.value.syncStatus !== '正常')
  )

  const previewFiles = computed(() => {
    if (!detail.value) return []
    return [
      {
        name: `${detail.value.qcReport}.pdf`,
        type: '质控报告 PDF',
        size: '1.2 MB',
        access: '受控预览',
        download: '未开放'
      },
      {
        name: detail.value.dataFile,
        type: '原始数据',
        size: `${(detail.value.dataSizeGb / 1000).toFixed(2)} TB`,
        access: '受控预览',
        download: '未开放'
      }
    ]
  })

  async function loadDetail() {
    detail.value = props.record
      ? { ...props.record, linkedSamples: props.record.linkedSamples.map((item) => ({ ...item })) }
      : undefined
    sample.value = detail.value ? await fetchGetSampleById(detail.value.sampleId) : undefined
  }

  watch(
    () => [props.modelValue, props.record?.id, props.tab] as const,
    async ([open, , nextTab]) => {
      if (!open) return
      tab.value = nextTab ?? 'detail'
      await loadDetail()
    },
    { immediate: true }
  )

  function openSyncCheck() {
    syncNoteInput.value = ''
    syncDialogVisible.value = true
  }

  async function resync() {
    const ok = await ElMessageBox.confirm('将从源库重新同步该检测记录，确认继续？', '重新同步', {
      type: 'warning'
    })
      .then(() => true)
      .catch(() => false)
    if (!ok) return
    await doSync('重新同步')
  }

  async function submitSyncCheck() {
    await doSync('标记已核对', syncNoteInput.value)
  }

  async function doSync(action: SampleSyncAction, note?: string) {
    if (!detail.value) return
    syncing.value = true
    try {
      const updated = (await fetchHandleSampleSync({
        kind: 'test',
        id: detail.value.id,
        action,
        operator: operatorName.value,
        role: role.value,
        note
      })) as SampleTestRecord
      detail.value = {
        ...detail.value,
        syncStatus: updated.syncStatus,
        lastSyncedAt: updated.lastSyncedAt,
        syncNote: updated.syncNote
      }
      ElMessage.success('同步状态已更新')
      syncDialogVisible.value = false
      emit('synced')
    } catch (error) {
      ElMessage.error((error as Error).message)
    } finally {
      syncing.value = false
    }
  }
</script>
