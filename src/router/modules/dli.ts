import { AppRouteRecord } from '@/types/router'

/**
 * DLI 疾病智能管理平台 - Web 端路由
 *
 * 菜单结构对应《疾病智能管理平台系统.md》Web 端 14 个菜单：
 * 工作台、患者管理、模型管理、智能管理、检查管理、生物样本、研究管理、
 * 个人中心、状态管理、人员管理、平台管理、中心管理、课题组管理、系统管理。
 *
 * 菜单权限按文档「角色」列裁剪：
 * - 所有 Web 角色：前 8 个菜单（含研究管理只读的共享项目视图）
 * - 医生 / 医生助理 / 护士：额外可访问状态管理、人员管理
 * - 平台管理端：额外可访问平台管理（可删除中心与用户）
 * - 中心管理端：额外可访问中心管理（不可删除）
 * - 课题组管理端：额外可访问课题组管理（不可删除）
 * - 系统管理端：额外可访问系统管理（可暂停平台服务）
 *
 * 角色编码：R_DOCTOR 医生 / R_ASSISTANT 医生助理 / R_NURSE 护士 /
 * R_PLATFORM 平台管理员 / R_CENTER 中心管理员 / R_GROUP 课题组管理员 / R_SYS 系统管理员
 */

/** 全部 Web 角色 */
const ALL_ROLES = [
  'R_DOCTOR',
  'R_ASSISTANT',
  'R_NURSE',
  'R_PLATFORM',
  'R_CENTER',
  'R_GROUP',
  'R_SYS'
]

/** 临床角色（医生、医生助理、护士） */
const CLINICAL_ROLES = ['R_DOCTOR', 'R_ASSISTANT', 'R_NURSE']

