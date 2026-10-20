import { fetchMockLogin, fetchMockUserInfo } from '@/mock/dli/users'

/**
 * 登录
 * @param params 登录参数
 * @returns 登录响应
 */
export function fetchLogin(params: Api.Auth.LoginParams) {
  return fetchMockLogin(params)
}

/**
 * 获取用户信息
 * @returns 用户信息
 */
export function fetchGetUserInfo() {
  return fetchMockUserInfo()
}
