<!-- 项目详情 · 研究资料 [批注 15]：资料上传 / 更新 / 预览（mock），入组清单版本与医生确认 -->
<template>
  <div class="dli-research-panel">
    <div class="dli-research-toolbar">
      <div>
        <span class="dli-research-section-title">方案与伦理材料</span>
        <ElTag effect="plain" size="small" class="ml-2">共 {{ materials.length }} 份</ElTag>
      </div>
      <div class="flex-c gap-2">
        <ElButton @click="openCriteria">入组清单</ElButton>
        <ElButton v-if="!readonly" type="primary" @click="openMaterial()">上传资料</ElButton>
      </div>
    </div>

    <ArtTable
      v-loading="loading"
      :data="materials"
      :columns="columns"
      :height="360"
      empty-text="暂无研究资料"
    />

    <p class="dli-research-hint">
      演示环境仅保存资料名称、版本与文件信息；医生维护正式资料，助理 /
      护士可协助草稿，待医生确认后生效。入组清单需医生确认版本后才供患者详情研究入组使用。
    </p>

    <!-- 上传 / 更新资料 -->
    <ElDialog
      v-model="materialVisible"
      :title="materialForm.id ? '更新研究资料' : '上传研究资料'"
      width="560px"
      destroy-on-close
    >
      <ElForm :model="materialForm" label-width="100px">
        <ElFormItem label="资料名称" required>
          <ElInput v-model="materialForm.name" placeholder="例如：研究方案" />
        </ElFormItem>
        <ElFormItem label="资料类型" required>
          <ElSelect v-model="materialForm.type" class="w-full">
            <ElOption v-for="item in MATERIAL_TYPES" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="版本" required>
          <ElInput v-model="materialForm.version" placeholder="例如：V2.0" />
        </ElFormItem>
        <ElFormItem label="资料文件" required>
          <ElUpload
            v-model:file-list="fileList"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
          >
            <ElButton>选择文件</ElButton>
            <template #tip>
              <div class="el-upload__tip">仅记录文件信息用于演示，不会上传或存储真实文件</div>
            </template>
          </ElUpload>
        </ElFormItem>
      </ElForm>
      <p v-if="!isDoctor" class="mt-2 text-xs leading-5 text-g-500">
        当前账号将以「协助草稿」保存，不会直接覆盖医生维护的正式资料，需医生确认后生效。
      </p>
      <template #footer>
        <ElButton @click="materialVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submitMaterial">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 预览（mock） -->
    <ElDialog v-model="previewVisible" title="资料预览" width="520px">
      <ElDescriptions v-if="previewRow" :column="1" border>
        <ElDescriptionsItem label="资料编号">{{ previewRow.id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="资料名称">{{ previewRow.name }}</ElDescriptionsItem>
        <ElDescriptionsItem label="资料类型">{{ previewRow.type }}</ElDescriptionsItem>
        <ElDescriptionsItem label="版本">{{ previewRow.version }}</ElDescriptionsItem>
        <ElDescriptionsItem label="文件名">{{ previewRow.fileName || '—' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="文件大小">{{ previewRow.fileSize || '—' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="更新人">{{ previewRow.updatedBy || '—' }}</ElDescriptionsItem>
      </ElDescriptions>
      <p class="mt-3 text-xs leading-5 text-g-500">
        {{ previewRow?.previewNote || '演示环境仅展示文件信息，不提供真实文件预览与下载。' }}
      </p>
    </ElDialog>

    <!-- 入组清单宽弹窗 [批注 15]：版本记录 + 条目维护 + 医生确认 -->
    <ElDialog v-model="criteriaVisible" title="入组清单" width="1080px" destroy-on-close>
      <div class="dli-research-criteria-head">
        <div class="dli-research-section-head">
          <span class="dli-research-section-title">版本记录</span>
          <ElTag effect="plain" size="small">方案版本 {{ planVersion }}</ElTag>
          <ElTag effect="plain" size="small" class="ml-2">
            当前清单版本 {{ effectiveVersion || '—' }}
          </ElTag>
        </div>
        <div class="flex-c gap-2">
          <ElButton v-if="!readonly" @click="addItem">新增条目</ElButton>
          <ElButton v-if="!readonly" :loading="saving" @click="saveDraft"
            >保存为新版本草稿</ElButton
          >
          <ElButton
            v-if="isDoctor"
            type="primary"
            :disabled="!canConfirm"
            :loading="saving"
            @click="confirmVersion"
          >
            确认该版本
          </ElButton>
        </div>
      </div>

      <ElTable
        :data="criteriaLists"
        border
        size="small"
        highlight-current-row
        @current-change="selectList"
      >
        <ElTableColumn prop="version" label="清单版本" width="110" />
        <ElTableColumn prop="planVersion" label="方案版本" width="110" />
        <ElTableColumn label="状态" width="110">
          <template #default="{ row }">
            <ElTag
              effect="plain"
              size="small"
              :type="
                row.status === '已确认' ? 'success' : row.status === '草稿' ? 'warning' : 'info'
              "
            >
              {{ row.status }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="条目数" width="90">
          <template #default="{ row }">{{ row.items.length }}</template>
        </ElTableColumn>
        <ElTableColumn prop="confirmedBy" label="确认人" width="110" />
        <ElTableColumn prop="confirmedAt" label="确认时间" width="170" />
        <ElTableColumn prop="updatedAt" label="更新时间" width="170" />
        <ElTableColumn label="操作" width="120" align="center">
          <template #default="{ row }">
            <ElButton link type="primary" @click="viewList(row)">查看条目</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="dli-research-section-head mt-4">
        <span class="dli-research-section-title">清单条目 · {{ editingVersion }}</span>
        <span class="text-xs text-g-500">纳入 / 排除分开，保存草稿后需医生确认才生效</span>
      </div>
      <ElTable :data="draftItems" border size="small" max-height="300">
        <ElTableColumn label="序号" width="70" type="index" />
        <ElTableColumn label="条件类型" width="150">
          <template #default="{ row }">
            <ElSelect v-model="row.type" size="small" :disabled="readonly">
              <ElOption label="纳入条件" value="纳入条件" />
              <ElOption label="排除条件" value="排除条件" />
            </ElSelect>
          </template>
        </ElTableColumn>
        <ElTableColumn label="条件内容" minWidth="330">
          <template #default="{ row }">
            <ElInput v-model="row.content" size="small" :disabled="readonly" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="所需依据资料" minWidth="220">
          <template #default="{ row }">
            <ElInput v-model="row.basis" size="small" :disabled="readonly" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="显示顺序" width="110" align="center">
          <template #default="{ row }">
            <ElInputNumber
              v-model="row.displayOrder"
              size="small"
              :min="1"
              :max="999"
              controls-position="right"
              :disabled="readonly"
              class="w-full"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="90" align="center">
          <template #default="{ $index }">
            <ElButton link type="danger" :disabled="readonly" @click="removeItem($index)"
              >删除</ElButton
            >
          </template>
        </ElTableColumn>
      </ElTable>

      <p class="mt-3 text-xs leading-5 text-g-500">
        上传文件或 Agent
        文字不会自动成为生效规则；确认新版本后，已完成核对的入组记录仍保留当时版本，
        新申请入组使用最新生效版本。
      </p>
      <template #footer>
        <ElButton @click="criteriaVisible = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElDescriptions,
    ElDescriptionsItem,
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElInputNumber,
    ElMessage,
    ElMessageBox,
    ElOption,
    ElSelect,
    ElTable,
    ElTableColumn,
    ElTag,
    ElUpload
  } from 'element-plus'
  import type { UploadFile, UploadUserFile } from 'element-plus'
  import { computed, h, onMounted, reactive, ref } from 'vue'
  import type { ColumnOption } from '@/types/component'
  import {
    fetchConfirmCriteriaList,
    fetchConfirmResearchMaterialDraft,
    fetchGetCriteriaLists,
    fetchGetResearchMaterials,
    fetchSaveCriteriaList,
    fetchSaveResearchMaterial
  } from '@/mock/dli/blueprint/api'
  import type {
    ResearchCriteriaItem,
    ResearchCriteriaList,
    ResearchMaterial
  } from '@/mock/dli/blueprint/types'
  import { useUserStore } from '@/store/modules/user'

  defineOptions({ name: 'ResearchMaterialPanel' })

  const props = defineProps<{
    projectId: string
    readonly: boolean
  }>()

  const MATERIAL_TYPES: ResearchMaterial['type'][] = [
    '研究方案',
    '伦理材料',
    '评价材料',
    '入组清单'
  ]
  const userStore = useUserStore()
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const isDoctor = computed(() => role.value === 'R_DOCTOR')

  const loading = ref(false)
  const saving = ref(false)
  const materials = ref<ResearchMaterial[]>([])

  const columns = computed<ColumnOption<ResearchMaterial>[]>(() => [
    {
      prop: 'name',
      label: '资料名称',
      minWidth: 220,
      formatter: (row: ResearchMaterial) =>
        h('span', { class: 'flex-c gap-2' }, [
          h('span', {}, row.name),
          row.maintainStatus === '草稿'
            ? h(ElTag, { effect: 'plain', size: 'small', type: 'warning' }, () => '草稿待确认')
            : null
        ])
    },
    { prop: 'type', label: '资料类型', width: 130 },
    { prop: 'version', label: '资料版本', width: 120 },
    { prop: 'updatedAt', label: '更新时间', width: 180 },
    {
      prop: 'operation',
      label: '操作',
      width: 210,
      fixed: 'right' as const,
      align: 'center' as const,
      formatter: (row: ResearchMaterial) => {
        const actions = [
          h(ElButton, { link: true, type: 'primary', onClick: () => preview(row) }, () => '预览')
        ]
        if (props.readonly) return h('div', { class: 'flex-c justify-center gap-2' }, actions)
        actions.push(
          h(
            ElButton,
            { link: true, type: 'primary', onClick: () => openMaterial(row) },
            () => '更新'
          )
        )
        if (isDoctor.value && row.maintainStatus === '草稿') {
          actions.push(
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => confirmDraft(row) },
              () => '确认草稿'
            )
          )
        }
        return h('div', { class: 'flex-c justify-center gap-2' }, actions)
      }
    }
  ])

  /* ---------------- 资料上传 / 更新 / 预览 ---------------- */

  const materialVisible = ref(false)
  const previewVisible = ref(false)
  const previewRow = ref<ResearchMaterial>()
  const fileList = ref<UploadUserFile[]>([])
  const materialForm = reactive({
    id: '',
    name: '',
    type: '研究方案' as ResearchMaterial['type'],
    version: '',
    fileName: '',
    fileSize: ''
  })

  function handleFileChange(file: UploadFile) {
    materialForm.fileName = file.name
    materialForm.fileSize = `${((file.size ?? 0) / 1024).toFixed(1)} KB`
  }

  function handleFileRemove() {
    materialForm.fileName = ''
    materialForm.fileSize = ''
  }

  function openMaterial(row?: ResearchMaterial) {
    materialForm.id = row?.id ?? ''
    materialForm.name = row?.name ?? ''
    materialForm.type = row?.type ?? '研究方案'
    materialForm.version = row?.version ?? ''
    materialForm.fileName = row?.fileName ?? ''
    materialForm.fileSize = row?.fileSize ?? ''
    fileList.value = row?.fileName
      ? [{ name: row.fileName, uid: Date.now(), status: 'success' }]
      : []
    materialVisible.value = true
  }

  function preview(row: ResearchMaterial) {
    previewRow.value = row
    previewVisible.value = true
  }

  async function submitMaterial() {
    if (!materialForm.name.trim() || !materialForm.version.trim() || !materialForm.fileName) {
      ElMessage.warning('请填写资料名称、版本并选择资料文件')
      return
    }
    saving.value = true
    try {
      await fetchSaveResearchMaterial(props.projectId, { ...materialForm }, role.value)
      ElMessage.success(materialForm.id ? '研究资料已更新' : '研究资料已上传')
      materialVisible.value = false
      await loadMaterials()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      saving.value = false
    }
  }

  async function confirmDraft(row: ResearchMaterial) {
    if (props.readonly || !isDoctor.value || row.maintainStatus !== '草稿') return
    saving.value = true
    try {
      await fetchConfirmResearchMaterialDraft(props.projectId, row.id, role.value)
      ElMessage.success(`${row.name} 草稿已确认为正式资料`)
      await loadMaterials()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '确认失败')
    } finally {
      saving.value = false
    }
  }

  /* ---------------- 入组清单 ---------------- */

  const criteriaVisible = ref(false)
  const criteriaLists = ref<ResearchCriteriaList[]>([])
  const draftItems = ref<ResearchCriteriaItem[]>([])
  const activeList = ref<ResearchCriteriaList>()
  const editingVersion = ref('待保存草稿')

  const effectiveVersion = computed(
    () => criteriaLists.value.find((item) => item.status === '已确认')?.version ?? ''
  )
  const planVersion = computed(() => criteriaLists.value[0]?.planVersion ?? 'V1.0')
  const canConfirm = computed(
    () => !!activeList.value && activeList.value.status === '草稿' && draftItems.value.length > 0
  )

  function cloneItems(list: ResearchCriteriaList): ResearchCriteriaItem[] {
    return list.items.map((item) => ({ ...item }))
  }

  function selectList(row: ResearchCriteriaList | null) {
    if (!row) return
    activeList.value = row
    editingVersion.value = row.version
    draftItems.value = cloneItems(row)
  }

  function viewList(row: ResearchCriteriaList) {
    selectList(row)
  }

  function addItem() {
    draftItems.value.push({
      id: `draft-${Date.now()}`,
      type: '纳入条件',
      content: '',
      basis: '',
      displayOrder: draftItems.value.length + 1
    })
  }

  function removeItem(index: number) {
    draftItems.value.splice(index, 1)
  }

  async function openCriteria() {
    criteriaVisible.value = true
    await loadCriteria()
  }

  async function loadCriteria() {
    if (!props.projectId) return
    criteriaLists.value = await fetchGetCriteriaLists(props.projectId)
    const effective = criteriaLists.value.find((item) => item.status === '已确认')
    const target = effective ?? criteriaLists.value[0]
    if (target) selectList(target)
  }

  async function saveDraft() {
    if (!draftItems.value.length) {
      ElMessage.warning('入组清单至少需要一条条件')
      return
    }
    if (draftItems.value.some((item) => !item.content.trim())) {
      ElMessage.warning('请填写全部条件内容')
      return
    }
    saving.value = true
    try {
      const saved = await fetchSaveCriteriaList(props.projectId, draftItems.value, role.value)
      ElMessage.success(`${saved.version} 草稿已保存，待医生确认`)
      await loadCriteria()
      selectList(saved)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存草稿失败')
    } finally {
      saving.value = false
    }
  }

  async function confirmVersion() {
    const target = activeList.value
    if (!target || target.status !== '草稿') return
    const ok = await ElMessageBox.confirm(
      `确认后 ${target.version} 将成为生效入组清单，患者详情新申请入组将使用该版本；已完成核对的记录保留当时版本。`,
      '确认入组清单版本',
      { type: 'warning' }
    )
      .then(() => true)
      .catch(() => false)
    if (!ok) return
    saving.value = true
    try {
      await fetchConfirmCriteriaList(props.projectId, target.version, role.value)
      ElMessage.success(`${target.version} 已生效`)
      await loadCriteria()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '确认失败')
    } finally {
      saving.value = false
    }
  }

  async function loadMaterials() {
    if (!props.projectId) return
    loading.value = true
    try {
      materials.value = await fetchGetResearchMaterials(props.projectId)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    void loadMaterials()
    void loadCriteria()
  })
</script>
