import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const loading = ref(false)
  const stats = ref({
    totalOrders: 0,
    transporting: 0,
    pending: 0,
    completed: 0,
  })
  const alerts = ref([])

  function setLoading(value) {
    loading.value = value
  }

  function setStats(newStats) {
    stats.value = newStats
  }

  function setAlerts(newAlerts) {
    alerts.value = newAlerts
  }

  return {
    loading,
    stats,
    alerts,
    setLoading,
    setStats,
    setAlerts,
  }
})
