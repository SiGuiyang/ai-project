const mongoose = require('mongoose');
const { successResponse, listResponse, errorResponse } = require('../../api/utils/response');
const Order = require('../../api/models/Order');
const Waybill = require('../../api/models/Waybill');
const TrackingLog = require('../../api/models/TrackingLog');

describe('Response Utils', () => {
  test('successResponse returns data with message', () => {
    const result = successResponse({ id: 1 }, 'Created');
    expect(result).toEqual({
      data: { id: 1 },
      message: 'Created',
    });
  });

  test('listResponse returns array with pagination meta', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const result = listResponse(items, 50, 1, 20);
    expect(result).toEqual({
      data: items,
      meta: { total: 50, page: 1, pageSize: 20 },
      message: '查询成功',
    });
  });

  test('errorResponse returns error object with code and message', () => {
    const result = errorResponse('validation_error', 'Invalid input', ['field required']);
    expect(result.status).toBe(400);
    expect(result.body).toEqual({
      error: {
        code: 'validation_error',
        message: 'Invalid input',
        details: ['field required'],
      },
    });
  });

  test('errorResponse defaults details to empty array', () => {
    const result = errorResponse('not_found', 'Not found');
    expect(result.body.error.details).toEqual([]);
  });
});

describe('Order Model', () => {
  beforeEach(async () => {
    await Order.deleteMany({});
  });

  test('creates order with auto-generated orderNo', async () => {
    const order = await Order.create({
      customerName: 'Test Customer',
      customerPhone: '13800138000',
      pickupAddress: 'Beijing',
      pickupContact: 'John',
      pickupPhone: '13800138001',
      deliveryAddress: 'Shanghai',
      deliveryContact: 'Jane',
      deliveryPhone: '13800138002',
      cargoType: '食品',
      cargoWeight: 100,
      tempMin: -18,
      tempMax: -10,
      tempRange: 'frozen',
    });

    expect(order.orderNo).toMatch(/^CC-\d{8}-\d{4}$/);
    expect(order.status).toBe('pending');
    expect(order.customerName).toBe('Test Customer');
  });

  test('validates required fields', async () => {
    await expect(Order.create({})).rejects.toThrow();
  });

  test('generates unique orderNo for each order', async () => {
    const order1 = await Order.create({
      customerName: 'A',
      customerPhone: '111',
      pickupAddress: 'A',
      pickupContact: 'A',
      pickupPhone: '111',
      deliveryAddress: 'A',
      deliveryContact: 'A',
      deliveryPhone: '111',
      cargoType: '食品',
      cargoWeight: 1,
      tempMin: 0,
      tempMax: 8,
      tempRange: 'cold',
    });

    const order2 = await Order.create({
      customerName: 'B',
      customerPhone: '222',
      pickupAddress: 'B',
      pickupContact: 'B',
      pickupPhone: '222',
      deliveryAddress: 'B',
      deliveryContact: 'B',
      deliveryPhone: '222',
      cargoType: '药品',
      cargoWeight: 2,
      tempMin: 2,
      tempMax: 8,
      tempRange: 'cold',
    });

    expect(order1.orderNo).not.toBe(order2.orderNo);
  });
});

describe('Waybill Model', () => {
  beforeEach(async () => {
    await Waybill.deleteMany({});
  });

  test('creates waybill with auto-generated waybillNo', async () => {
    const waybill = await Waybill.create({
      orderId: new mongoose.Types.ObjectId(),
      orderNo: 'CC-20260503-0001',
      carrierName: 'SF Express',
      vehicleNo: '京A12345',
      driverName: 'Driver Zhang',
      driverPhone: '13900139000',
    });

    expect(waybill.waybillNo).toMatch(/^WB-\d{8}-\d{4}$/);
    expect(waybill.status).toBe('pending');
  });

  test('validates required fields', async () => {
    await expect(Waybill.create({})).rejects.toThrow();
  });
});

describe('TrackingLog Model', () => {
  beforeEach(async () => {
    await TrackingLog.deleteMany({});
  });

  test('creates tracking log with timestamp', async () => {
    const log = await TrackingLog.create({
      waybillId: new mongoose.Types.ObjectId(),
      waybillNo: 'WB-20260503-0001',
      location: 'Beijing Distribution Center',
      temperature: -15,
      humidity: 65,
      eventType: 'transit',
      operator: 'Driver Zhang',
    });

    expect(log.timestamp).toBeDefined();
    expect(log.temperature).toBe(-15);
    expect(log.eventType).toBe('transit');
  });

  test('validates required eventType from enum', async () => {
    const log = new TrackingLog({
      waybillId: new mongoose.Types.ObjectId(),
      waybillNo: 'WB-20260503-0001',
      location: 'Test',
      eventType: 'invalid_type',
    });

    await expect(log.save()).rejects.toThrow();
  });
});
