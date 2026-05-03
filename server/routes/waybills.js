const express = require('express');
const router = express.Router();
const Waybill = require('../models/Waybill');
const { successResponse, listResponse, errorResponse } = require('../utils/response');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const { orderId, status } = req.query;

    const filter = {};
    if (orderId) filter.orderId = orderId;
    if (status) filter.status = status;

    const skip = (page - 1) * pageSize;
    const [waybills, total] = await Promise.all([
      Waybill.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      Waybill.countDocuments(filter),
    ]);

    res.json(listResponse(waybills, total, page, pageSize));
  } catch (err) {
    const { status, body } = errorResponse('internal_error', err.message);
    res.status(status).json(body);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const waybill = await Waybill.findById(req.params.id).populate('orderId');
    if (!waybill) {
      const { status, body } = errorResponse('not_found', 'Waybill not found');
      return res.status(status).json(body);
    }
    res.json(successResponse(waybill));
  } catch (err) {
    const { status, body } = errorResponse('internal_error', err.message);
    res.status(status).json(body);
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      orderId,
      orderNo,
      carrierName,
      vehicleNo,
      vehiclePlate,
      driverName,
      driverPhone,
      estimatedArrival,
    } = req.body;

    if (!orderId || !orderNo || !carrierName || !vehicleNo || !driverName || !driverPhone) {
      const { status, body } = errorResponse('validation_error', 'Missing required fields');
      return res.status(status).json(body);
    }

    const waybill = await Waybill.create({
      orderId,
      orderNo,
      carrierName,
      vehicleNo,
      vehiclePlate,
      driverName,
      driverPhone,
      estimatedArrival,
    });

    res.status(201).json(successResponse(waybill, '转运单创建成功'));
  } catch (err) {
    const { status, body } = errorResponse('validation_error', err.message);
    res.status(status).json(body);
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'transporting', 'signed'];

    if (!status || !validStatuses.includes(status)) {
      const { status: errStatus, body } = errorResponse(
        'validation_error',
        'Invalid status value',
        [`Must be one of: ${validStatuses.join(', ')}`]
      );
      return res.status(errStatus).json(body);
    }

    const waybill = await Waybill.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!waybill) {
      const { status: errStatus, body } = errorResponse('not_found', 'Waybill not found');
      return res.status(errStatus).json(body);
    }

    res.json(successResponse(waybill, '状态更新成功'));
  } catch (err) {
    const { status, body } = errorResponse('internal_error', err.message);
    res.status(status).json(body);
  }
});

module.exports = router;
