<!-- 表格搜索组件 -->
<!-- 支持常用表单组件、自定义组件、插槽、校验、隐藏表单项 -->
<!-- 写法同 ElementPlus 官方文档组件，把属性写在 props 里面就可以了 -->
<template>
  <section class="art-search-bar art-card-xs" :class="{ 'is-expanded': isExpanded }">
    <ElForm
      ref="formRef"
      :model="modelValue"
      :label-position="labelPosition"
      v-bind="{ ...$attrs }"
    >
      <div class="art-search-body">
        <div
          ref="itemsRef"
          class="art-search-items"
          :class="{ 'is-collapsed': !isExpand && !isExpanded && hiddenCount > 0 }"
          :style="{ '--art-row-h': `${rowHeight}px` }"
        >
          <ElFormItem
            v-for="item in formItems"
            :key="item.key"
            :prop="item.key"
            :label-width="item.label ? getLabelWidth(item) : undefined"
          >
            <template #label v-if="item.label">
              <component v-if="typeof item.label !== 'string'" :is="item.label" />
              <span v-else>{{ item.label }}</span>
            </template>
            <slot :name="item.key" :item="item" :modelValue="modelValue">
              <component
                :is="getComponent(item)"
                :model-value="getFieldValue(item.key)"
                @update:model-value="setFieldValue(item.key, $event)"
                v-bind="getProps(item)"
                :style="getItemWidth(item)"
              >
                <!-- 下拉选择 -->
                <template v-if="item.type === 'select' && getProps(item)?.options">
                  <ElOption
                    v-for="option in getProps(item).options"
                    v-bind="option"
                    :key="option.value"
                  />
                </template>

                <!-- 复选框组 -->
                <template v-if="item.type === 'checkboxgroup' && getProps(item)?.options">
                  <ElCheckbox
                    v-for="option in getProps(item).options"
                    v-bind="option"
                    :key="option.value"
                  />
                </template>

                <!-- 单选框组 -->
                <template v-if="item.type === 'radiogroup' && getProps(item)?.options">
                  <ElRadio
                    v-for="option in getProps(item).options"
                    v-bind="option"
                    :key="option.value"
                  />
                </template>

                <!-- 动态插槽支持 -->
                <template v-for="(slotFn, slotName) in getSlots(item)" :key="slotName" #[slotName]>
                  <component :is="slotFn" />
                </template>
              </component>
            </slot>
          </ElFormItem>
        </div>

        <div class="action-buttons-wrapper" :style="actionButtonsStyle">
          <div class="form-buttons">
            <ElButton v-if="showReset" class="reset-button" @click="handleReset" v-ripple>
              {{ t('table.searchBar.reset') }}
            </ElButton>
            <ElButton
              v-if="showSearch"
              type="primary"
              class="search-button"
              @click="handleSearch"
              v-ripple
              :disabled="disabledSearch"
            >
              {{ t('table.searchBar.search') }}
            </ElButton>
          </div>
          <div v-if="shouldShowExpandToggle" class="filter-toggle" @click="toggleExpand">
            <span>{{ expandToggleText }}</span>
            <div class="icon-wrapper">
              <ElIcon>
                <ArrowUpBold v-if="isExpanded" />
                <ArrowDownBold v-else />
              </ElIcon>
            </div>
          </div>
        </div>
      </div>
    </ElForm>
  </section>
</template>

