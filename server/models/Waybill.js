const mongoose = require('mongoose');

const waybillSchema = new mongoose.Schema(
  {
    waybillNo: {
      type: String,
      unique: true,
    },
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Order' },
    orderNo: { type: String, required: true },
    carrierName: { type: String, required: true },
    vehicleNo: { type: String, required: true },
    vehiclePlate: { type: String },
    driverName: { type: String, required: true },
    driverPhone: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'transporting', 'signed'],
      default: 'pending',
    },
    currentLocation: { type: String },
    estimatedArrival: { type: Date },
  },
  { timestamps: true }
);

waybillSchema.pre('save', async function (next) {
  if (!this.waybillNo) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.constructor.countDocuments();
    const seq = String(count + 1).padStart(4, '0');
    this.waybillNo = `WB-${dateStr}-${seq}`;
  }
  next();
});

const Waybill = mongoose.models.Waybill || mongoose.model('Waybill', waybillSchema);

module.exports = Waybill;
