import { AppRouteRecord } from '@/types/router'

/**
 * DLI 医患双端智能诊疗平台 - 医生端路由
 *
 * 菜单结构对应《DLI 疾病管理系统项目建设蓝图》用户前台导航：
 * 首页、患者管理、评估预警、处理记录、随访计划、审核发布
 *
 * 说明：各页面均作为一级菜单平铺展示，患者详情为隐藏路由（从患者列表进入）
 */
export const dliRoutes: AppRouteRecord[] = [
  {
    path: '/dli/home',
    name: 'DliHome',
    component: '/dli/home',
    meta: {
      title: 'menus.dli.home',
      icon: 'ri:dashboard-3-line',
      fixedTab: true,
      keepAlive: false
    }
  },
  {
    path: '/dli/patient/list',
    name: 'DliPatientList',
    component: '/dli/patient/list',
    meta: {
      title: 'menus.dli.patient.title',
      icon: 'ri:group-line',
      keepAlive: true
    }
  },
  {
    path: '/dli/patient/detail/:id',
    name: 'DliPatientDetail',
    component: '/dli/patient/detail',
    meta: {
      title: 'menus.dli.patient.detail',
      icon: 'ri:user-heart-line',
      isHide: true,
      activePath: '/dli/patient/list',
      keepAlive: false
    }
  },
  {
    path: '/dli/cdss',
    name: 'DliCdss',
    component: '/dli/cdss',
    meta: {
      title: 'menus.dli.cdss',
      icon: 'ri:stethoscope-line',
      keepAlive: true
    }
  },
  {
    path: '/dli/alert',
    name: 'DliAlert',
    component: '/dli/alert',
    meta: {
      title: 'menus.dli.alert',
      icon: 'ri:alarm-warning-line',
      keepAlive: true
    }
  },
  {
    path: '/dli/followup',
    name: 'DliFollowup',
    component: '/dli/followup',
    meta: {
      title: 'menus.dli.followup',
      icon: 'ri:calendar-check-line',
      keepAlive: true
    }
  },
  {
    path: '/dli/review',
    name: 'DliReview',
    component: '/dli/review',
    meta: {
      title: 'menus.dli.review',
      icon: 'ri:shield-check-line',
      keepAlive: true
    }
  }
]
