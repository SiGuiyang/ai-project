<template>
  <div class="order-list">
    <div class="page-header">
      <h2 class="page-title">订单管理</h2>
      <div class="header-actions">
        <el-button type="success" @click="handleExport">
          <el-icon><Download /></el-icon>导出
        </el-button>
        <el-button type="warning" @click="handleImport">
          <el-icon><Upload /></el-icon>导入
        </el-button>
        <el-button type="primary" @click="showCreateDialog">创建订单</el-button>
      </div>
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

    <input
      ref="importFileRef"
      type="file"
      accept=".xlsx,.xls"
      style="display: none"
      @change="handleFileChange"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { orders } from '@/api/client'
import OrderForm from '@/components/OrderForm.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Upload } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

const loading = ref(false)
const ordersList = ref([])
const dialogVisible = ref(false)
const currentOrder = ref(null)
const importFileRef = ref(null)

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

const tempRangeLabel = {
  frozen: '冷冻',
  cold: '冷藏',
  constant: '恒温',
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

// 导出功能
async function handleExport() {
  try {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.tempRange) params.tempRange = filters.tempRange

    const res = await orders.export(params)
    const data = res.data || []

    if (data.length === 0) {
      ElMessage.warning('没有可导出的数据')
      return
    }

    const exportData = data.map((item) => ({
      '订单号': item.orderNo,
      '客户名称': item.customerName,
      '客户电话': item.customerPhone,
      '取货地址': item.pickupAddress,
      '取货联系人': item.pickupContact,
      '取货电话': item.pickupPhone,
      '送货地址': item.deliveryAddress,
      '收货联系人': item.deliveryContact,
      '收货电话': item.deliveryPhone,
      '货物类型': item.cargoType,
      '货物重量(kg)': item.cargoWeight,
      '货物体积(m³)': item.cargoVolume,
      '最低温度(°C)': item.tempMin,
      '最高温度(°C)': item.tempMax,
      '温度范围': tempRangeLabel[item.tempRange] || item.tempRange,
      '状态': getStatusLabel(item.status),
      '备注': item.remarks,
      '创建时间': formatDate(item.createdAt),
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '订单列表')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/octet-stream' })
    saveAs(blob, `订单列表_${new Date().toISOString().slice(0, 10)}.xlsx`)
    ElMessage.success('导出成功')
  } catch (err) {
    ElMessage.error('导出失败')
  }
}

// 导入功能
function handleImport() {
  importFileRef.value?.click()
}

async function handleFileChange(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    const data = await readFileAsArrayBuffer(file)
    const workbook = XLSX.read(data, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(sheet)

    if (jsonData.length === 0) {
      ElMessage.warning('文件中没有数据')
      return
    }

    const importData = jsonData.map((row) => ({
      customerName: row['客户名称'],
      customerPhone: row['客户电话'],
      pickupAddress: row['取货地址'],
      pickupContact: row['取货联系人'],
      pickupPhone: row['取货电话'],
      deliveryAddress: row['送货地址'],
      deliveryContact: row['收货联系人'],
      deliveryPhone: row['收货电话'],
      cargoType: row['货物类型'],
      cargoWeight: row['货物重量(kg)'],
      cargoVolume: row['货物体积(m³)'],
      tempMin: row['最低温度(°C)'],
      tempMax: row['最高温度(°C)'],
      tempRange: row['温度范围'] === '冷冻' ? 'frozen' : row['温度范围'] === '冷藏' ? 'cold' : 'constant',
      remarks: row['备注'],
    }))

    const res = await orders.import({ data: importData })
    ElMessage.success(res.message || '导入完成')
    fetchOrders()
  } catch (err) {
    ElMessage.error('导入失败')
  } finally {
    event.target.value = ''
  }
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
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

.header-actions {
  display: flex;
  gap: 8px;
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
