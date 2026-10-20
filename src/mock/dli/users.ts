/**
 * DLI 账号与角色 Mock
 *
 * 按《DLI 疾病管理系统项目建设蓝图 V1.1》定义医生端 Web 的四类登录账号：
 * - 管理员：全部菜单 + 系统管理
 * - 医生：首页、患者管理、评估预警、处理记录、随访计划、审核发布
 * - 医生助理：首页、患者管理、随访计划
 * - 护士：首页、患者管理、处理记录
 *
 * 菜单权限通过路由 meta.roles 与角色编码匹配实现，账号密码均为 123456。
 */
import avatarAdmin from '@/assets/images/avatar/avatar2.webp'
import avatarAssistant from '@/assets/images/avatar/avatar3.webp'
import avatarDoctor from '@/assets/images/avatar/avatar1.webp'
import avatarNurse from '@/assets/images/avatar/avatar4.webp'

/** DLI 角色编码 */
export type DliRoleCode = 'R_ADMIN' | 'R_DOCTOR' | 'R_ASSISTANT' | 'R_NURSE'

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
  /** 邮箱 */
  email: string
  /** 头像 */
  avatar: string
}

/** 当前登录账号在 localStorage 中的键（用于按 token 还原用户信息） */
const CURRENT_ACCOUNT_KEY = 'dli-current-account'

/** 模拟网络延迟 */
const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms))

/** 账号列表 */
export const DLI_ACCOUNTS: DliAccount[] = [
  {
    userId: 1,
    userName: 'doctor',
    password: '123456',
    nickName: '陈明远',
    roleCode: 'R_DOCTOR',
    roleName: '医生',
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
    email: 'nurse@dli.com',
    avatar: avatarNurse
  },
  {
    userId: 4,
    userName: 'admin',
    password: '123456',
    nickName: '平台管理员',
    roleCode: 'R_ADMIN',
    roleName: '管理员',
    email: 'admin@dli.com',
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
