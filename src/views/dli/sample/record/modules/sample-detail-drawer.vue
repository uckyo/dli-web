<!-- 样本详情抽屉：基本信息、SOP、流转记录与源库同步处理 [批注 07] -->
<template>
  <ElDrawer
    v-model="visible"
    :title="`样本详情 · ${detail?.name ?? sample?.name ?? ''}`"
    size="600px"
  >
    <div v-if="detail" class="flex h-full flex-col">
      <ElTabs v-model="tab" class="flex-1 overflow-hidden">
        <ElTabPane label="基本信息" name="detail">
          <div class="h-full overflow-y-auto pr-1">
            <ElDescriptions :column="2" border size="small" label-width="88px">
              <ElDescriptionsItem label="样本编号" :span="2">
                {{ detail.id }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="样本名称">{{ detail.name }}</ElDescriptionsItem>
              <ElDescriptionsItem label="样本类型">{{ detail.type }}</ElDescriptionsItem>
              <ElDescriptionsItem label="患者编号">{{ detail.patientId }}</ElDescriptionsItem>
              <ElDescriptionsItem label="所属中心">{{ detail.center }}</ElDescriptionsItem>
              <ElDescriptionsItem label="采集时间">{{ detail.collectedAt }}</ElDescriptionsItem>
              <ElDescriptionsItem label="入库时间">{{ detail.storedAt }}</ElDescriptionsItem>
              <ElDescriptionsItem label="剩余样本量">
                {{ detail.remaining }} {{ detail.unit }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="样本状态">
                <ElTag :type="SAMPLE_STATUS_TAG[detail.status]" effect="plain" size="small">
                  {{ detail.status }}
                </ElTag>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="保存位置">{{ detail.location }}</ElDescriptionsItem>
              <ElDescriptionsItem label="共享级别">{{ detail.shareLevel }}</ElDescriptionsItem>
              <ElDescriptionsItem label="操作者">{{ detail.operator }}</ElDescriptionsItem>
              <ElDescriptionsItem label="设备及位置" :span="2">
                {{ detail.device }}
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
              <p class="mb-2 text-sm font-medium text-g-900">SOP</p>
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

        <ElTabPane label="流转记录" name="flow">
          <div class="h-full overflow-y-auto pr-1">
            <ElTable :data="flowDesc" size="small" border>
              <ElTableColumn prop="time" label="流转时间" width="140" />
              <ElTableColumn prop="action" label="流转类型" width="92" />
              <ElTableColumn label="流转数量及单位" width="130">
                <template #default="{ row }">{{ row.quantity }} {{ row.unit }}</template>
              </ElTableColumn>
              <ElTableColumn prop="from" label="起始位置" min-width="130" show-overflow-tooltip />
              <ElTableColumn prop="to" label="目标位置" min-width="130" show-overflow-tooltip />
              <ElTableColumn prop="operator" label="操作者" width="92" />
            </ElTable>
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
  import type { SampleRecord } from '@/mock/dli/types'
  import { useUserStore } from '@/store/modules/user'
  import { SAMPLE_STATUS_TAG, SYNC_STATUS_TAG } from '../../format'

  defineOptions({ name: 'SampleDetailDrawer' })

  const props = defineProps<{
    modelValue: boolean
    sample?: SampleRecord
    tab?: 'detail' | 'flow'
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

  const tab = ref<'detail' | 'flow'>(props.tab ?? 'detail')
  const detail = ref<SampleRecord>()
  const syncDialogVisible = ref(false)
  const syncNoteInput = ref('')
  const syncing = ref(false)

  const flowDesc = computed(() => [...(detail.value?.flow ?? [])].reverse())
  const canHandleSync = computed(
    () => role.value === 'R_SYS' && Boolean(detail.value && detail.value.syncStatus !== '正常')
  )

  async function loadDetail() {
    if (!props.sample?.id) {
      detail.value = props.sample
      return
    }
    /** 先用列表行填充避免抽屉闪烁，再按编号读取数据层最新状态 */
    detail.value = { ...props.sample }
    const fresh = await fetchGetSampleById(props.sample.id)
    if (fresh) detail.value = fresh
  }

  watch(
    () => [props.modelValue, props.sample?.id, props.tab] as const,
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
    const ok = await ElMessageBox.confirm('将从源库重新同步该样本记录，确认继续？', '重新同步', {
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
      await fetchHandleSampleSync({
        kind: 'sample',
        id: detail.value.id,
        action,
        operator: operatorName.value,
        role: role.value,
        note
      })
      ElMessage.success('同步状态已更新')
      syncDialogVisible.value = false
      await loadDetail()
      emit('synced')
    } catch (error) {
      ElMessage.error((error as Error).message)
    } finally {
      syncing.value = false
    }
  }
</script>
