# agents.md

面向 AI 编码代理的项目规范。基于 Art Design Pro 模板（官方文档：https://www.artd.pro/docs ）。

## 项目概述

dli-web 是基于 **Art Design Pro** 的企业级中后台管理系统，以用户体验与视觉设计为核心。权限模式由 `VITE_ACCESS_MODE` 控制（`frontend` 前端路由过滤 / `backend` 后端返回菜单）。

## 技术栈

Vue 3.5（`<script setup>`）· TypeScript 5.6 · Vite 7 · Element Plus · Tailwind CSS 4 · Sass · Pinia 3（persistedstate）· Vue Router 4 · Axios · ECharts 6 · vue-i18n · Iconify 图标

环境要求：Node ≥ 20.19.0，pnpm ≥ 8.8.0

## 常用命令

```bash
pnpm dev            # 本地开发，端口 3006（.env 中 VITE_PORT）
pnpm build          # 生产打包（先 vue-tsc --noEmit 类型检查）
pnpm lint           # ESLint 检查
pnpm fix            # ESLint 自动修复
pnpm lint:prettier  # Prettier 格式化
pnpm lint:stylelint # Stylelint 修复样式
pnpm commit         # cz-git 交互式提交（不要手写 commit message 绕过校验）
pnpm clean:dev      # 一键清理演示数据，获得干净基础项目（谨慎执行）
```

## 路径别名

`@` → src · `@views` → src/views · `@utils` → src/utils · `@stores` → src/store · `@styles` → src/assets/styles · `@imgs` → src/assets/images · `@icons` → src/assets/icons

## 目录结构关键点

```
src/
├── api/                  # API 请求定义（按业务域拆分文件）
├── components/
│   ├── core/             # 通用组件（art-xxx，自动导入，全局可用）
│   └── business/         # 业务组件
├── config/               # 全局配置（index.ts 为 SystemConfig，Object.freeze 导出）
├── hooks/core/           # 核心 hooks（useTable、useCommon、useAuth 等）
├── router/
│   ├── modules/          # 菜单路由模块（按业务域拆分）
│   ├── routes/           # 静态/动态路由
│   ├── guards/           # 路由守卫（登录校验、动态注册、404 处理）
│   └── routesAlias.ts    # 系统级公共路由别名（Layout、Login）
├── store/modules/        # Pinia store（setup 风格）
├── types/
│   ├── api/api.d.ts      # 全局 Api 命名空间（无需 import）
│   └── router/index.ts   # AppRouteRecord、RouteMeta
├── utils/http/           # Axios 封装（拦截器、重试、统一错误提示）
├── utils/storage/        # 本地存储（键名 sys-v{版本}-{storeId}）
└── views/                # 页面（模块/功能/index.vue，子组件放 modules/）
```

## API 请求规范

新增接口在 `src/api/` 按业务域建文件，函数命名 `fetchXxx`，统一从 `@/utils/http` 导入：

```typescript
import request from '@/utils/http'

// 获取用户列表
export function fetchGetUserList(params: Api.SystemManage.UserSearchParams) {
  return request.get<Api.SystemManage.UserListResponse>({ url: '/api/user/list', params })
  // 可选：showSuccessMessage / showErrorMessage(默认 true) / headers 自定义请求头
}
```

- 请求方法：`request.get/post/put/del<T>({ url, params })`，成功直接返回 `res.data.data as T`（不是整个响应体）
- POST/PUT 传 `params` 会自动转为 `data`（request 内部处理）
- 响应拦截器统一处理：自动注入 `Authorization`、401 登录态处理、业务错误 ElMessage 提示、失败自动重试
- 后端统一响应结构 `BaseResponse<T>`：`{ code, msg, data }`

**类型定义**：在 `src/types/api/api.d.ts` 的全局 `declare namespace Api` 下按 `Api.Common` / `Api.Auth` / `Api.SystemManage` 分组扩展，全局可用无需导入。分页约定：请求 `current/size`，响应 `records/current/size/total`（`Api.Common.PaginatedResponse<T>`）。

在 .vue 文件中使用 `Api` 命名空间时依赖 `.auto-import.json` 的 globals 配置，无需手动 import。

## 路由与菜单规范

菜单路由在 `src/router/modules/` 定义并导出，类型为 `AppRouteRecord`：

```typescript
import { AppRouteRecord } from '@/types/router'

export const dashboardRoutes: AppRouteRecord = {
  name: 'Dashboard',
  path: '/dashboard',
  component: '/index/index', // 字符串路径，相对 src/views；布局容器用 RoutesAlias.Layout
  meta: {
    title: 'menus.dashboard.title', // i18n key（zh.json / en.json 中维护）
    icon: 'ri:pie-chart-line', // Iconify 图标（remixicon 为主）
    roles: ['R_SUPER', 'R_ADMIN'] // 可访问角色，R_SUPER 为超管
  },
  children: [
    /* 子路由 path 不带前导斜杠，如 'console' */
  ]
}
```

常用 `meta` 字段：`title`（必填，i18n key）、`icon`、`roles`、`isHide`（菜单隐藏）、`keepAlive`、`fixedTab`（固定标签页）、`link`（外链）、`isIframe`、`activePath`。