export const dliRoutes: AppRouteRecord[] = [
  {
    path: '/dli/workbench',
    name: 'DliWorkbench',
    component: '/dli/workbench',
    meta: {
      title: 'menus.dli.workbench',
      icon: 'ri:dashboard-3-line',
      fixedTab: true,
      keepAlive: false,
      roles: ALL_ROLES
    }
  },
  {
    path: '/dli/patient',
    name: 'DliPatient',
    component: '/dli/patient',
    meta: {
      title: 'menus.dli.patient',
      icon: 'ri:group-line',
      keepAlive: true,
      roles: ALL_ROLES
    }
  },
  {
    path: '/dli/model',
    name: 'DliModel',
    component: '/dli/model',
    meta: {
      title: 'menus.dli.model',
      icon: 'ri:cpu-line',
      keepAlive: true,
      roles: ALL_ROLES
    }
  },
  {
    path: '/dli/intelligence',
    name: 'DliIntelligence',
    component: '/index/index',
    meta: {
      title: 'menus.dli.intelligence.title',
      icon: 'ri:robot-2-line',
      roles: ALL_ROLES
    },
    children: [
      {
        path: 'skill',
        name: 'DliIntelligenceSkill',
        component: '/dli/intelligence/skill',
        meta: {
          title: 'menus.dli.intelligence.skill',
          icon: 'ri:magic-line',
          keepAlive: true
        }
      },
      {
        path: 'knowledge',
        name: 'DliIntelligenceKnowledge',
        component: '/dli/intelligence/knowledge',
        meta: {
          title: 'menus.dli.intelligence.knowledge',
          icon: 'ri:book-2-line',
          keepAlive: true
        }
      },
      {
        path: 'mcp',
        name: 'DliIntelligenceMcp',
        component: '/dli/intelligence/mcp',
        meta: {
          title: 'menus.dli.intelligence.mcp',
          icon: 'ri:links-line',
          keepAlive: true
        }
      },
      {
        path: 'llm',
        name: 'DliIntelligenceLlm',
        component: '/dli/intelligence/llm',
        meta: {
          title: 'menus.dli.intelligence.llm',
          icon: 'ri:brain-line',
          keepAlive: true
        }
      },
      {
        path: 'agent',
        name: 'DliIntelligenceAgent',
        component: '/dli/intelligence/agent',
        meta: {
          title: 'menus.dli.intelligence.agent',
          icon: 'ri:sparkling-line',
          keepAlive: true
        }
      }
    ]
  },
  {
    path: '/dli/exam',
    name: 'DliExam',
    component: '/dli/exam',
    meta: {
      title: 'menus.dli.exam',
      icon: 'ri:file-search-line',
      keepAlive: true,
      roles: ALL_ROLES
    }
  },
  {
    path: '/dli/sample',
    name: 'DliSample',
    component: '/index/index',
    meta: {
      title: 'menus.dli.sample.title',
      icon: 'ri:test-tube-line',
      roles: ALL_ROLES
    },
    children: [
      {
        path: 'record',
        name: 'DliSampleRecord',
        component: '/dli/sample/record',
        meta: {
          title: 'menus.dli.sample.record',
          icon: 'ri:archive-2-line',
          keepAlive: true
        }
      },
      {
        path: 'test',
        name: 'DliSampleTest',
        component: '/dli/sample/test',
        meta: {
          title: 'menus.dli.sample.test',
          icon: 'ri:flask-line',
          keepAlive: true
        }
      }
    ]
  },
  {
    path: '/dli/research',
    name: 'DliResearch',
    component: '/dli/research',
    meta: {
      title: 'menus.dli.research',
      icon: 'ri:flask-line',
      keepAlive: true,
      roles: ALL_ROLES
    }
  },
  {
    path: '/dli/status',
    name: 'DliStatus',
    component: '/dli/status',
    meta: {
      title: 'menus.dli.status',
      icon: 'ri:loop-left-line',
      keepAlive: true,
      roles: CLINICAL_ROLES
    }
  },
  {
    path: '/dli/staff',
    name: 'DliStaff',
    component: '/dli/staff',
    meta: {
      title: 'menus.dli.staff',
      icon: 'ri:team-line',
      keepAlive: true,
      roles: CLINICAL_ROLES
    }
  },
  {
    path: '/dli/platform',
    name: 'DliPlatform',
    component: '/dli/platform',
    meta: {
      title: 'menus.dli.platform',
      icon: 'ri:building-2-line',
      keepAlive: true,
      roles: ['R_PLATFORM']
    }
  },
  {
    path: '/dli/center',
    name: 'DliCenter',
    component: '/dli/center',
    meta: {
      title: 'menus.dli.center',
      icon: 'ri:hospital-line',
      keepAlive: true,
      roles: ['R_CENTER']
    }
  },
  {
    path: '/dli/group',
    name: 'DliGroup',
    component: '/dli/group',
    meta: {
      title: 'menus.dli.group',
      icon: 'ri:organization-chart',
      keepAlive: true,
      roles: ['R_GROUP']
    }
  },
  {
    path: '/dli/system',
    name: 'DliSystem',
    component: '/index/index',
    meta: {
      title: 'menus.dli.system.title',
      icon: 'ri:settings-3-line',
      roles: ['R_SYS']
    },
    children: [
      {
        path: 'config',
        name: 'DliSystemConfig',
        component: '/dli/system/config',
        meta: {
          title: 'menus.dli.system.config',
          icon: 'ri:settings-4-line',
          keepAlive: true
        }
      },
      {
        path: 'platform',
        name: 'DliSystemPlatform',
        component: '/dli/system/platform',
        meta: {
          title: 'menus.dli.system.platform',
          icon: 'ri:building-2-line',
          keepAlive: true
        }
      },
      {
        path: 'user',
        name: 'DliSystemUser',
        component: '/dli/system/user',
        meta: {
          title: 'menus.dli.system.user',
          icon: 'ri:user-settings-line',
          keepAlive: true
        }
      }
    ]
  },
  {
    path: '/dli/profile',
    name: 'DliProfile',
    component: '/dli/profile',
    meta: {
      title: 'menus.dli.profile',
      icon: 'ri:user-settings-line',
      keepAlive: true,
      roles: ALL_ROLES
    }
  }
]
