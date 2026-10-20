import { AppRouteRecord } from '@/types/router'
import { WEB_LINKS } from '@/utils/constants'

export const helpRoutes: AppRouteRecord[] = [
  {
    name: 'Document',
    path: '',
    component: '',
    meta: {
      title: 'menus.help.document',
      icon: 'ri:bill-line',
      link: WEB_LINKS.DOCS,
      isIframe: false,
      keepAlive: false,
      isHide: true // 暂时隐藏该菜单，恢复时删除此行
    }
  },
  {
    name: 'LiteVersion',
    path: '',
    component: '',
    meta: {
      title: 'menus.help.liteVersion',
      icon: 'ri:bus-2-line',
      link: WEB_LINKS.LiteVersion,
      isIframe: false,
      keepAlive: false,
      isHide: true // 暂时隐藏该菜单，恢复时删除此行
    }
  },
  {
    name: 'OldVersion',
    path: '',
    component: '',
    meta: {
      title: 'menus.help.oldVersion',
      icon: 'ri:subway-line',
      link: WEB_LINKS.OldVersion,
      isIframe: false,
      keepAlive: false,
      isHide: true // 暂时隐藏该菜单，恢复时删除此行
    }
  },
  {
    name: 'ChangeLog',
    path: '/change/log',
    component: '/change/log',
    meta: {
      title: 'menus.plan.log',
      showTextBadge: `v${__APP_VERSION__}`,
      icon: 'ri:gamepad-line',
      keepAlive: false,
      isHide: true // 暂时隐藏该菜单，恢复时删除此行
    }
  }
]
