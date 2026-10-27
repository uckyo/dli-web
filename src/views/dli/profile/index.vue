<!-- DLI 个人中心：账号信息 / 安全设置 / 数据权限 -->
<template>
  <div class="art-full-height overflow-y-auto pb-5">
    <div class="art-card mb-5 px-5 py-5">
      <div class="flex-c flex-wrap gap-4">
        <ElAvatar :size="64" :src="userStore.getUserInfo.avatar">
          {{ displayName.slice(0, 1) }}
        </ElAvatar>
        <div class="flex-1">
          <div class="flex-c flex-wrap gap-2">
            <h3 class="text-lg font-medium text-g-900">{{ displayName }}</h3>
            <ElTag type="primary" effect="plain">{{ roleName }}</ElTag>
            <ElTag type="success" effect="plain">{{ account?.orgName ?? '—' }}</ElTag>
          </div>
          <p class="mt-1 text-sm text-g-500">
            {{ userStore.getUserInfo.email }} · {{ account?.userName }}
          </p>
        </div>
        <div class="flex gap-6 text-center">
          <div>
            <p class="text-xl font-semibold text-g-900">{{ headStat.value }}</p>
            <p class="mt-1 text-xs text-g-500">{{ headStat.label }}</p>
          </div>
          <div>
            <p class="text-xl font-semibold text-g-900">{{ menus.length }}</p>
            <p class="mt-1 text-xs text-g-500">可用菜单</p>
          </div>
        </div>
      </div>
    </div>

    <div class="art-card px-5 pb-5 pt-2">
      <ElTabs v-model="activeTab">
        <!-- 账号信息 -->
        <ElTabPane label="账号信息" name="info">
          <div class="grid grid-cols-1 gap-8 pt-2 lg:grid-cols-2">
            <ElForm :model="infoForm" label-width="96px">
              <ElFormItem label="显示名称">
                <ElInput v-model="infoForm.nickName" maxlength="20" />
              </ElFormItem>
              <ElFormItem label="邮箱">
                <ElInput v-model="infoForm.email" />
              </ElFormItem>
              <ElFormItem label="手机号">
                <ElInput v-model="infoForm.phone" maxlength="11" />
              </ElFormItem>
              <ElFormItem label="办公地点">
                <ElInput v-model="infoForm.office" maxlength="40" />
              </ElFormItem>
              <ElFormItem>
                <ElButton type="primary" @click="saveInfo">保存修改</ElButton>
              </ElFormItem>
            </ElForm>

            <ElDescriptions :column="1" border>
              <ElDescriptionsItem label="登录账号">
                {{ account?.userName ?? '—' }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="角色">{{ roleName }}</ElDescriptionsItem>
              <ElDescriptionsItem label="所属组织">
                {{ account?.orgName ?? '—' }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="数据范围">{{ scopeText }}</ElDescriptionsItem>
              <ElDescriptionsItem label="账号状态">
                <ElTag type="success" effect="light">正常</ElTag>
              </ElDescriptionsItem>
            </ElDescriptions>
          </div>
        </ElTabPane>

        <!-- 安全设置 -->
        <ElTabPane label="安全设置" name="security">
          <div class="grid grid-cols-1 gap-8 pt-2 lg:grid-cols-2">
            <div>
              <h4 class="mb-3 font-medium text-g-900">修改登录密码</h4>
              <ElForm ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="96px">
                <ElFormItem label="原密码" prop="oldPassword">
                  <ElInput v-model="pwdForm.oldPassword" type="password" show-password />
                </ElFormItem>
                <ElFormItem label="新密码" prop="newPassword">
                  <ElInput v-model="pwdForm.newPassword" type="password" show-password />
                </ElFormItem>
                <ElFormItem label="确认密码" prop="confirmPassword">
                  <ElInput v-model="pwdForm.confirmPassword" type="password" show-password />
                </ElFormItem>
                <ElFormItem>
                  <ElButton type="primary" @click="submitPassword">更新密码</ElButton>
                </ElFormItem>
              </ElForm>
            </div>

            <div>
              <h4 class="mb-3 font-medium text-g-900">登录设备</h4>
              <ElTable :data="DEVICES" border>
                <ElTableColumn prop="device" label="设备" min-width="150" />
                <ElTableColumn prop="place" label="登录地点" width="120" />
                <ElTableColumn prop="time" label="最近登录" width="130" />
                <ElTableColumn label="状态" width="100">
                  <template #default="{ row }">
                    <ElTag :type="row.current ? 'success' : 'info'" effect="light">
                      {{ row.current ? '当前设备' : '已登录' }}
                    </ElTag>
                  </template>
                </ElTableColumn>
              </ElTable>
              <p class="mt-3 text-xs text-g-500">
                公共设备使用完毕后请及时退出登录；发现异常登录请联系平台管理员重置密码。
              </p>
            </div>
          </div>
        </ElTabPane>

        <!-- 数据权限 -->
        <ElTabPane label="数据权限" name="permission">
          <div class="pt-2">
            <h4 class="mb-2 font-medium text-g-900">菜单权限</h4>
            <div class="flex flex-wrap gap-2">
              <ElTag v-for="menu in menus" :key="menu" effect="plain">{{ menu }}</ElTag>
            </div>

            <h4 class="mb-2 mt-6 font-medium text-g-900">数据范围</h4>
            <ElAlert :title="scopeText" type="info" :closable="false" show-icon />

            <h4 class="mb-2 mt-6 font-medium text-g-900">管理边界</h4>
            <ul class="list-inside list-disc space-y-1 text-sm leading-6 text-g-600">
              <li v-for="item in boundaries" :key="item">{{ item }}</li>
            </ul>
          </div>
        </ElTabPane>
      </ElTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { getAccountByRole } from '@/mock/dli/users'
  import { useUserStore } from '@/store/modules/user'

  defineOptions({ name: 'DliProfile' })

  const userStore = useUserStore()

  const role = computed(() => userStore.getUserInfo.roles?.[0] ?? 'R_DOCTOR')

  /** 角色名称 */
  const ROLE_NAMES: Record<string, string> = {
    R_DOCTOR: '医生',
    R_ASSISTANT: '医生助理',
    R_NURSE: '护士',
    R_PLATFORM: '平台管理员',
    R_CENTER: '中心管理员',
    R_GROUP: '课题组管理员',
    R_SYS: '系统管理员'
  }

  const roleName = computed(() => ROLE_NAMES[role.value] ?? '医生')
  const account = computed(() => getAccountByRole(role.value))
  const displayName = computed(
    () => userStore.getUserInfo.userName ?? account.value?.nickName ?? '用户'
  )

  /** 各角色数据范围 */
  const SCOPE_TEXT: Record<string, string> = {
    R_DOCTOR: '本课题组在管患者',
    R_ASSISTANT: '所协助医生名下患者',
    R_NURSE: '所负责患者',
    R_PLATFORM: '平台下全部中心、课题组与用户',
    R_CENTER: '本中心及下属课题组',
    R_GROUP: '本课题组医生与患者',
    R_SYS: '全系统平台、中心与用户'
  }

  const scopeText = computed(() => SCOPE_TEXT[role.value] ?? '平台数据')

  /** 角色概览指标 */
  const headStat = computed(() => {
    const map: Record<string, { label: string; value: number }> = {
      R_DOCTOR: { label: '在管患者', value: 86 },
      R_ASSISTANT: { label: '协助患者', value: 46 },
      R_NURSE: { label: '负责患者', value: 52 },
      R_PLATFORM: { label: '管理用户', value: 386 },
      R_CENTER: { label: '本中心医生', value: 52 },
      R_GROUP: { label: '课题组医生', value: 5 },
      R_SYS: { label: '托管平台', value: 3 }
    }
    return map[role.value] ?? { label: '在管患者', value: 0 }
  })

  /** 基础菜单（全部角色） */
  const BASE_MENUS = [
    '工作台',
    '患者管理',
    '模型管理',
    '智能管理',
    '检查管理',
    '生物样本',
    '研究管理',
    '个人中心'
  ]

  /** 菜单权限 */
  const menus = computed(() => {
    const extra: Record<string, string[]> = {
      R_DOCTOR: ['状态管理', '人员管理'],
      R_ASSISTANT: ['状态管理', '人员管理'],
      R_NURSE: ['状态管理', '人员管理'],
      R_PLATFORM: ['平台管理'],
      R_CENTER: ['中心管理'],
      R_GROUP: ['课题组管理'],
      R_SYS: ['系统管理']
    }
    return [...BASE_MENUS, ...(extra[role.value] ?? [])]
  })

  /** 管理边界说明 */
  const boundaries = computed(() => {
    const map: Record<string, string[]> = {
      R_DOCTOR: [
        '可管理本人名下患者、助理与护士',
        '可发起研究并设置共享范围',
        '涉及删除的操作需由平台管理员完成'
      ],
      R_ASSISTANT: [
        '可协助维护所属医生名下患者',
        '可参与研究与管理随访状态',
        '不可删除用户与课题组成员'
      ],
      R_NURSE: ['可维护所负责患者的随访与体征', '可查看共享研究项目', '不可删除用户与课题组成员'],
      R_PLATFORM: [
        '可新增、编辑与删除中心',
        '可删除平台下全部用户（平台负责人除外）',
        '不可暂停平台服务'
      ],
      R_CENTER: [
        '可维护本中心课题组（不可删除）',
        '可维护本中心用户（不可删除）',
        '可查看共享至本中心的研究项目'
      ],
      R_GROUP: [
        '可维护本课题组医生（不可删除）',
        '可维护本课题组用户（不可删除）',
        '可查看共享至本课题组的研究项目'
      ],
      R_SYS: ['可暂停或恢复平台服务', '可查看并维护全部平台用户（不可删除）', '可调整全局基础配置']
    }
    return map[role.value] ?? []
  })

  const activeTab = ref('info')

  /** 账号信息表单（演示数据） */
  const infoForm = reactive({
    nickName: displayName.value,
    email: userStore.getUserInfo.email ?? '',
    phone: '138****2026',
    office: account.value?.orgName ?? ''
  })

  /** 保存账号信息（演示） */
  function saveInfo() {
    ElMessage.success('账号信息已保存（演示）')
  }

  /** 登录设备（演示数据） */
  const DEVICES = [
    { device: 'Chrome · Windows', place: '上海', time: '刚刚', current: true },
    { device: 'Safari · iPhone 15', place: '上海', time: '3 天前', current: false },
    { device: 'Edge · Windows', place: '杭州', time: '2026-10-12', current: false }
  ]

  /* ------------------------------ 修改密码 ------------------------------ */

  const pwdFormRef = ref<FormInstance>()
  const pwdForm = reactive({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const pwdRules: FormRules = {
    oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
    newPassword: [
      { required: true, message: '请输入新密码', trigger: 'blur' },
      { min: 6, message: '密码至少 6 位', trigger: 'blur' }
    ],
    confirmPassword: [
      { required: true, message: '请再次输入新密码', trigger: 'blur' },
      {
        validator: (_rule, value, callback) => {
          if (value !== pwdForm.newPassword) {
            callback(new Error('两次输入的密码不一致'))
            return
          }
          callback()
        },
        trigger: 'blur'
      }
    ]
  }

  /** 更新密码（演示） */
  async function submitPassword() {
    if (!pwdFormRef.value) return
    const valid = await pwdFormRef.value.validate().catch(() => false)
    if (!valid) return
    ElMessage.success('密码已更新，请使用新密码重新登录（演示）')
    pwdForm.oldPassword = ''
    pwdForm.newPassword = ''
    pwdForm.confirmPassword = ''
    pwdFormRef.value.resetFields()
  }
</script>
