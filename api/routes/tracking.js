const express = require('express');
const router = express.Router();
const TrackingLog = require('../models/TrackingLog');
const { successResponse, listResponse, errorResponse } = require('../utils/response');

router.post('/', async (req, res) => {
  try {
    const {
      waybillId,
      waybillNo,
      location,
      latitude,
      longitude,
      temperature,
      humidity,
      eventType,
      operator,
      remarks,
      alertType,
    } = req.body;

    if (!waybillId || !waybillNo || !location || temperature === undefined || !eventType || !operator) {
      const { status, body } = errorResponse('validation_error', 'Missing required fields');
      return res.status(status).json(body);
    }

    const log = await TrackingLog.create({
      waybillId,
      waybillNo,
      location,
      latitude,
      longitude,
      temperature,
      humidity,
      eventType,
      operator,
      remarks,
      alertType,
    });

    res.status(201).json(successResponse(log, '轨迹记录成功'));
  } catch (err) {
    const { status, body } = errorResponse('validation_error', err.message);
    res.status(status).json(body);
  }
});

router.get('/:waybillId', async (req, res) => {
  try {
    const logs = await TrackingLog.find({ waybillId: req.params.waybillId })
      .sort({ timestamp: -1 });

    res.json(listResponse(logs, logs.length, 1, logs.length));
  } catch (err) {
    const { status, body } = errorResponse('internal_error', err.message);
    res.status(status).json(body);
  }
});

router.get('/:waybillId/latest', async (req, res) => {
  try {
    const log = await TrackingLog.findOne({ waybillId: req.params.waybillId })
      .sort({ timestamp: -1 });

    if (!log) {
      const { status, body } = errorResponse('not_found', 'No tracking logs found');
      return res.status(status).json(body);
    }

    res.json(successResponse(log));
  } catch (err) {
    const { status, body } = errorResponse('internal_error', err.message);
    res.status(status).json(body);
  }
});

module.exports = router;
