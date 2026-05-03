<template>
  <div class="tracking-view">
    <h2 class="page-title">物流轨迹查询</h2>

    <el-card class="search-card">
      <el-form :inline="true">
        <el-form-item label="转运单号">
          <el-input
            v-model="waybillNo"
            placeholder="请输入转运单号"
            style="width: 300px"
            @keyup.enter="searchTracking"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchTracking">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="waybillInfo" class="info-card">
      <template #header>
        <div class="card-header">
          <span>转运单信息</span>
          <el-tag :type="getStatusType(waybillInfo.status)">
            {{ getStatusLabel(waybillInfo.status) }}
          </el-tag>
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="转运单号">{{ waybillInfo.waybillNo }}</el-descriptions-item>
        <el-descriptions-item label="关联订单">{{ waybillInfo.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="承运商">{{ waybillInfo.carrierName }}</el-descriptions-item>
        <el-descriptions-item label="车牌号">{{ waybillInfo.vehicleNo }}</el-descriptions-item>
        <el-descriptions-item label="司机">{{ waybillInfo.driverName }}</el-descriptions-item>
        <el-descriptions-item label="司机电话">{{ waybillInfo.driverPhone }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="logs.length > 0" class="timeline-card">
      <template #header>
        <div class="card-header">
          <span>轨迹记录</span>
          <el-button type="primary" size="small" @click="showAddLogDialog">
            添加记录
          </el-button>
        </div>
      </template>

      <div v-if="alerts.length > 0" class="alerts-section">
        <h4>温度预警</h4>
        <TemperatureAlert
          v-for="alert in alerts"
          :key="alert._id"
          :alert="alert"
        />
      </div>

      <TrackingTimeline :logs="sortedLogs" :order-temp="orderTempRange" />
    </el-card>

    <el-dialog
      v-model="addLogVisible"
      title="添加轨迹记录"
      width="500px"
    >
      <el-form :model="logForm" label-width="100px">
        <el-form-item label="地点">
          <el-input v-model="logForm.location" placeholder="请输入地点" />
        </el-form-item>
        <el-form-item label="温度(°C)">
          <el-input-number v-model="logForm.temperature" :min="-50" :max="50" />
        </el-form-item>
        <el-form-item label="湿度(%)">
          <el-input-number v-model="logForm.humidity" :min="0" :max="100" />
        </el-form-item>
        <el-form-item label="事件类型">
          <el-select v-model="logForm.eventType" placeholder="请选择">
            <el-option label="取货" value="pickup" />
            <el-option label="运输中" value="transit" />
            <el-option label="送达" value="delivery" />
            <el-option label="签收" value="signed" />
            <el-option label="预警" value="alert" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="logForm.operator" placeholder="请输入操作人" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="logForm.remarks" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addLogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitLog">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { waybills, tracking, orders } from '@/api/client'
import TrackingTimeline from '@/components/TrackingTimeline.vue'
import TemperatureAlert from '@/components/TemperatureAlert.vue'
import { ElMessage } from 'element-plus'

const route = useRoute()

const waybillNo = ref(route.query.waybillNo || '')
const waybillInfo = ref(null)
const logs = ref([])
const orderInfo = ref(null)
const addLogVisible = ref(false)

const logForm = reactive({
  location: '',
  temperature: 0,
  humidity: 0,
  eventType: 'transit',
  operator: '',
  remarks: '',
})

const alerts = computed(() =>
  logs.value.filter((log) => log.alertType)
)

const sortedLogs = computed(() =>
  [...logs.value].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
)

const orderTempRange = computed(() => {
  if (!orderInfo.value) return null
  return {
    min: orderInfo.value.tempMin,
    max: orderInfo.value.tempMax,
  }
})

const statusMap = {
  pending: { label: '待发车', type: 'warning' },
  transporting: { label: '运输中', type: 'primary' },
  signed: { label: '已签收', type: 'success' },
}

function getStatusType(status) {
  return statusMap[status]?.type || ''
}

function getStatusLabel(status) {
  return statusMap[status]?.label || status
}

async function searchTracking() {
  if (!waybillNo.value.trim()) {
    ElMessage.warning('请输入转运单号')
    return
  }

  try {
    const wbRes = await waybills.list({ pageSize: 100 })
    const wb = (wbRes.data || []).find((w) => w.waybillNo === waybillNo.value)

    if (!wb) {
      ElMessage.warning('未找到该转运单')
      waybillInfo.value = null
      logs.value = []
      return
    }

    waybillInfo.value = wb

    const logRes = await tracking.list(wb._id)
    logs.value = logRes.data || []

    if (wb.orderId) {
      const orderRes = await orders.get(wb.orderId)
      orderInfo.value = orderRes.data
    }
  } catch (err) {
    ElMessage.error('查询失败')
  }
}

function showAddLogDialog() {
  addLogVisible.value = true
  Object.assign(logForm, {
    location: '',
    temperature: 0,
    humidity: 0,
    eventType: 'transit',
    operator: '',
    remarks: '',
  })
}

async function submitLog() {
  if (!logForm.location || !logForm.operator) {
    ElMessage.warning('请填写地点和操作人')
    return
  }

  try {
    await tracking.create({
      waybillId: waybillInfo.value._id,
      waybillNo: waybillInfo.value.waybillNo,
      ...logForm,
    })
    ElMessage.success('记录添加成功')
    addLogVisible.value = false
    searchTracking()
  } catch (err) {
    ElMessage.error('添加记录失败')
  }
}

onMounted(() => {
  if (route.query.waybillNo) {
    searchTracking()
  }
})
</script>

<style scoped>
.tracking-view {
  max-width: 900px;
}

.page-title {
  margin-bottom: 20px;
  font-size: 24px;
  color: #303133;
}

.search-card {
  margin-bottom: 20px;
}

.info-card {
  margin-bottom: 20px;
}

.timeline-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alerts-section {
  margin-bottom: 20px;
}

.alerts-section h4 {
  color: #f56c6c;
  margin-bottom: 12px;
}
</style>
