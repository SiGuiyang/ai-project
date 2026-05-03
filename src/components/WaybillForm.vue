<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑转运单' : '创建转运单'"
    width="600px"
    @close="$emit('update:visible', false)"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
    >
      <el-form-item label="关联订单" prop="orderId">
        <el-select
          v-model="form.orderId"
          placeholder="请选择订单"
          filterable
          @change="onOrderChange"
        >
          <el-option
            v-for="order in ordersList"
            :key="order._id"
            :label="`${order.orderNo} - ${order.customerName}`"
            :value="order._id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="承运商" prop="carrierName">
        <el-input v-model="form.carrierName" placeholder="请输入承运商名称" />
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="车牌号" prop="vehicleNo">
            <el-input v-model="form.vehicleNo" placeholder="请输入车牌号" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="车辆类型" prop="vehiclePlate">
            <el-input v-model="form.vehiclePlate" placeholder="请输入车辆类型" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="司机姓名" prop="driverName">
            <el-input v-model="form.driverName" placeholder="请输入司机姓名" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="司机电话" prop="driverPhone">
            <el-input v-model="form.driverPhone" placeholder="请输入司机电话" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="预计到达" prop="estimatedArrival">
        <el-date-picker
          v-model="form.estimatedArrival"
          type="datetime"
          placeholder="选择预计到达时间"
          format="YYYY-MM-DD HH:mm"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ isEdit ? '保存' : '创建' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { orders } from '@/api/client'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: { type: Boolean, default: false },
  waybill: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'submit'])

const formRef = ref(null)
const submitting = ref(false)
const isEdit = ref(false)
const ordersList = ref([])

const defaultForm = {
  orderId: '',
  orderNo: '',
  carrierName: '',
  vehicleNo: '',
  vehiclePlate: '',
  driverName: '',
  driverPhone: '',
  estimatedArrival: '',
}

const form = reactive({ ...defaultForm })

const rules = {
  orderId: [{ required: true, message: '请选择关联订单', trigger: 'change' }],
  carrierName: [{ required: true, message: '请输入承运商名称', trigger: 'blur' }],
  vehicleNo: [{ required: true, message: '请输入车牌号', trigger: 'blur' }],
  driverName: [{ required: true, message: '请输入司机姓名', trigger: 'blur' }],
  driverPhone: [{ required: true, message: '请输入司机电话', trigger: 'blur' }],
}

async function fetchOrders() {
  try {
    const res = await orders.list({ pageSize: 100 })
    ordersList.value = res.data || []
  } catch (err) {
    ElMessage.error('获取订单列表失败')
  }
}

function onOrderChange(orderId) {
  const order = ordersList.value.find((o) => o._id === orderId)
  if (order) {
    form.orderNo = order.orderNo
  }
}

watch(
  () => props.waybill,
  (val) => {
    if (val) {
      isEdit.value = true
      Object.assign(form, { ...val })
    } else {
      isEdit.value = false
      Object.assign(form, { ...defaultForm })
    }
  },
  { immediate: true }
)

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        emit('submit', { ...form })
      } finally {
        submitting.value = false
      }
    }
  })
}

onMounted(fetchOrders)
</script>
