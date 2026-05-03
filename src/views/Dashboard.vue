<template>
  <div class="dashboard">
    <h2 class="page-title">仪表盘</h2>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value">{{ stats.totalOrders }}</div>
          <div class="stat-label">总订单数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card stat-pending">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待处理</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card stat-transporting">
          <div class="stat-value">{{ stats.transporting }}</div>
          <div class="stat-label">运输中</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card stat-completed">
          <div class="stat-value">{{ stats.completed }}</div>
          <div class="stat-label">已完成</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="content-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>温度异常预警</span>
            </div>
          </template>
          <div v-if="alerts.length === 0" class="empty-state">暂无预警</div>
          <div v-else>
            <TemperatureAlert
              v-for="alert in alerts"
              :key="alert._id"
              :alert="alert"
            />
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>近期订单</span>
              <el-button type="primary" link @click="$router.push('/orders')">
                查看全部
              </el-button>
            </div>
          </template>
          <el-table :data="recentOrders" style="width: 100%">
            <el-table-column prop="orderNo" label="订单号" width="180" />
            <el-table-column prop="customerName" label="客户" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { orders } from '@/api/client'
import TemperatureAlert from '@/components/TemperatureAlert.vue'
import { ElMessage } from 'element-plus'

const stats = ref({
  totalOrders: 0,
  transporting: 0,
  pending: 0,
  completed: 0,
})
const alerts = ref([])
const recentOrders = ref([])

const statusMap = {
  pending: { label: '待处理', type: 'warning' },
  confirmed: { label: '已确认', type: '' },
  transporting: { label: '运输中', type: 'primary' },
  completed: { label: '已完成', type: 'success' },
  cancelled: { label: '已取消', type: 'danger' },
}

function getStatusType(status) {
  return statusMap[status]?.type || ''
}

function getStatusLabel(status) {
  return statusMap[status]?.label || status
}

async function fetchDashboardData() {
  try {
    const [allOrders, pendingRes, transportingRes, completedRes] = await Promise.all([
      orders.list({ pageSize: 1 }),
      orders.list({ status: 'pending', pageSize: 1 }),
      orders.list({ status: 'transporting', pageSize: 1 }),
      orders.list({ status: 'completed', pageSize: 1 }),
    ])

    stats.value = {
      totalOrders: allOrders.meta?.total || 0,
      pending: pendingRes.meta?.total || 0,
      transporting: transportingRes.meta?.total || 0,
      completed: completedRes.meta?.total || 0,
    }

    recentOrders.value = (allOrders.data || []).slice(0, 5)
  } catch (err) {
    ElMessage.error('获取数据失败')
  }
}

onMounted(fetchDashboardData)
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
}

.page-title {
  margin-bottom: 20px;
  font-size: 24px;
  color: #303133;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  padding: 20px 0;
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  color: #409eff;
}

.stat-label {
  margin-top: 8px;
  color: #909399;
  font-size: 14px;
}

.stat-pending .stat-value {
  color: #e6a23c;
}

.stat-transporting .stat-value {
  color: #409eff;
}

.stat-completed .stat-value {
  color: #67c23a;
}

.content-row {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #909399;
}
</style>
