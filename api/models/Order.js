const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderNo: {
      type: String,
      unique: true,
    },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    pickupAddress: { type: String, required: true },
    pickupContact: { type: String, required: true },
    pickupPhone: { type: String, required: true },
    deliveryAddress: { type: String, required: true },
    deliveryContact: { type: String, required: true },
    deliveryPhone: { type: String, required: true },
    cargoType: { type: String, required: true },
    cargoWeight: { type: Number, required: true },
    cargoVolume: { type: Number },
    tempMin: { type: Number, required: true },
    tempMax: { type: Number, required: true },
    tempRange: {
      type: String,
      enum: ['frozen', 'cold', 'constant'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'transporting', 'completed', 'cancelled'],
      default: 'pending',
    },
    remarks: { type: String },
  },
  { timestamps: true }
);

orderSchema.pre('save', async function (next) {
  if (!this.orderNo) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.constructor.countDocuments();
    const seq = String(count + 1).padStart(4, '0');
    this.orderNo = `CC-${dateStr}-${seq}`;
  }
  next();
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

module.exports = Order;
