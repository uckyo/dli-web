/**
 * 快速入口配置
 * 包含：应用列表、快速链接等配置（按 DLI 业务菜单定制）
 */
import type { FastEnterConfig } from '@/types/config'

const fastEnterConfig: FastEnterConfig = {
  // 显示条件（屏幕宽度）
  minWidth: 1200,
  // 应用列表
  applications: [
    {
      name: '工作台',
      description: '平台概览与智能预警',
      icon: 'ri:dashboard-3-line',
      iconColor: '#377dff',
      enabled: true,
      order: 1,
      routeName: 'DliWorkbench'
    },
    {
      name: '患者管理',
      description: '患者档案与医患对话',
      icon: 'ri:group-line',
      iconColor: '#13DEB9',
      enabled: true,
      order: 2,
      routeName: 'DliPatient'
    },
    {
      name: '检查管理',
      description: '影像 / 病理 / 检验资料',
      icon: 'ri:file-search-line',
      iconColor: '#ffb100',
      enabled: true,
      order: 3,
      routeName: 'DliExam'
    },
    {
      name: '研究管理',
      description: '分组指标与 Agent 研究',
      icon: 'ri:flask-line',
      iconColor: '#7A7FFF',
      enabled: true,
      order: 4,
      routeName: 'DliResearch'
    },
    {
      name: '智能管理',
      description: '技能 / 知识库 / 智能体',
      icon: 'ri:robot-2-line',
      iconColor: '#38C0FC',
      enabled: true,
      order: 5,
      routeName: 'DliIntelligence'
    }
  ],
  // 快速链接
  quickLinks: [
    {
      name: '个人中心',
      enabled: true,
      order: 1,
      routeName: 'DliProfile'
    },
    {
      name: '模型管理',
      enabled: true,
      order: 2,
      routeName: 'DliModel'
    },
    {
      name: '生物样本',
      enabled: true,
      order: 3,
      routeName: 'DliSample'
    }
  ]
}

export default Object.freeze(fastEnterConfig)
