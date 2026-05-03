<template>
  <div class="tracking-timeline">
    <el-timeline>
      <el-timeline-item
        v-for="(log, index) in logs"
        :key="log._id || index"
        :timestamp="formatTime(log.timestamp)"
        placement="top"
        :type="getEventTypeColor(log.eventType)"
        :hollow="log.alertType ? false : true"
      >
        <el-card :class="{ 'alert-card': log.alertType }">
          <div class="timeline-header">
            <el-tag :type="getEventTypeTagType(log.eventType)" size="small">
              {{ getEventTypeLabel(log.eventType) }}
            </el-tag>
            <span class="operator">操作人: {{ log.operator }}</span>
          </div>
          <div class="timeline-location">
            <el-icon><Location /></el-icon>
            {{ log.location }}
          </div>
          <div class="timeline-temp">
            温度: <span :class="getTempClass(log, orderTemp)">{{ log.temperature }}°C</span>
            <span v-if="log.humidity !== undefined" class="humidity">
              | 湿度: {{ log.humidity }}%
            </span>
          </div>
          <div v-if="log.alertType" class="alert-badge">
            <el-tag type="danger" size="small">{{ getAlertLabel(log.alertType) }}</el-tag>
          </div>
          <div v-if="log.remarks" class="remarks">{{ log.remarks }}</div>
        </el-card>
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<script setup>
import { Location } from '@element-plus/icons-vue'

const props = defineProps({
  logs: { type: Array, default: () => [] },
  orderTemp: { type: Object, default: () => ({ min: 0, max: 0 }) },
})

const eventTypeMap = {
  pickup: { label: '取货', type: 'success', color: 'success' },
  transit: { label: '运输中', type: 'primary', color: 'primary' },
  delivery: { label: '送达', type: 'info', color: '' },
  signed: { label: '签收', type: 'success', color: 'success' },
  alert: { label: '预警', type: 'danger', color: 'danger' },
}

function getEventTypeLabel(type) {
  return eventTypeMap[type]?.label || type
}

function getEventTypeTagType(type) {
  return eventTypeMap[type]?.type || ''
}

function getEventTypeColor(type) {
  return eventTypeMap[type]?.color || ''
}

function getAlertLabel(type) {
  const map = {
    temp_over: '温度过高',
    temp_under: '温度过低',
    delay: '延迟',
  }
  return map[type] || type
}

function getTempClass(log, orderTemp) {
  if (!orderTemp) return ''
  if (log.temperature > orderTemp.max) return 'temp-high'
  if (log.temperature < orderTemp.min) return 'temp-low'
  return 'temp-normal'
}

function formatTime(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.tracking-timeline {
  padding: 20px 0;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.operator {
  color: #909399;
  font-size: 13px;
}

.timeline-location {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  color: #303133;
  font-weight: 500;
}

.timeline-temp {
  font-size: 14px;
  color: #606266;
}

.temp-high {
  color: #f56c6c;
  font-weight: bold;
}

.temp-low {
  color: #409eff;
  font-weight: bold;
}

.temp-normal {
  color: #67c23a;
  font-weight: bold;
}

.humidity {
  color: #909399;
}

.alert-card {
  border-color: #f56c6c;
}

.alert-badge {
  margin-top: 8px;
}

.remarks {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}
</style>
