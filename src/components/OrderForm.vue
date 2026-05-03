<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑订单' : '创建订单'"
    width="700px"
    @close="$emit('update:visible', false)"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
    >
      <h3 class="section-title">客户信息</h3>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="客户名称" prop="customerName">
            <el-input v-model="form.customerName" placeholder="请输入客户名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="客户电话" prop="customerPhone">
            <el-input v-model="form.customerPhone" placeholder="请输入客户电话" />
          </el-form-item>
        </el-col>
      </el-row>

      <h3 class="section-title">取货信息</h3>
      <el-form-item label="取货地址" prop="pickupAddress">
        <el-input v-model="form.pickupAddress" placeholder="请输入取货地址" />
      </el-form-item>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="取货联系人" prop="pickupContact">
            <el-input v-model="form.pickupContact" placeholder="请输入联系人" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="取货电话" prop="pickupPhone">
            <el-input v-model="form.pickupPhone" placeholder="请输入联系电话" />
          </el-form-item>
        </el-col>
      </el-row>

      <h3 class="section-title">送货信息</h3>
      <el-form-item label="送货地址" prop="deliveryAddress">
        <el-input v-model="form.deliveryAddress" placeholder="请输入送货地址" />
      </el-form-item>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="收货联系人" prop="deliveryContact">
            <el-input v-model="form.deliveryContact" placeholder="请输入联系人" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="收货电话" prop="deliveryPhone">
            <el-input v-model="form.deliveryPhone" placeholder="请输入联系电话" />
          </el-form-item>
        </el-col>
      </el-row>

      <h3 class="section-title">货物信息</h3>
      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="货物类型" prop="cargoType">
            <el-select v-model="form.cargoType" placeholder="请选择">
              <el-option label="食品" value="食品" />
              <el-option label="药品" value="药品" />
              <el-option label="生鲜" value="生鲜" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="重量(kg)" prop="cargoWeight">
            <el-input-number v-model="form.cargoWeight" :min="0" :precision="2" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="体积(m³)" prop="cargoVolume">
            <el-input-number v-model="form.cargoVolume" :min="0" :precision="2" />
          </el-form-item>
        </el-col>
      </el-row>

      <h3 class="section-title">温度要求</h3>
      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="最低温度(°C)" prop="tempMin">
            <el-input-number v-model="form.tempMin" :min="-50" :max="50" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="最高温度(°C)" prop="tempMax">
            <el-input-number v-model="form.tempMax" :min="-50" :max="50" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="温度范围" prop="tempRange">
            <el-select v-model="form.tempRange" placeholder="请选择">
              <el-option label="冷冻 (≤-18°C)" value="frozen" />
              <el-option label="冷藏 (0°C~8°C)" value="cold" />
              <el-option label="恒温 (8°C~15°C)" value="constant" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="备注" prop="remarks">
        <el-input v-model="form.remarks" type="textarea" :rows="3" placeholder="请输入备注" />
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
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: { type: Boolean, default: false },
  order: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'submit'])

const formRef = ref(null)
const submitting = ref(false)
const isEdit = ref(false)

const defaultForm = {
  customerName: '',
  customerPhone: '',
  pickupAddress: '',
  pickupContact: '',
  pickupPhone: '',
  deliveryAddress: '',
  deliveryContact: '',
  deliveryPhone: '',
  cargoType: '',
  cargoWeight: 0,
  cargoVolume: 0,
  tempMin: 0,
  tempMax: 0,
  tempRange: '',
  remarks: '',
}

const form = reactive({ ...defaultForm })

const rules = {
  customerName: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  customerPhone: [{ required: true, message: '请输入客户电话', trigger: 'blur' }],
  pickupAddress: [{ required: true, message: '请输入取货地址', trigger: 'blur' }],
  pickupContact: [{ required: true, message: '请输入取货联系人', trigger: 'blur' }],
  pickupPhone: [{ required: true, message: '请输入取货电话', trigger: 'blur' }],
  deliveryAddress: [{ required: true, message: '请输入送货地址', trigger: 'blur' }],
  deliveryContact: [{ required: true, message: '请输入收货联系人', trigger: 'blur' }],
  deliveryPhone: [{ required: true, message: '请输入收货电话', trigger: 'blur' }],
  cargoType: [{ required: true, message: '请选择货物类型', trigger: 'change' }],
  cargoWeight: [{ required: true, message: '请输入货物重量', trigger: 'blur' }],
  tempMin: [{ required: true, message: '请输入最低温度', trigger: 'blur' }],
  tempMax: [{ required: true, message: '请输入最高温度', trigger: 'blur' }],
  tempRange: [{ required: true, message: '请选择温度范围', trigger: 'change' }],
}

watch(
  () => props.order,
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
</script>

<style scoped>
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 16px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.section-title:first-child {
  margin-top: 0;
}
</style>
