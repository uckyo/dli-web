/**
 * 智能管理角色判断
 *
 * 所有角色可查看智能管理页面；仅平台管理员 / 系统管理员可执行写操作。
 */
import { computed } from 'vue'
import { useUserStore } from '@/store/modules/user'

const ADMIN_ROLES = ['R_PLATFORM', 'R_SYS']

export function useIntelligenceRole() {
  const userStore = useUserStore()
  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')
  const isAdmin = computed(() => ADMIN_ROLES.includes(role.value))

  return { role, isAdmin }
}
