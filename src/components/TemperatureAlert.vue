<template>
  <div class="temperature-alert" :class="alertClass">
    <el-icon class="alert-icon"><WarningFilled /></el-icon>
    <div class="alert-content">
      <div class="alert-title">{{ alertTitle }}</div>
      <div class="alert-detail">
        当前温度: {{ data.temperature }}°C | 要求范围: {{ data.tempMin }}°C ~ {{ data.tempMax }}°C
      </div>
      <div class="alert-time">{{ formatTime(data.timestamp) }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'

const props = defineProps({
  alert: { type: Object, required: true },
})

const data = computed(() => props.alert)

const alertClass = computed(() => {
  if (data.value.alertType === 'temp_under') return 'alert-cold'
  if (data.value.alertType === 'temp_over') return 'alert-warm'
  return 'alert-warning'
})

const alertTitle = computed(() => {
  switch (data.value.alertType) {
    case 'temp_under':
      return '温度过低预警'
    case 'temp_over':
      return '温度过高预警'
    case 'delay':
      return '延迟预警'
    default:
      return '异常预警'
  }
})

function formatTime(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.temperature-alert {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 4px;
  background-color: #fef0f0;
}

.alert-cold {
  background-color: #e8f4ff;
}

.alert-warm {
  background-color: #fdf6ec;
}

.alert-icon {
  font-size: 20px;
  color: #f56c6c;
  margin-right: 12px;
  margin-top: 2px;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.alert-detail {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}

.alert-time {
  font-size: 12px;
  color: #909399;
}
</style>