- 新增菜单模块：在 `modules/` 建文件 → 在 `modules/index.ts` 导出 → `title` 同步到 `locales/langs/zh.json` 与 `en.json` 的 `menus.*`
- 登录后守卫 `guards/beforeEach.ts` 动态注册路由并写回菜单 store；首页路径由菜单数据自动计算
- 系统级路由别名统一放 `routesAlias.ts`，勿硬编码 `/auth/login` 等路径

## 状态管理

Pinia setup 风格，文件放 `store/modules/`：

```typescript
export const useUserStore = defineStore('userStore', () => {
  const token = ref('')
  // ...
  return { token }
})
```

- 持久化存储键自动格式化为 `sys-v{VITE_VERSION}-{storeId}`（如 `sys-v3.0.2-user`），改 store id 会丢持久化数据
- 菜单、设置（setting）、工作标签（worktab）均有独立 store，读设置优先走 `useSettingStore` 而非直接改 config

## 组件规范

- 通用组件放 `components/core/`，业务组件放 `components/business/`，按类别建目录（cards/charts/forms/tables/layouts 等）
- 每个组件一个目录：`art-xxx/index.vue`，复杂组件拆 `widget/` 子组件
- 组件通过 `unplugin-vue-components` **自动导入**，模板中直接使用，无需 import；Element Plus 组件同样自动按需导入
- `vue` / `vue-router` / `pinia` / `@vueuse/core` 的 API 由 `unplugin-auto-import` 自动导入，**不要手写 import**

## 页面开发模式

标准 CRUD 页面使用 `useTable`（企业级表格方案，见 `hooks/core/useTable.ts`），模板参考 `views/system/user/index.vue`：

```typescript
const { tableData, loading, pagination, searchParams, handleSearch, refresh, refreshFirstPage } =
  useTable({
    core: {
      apiFn: fetchGetUserList,        // API 函数（自动推导参数与记录类型）
      apiParams: { ... },             // 默认搜索参数
      excludeParams: [...],           // 搜索时排除的字段
      columnsFactory: () => columns   // 列配置工厂
    },
    transform: { dataTransformer },   // 可选数据转换
    hooks: { onSuccess, onError }     // 可选生命周期回调
  })
```

配套组件：`ArtSearchBar`（搜索区）、`ArtTable`（表格 + 分页）、`ArtButtonMore`（行操作下拉）。

- 页面文件：`views/模块/功能/index.vue`，私有子组件放同级 `modules/` 目录
- 列表页改动后注意 `useTable` 的 5 种刷新方法（`refresh` / `refreshFirstPage` 等按新增/更新/删除场景选择）

## 样式规范

- Tailwind CSS 4（`@tailwindcss/vite` 插件，无 tailwind.config）+ Sass
- 主题色、暗黑模式由设置面板 + `useTheme` 驱动，**必须同时适配暗黑主题**（变量见 `assets/styles/core/dark.scss`、`el-dark.scss`）
- Stylelint 使用 `recess-order` 属性顺序，样式代码须通过 `pnpm lint:stylelint`

## i18n

所有用户可见文案走 vue-i18n：`locales/langs/zh.json` / `en.json`，菜单标题用 `menus.*` 键名。新增文案两个语言文件必须同步。

## 环境变量

`.env`（通用）/ `.env.development` / `.env.production`，均以 `VITE_` 前缀，在代码中通过 `import.meta.env.VITE_XXX` 访问：

- `VITE_API_URL`：API 基础路径（开发为 `/`，配合代理）
- `VITE_API_PROXY_URL`：开发代理目标（仅 dev）
- `VITE_ACCESS_MODE`：`frontend` / `backend` 权限模式
- `VITE_PORT`：开发端口（默认 3006）
- `VITE_DROP_CONSOLE` / `VITE_WITH_CREDENTIALS` / `VITE_BASE_URL`（部署子路径）

## 代码风格

- Prettier：行宽 100、无分号、单引号、2 空格缩进、`trailingComma: 'none'`、Vue 缩进 script/style
- ESLint 9 flat config（`eslint.config.mjs`）；TypeScript 严格模式，构建前跑 `vue-tsc --noEmit`
- 文件命名：组件目录 `kebab-case`，TS 工具/hooks 文件 `camelCase.ts`，类型集中放 `types/`
- 所有公共模块用 JSDoc 头注释说明模块用途（现有代码风格）

## Git 提交规范

- 用 `pnpm commit`（cz-git 交互式）；类型必须为：`feat | fix | docs | style | refactor | perf | test | build | ci | revert | chore | wip`
- Husky + lint-staged：提交前自动 ESLint / Prettier / Stylelint 修复，若有报错需修复后再提交，禁止 `--no-verify`

## 注意事项

1. 不要修改 `auto-imports.d.ts` / `components.d.ts`（自动生成）
2. 不要绕过 `utils/http` 直接使用 axios
3. 生产构建会 drop console/debugger，开发调试用 `VITE_DROP_CONSOLE`
4. 图标用 Iconify 在线图标（`ri:` 前缀为主），本地 SVG 走 `art-svg-icon` 组件
5. 表格列配置、缓存策略相关工具在 `utils/table/`，扩展表格能力优先复用而非重写
