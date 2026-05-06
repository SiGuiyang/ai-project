<template>
  <div class="waybill-list">
    <div class="page-header">
      <h2 class="page-title">转运单管理</h2>
      <div class="header-actions">
        <el-button type="success" @click="handleExport">
          <el-icon><Download /></el-icon>导出
        </el-button>
        <el-button type="warning" @click="handleImport">
          <el-icon><Upload /></el-icon>导入
        </el-button>
        <el-button type="primary" @click="showCreateDialog">创建转运单</el-button>
      </div>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true">
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable>
            <el-option label="待发车" value="pending" />
            <el-option label="运输中" value="transporting" />
            <el-option label="已签收" value="signed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchWaybills">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="waybillsList" v-loading="loading" style="width: 100%">
        <el-table-column prop="waybillNo" label="转运单号" width="180" />
        <el-table-column prop="orderNo" label="关联订单" width="180" />
        <el-table-column prop="carrierName" label="承运商" width="120" />
        <el-table-column prop="vehicleNo" label="车牌号" width="120" />
        <el-table-column prop="driverName" label="司机" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="currentLocation" label="当前位置" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewTracking(row)">查看轨迹</el-button>
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
          @change="fetchWaybills"
        />
      </div>
    </el-card>

    <WaybillForm
      v-model:visible="dialogVisible"
      :waybill="currentWaybill"
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
import { useRouter } from 'vue-router'
import { waybills } from '@/api/client'
import WaybillForm from '@/components/WaybillForm.vue'
import { ElMessage } from 'element-plus'
import { Download, Upload } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

const router = useRouter()
const loading = ref(false)
const waybillsList = ref([])
const dialogVisible = ref(false)
const currentWaybill = ref(null)
const importFileRef = ref(null)

const filters = reactive({
  status: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const statusMap = {
  pending: { label: '待发车', type: 'warning' },
  transporting: { label: '运输中', type: 'primary' },
  signed: { label: '已签收', type: 'success' },
}

const statusLabel = {
  pending: '待发车',
  transporting: '运输中',
  signed: '已签收',
}

function getStatusType(status) {
  return statusMap[status]?.type || ''
}

function getStatusLabel(status) {
  return statusMap[status]?.label || status
}

function availableStatuses(current) {
  const all = [
    { value: 'pending', label: '待发车' },
    { value: 'transporting', label: '运输中' },
    { value: 'signed', label: '已签收' },
  ]
  return all.filter((s) => s.value !== current)
}

async function fetchWaybills() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (filters.status) params.status = filters.status

    const res = await waybills.list(params)
    waybillsList.value = res.data || []
    pagination.total = res.meta?.total || 0
  } catch (err) {
    ElMessage.error('获取转运单列表失败')
  } finally {
    loading.value = false
  }
}

function showCreateDialog() {
  currentWaybill.value = null
  dialogVisible.value = true
}

async function handleCreate(data) {
  try {
    await waybills.create(data)
    ElMessage.success('转运单创建成功')
    dialogVisible.value = false
    fetchWaybills()
  } catch (err) {
    ElMessage.error('转运单创建失败')
  }
}

async function updateStatus(waybill, status) {
  try {
    await waybills.updateStatus(waybill._id, status)
    ElMessage.success('状态更新成功')
    fetchWaybills()
  } catch (err) {
    ElMessage.error('状态更新失败')
  }
}

function viewTracking(waybill) {
  router.push({ path: '/tracking', query: { waybillNo: waybill.waybillNo, waybillId: waybill._id } })
}

// 导出功能
async function handleExport() {
  try {
    const params = {}
    if (filters.status) params.status = filters.status

    const res = await waybills.export(params)
    const data = res.data || []

    if (data.length === 0) {
      ElMessage.warning('没有可导出的数据')
      return
    }

    const exportData = data.map((item) => ({
      '转运单号': item.waybillNo,
      '关联订单号': item.orderNo,
      '承运商': item.carrierName,
      '车牌号': item.vehicleNo,
      '车辆类型': item.vehiclePlate,
      '司机姓名': item.driverName,
      '司机电话': item.driverPhone,
      '当前位置': item.currentLocation,
      '状态': statusLabel[item.status] || item.status,
      '预计到达时间': item.estimatedArrival ? new Date(item.estimatedArrival).toLocaleString('zh-CN') : '',
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '转运单列表')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/octet-stream' })
    saveAs(blob, `转运单列表_${new Date().toISOString().slice(0, 10)}.xlsx`)
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
      orderId: row['关联订单号'] || '',
      orderNo: row['关联订单号'] || '',
      carrierName: row['承运商'],
      vehicleNo: row['车牌号'],
      vehiclePlate: row['车辆类型'],
      driverName: row['司机姓名'],
      driverPhone: row['司机电话'],
      currentLocation: row['当前位置'],
      estimatedArrival: row['预计到达时间'] ? new Date(row['预计到达时间']) : null,
    }))

    const res = await waybills.import({ data: importData })
    ElMessage.success(res.message || '导入完成')
    fetchWaybills()
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

onMounted(fetchWaybills)
</script>

<style scoped>
.waybill-list {
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

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
