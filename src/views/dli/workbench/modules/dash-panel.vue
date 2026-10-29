<!-- 数据大屏面板：固定暗色，不跟随系统主题 -->
<template>
  <section class="dash-panel">
    <header class="dash-panel-head">
      <div class="flex min-w-0 items-center gap-2">
        <span class="dash-panel-bar"></span>
        <h4 class="dash-panel-title">{{ title }}</h4>
        <span v-if="subtitle" class="dash-panel-sub">{{ subtitle }}</span>
      </div>
      <slot name="extra"></slot>
    </header>
    <div class="dash-panel-body">
      <slot></slot>
    </div>
  </section>
</template>

<script setup lang="ts">
  defineOptions({ name: 'DashPanel' })

  defineProps<{
    title: string
    subtitle?: string
  }>()
</script>

<style scoped lang="scss">
  .dash-panel {
    --dash-pad-b: 14px;

    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 200px;
    padding: 12px 14px var(--dash-pad-b);
    overflow: hidden;
    background: linear-gradient(165deg, rgb(10 36 70 / 52%) 0%, rgb(4 16 34 / 60%) 100%);
    border: 1px solid rgb(56 180 255 / 18%);
    border-radius: 10px;
    box-shadow:
      inset 0 0 26px rgb(0 116 255 / 6%),
      0 6px 24px rgb(0 0 0 / 24%);

    &::before {
      position: absolute;
      inset: 4px;
      z-index: 1;
      pointer-events: none;
      content: '';
      background:
        linear-gradient(#45dbff, #45dbff) right top / 14px 1px no-repeat,
        linear-gradient(#45dbff, #45dbff) right top / 1px 14px no-repeat,
        linear-gradient(#45dbff, #45dbff) left bottom / 14px 1px no-repeat,
        linear-gradient(#45dbff, #45dbff) left bottom / 1px 14px no-repeat;
      opacity: 0.7;
    }
  }

  .dash-panel-head {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    border-bottom: 1px solid rgb(64 199 255 / 12%);
  }

  .dash-panel-bar {
    width: 3px;
    height: 14px;
    background: linear-gradient(180deg, #6ce9ff, #1f8bff);
    border-radius: 2px;
    box-shadow: 0 0 8px rgb(59 208 255 / 85%);
  }

  .dash-panel-title {
    flex-shrink: 0;
    font-size: 15px;
    font-weight: 600;
    color: #e6f7ff;
    letter-spacing: 0.5px;
  }

  .dash-panel-sub {
    overflow: hidden;
    font-size: 11px;
    color: #6f97b6;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dash-panel-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding-top: 10px;
  }

  @media (width >= 1280px) {
    .dash-panel {
      min-height: 0;
    }

    .dash-panel-title {
      font-size: 16px;
    }
  }

  @media (height <= 960px) {
    .dash-panel {
      --dash-pad-b: 11px;

      padding: 10px 14px var(--dash-pad-b);
    }

    .dash-panel-head {
      padding-bottom: 7px;
    }

    .dash-panel-body {
      padding-top: 8px;
    }
  }

  @media (height <= 880px) {
    .dash-panel {
      padding: 9px 12px 10px;
    }

    .dash-panel-head {
      padding-bottom: 5px;
    }

    .dash-panel-body {
      padding-top: 6px;
    }

    .dash-panel-sub {
      font-size: 10px;
    }
  }
</style>
