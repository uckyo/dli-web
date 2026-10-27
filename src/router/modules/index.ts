import { AppRouteRecord } from '@/types/router'
import { dliRoutes } from './dli'

/**
 * 导出所有模块化路由
 *
 * 本系统为 DLI 疾病智能管理平台，仅注册业务菜单；
 * 模板自带的示例模块（dashboard / widgets / template 等）不再挂载。
 */
export const routeModules: AppRouteRecord[] = [...dliRoutes]
