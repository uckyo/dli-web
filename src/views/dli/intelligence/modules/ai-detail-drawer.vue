<!-- 智能管理统一详情抽屉 -->
<template>
  <ElDrawer
    :model-value="modelValue"
    :size="width"
    :with-header="true"
    destroy-on-close
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <template #header>
      <div class="flex-cb w-full gap-3 pr-4">
        <div class="min-w-0">
          <p class="truncate text-base font-medium text-g-900">{{ title }}</p>
          <p v-if="subtitle" class="mt-0.5 truncate text-xs text-g-500">{{ subtitle }}</p>
        </div>
        <div class="flex-c shrink-0 items-center gap-2">
          <slot name="extra" />
        </div>
      </div>
    </template>

    <div v-loading="loading" class="min-h-[240px]">
      <slot />
    </div>

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </ElDrawer>
</template>

<script setup lang="ts">
  defineOptions({ name: 'AiDetailDrawer' })

  withDefaults(
    defineProps<{
      modelValue: boolean
      title: string
      subtitle?: string
      width?: string
      loading?: boolean
    }>(),
    {
      subtitle: '',
      width: '760px',
      loading: false
    }
  )

  const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>
