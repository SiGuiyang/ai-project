const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const orderRoutes = require('../../server/routes/orders');
const waybillRoutes = require('../../server/routes/waybills');
const trackingRoutes = require('../../server/routes/tracking');

describe('Orders API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/orders', orderRoutes);
  });

  beforeEach(async () => {
    await mongoose.connection.collection('orders').deleteMany({});
  });

  test('POST /api/orders creates a new order', async () => {
    const res = await request(app).post('/api/orders').send({
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

    expect(res.status).toBe(201);
    expect(res.body.data.orderNo).toMatch(/^CC-\d{8}-\d{4}$/);
    expect(res.body.data.customerName).toBe('Test Customer');
  });

  test('GET /api/orders returns paginated list', async () => {
    await mongoose.connection.collection('orders').insertMany([
      {
        orderNo: 'CC-20260503-0001',
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
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        orderNo: 'CC-20260503-0002',
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
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const res = await request(app).get('/api/orders');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.total).toBe(2);
  });

  test('GET /api/orders/:id returns order details', async () => {
    const order = await mongoose.connection.collection('orders').insertOne({
      orderNo: 'CC-20260503-0005',
      customerName: 'E',
      customerPhone: '555',
      pickupAddress: 'E',
      pickupContact: 'E',
      pickupPhone: '555',
      deliveryAddress: 'E',
      deliveryContact: 'E',
      deliveryPhone: '555',
      cargoType: '食品',
      cargoWeight: 5,
      tempMin: -18,
      tempMax: -10,
      tempRange: 'frozen',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).get(`/api/orders/${order.insertedId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.orderNo).toBe('CC-20260503-0005');
  });

  test('POST /api/orders returns 400 for missing required fields', async () => {
    const res = await request(app).post('/api/orders').send({
      customerName: 'Test',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
  });
});

describe('Waybills API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/waybills', waybillRoutes);
  });

  beforeEach(async () => {
    await mongoose.connection.collection('waybills').deleteMany({});
  });

  test('POST /api/waybills creates a new waybill', async () => {
    const res = await request(app).post('/api/waybills').send({
      orderId: new mongoose.Types.ObjectId(),
      orderNo: 'CC-20260503-0001',
      carrierName: 'SF Express',
      vehicleNo: '京A12345',
      driverName: 'Driver Zhang',
      driverPhone: '13900139000',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.waybillNo).toMatch(/^WB-\d{8}-\d{4}$/);
  });

  test('GET /api/waybills returns paginated list', async () => {
    await mongoose.connection.collection('waybills').insertOne({
      waybillNo: 'WB-20260503-0001',
      orderId: new mongoose.Types.ObjectId(),
      orderNo: 'CC-20260503-0001',
      carrierName: 'SF Express',
      vehicleNo: '京A12345',
      driverName: 'Driver Zhang',
      driverPhone: '13900139000',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).get('/api/waybills');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });
});

describe('Tracking API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/tracking', trackingRoutes);
  });

  beforeEach(async () => {
    await mongoose.connection.collection('trackinglogs').deleteMany({});
  });

  test('POST /api/tracking creates a new tracking log', async () => {
    const res = await request(app).post('/api/tracking').send({
      waybillId: new mongoose.Types.ObjectId(),
      waybillNo: 'WB-20260503-0001',
      location: 'Beijing Center',
      temperature: -15,
      humidity: 65,
      eventType: 'transit',
      operator: 'Driver Zhang',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.temperature).toBe(-15);
  });

  test('GET /api/tracking/:waybillId returns tracking logs', async () => {
    const waybillId = new mongoose.Types.ObjectId();
    await mongoose.connection.collection('trackinglogs').insertMany([
      {
        waybillId,
        waybillNo: 'WB-20260503-0001',
        location: 'Point A',
        temperature: -15,
        eventType: 'pickup',
        operator: 'A',
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        waybillId,
        waybillNo: 'WB-20260503-0001',
        location: 'Point B',
        temperature: -14,
        eventType: 'transit',
        operator: 'B',
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const res = await request(app).get(`/api/tracking/${waybillId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });
});
