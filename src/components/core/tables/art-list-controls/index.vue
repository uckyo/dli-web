<template>
  <section class="art-list-controls art-card-xs">
    <div v-if="$slots.actions" class="art-list-actions">
      <slot name="actions" />
    </div>
    <div v-if="$slots.default" class="art-list-filters">
      <slot />
    </div>
  </section>
</template>

<style scoped lang="scss">
  .art-list-controls {
    --art-list-control-padding: 16px;

    flex: none;
    padding: var(--art-list-control-padding) 20px;

    &:not(:has(.art-list-actions > *, .art-list-filters > *)) {
      display: none;
    }
  }

  .art-list-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;

    &:empty {
      display: none;
    }

    &:has(> *) + .art-list-filters:has(> *) {
      margin-top: var(--art-list-control-padding);
    }

    &:has(.el-button):has(+ .art-list-filters > *) {
      padding-bottom: var(--art-list-control-padding);
      border-bottom: 1px solid var(--el-border-color-light);
    }

    :deep(.el-button + .el-button) {
      margin-left: 0;
    }
  }

  .art-list-filters {
    --art-search-padding: 0;
    --art-search-row-gap: 12px;
    --art-search-item-bottom: 0px;

    :deep(.art-search-bar) {
      background: transparent;
      border: 0 !important;
      box-shadow: none !important;
    }

    :deep(.el-form) {
      padding: 0;
      margin: 0;
    }

    :deep(.el-form--inline) {
      row-gap: 12px;
    }

    :deep(.el-form--inline .el-form-item) {
      margin-block: 0;
    }
  }
</style>
