import { onMounted, ref } from 'vue'
import { fetchGetIntelligence } from '@/mock/dli/api'

/** 智能管理聚合数据类型 */
export type IntelligenceData = Awaited<ReturnType<typeof fetchGetIntelligence>>

/**
 * 智能管理各二级页面共享的数据加载逻辑
 */
export function useIntelligenceData() {
  const loading = ref(true)
  const intelligence = ref<IntelligenceData>()

  async function loadIntelligence() {
    loading.value = true
    try {
      intelligence.value = await fetchGetIntelligence()
    } finally {
      loading.value = false
    }
  }

  onMounted(loadIntelligence)

  return { loading, intelligence, loadIntelligence }
}