<script setup lang="ts">
  import { ArrowUpBold, ArrowDownBold } from '@element-plus/icons-vue'
  import { useWindowSize } from '@vueuse/core'
  import { useI18n } from 'vue-i18n'
  import { nextTick, onMounted, onUnmounted, toRaw, type Component } from 'vue'
  import {
    ElCascader,
    ElCheckbox,
    ElCheckboxGroup,
    ElDatePicker,
    ElInput,
    ElInputTag,
    ElInputNumber,
    ElRadioGroup,
    ElRate,
    ElSelect,
    ElSlider,
    ElSwitch,
    ElTimePicker,
    ElTimeSelect,
    ElTreeSelect,
    type FormInstance
  } from 'element-plus'

  defineOptions({ name: 'ArtSearchBar' })

  const componentMap = {
    input: ElInput, // 输入框
    inputTag: ElInputTag, // 标签输入框
    number: ElInputNumber, // 数字输入框
    select: ElSelect, // 选择器
    switch: ElSwitch, // 开关
    checkbox: ElCheckbox, // 复选框
    checkboxgroup: ElCheckboxGroup, // 复选框组
    radiogroup: ElRadioGroup, // 单选框组
    date: ElDatePicker, // 日期选择器
    daterange: ElDatePicker, // 日期范围选择器
    datetime: ElDatePicker, // 日期时间选择器
    datetimerange: ElDatePicker, // 日期时间范围选择器
    rate: ElRate, // 评分
    slider: ElSlider, // 滑块
    cascader: ElCascader, // 级联选择器
    timepicker: ElTimePicker, // 时间选择器
    timeselect: ElTimeSelect, // 时间选择
    treeselect: ElTreeSelect // 树选择器
  }

  const { width } = useWindowSize()
  const { t } = useI18n()
  const isMobile = computed(() => width.value < 500)

  const formInstance = useTemplateRef<FormInstance>('formRef')

  // 表单项配置
  export interface SearchFormItem {
    /** 表单项的唯一标识 */
    key: string
    /** 表单项的标签文本或自定义渲染函数 */
    label: string | (() => VNode) | Component
    /** 表单项标签的宽度，会覆盖 Form 的 labelWidth */
    labelWidth?: string | number
    /** 表单项类型，支持预定义的组件类型 */
    type?: keyof typeof componentMap | string
    /** 自定义渲染函数或组件，用于渲染自定义组件（优先级高于 type） */
    render?: (() => VNode) | Component
    /** 是否隐藏该表单项 */
    hidden?: boolean
    /** 表单项占据的列宽，基于24格栅格系统 */
    span?: number
    /** 单字段控件宽度覆盖：默认按控件类型取内置宽度，个别字段（如超长 placeholder）可单独放宽 */
    width?: string | number
    /** 选项数据，用于 select、checkbox-group、radio-group 等 */
    options?: Record<string, any>
    /** 传递给表单项组件的属性 */
    props?: Record<string, any>
    /** 表单项的插槽配置 */
    slots?: Record<string, (() => any) | undefined>
    /** 表单项的占位符文本 */
    placeholder?: string
    /** 更多属性配置请参考 ElementPlus 官方文档 */
  }

  // 表单配置
  interface SearchBarProps {
    /** 表单数据 */
    items: SearchFormItem[]
    /** 每列的宽度（基于 24 格布局） */
    span?: number
    /** 表单控件间隙 */
    gutter?: number
    /** 展开/收起 */
    isExpand?: boolean
    /** 默认是否展开（仅在 showExpand 为 true 且 isExpand 为 false 时生效） */
    defaultExpanded?: boolean
    /** 表单域标签的位置 */
    labelPosition?: 'left' | 'right' | 'top'
    /** 文字宽度 */
    labelWidth?: string | number
    /** 是否需要展示，收起 */
    showExpand?: boolean
    /** 按钮靠左对齐限制（表单项小于等于该值时） */
    buttonLeftLimit?: number
    /** 是否显示重置按钮 */
    showReset?: boolean
    /** 是否显示搜索按钮 */
    showSearch?: boolean
    /** 是否禁用搜索按钮 */
    disabledSearch?: boolean
    /** 搜索时是否清洗空值 */
    sanitizeOutput?: Partial<SanitizeOutputOptions>
  }

  interface SanitizeOutputOptions {
    /** 移除空字符串 */
    removeEmptyString: boolean
    /** 移除空数组 */
    removeEmptyArray: boolean
    /** 移除清洗后为空的对象 */
    removeEmptyObject: boolean
    /** 移除空富文本占位内容，如 <p><br></p> */
    removeEmptyRichText: boolean
    /** 保留数字 0 这类有效筛选值 */
    keepZero: boolean
    /** 保留 false 这类有效筛选值 */
    keepFalse: boolean
  }

  const props = withDefaults(defineProps<SearchBarProps>(), {
    items: () => [],
    span: 6,
    gutter: 12,
    isExpand: false,
    labelPosition: 'right',
    labelWidth: '70px',
    showExpand: true,
    defaultExpanded: false,
    buttonLeftLimit: 2,
    showReset: true,
    showSearch: true,
    disabledSearch: false,
    sanitizeOutput: () => ({})
  })

  interface SearchBarEmits {
    reset: []
    search: [Record<string, any>]
  }

  const emit = defineEmits<SearchBarEmits>()

  const modelValue = defineModel<Record<string, any>>({ default: {} })
  const initialModelValue = ref<Record<string, any>>({})

  // 保存组件初始化时的表单快照，用于 reset 时恢复默认筛选条件。
  const cloneModelValue = (value: Record<string, any> | undefined) => {
    if (!value) return {}

    const deepClone = (source: unknown): unknown => {
      if (Array.isArray(source)) {
        return source.map((item) => deepClone(item))
      }

      if (source && typeof source === 'object') {
        const rawSource = toRaw(source)
        return Object.keys(rawSource).reduce<Record<string, unknown>>((accumulator, key) => {
          accumulator[key] = deepClone((rawSource as Record<string, unknown>)[key])
          return accumulator
        }, {})
      }

      return source
    }

    return deepClone(toRaw(value)) as Record<string, any>
  }

  initialModelValue.value = cloneModelValue(modelValue.value)

  /**
   * 是否展开状态
   */
  const isExpanded = ref(props.defaultExpanded)

  const rootProps = ['label', 'labelWidth', 'key', 'type', 'hidden', 'span', 'width', 'slots']
  // 搜索参数默认更激进地去掉空值，减少无效 query 参数。
  const sanitizeOutputOptions = computed<SanitizeOutputOptions>(() => ({
    removeEmptyString: true,
    removeEmptyArray: true,
    removeEmptyObject: true,
    removeEmptyRichText: true,
    keepZero: true,
    keepFalse: true,
    ...props.sanitizeOutput
  }))

  const getProps = (item: SearchFormItem) => {
    if (item.props) return item.props
    const props = { ...item }
    rootProps.forEach((key) => delete (props as Record<string, any>)[key])
    return props
  }

  // 获取插槽
  const getSlots = (item: SearchFormItem) => {
    if (!item.slots) return {}
    const validSlots: Record<string, () => any> = {}
    Object.entries(item.slots).forEach(([key, slotFn]) => {
      if (slotFn) {
        validSlots[key] = slotFn
      }
    })
    return validSlots
  }

  // 搜索表单清空输入时不保留空字符串，避免后续请求携带空字段。
  const normalizeFieldValue = (value: unknown) => {
    return value === '' ? undefined : value
  }

  const getFieldValue = (key: string) => modelValue.value[key]

  const setFieldValue = (key: string, value: unknown) => {
    const normalizedValue = normalizeFieldValue(value)

    if (normalizedValue === undefined) {
      delete modelValue.value[key]
      return
    }

    modelValue.value[key] = normalizedValue
  }

  const isRichTextEmpty = (value: string) => {
    if (/<(img|video|audio|iframe|embed|object)\b/i.test(value)) {
      return false
    }

    // 去掉编辑器常见占位标签后再判断是否还有实际内容。
    return (
      value
        .replace(/&nbsp;/gi, '')
        .replace(/<br\s*\/?>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim() === ''
    )
  }

  // 搜索时按配置清洗空值，但保留 0 和 false 这类有效筛选条件。
  const sanitizeOutputValue = (value: unknown): unknown => {
    const options = sanitizeOutputOptions.value

    if (Array.isArray(value)) {
      const sanitizedArray = value
        .map((item) => sanitizeOutputValue(item))
        .filter((item) => item !== undefined)
      return sanitizedArray.length === 0 && options.removeEmptyArray ? undefined : sanitizedArray
    }

    if (value && typeof value === 'object') {
      const rawValue = toRaw(value)
      const sanitizedObject = Object.entries(rawValue).reduce<Record<string, unknown>>(
        (accumulator, [key, item]) => {
          const sanitizedItem = sanitizeOutputValue(item)
          if (sanitizedItem !== undefined) {
            accumulator[key] = sanitizedItem
          }
          return accumulator
        },
        {}
      )
      return Object.keys(sanitizedObject).length === 0 && options.removeEmptyObject
        ? undefined
        : sanitizedObject
    }

    if (typeof value === 'string') {
      if (options.removeEmptyString && value.trim() === '') {
        return undefined
      }
      if (options.removeEmptyRichText && isRichTextEmpty(value)) {
        return undefined
      }
      return value
    }

    if (value === 0) {
      return options.keepZero ? value : undefined
    }

    if (value === false) {
      return options.keepFalse ? value : undefined
    }

    return value ?? undefined
  }

  const getSanitizedOutput = () => {
    return (sanitizeOutputValue(cloneModelValue(modelValue.value)) || {}) as Record<string, any>
  }

  // 组件
  const getComponent = (item: SearchFormItem) => {
    // 优先使用 render 函数或组件渲染自定义组件
    if (item.render) {
      return item.render
    }
    // 使用 type 获取预定义组件
    const { type } = item
    return componentMap[type as keyof typeof componentMap] || componentMap['input']
  }

  /**
   * label 宽度按各自文案计算。
   * 不再统一取最长项——统一宽度会让「来源」这类短 label 在容器里靠右、前面空出一大截，
   * 视觉上把相邻两个控件推得很远；按各自内容撑开既不掉行也更紧凑。
   */
  function getLabelWidth(item: SearchFormItem): string | number {
    if (item.labelWidth) return item.labelWidth
    if (typeof item.label !== 'string') return props.labelWidth
    const px = Array.from(item.label).reduce(
      (sum, ch) => sum + (/[\u4e00-\u9fa5]/.test(ch) ? 14 : 9),
      0
    )
    // 预留冒号与右侧间距；夹在 40-120px，防止极短 label 贴太近、超长 label 挤掉控件
    return `${Math.min(Math.max(px + 16, 40), 120)}px`
  }

  /**
   * 单字段控件宽度覆盖。
   * 默认宽度按控件类型给（见样式），只有 placeholder 明显偏长这类特例才需要单独放宽，
   * 避免为了一个字段把所有输入框都撑宽、白白少放几项。
   * 注意必须返回对象：:style 传字符串会被当成 cssText，'220px' 不是合法样式会整条失效。
   */
  function getItemWidth(item: SearchFormItem) {
    if (!item.width) return undefined
    return { width: typeof item.width === 'number' ? `${item.width}px` : item.width }
  }

  /**
   * 全部可见表单项。收起态也全部渲染，由容器 max-height 裁剪——
   * 这样一行能放几个由控件实际宽度决定，不再受固定栅格列数限制。
   */
  const formItems = computed(() => props.items.filter((item) => !item.hidden))

  const itemsRef = ref<HTMLElement | null>(null)
  const hiddenCount = ref(0)
  const rowHeight = ref(0)
  let rowObserver: ResizeObserver | null = null
  let lastBodyWidth = 0

  /** 按各表单项的 offsetTop 判断第一行之外的项 */
  function measureRow() {
    const box = itemsRef.value
    if (!box) return
    const items = Array.from(box.children) as HTMLElement[]
    if (!items.length) return
    const top0 = items[0].offsetTop
    const overflowing = items.filter((el) => el.offsetTop > top0 + 1)
    hiddenCount.value = overflowing.length
    rowHeight.value = overflowing.length
      ? overflowing[0].offsetTop - top0
      : items[0].offsetHeight + 16
  }

  function scheduleMeasure() {
    void nextTick(measureRow)
  }

  /** 容器宽度变化才重算，避免展开/收起引起的高度变化造成回调循环 */
  function initRowObserver() {
    window.addEventListener('resize', scheduleMeasure)
    const body = itemsRef.value?.parentElement
    if (!body || typeof ResizeObserver === 'undefined') return
    lastBodyWidth = Math.round(body.getBoundingClientRect().width)
    rowObserver = new ResizeObserver((entries) => {
      const width = Math.round(entries[0].contentRect.width)
      if (width === lastBodyWidth) return
      lastBodyWidth = width
      scheduleMeasure()
    })
    rowObserver.observe(body)
  }

  onMounted(() => {
    void nextTick(() => {
      measureRow()
      initRowObserver()
      requestAnimationFrame(measureRow)
    })
  })

  onUnmounted(() => {
    rowObserver?.disconnect()
    window.removeEventListener('resize', scheduleMeasure)
  })

  /**
   * 是否应该显示展开/收起按钮
   */
  const shouldShowExpandToggle = computed(
    () => !props.isExpand && props.showExpand && hiddenCount.value > 0
  )

  /**
   * 展开/收起按钮文本
   */
  const expandToggleText = computed(() => {
    return isExpanded.value ? t('table.searchBar.collapse') : t('table.searchBar.expand')
  })

  /**
   * 操作按钮样式
   */
  const actionButtonsStyle = computed(() => ({
    'justify-content': isMobile.value
      ? 'flex-end'
      : props.items.filter((item) => !item.hidden).length <= props.buttonLeftLimit
        ? 'flex-start'
        : 'flex-end'
  }))

  /**
   * 切换展开/收起状态
   */
  const toggleExpand = () => {
    isExpanded.value = !isExpanded.value
  }

  /**
   * 处理重置事件
   */
  const handleReset = () => {
    // 重置表单字段（UI 层）
    formInstance.value?.resetFields()

    // 恢复初始表单值，保留默认搜索条件而不是简单清空。
    Object.keys(modelValue.value).forEach((key) => {
      delete modelValue.value[key]
    })
    Object.assign(modelValue.value, cloneModelValue(initialModelValue.value))

    // 触发 reset 事件
    emit('reset')
  }

  /**
   * 处理搜索事件
   */
  const handleSearch = () => {
    // 对外只抛出清洗后的查询参数，避免接口收到空数组/空字符串。
    emit('search', getSanitizedOutput())
  }

  defineExpose({
    ref: formInstance,
    validate: (...args: any[]) => formInstance.value?.validate(...args),
    reset: handleReset,
    // 允许外部在手动组装请求前直接读取清洗后的参数。
    getOutput: getSanitizedOutput
  })

  // 解构 props 以便在模板中直接使用
  const { labelPosition } = toRefs(props)
</script>

<style lang="scss" scoped>
  .art-search-bar {
    padding: 15px 20px 0;

    // label 宽度已按文案计算，这里兜底防止字体/缩放差异导致折行
    :deep(.el-form-item__label) {
      white-space: nowrap;
    }

    .art-search-body {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    // 表单项按内容宽度流式排列：一行放几个由控件宽度决定，不再固定列数
    .art-search-items {
      position: relative; // 子项 offsetTop 相对本容器，便于判断换行
      display: flex;
      flex: 1 1 auto;
      flex-wrap: wrap;
      align-items: flex-start;
      min-width: 0;
      transition: max-height 0.2s ease;

      &.is-collapsed {
        max-height: var(--art-row-h, 48px);
        overflow: hidden;
      }

      :deep(.el-form-item) {
        flex: 0 0 auto;
        margin-right: 16px;
        margin-bottom: 14px;
      }

      // 控件按类型给宽度：选择器短、输入框长、日期范围更长，
      // 短控件省下来的空间就能多放一项
      :deep(.el-form-item__content) {
        min-width: 0;

        > .el-input {
          width: 195px;
        }

        > .el-select {
          width: 145px;
        }

        > .el-input-number {
          width: 125px;
        }

        > .el-cascader {
          width: 160px;
        }

        // 单个日期/时间。
        // 注意：范围选择器的根节点同样带 .el-input__wrapper，
        // 若这里不加 :not 排除，两条规则会按权重（2 个类 > 1 个类）覆盖掉下面的范围宽度。
        > .el-date-editor:not(
            .el-date-editor--datetimerange,
            .el-date-editor--daterange,
            .el-date-editor--monthrange
          ) {
          width: 175px;
        }

        // 日期/时间范围要完整显示“开始日期 至 结束日期”，窄了会被截断
        > .el-date-editor--daterange,
        > .el-date-editor--datetimerange,
        > .el-date-editor--monthrange {
          width: 300px;
        }

        > .el-checkbox-group,
        > .el-radio-group {
          width: auto;
        }
      }
    }

    .action-buttons-wrapper {
      display: flex;
      flex: 0 0 auto;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      margin-bottom: 14px;
    }

    .form-buttons {
      display: flex;
      gap: 8px;
    }

    .filter-toggle {
      display: flex;
      align-items: center;
      margin-left: 10px;
      line-height: 32px;
      color: var(--theme-color);
      cursor: pointer;
      transition: color 0.2s ease;

      &:hover {
        color: var(--ElColor-primary);
      }

      span {
        font-size: 14px;
        user-select: none;
      }

      .icon-wrapper {
        display: flex;
        align-items: center;
        margin-left: 4px;
        font-size: 14px;
        transition: transform 0.2s ease;
      }
    }
  }

  // 响应式优化：窄屏下按钮独占一行，避免和筛选项抢宽度
  @media (width <= 768px) {
    .art-search-bar {
      padding: 16px 16px 0;

      .art-search-body {
        flex-direction: column;
        gap: 4px;
      }

      .action-buttons-wrapper {
        justify-content: center;
        width: 100%;

        .filter-toggle {
          margin-left: 0;
        }
      }
    }
  }
</style>
