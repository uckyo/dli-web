<!-- DLI 通用对话弹窗：左侧上下文与快捷提问，右侧头像 / 气泡会话与输入区 -->
<template>
  <ElDialog v-model="visible" :width="width" :close-on-click-modal="false" destroy-on-close>
    <template #header>
      <div class="flex-c gap-3 pr-8">
        <div class="size-10 flex-cc rounded-lg bg-primary/10 text-xl text-primary">
          <ArtSvgIcon :icon="avatarIcon" />
        </div>
        <div class="min-w-0">
          <p class="truncate text-base font-medium text-g-900">{{ title }}</p>
          <p v-if="subtitle" class="mt-0.5 truncate text-xs text-g-500">{{ subtitle }}</p>
        </div>
        <ElTag v-if="badgeText" class="ml-1 shrink-0" :type="badgeType" effect="plain">
          {{ badgeText }}
        </ElTag>
      </div>
    </template>

    <div
      class="flex h-[620px] max-h-[72vh] overflow-hidden rounded-lg border border-full-d max-md:h-[76vh]"
    >
      <!-- 左侧：上下文与快捷提问 -->
      <aside class="box-border hidden w-72 shrink-0 flex-col border-r border-g-300 md:flex">
        <div class="p-5 pb-3">
          <div class="flex-c gap-3">
            <ElAvatar :size="48" class="!bg-primary/10 !text-primary">
              <ArtSvgIcon :icon="contextIcon" class="text-xl" />
            </ElAvatar>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-g-900">{{ contextTitle }}</p>
              <p v-if="contextSubtitle" class="mt-1 truncate text-xs text-g-500">
                {{ contextSubtitle }}
              </p>
            </div>
          </div>

          <div v-for="group in contextTags" :key="group.label" class="mt-3">
            <p class="text-xs text-g-500">{{ group.label }}</p>
            <div class="mt-1 flex flex-wrap gap-1">
              <ElTag
                v-for="item in group.items"
                :key="item"
                size="small"
                :type="group.type"
                effect="plain"
              >
                {{ item }}
              </ElTag>
            </div>
          </div>
        </div>

        <ElScrollbar class="min-h-0 flex-1">
          <div class="px-5 pb-5">
            <p
              v-if="readonly"
              class="rounded-lg bg-warning/10 px-3 py-2 text-xs leading-5 text-warning"
            >
              {{ readonlyTip }}
            </p>
            <template v-else-if="quickPrompts.length">
              <p class="mb-2 text-xs text-g-500">快捷提问</p>
              <div
                v-for="prompt in quickPrompts"
                :key="prompt"
                class="mb-1 cursor-pointer rounded-lg px-2.5 py-2 text-sm text-g-700 transition-colors hover:bg-active-color/40"
                @click="draft = prompt"
              >
                {{ prompt }}
              </div>
            </template>
          </div>
        </ElScrollbar>

        <p v-if="contextNote" class="border-t border-full-d px-5 py-3 text-xs leading-5 text-g-500">
          {{ contextNote }}
        </p>
      </aside>

      <!-- 右侧：会话区 -->
      <section class="flex min-w-0 flex-1 flex-col">
        <div class="flex-cb shrink-0 border-b border-full-d px-4 py-3">
          <div class="flex-c gap-2">
            <div class="relative">
              <ElAvatar :size="36" class="!bg-theme/15 !text-theme">
                <ArtSvgIcon :icon="peerIcon" />
              </ElAvatar>
              <span
                v-if="peerOnline"
                class="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-white bg-success dark:border-g-800"
              ></span>
            </div>
            <div>
              <p class="text-sm font-medium text-g-900">{{ peerName }}</p>
              <p class="text-xs text-g-500">{{ peerSubtitle }}</p>
            </div>
          </div>
          <div class="flex-c gap-1">
            <slot name="actions" />
          </div>
        </div>

        <!-- 消息区 -->
        <div ref="scrollRef" class="flex-1 overflow-y-auto px-4 py-5" v-loading="loading">
          <template v-for="message in messages" :key="message.id">
            <div
              :class="[
                'mb-6 flex w-full items-start gap-2',
                message.from === 'me' ? 'flex-row-reverse' : 'flex-row justify-start'
              ]"
            >
              <ElAvatar
                :size="32"
                class="shrink-0"
                :class="
                  message.from === 'me'
                    ? '!bg-primary/10 !text-primary'
                    : '!bg-theme/15 !text-theme'
                "
              >
                <ArtSvgIcon :icon="message.from === 'me' ? 'ri:user-line' : peerIcon" />
              </ElAvatar>
              <div
                class="flex max-w-[76%] flex-col"
                :class="message.from === 'me' ? 'items-end' : 'items-start'"
              >
                <div
                  class="mb-1 flex gap-2 text-xs"
                  :class="message.from === 'me' ? 'flex-row-reverse' : 'flex-row'"
                >
                  <span class="font-medium text-g-800">{{ message.sender }}</span>
                  <span class="text-g-500">{{ message.time }}</span>
                </div>
                <div
                  class="whitespace-pre-line rounded-md px-3.5 py-2.5 text-sm leading-[1.5]"
                  :class="
                    message.from === 'me'
                      ? '!bg-theme/15 text-g-900'
                      : '!bg-active-color text-g-800'
                  "
                >
                  {{ message.content }}
                </div>
              </div>
            </div>
          </template>

          <p v-if="pending" class="flex items-center gap-2 text-xs text-g-500">
            <span class="i-ri:loader-4-line animate-spin" />{{ pendingText }}
          </p>
        </div>

        <!-- 输入区 -->
        <div class="shrink-0 border-t border-full-d p-4">
          <p v-if="readonly" class="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
            当前角色不可发起对话，仅可查看对话记录。
          </p>
          <template v-else>
            <ElInput
              v-model="draft"
              type="textarea"
              :rows="3"
              :maxlength="maxlength"
              show-word-limit
              resize="none"
              :placeholder="placeholder"
              @keyup.enter.prevent="send"
            />
            <div class="mt-3 flex-cb">
              <div class="flex-c gap-1">
                <ElTooltip content="清空输入" placement="top">
                  <ArtIconButton
                    icon="ri:eraser-line"
                    circle
                    class="size-9 text-g-600"
                    @click="draft = ''"
                  />
                </ElTooltip>
                <span class="text-xs text-g-500">Enter 发送 · Shift + Enter 换行</span>
              </div>
              <ElButton
                type="primary"
                :disabled="!draft.trim() || pending"
                class="min-w-20"
                v-ripple
                @click="send"
              >
                发送
              </ElButton>
            </div>
          </template>
        </div>
      </section>
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
  defineOptions({ name: 'DliChatDialog' })

  /** 左侧上下文分组 */
  interface ChatContextGroup {
    label: string
    items: string[]
    type?: 'primary' | 'success' | 'info' | 'warning' | 'danger'
  }

  /** 会话消息（统一左右两侧展示） */
  interface ChatMessage {
    id: string | number
    from: 'me' | 'other'
    sender: string
    content: string
    time: string
  }

  const props = withDefaults(
    defineProps<{
      modelValue: boolean
      /** 弹窗标题与副标题 */
      title: string
      subtitle?: string
      avatarIcon?: string
      badgeText?: string
      badgeType?: 'primary' | 'success' | 'info' | 'warning' | 'danger'
      /** 会话对象 */
      peerName: string
      peerSubtitle?: string
      peerIcon?: string
      peerOnline?: boolean
      /** 消息与状态 */
      messages: ChatMessage[]
      readonly?: boolean
      readonlyTip?: string
      loading?: boolean
      pending?: boolean
      pendingText?: string
      /** 左侧上下文 */
      contextTitle: string
      contextSubtitle?: string
      contextIcon?: string
      contextTags?: ChatContextGroup[]
      contextNote?: string
      quickPrompts?: string[]
      /** 输入框 */
      placeholder?: string
      maxlength?: number
      width?: string
    }>(),
    {
      avatarIcon: 'ri:chat-3-line',
      badgeType: 'success',
      peerIcon: 'ri:robot-2-line',
      peerOnline: true,
      readonly: false,
      readonlyTip: '当前角色仅可查看对话记录。',
      loading: false,
      pending: false,
      pendingText: '正在输入…',
      contextIcon: 'ri:chat-3-line',
      contextTags: () => [],
      quickPrompts: () => [],
      maxlength: 300,
      width: 'min(1080px, 94vw)'
    }
  )

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    send: [text: string]
  }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const draft = ref('')
  const scrollRef = ref<HTMLElement>()

  /** 打开时重置输入并滚动到底部 */
  watch(
    () => props.modelValue,
    (open) => {
      if (!open) return
      draft.value = ''
      scrollToBottom()
    }
  )

  /** 新消息到达后滚动到底部 */
  watch(
    () => props.messages.length,
    () => scrollToBottom()
  )

  /** 滚动到底部 */
  async function scrollToBottom() {
    await nextTick()
    if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }

  /** 发送消息 */
  function send() {
    const text = draft.value.trim()
    if (!text || props.readonly || props.pending) return
    emit('send', text)
    draft.value = ''
  }
</script>
