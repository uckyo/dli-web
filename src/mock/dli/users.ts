/**
 * DLI 账号与角色 Mock
 *
 * 按《疾病智能管理平台系统.md》定义 Web 端 7 类登录角色：
 * - 医生 / 医生助理 / 护士：临床业务菜单（含研究管理、状态管理、人员管理）
 * - 平台管理员：全部基础菜单 + 平台管理（可删除中心与用户）
 * - 中心管理员：全部基础菜单 + 中心管理（不可删除）
 * - 课题组管理员：全部基础菜单 + 课题组管理（不可删除）
 * - 系统管理员：全部基础菜单 + 系统管理（可暂停平台服务）
 *
 * 菜单权限通过路由 meta.roles 与角色编码匹配实现，账号密码均为 123456。
 */
import avatarAdmin from '@/assets/images/avatar/avatar2.webp'
import avatarAssistant from '@/assets/images/avatar/avatar3.webp'
import avatarDoctor from '@/assets/images/avatar/avatar1.webp'
import avatarNurse from '@/assets/images/avatar/avatar4.webp'
import type { WebRoleCode } from './types'

/** DLI 角色编码 */
export type DliRoleCode = WebRoleCode

/** DLI 账号 */
export interface DliAccount {
  /** 用户 ID */
  userId: number
  /** 登录账号 */
  userName: string
  /** 登录密码 */
  password: string
  /** 显示名称 */
  nickName: string
  /** 角色编码 */
  roleCode: DliRoleCode
  /** 角色名称 */
  roleName: string
  /** 所属组织 */
  orgName: string
  /** 邮箱 */
  email: string
  /** 头像 */
  avatar: string
}

/** 当前登录账号在 localStorage 中的键（用于按 token 还原用户信息） */
const CURRENT_ACCOUNT_KEY = 'dli-current-account'

/** 模拟网络延迟 */
const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms))

/** 账号列表：7 类角色各一个演示账号 */
export const DLI_ACCOUNTS: DliAccount[] = [
  {
    userId: 1,
    userName: 'doctor',
    password: '123456',
    nickName: '陈明远',
    roleCode: 'R_DOCTOR',
    roleName: '医生',
    orgName: '华东中心 · 呼吸影像课题组',
    email: 'doctor@dli.com',
    avatar: avatarDoctor
  },
  {
    userId: 2,
    userName: 'assistant',
    password: '123456',
    nickName: '李晓彤',
    roleCode: 'R_ASSISTANT',
    roleName: '医生助理',
    orgName: '华东中心 · 呼吸影像课题组',
    email: 'assistant@dli.com',
    avatar: avatarAssistant
  },
  {
    userId: 3,
    userName: 'nurse',
    password: '123456',
    nickName: '王丽',
    roleCode: 'R_NURSE',
    roleName: '护士',
    orgName: '华东中心 · 呼吸影像课题组',
    email: 'nurse@dli.com',
    avatar: avatarNurse
  },
  {
    userId: 4,
    userName: 'platform',
    password: '123456',
    nickName: '张启明',
    roleCode: 'R_PLATFORM',
    roleName: '平台管理员',
    orgName: 'DLI 智能管理平台',
    email: 'platform@dli.com',
    avatar: avatarAdmin
  },
  {
    userId: 5,
    userName: 'center',
    password: '123456',
    nickName: '周雅琴',
    roleCode: 'R_CENTER',
    roleName: '中心管理员',
    orgName: '华东中心',
    email: 'center@dli.com',
    avatar: avatarDoctor
  },
  {
    userId: 6,
    userName: 'group',
    password: '123456',
    nickName: '刘志远',
    roleCode: 'R_GROUP',
    roleName: '课题组管理员',
    orgName: '华东中心 · 免疫药理课题组',
    email: 'group@dli.com',
    avatar: avatarAssistant
  },
  {
    userId: 7,
    userName: 'sys',
    password: '123456',
    nickName: '系统管理员',
    roleCode: 'R_SYS',
    roleName: '系统管理员',
    orgName: '系统运维中心',
    email: 'sys@dli.com',
    avatar: avatarAdmin
  }
]

/**
 * 登录
 * @param params 登录参数
 * @returns 登录响应
 */
export async function fetchMockLogin(
  params: Api.Auth.LoginParams
): Promise<Api.Auth.LoginResponse> {
  await delay()

  const account = DLI_ACCOUNTS.find(
    (item) =>
      item.userName.toLowerCase() === params.userName.trim().toLowerCase() &&
      item.password === params.password
  )

  if (!account) {
    throw new Error('账号或密码错误')
  }

  localStorage.setItem(CURRENT_ACCOUNT_KEY, account.userName)

  return {
    token: `dli-mock-token-${account.userName}`,
    refreshToken: `dli-mock-refresh-token-${account.userName}`
  }
}

/**
 * 获取当前登录用户信息
 * @returns 用户信息（含角色编码，用于菜单权限过滤）
 */
export async function fetchMockUserInfo(): Promise<Api.Auth.UserInfo> {
  await delay(100)

  const userName = localStorage.getItem(CURRENT_ACCOUNT_KEY)
  const account = DLI_ACCOUNTS.find((item) => item.userName === userName)

  if (!account) {
    throw new Error('登录状态已失效，请重新登录')
  }

  return {
    userId: account.userId,
    userName: account.nickName,
    email: account.email,
    avatar: account.avatar,
    roles: [account.roleCode],
    buttons: []
  }
}

/** 按角色编码获取账号信息（工作台、个人中心展示所属组织） */
export const getAccountByRole = (role?: string): DliAccount | undefined =>
  DLI_ACCOUNTS.find((item) => item.roleCode === role)
