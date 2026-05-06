const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { successResponse, listResponse, errorResponse } = require('../utils/response');

router.get('/export', async (req, res) => {
  try {
    const { status, tempRange } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (tempRange) filter.tempRange = tempRange;

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(successResponse(orders, '导出数据获取成功'));
  } catch (err) {
    const { status, body } = errorResponse('internal_error', err.message);
    res.status(status).json(body);
  }
});

router.post('/import', async (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      const { status, body } = errorResponse('validation_error', '导入数据不能为空');
      return res.status(status).json(body);
    }

    const results = [];
    for (const item of data) {
      try {
        const order = await Order.create({
          customerName: item.customerName,
          customerPhone: item.customerPhone,
          pickupAddress: item.pickupAddress,
          pickupContact: item.pickupContact,
          pickupPhone: item.pickupPhone,
          deliveryAddress: item.deliveryAddress,
          deliveryContact: item.deliveryContact,
          deliveryPhone: item.deliveryPhone,
          cargoType: item.cargoType,
          cargoWeight: item.cargoWeight,
          cargoVolume: item.cargoVolume,
          tempMin: item.tempMin,
          tempMax: item.tempMax,
          tempRange: item.tempRange,
          remarks: item.remarks,
        });
        results.push({ success: true, orderNo: order.orderNo });
      } catch (err) {
        results.push({ success: false, error: err.message, data: item });
      }
    }

    res.status(200).json(successResponse(results, `导入完成：成功 ${results.filter(r => r.success).length} 条，失败 ${results.filter(r => !r.success).length} 条`));
  } catch (err) {
    const { status, body } = errorResponse('internal_error', err.message);
    res.status(status).json(body);
  }
});

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const { status, tempRange } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (tempRange) filter.tempRange = tempRange;

    const skip = (page - 1) * pageSize;
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      Order.countDocuments(filter),
    ]);

    res.json(listResponse(orders, total, page, pageSize));
  } catch (err) {
    const { status, body } = errorResponse('internal_error', err.message);
    res.status(status).json(body);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      const { status, body } = errorResponse('not_found', 'Order not found');
      return res.status(status).json(body);
    }
    res.json(successResponse(order));
  } catch (err) {
    const { status, body } = errorResponse('internal_error', err.message);
    res.status(status).json(body);
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      pickupAddress,
      pickupContact,
      pickupPhone,
      deliveryAddress,
      deliveryContact,
      deliveryPhone,
      cargoType,
      cargoWeight,
      cargoVolume,
      tempMin,
      tempMax,
      tempRange,
      remarks,
    } = req.body;

    if (
      !customerName ||
      !customerPhone ||
      !pickupAddress ||
      !pickupContact ||
      !pickupPhone ||
      !deliveryAddress ||
      !deliveryContact ||
      !deliveryPhone ||
      !cargoType ||
      !cargoWeight ||
      tempMin === undefined ||
      tempMax === undefined ||
      !tempRange
    ) {
      const { status, body } = errorResponse(
        'validation_error',
        'Missing required fields',
        ['customerName', 'customerPhone', 'pickupAddress', 'pickupContact', 'pickupPhone', 'deliveryAddress', 'deliveryContact', 'deliveryPhone', 'cargoType', 'cargoWeight', 'tempMin', 'tempMax', 'tempRange']
      );
      return res.status(status).json(body);
    }

    const order = await Order.create({
      customerName,
      customerPhone,
      pickupAddress,
      pickupContact,
      pickupPhone,
      deliveryAddress,
      deliveryContact,
      deliveryPhone,
      cargoType,
      cargoWeight,
      cargoVolume,
      tempMin,
      tempMax,
      tempRange,
      remarks,
    });

    res.status(201).json(successResponse(order, '订单创建成功'));
  } catch (err) {
    const { status, body } = errorResponse('validation_error', err.message);
    res.status(status).json(body);
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'transporting', 'completed', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      const { status: errStatus, body } = errorResponse(
        'validation_error',
        'Invalid status value',
        [`Must be one of: ${validStatuses.join(', ')}`]
      );
      return res.status(errStatus).json(body);
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      const { status: errStatus, body } = errorResponse('not_found', 'Order not found');
      return res.status(errStatus).json(body);
    }

    res.json(successResponse(order, '状态更新成功'));
  } catch (err) {
    const { status, body } = errorResponse('internal_error', err.message);
    res.status(status).json(body);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      const { status, body } = errorResponse('not_found', 'Order not found');
      return res.status(status).json(body);
    }
    res.status(204).send();
  } catch (err) {
    const { status, body } = errorResponse('internal_error', err.message);
    res.status(status).json(body);
  }
});

module.exports = router;
