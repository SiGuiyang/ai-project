const mongoose = require('mongoose');

const trackingLogSchema = new mongoose.Schema(
  {
    waybillId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Waybill' },
    waybillNo: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    location: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
    temperature: { type: Number, required: true },
    humidity: { type: Number },
    eventType: {
      type: String,
      enum: ['pickup', 'transit', 'signed', 'alert', 'delivery'],
      required: true,
    },
    operator: { type: String, required: true },
    remarks: { type: String },
    alertType: {
      type: String,
      enum: ['temp_over', 'temp_under', 'delay', null],
    },
  },
  { timestamps: true }
);

trackingLogSchema.index({ waybillId: 1, timestamp: -1 });

const TrackingLog =
  mongoose.models.TrackingLog || mongoose.model('TrackingLog', trackingLogSchema);

module.exports = TrackingLog;
