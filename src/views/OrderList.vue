<template>
  <div class="order-list">
    <div class="page-header">
      <h2 class="page-title">订单管理</h2>
      <el-button type="primary" @click="showCreateDialog">创建订单</el-button>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable>
            <el-option label="待处理" value="pending" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="运输中" value="transporting" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="温度范围">
          <el-select v-model="filters.tempRange" placeholder="全部" clearable>
            <el-option label="冷冻" value="frozen" />
            <el-option label="冷藏" value="cold" />
            <el-option label="恒温" value="constant" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchOrders">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="ordersList" v-loading="loading" style="width: 100%">
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="customerName" label="客户" width="120" />
        <el-table-column prop="cargoType" label="货物类型" width="100" />
        <el-table-column label="温度范围" width="140">
          <template #default="{ row }">
            <el-tag :type="getTempRangeType(row.tempRange)" size="small">
              {{ getTempRangeLabel(row.tempRange) }}
            </el-tag>
            <span class="temp-detail">
              {{ row.tempMin }}°C ~ {{ row.tempMax }}°C
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
            <el-dropdown @command="(cmd) => updateStatus(row, cmd)">
              <el-button link type="primary">
                更新状态
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="s in availableStatuses(row.status)"
                    :key="s.value"
                    :command="s.value"
                  >
                    {{ s.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button link type="danger" @click="deleteOrder(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @change="fetchOrders"
        />
      </div>
    </el-card>

    <OrderForm
      v-model:visible="dialogVisible"
      :order="currentOrder"
      @submit="handleCreate"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { orders } from '@/api/client'
import OrderForm from '@/components/OrderForm.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const ordersList = ref([])
const dialogVisible = ref(false)
const currentOrder = ref(null)

const filters = reactive({
  status: '',
  tempRange: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const statusMap = {
  pending: { label: '待处理', type: 'warning' },
  confirmed: { label: '已确认', type: '' },
  transporting: { label: '运输中', type: 'primary' },
  completed: { label: '已完成', type: 'success' },
  cancelled: { label: '已取消', type: 'danger' },
}

const tempRangeMap = {
  frozen: { label: '冷冻', type: 'primary' },
  cold: { label: '冷藏', type: 'success' },
  constant: { label: '恒温', type: 'warning' },
}

function getStatusType(status) {
  return statusMap[status]?.type || ''
}

function getStatusLabel(status) {
  return statusMap[status]?.label || status
}

function getTempRangeType(range) {
  return tempRangeMap[range]?.type || ''
}

function getTempRangeLabel(range) {
  return tempRangeMap[range]?.label || range
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

function availableStatuses(current) {
  const all = [
    { value: 'pending', label: '待处理' },
    { value: 'confirmed', label: '已确认' },
    { value: 'transporting', label: '运输中' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
  ]
  return all.filter((s) => s.value !== current)
}

async function fetchOrders() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (filters.status) params.status = filters.status
    if (filters.tempRange) params.tempRange = filters.tempRange

    const res = await orders.list(params)
    ordersList.value = res.data || []
    pagination.total = res.meta?.total || 0
  } catch (err) {
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

function showCreateDialog() {
  currentOrder.value = null
  dialogVisible.value = true
}

async function handleCreate(data) {
  try {
    await orders.create(data)
    ElMessage.success('订单创建成功')
    dialogVisible.value = false
    fetchOrders()
  } catch (err) {
    ElMessage.error('订单创建失败')
  }
}

async function updateStatus(order, status) {
  try {
    await orders.updateStatus(order._id, status)
    ElMessage.success('状态更新成功')
    fetchOrders()
  } catch (err) {
    ElMessage.error('状态更新失败')
  }
}

async function deleteOrder(order) {
  try {
    await ElMessageBox.confirm('确定删除该订单吗?', '提示', { type: 'warning' })
    await orders.delete(order._id)
    ElMessage.success('订单删除成功')
    fetchOrders()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('订单删除失败')
    }
  }
}

function viewDetail(order) {
  currentOrder.value = order
  dialogVisible.value = true
}

onMounted(fetchOrders)
</script>

<style scoped>
.order-list {
  max-width: 1200px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  color: #303133;
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.temp-detail {
  margin-left: 8px;
  color: #606266;
  font-size: 12px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
