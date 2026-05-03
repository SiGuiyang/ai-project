# Cold Chain Logistics PaaS Platform Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cold chain logistics PaaS platform with order management, waybill management, and tracking functionality.

**Architecture:** Vue 3 SPA served by Vercel, with Express API routes as Vercel Serverless Functions, backed by MongoDB Atlas.

**Tech Stack:** Vue 3, Vite, Element Plus, Node.js, Express, Mongoose, MongoDB, Vercel

---

## Project File Structure

```
cold-chain-platform/
├── package.json                          # Root dependencies (frontend + backend)
├── vercel.json                           # Vercel deployment configuration
├── vite.config.js                        # Vite build configuration
├── index.html                            # HTML entry point
├── .env.example                          # Environment variables template
│
├── api/                                  # Vercel Serverless API
│   ├── index.js                          # Express app entry (route handler)
│   ├── lib/
│   │   └── db.js                         # MongoDB connection utility
│   ├── models/
│   │   ├── Order.js                      # Order Mongoose model
│   │   ├── Waybill.js                    # Waybill Mongoose model
│   │   └── TrackingLog.js               # TrackingLog Mongoose model
│   ├── utils/
│   │   └── response.js                   # Unified response formatter
│   └── routes/
│       ├── orders.js                     # Order API routes
│       ├── waybills.js                   # Waybill API routes
│       └── tracking.js                   # Tracking API routes
│
├── src/                                  # Vue 3 Frontend
│   ├── main.js                           # Vue app entry
│   ├── App.vue                           # Root component
│   ├── api/
│   │   └── client.js                     # Axios API client
│   ├── router/
│   │   └── index.js                      # Vue Router config
│   ├── stores/
│   │   └── app.js                        # Pinia store
│   ├── views/
│   │   ├── Dashboard.vue                 # Dashboard page
│   │   ├── OrderList.vue                 # Order management page
│   │   ├── WaybillList.vue              # Waybill management page
│   │   └── TrackingView.vue             # Tracking page
│   └── components/
│       ├── OrderForm.vue                 # Order create/edit form
│       ├── WaybillForm.vue              # Waybill create/edit form
│       ├── TrackingTimeline.vue          # Timeline display component
│       └── TemperatureAlert.vue          # Temperature alert component
│
├── tests/                                # Test files
│   ├── api/
│   │   ├── models.test.js               # Model unit tests
│   │   └── routes.test.js               # API route integration tests
│   └── setup.js                          # Test setup (in-memory MongoDB)
│
└── public/                               # Static assets
    └── favicon.ico
```

---

## Chunk 1: Project Setup & Backend Foundation

### Task 1: Initialize Project & Dependencies

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `vercel.json`
- Create: `vite.config.js`
- Create: `index.html`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "cold-chain-platform",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "NODE_ENV=test jest --detectOpenHandles --forceExit",
    "test:watch": "NODE_ENV=test jest --watch",
    "lint": "eslint src/ api/"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "axios": "^1.6.0",
    "element-plus": "^2.5.0",
    "express": "^4.18.0",
    "mongoose": "^8.0.0",
    "cors": "^2.8.5",
    "serverless-http": "^3.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0",
    "jest": "^29.7.0",
    "mongodb-memory-server": "^9.1.0",
    "supertest": "^6.3.0",
    "eslint": "^8.56.0",
    "eslint-plugin-vue": "^9.20.0"
  },
  "jest": {
    "testEnvironment": "node",
    "setupFilesAfterEnv": ["<rootDir>/tests/setup.js"],
    "testMatch": ["**/tests/**/*.test.js"],
    "collectCoverageFrom": ["api/**/*.js", "!api/index.js"]
  }
}
```

- [ ] **Step 2: Create .env.example**

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/coldchain?retryWrites=true&w=majority
NODE_ENV=development
PORT=3000
```

- [ ] **Step 3: Create vercel.json**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

- [ ] **Step 4: Create vite.config.js**

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>冷链物流PaaS平台</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 6: Install dependencies**

```bash
npm install
```

Expected: All dependencies installed successfully.

---

### Task 2: Database Connection Utility

**Files:**
- Create: `api/lib/db.js`

- [ ] **Step 1: Write the failing test**

Create `tests/api/models.test.js` (will also cover model tests in Task 3):

```javascript
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const connectDB = require('../../api/lib/db');

describe('Database Connection', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test('connects to MongoDB using provided URI', async () => {
    const uri = mongoServer.getUri();
    const conn = await connectDB(uri);
    expect(conn.readyState).toBe(1); // connected
  });

  test('returns existing connection if already connected', async () => {
    const uri = mongoServer.getUri();
    const conn1 = await connectDB(uri);
    const conn2 = await connectDB(uri);
    expect(conn1).toBe(conn2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/api/models.test.js
```

Expected: FAIL with "Cannot find module '../../api/lib/db'"

- [ ] **Step 3: Write minimal implementation**

Create `api/lib/db.js`:

```javascript
const mongoose = require('mongoose');

let cachedConnection = null;

async function connectDB(uri) {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  cachedConnection = conn;
  return conn;
}

module.exports = connectDB;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test tests/api/models.test.js
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json .env.example vercel.json vite.config.js index.html api/lib/db.js tests/api/models.test.js
git commit -m "chore: initialize project with database connection utility"
```

---

### Task 3: Response Utility

**Files:**
- Create: `api/utils/response.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/api/models.test.js`:

```javascript
const { successResponse, listResponse, errorResponse } = require('../../api/utils/response');

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/api/models.test.js
```

Expected: FAIL with "Cannot find module '../../api/utils/response'"

- [ ] **Step 3: Write minimal implementation**

Create `api/utils/response.js`:

```javascript
function successResponse(data, message = '操作成功') {
  return {
    data,
    message,
  };
}

function listResponse(data, total, page, pageSize) {
  return {
    data,
    meta: { total, page, pageSize },
    message: '查询成功',
  };
}

function errorResponse(code, message, details = []) {
  const statusMap = {
    validation_error: 400,
    not_found: 404,
    internal_error: 500,
    conflict: 409,
  };

  return {
    status: statusMap[code] || 500,
    body: {
      error: {
        code,
        message,
        details,
      },
    },
  };
}

module.exports = { successResponse, listResponse, errorResponse };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test tests/api/models.test.js
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/utils/response.js tests/api/models.test.js
git commit -m "feat: add unified response utility with tests"
```

---

## Chunk 2: Mongoose Models

### Task 4: Order Model

**Files:**
- Create: `api/models/Order.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/api/models.test.js`:

```javascript
const Order = require('../../api/models/Order');

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/api/models.test.js -t "Order Model"
```

Expected: FAIL with "Cannot find module '../../api/models/Order'"

- [ ] **Step 3: Write minimal implementation**

Create `api/models/Order.js`:

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test tests/api/models.test.js -t "Order Model"
```

Expected: All Order Model tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/models/Order.js tests/api/models.test.js
git commit -m "feat: add Order model with auto-generated orderNo"
```

---

### Task 5: Waybill Model

**Files:**
- Create: `api/models/Waybill.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/api/models.test.js`:

```javascript
const Waybill = require('../../api/models/Waybill');

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
      vehiclePlate: '重型冷藏车',
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/api/models.test.js -t "Waybill Model"
```

Expected: FAIL with "Cannot find module '../../api/models/Waybill'"

- [ ] **Step 3: Write minimal implementation**

Create `api/models/Waybill.js`:

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test tests/api/models.test.js -t "Waybill Model"
```

Expected: All Waybill Model tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/models/Waybill.js tests/api/models.test.js
git commit -m "feat: add Waybill model with auto-generated waybillNo"
```

---

### Task 6: TrackingLog Model

**Files:**
- Create: `api/models/TrackingLog.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/api/models.test.js`:

```javascript
const TrackingLog = require('../../api/models/TrackingLog');

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
    const log = TrackingLog({
      waybillId: new mongoose.Types.ObjectId(),
      waybillNo: 'WB-20260503-0001',
      location: 'Test',
      eventType: 'invalid_type',
    });

    await expect(log.save()).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/api/models.test.js -t "TrackingLog Model"
```

Expected: FAIL with "Cannot find module '../../api/models/TrackingLog'"

- [ ] **Step 3: Write minimal implementation**

Create `api/models/TrackingLog.js`:

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test tests/api/models.test.js -t "TrackingLog Model"
```

Expected: All TrackingLog Model tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/models/TrackingLog.js tests/api/models.test.js
git commit -m "feat: add TrackingLog model with temperature tracking"
```

---

## Chunk 3: API Routes

### Task 7: Orders API Routes

**Files:**
- Create: `api/routes/orders.js`

- [ ] **Step 1: Write the failing test**

Create `tests/api/routes.test.js`:

```javascript
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const orderRoutes = require('../../api/routes/orders');

describe('Orders API', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    app.use(express.json());
    app.use('/api/orders', orderRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
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

  test('PATCH /api/orders/:id/status updates order status', async () => {
    const order = await mongoose.connection.collection('orders').insertOne({
      orderNo: 'CC-20260503-0003',
      customerName: 'C',
      customerPhone: '333',
      pickupAddress: 'C',
      pickupContact: 'C',
      pickupPhone: '333',
      deliveryAddress: 'C',
      deliveryContact: 'C',
      deliveryPhone: '333',
      cargoType: '食品',
      cargoWeight: 5,
      tempMin: -18,
      tempMax: -10,
      tempRange: 'frozen',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .patch(`/api/orders/${order.insertedId}/status`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('confirmed');
  });

  test('DELETE /api/orders/:id deletes an order', async () => {
    const order = await mongoose.connection.collection('orders').insertOne({
      orderNo: 'CC-20260503-0004',
      customerName: 'D',
      customerPhone: '444',
      pickupAddress: 'D',
      pickupContact: 'D',
      pickupPhone: '444',
      deliveryAddress: 'D',
      deliveryContact: 'D',
      deliveryPhone: '444',
      cargoType: '食品',
      cargoWeight: 5,
      tempMin: -18,
      tempMax: -10,
      tempRange: 'frozen',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).delete(`/api/orders/${order.insertedId}`);

    expect(res.status).toBe(204);
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/api/routes.test.js -t "Orders API"
```

Expected: FAIL with "Cannot find module '../../api/routes/orders'"

- [ ] **Step 3: Write minimal implementation**

Create `api/routes/orders.js`:

```javascript
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { successResponse, listResponse, errorResponse } = require('../utils/response');

// GET /api/orders - List orders with pagination
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

// GET /api/orders/:id - Get order details
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

// POST /api/orders - Create order
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

// PATCH /api/orders/:id/status - Update order status
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

// DELETE /api/orders/:id - Delete order
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test tests/api/routes.test.js -t "Orders API"
```

Expected: All Orders API tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/routes/orders.js tests/api/routes.test.js
git commit -m "feat: add orders API routes with CRUD operations"
```

---

### Task 8: Waybills API Routes

**Files:**
- Create: `api/routes/waybills.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/api/routes.test.js`:

```javascript
const waybillRoutes = require('../../api/routes/waybills');

describe('Waybills API', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    app.use(express.json());
    app.use('/api/waybills', waybillRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
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

  test('PATCH /api/waybills/:id/status updates waybill status', async () => {
    const waybill = await mongoose.connection.collection('waybills').insertOne({
      waybillNo: 'WB-20260503-0002',
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

    const res = await request(app)
      .patch(`/api/waybills/${waybill.insertedId}/status`)
      .send({ status: 'transporting' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('transporting');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/api/routes.test.js -t "Waybills API"
```

Expected: FAIL with "Cannot find module '../../api/routes/waybills'"

- [ ] **Step 3: Write minimal implementation**

Create `api/routes/waybills.js`:

```javascript
const express = require('express');
const router = express.Router();
const Waybill = require('../models/Waybill');
const { successResponse, listResponse, errorResponse } = require('../utils/response');

// GET /api/waybills - List waybills with pagination
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

// GET /api/waybills/:id - Get waybill details
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

// POST /api/waybills - Create waybill
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

// PATCH /api/waybills/:id/status - Update waybill status
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test tests/api/routes.test.js -t "Waybills API"
```

Expected: All Waybills API tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/routes/waybills.js tests/api/routes.test.js
git commit -m "feat: add waybills API routes with CRUD operations"
```

---

### Task 9: Tracking API Routes

**Files:**
- Create: `api/routes/tracking.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/api/routes.test.js`:

```javascript
const trackingRoutes = require('../../api/routes/tracking');

describe('Tracking API', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    app.use(express.json());
    app.use('/api/tracking', trackingRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
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

  test('GET /api/tracking/:waybillId/latest returns most recent log', async () => {
    const waybillId = new mongoose.Types.ObjectId();
    await mongoose.connection.collection('trackinglogs').insertMany([
      {
        waybillId,
        waybillNo: 'WB-20260503-0001',
        location: 'First',
        temperature: -18,
        eventType: 'pickup',
        operator: 'A',
        timestamp: new Date('2026-05-01'),
        createdAt: new Date('2026-05-01'),
        updatedAt: new Date('2026-05-01'),
      },
      {
        waybillId,
        waybillNo: 'WB-20260503-0001',
        location: 'Latest',
        temperature: -15,
        eventType: 'transit',
        operator: 'B',
        timestamp: new Date('2026-05-03'),
        createdAt: new Date('2026-05-03'),
        updatedAt: new Date('2026-05-03'),
      },
    ]);

    const res = await request(app).get(`/api/tracking/${waybillId}/latest`);

    expect(res.status).toBe(200);
    expect(res.body.data.location).toBe('Latest');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/api/routes.test.js -t "Tracking API"
```

Expected: FAIL with "Cannot find module '../../api/routes/tracking'"

- [ ] **Step 3: Write minimal implementation**

Create `api/routes/tracking.js`:

```javascript
const express = require('express');
const router = express.Router();
const TrackingLog = require('../models/TrackingLog');
const { successResponse, listResponse, errorResponse } = require('../utils/response');

// POST /api/tracking - Create tracking log
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

// GET /api/tracking/:waybillId - Get tracking logs for waybill
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

// GET /api/tracking/:waybillId/latest - Get latest tracking log
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test tests/api/routes.test.js -t "Tracking API"
```

Expected: All Tracking API tests PASS.

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add api/routes/tracking.js tests/api/routes.test.js
git commit -m "feat: add tracking API routes with location logging"
```

---

### Task 10: Express App Entry

**Files:**
- Create: `api/index.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/api/routes.test.js`:

```javascript
describe('Express App', () => {
  let server;

  afterEach(() => {
    if (server) server.close();
  });

  test('API entry point mounts all routes', async () => {
    // Verify the module exports an express-compatible handler
    const handler = require('../../api/index');
    expect(typeof handler).toBe('function');
    expect(handler.length).toBe(2); // (req, res) for serverless
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/api/routes.test.js -t "Express App"
```

Expected: FAIL with "Cannot find module '../../api/index'"

- [ ] **Step 3: Write minimal implementation**

Create `api/index.js`:

```javascript
const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const connectDB = require('./lib/db');

const orderRoutes = require('./routes/orders');
const waybillRoutes = require('./routes/waybills');
const trackingRoutes = require('./routes/tracking');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/orders', orderRoutes);
app.use('/api/waybills', waybillRoutes);
app.use('/api/tracking', trackingRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Vercel serverless handler
const handler = serverless(app);

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  connectDB(process.env.MONGODB_URI || 'mongodb://localhost:27017/coldchain').then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}

module.exports = handler;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test tests/api/routes.test.js -t "Express App"
```

Expected: Express App test PASS.

- [ ] **Step 5: Commit**

```bash
git add api/index.js tests/api/routes.test.js
git commit -m "feat: add Express app entry with serverless handler"
```

---

## Chunk 4: Frontend Setup

### Task 11: Vue App Entry & Router

**Files:**
- Create: `src/main.js`
- Create: `src/App.vue`
- Create: `src/router/index.js`

- [ ] **Step 1: Create src/main.js**

```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')
```

- [ ] **Step 2: Create src/App.vue**

```vue
<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <h1 class="logo">冷链物流PaaS平台</h1>
        <el-menu
          :default-active="activeRoute"
          mode="horizontal"
          :router="true"
          class="nav-menu"
        >
          <el-menu-item index="/">仪表盘</el-menu-item>
          <el-menu-item index="/orders">订单管理</el-menu-item>
          <el-menu-item index="/waybills">转运单管理</el-menu-item>
          <el-menu-item index="/tracking">物流轨迹</el-menu-item>
        </el-menu>
      </div>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeRoute = computed(() => route.path)
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f7fa;
}

.app-container {
  min-height: 100vh;
}

.app-header {
  background: #fff;
  padding: 0;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-content {
  display: flex;
  align-items: center;
  height: 60px;
  padding: 0 20px;
}

.logo {
  font-size: 20px;
  font-weight: 600;
  color: #409eff;
  margin-right: 40px;
  white-space: nowrap;
}

.nav-menu {
  flex: 1;
  border-bottom: none !important;
}

.app-main {
  padding: 20px;
  background-color: #f5f7fa;
}
</style>
```

- [ ] **Step 3: Create src/router/index.js**

```javascript
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('@/views/OrderList.vue'),
  },
  {
    path: '/waybills',
    name: 'Waybills',
    component: () => import('@/views/WaybillList.vue'),
  },
  {
    path: '/tracking',
    name: 'Tracking',
    component: () => import('@/views/TrackingView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
```

- [ ] **Step 4: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts on http://localhost:5173

- [ ] **Step 5: Commit**

```bash
git add src/main.js src/App.vue src/router/index.js
git commit -m "feat: add Vue app entry with Element Plus and router"
```

---

### Task 12: API Client & Pinia Store

**Files:**
- Create: `src/api/client.js`
- Create: `src/stores/app.js`

- [ ] **Step 1: Create src/api/client.js**

```javascript
import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error?.message || '请求失败'
    ElMessage?.error(message)
    return Promise.reject(error)
  }
)

export const orders = {
  list: (params) => client.get('/orders', { params }),
  get: (id) => client.get(`/orders/${id}`),
  create: (data) => client.post('/orders', data),
  updateStatus: (id, status) => client.patch(`/orders/${id}/status`, { status }),
  delete: (id) => client.delete(`/orders/${id}`),
}

export const waybills = {
  list: (params) => client.get('/waybills', { params }),
  get: (id) => client.get(`/waybills/${id}`),
  create: (data) => client.post('/waybills', data),
  updateStatus: (id, status) => client.patch(`/waybills/${id}/status`, { status }),
}

export const tracking = {
  list: (waybillId) => client.get(`/tracking/${waybillId}`),
  latest: (waybillId) => client.get(`/tracking/${waybillId}/latest`),
  create: (data) => client.post('/tracking', data),
}

export default client
```

- [ ] **Step 2: Create src/stores/app.js**

```javascript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const loading = ref(false)
  const stats = ref({
    totalOrders: 0,
    transporting: 0,
    pending: 0,
    completed: 0,
  })
  const alerts = ref([])

  function setLoading(value) {
    loading.value = value
  }

  function setStats(newStats) {
    stats.value = newStats
  }

  function setAlerts(newAlerts) {
    alerts.value = newAlerts
  }

  return {
    loading,
    stats,
    alerts,
    setLoading,
    setStats,
    setAlerts,
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add src/api/client.js src/stores/app.js
git commit -m "feat: add API client and Pinia store"
```

---

## Chunk 5: Frontend Views & Components

### Task 13: Dashboard View

**Files:**
- Create: `src/views/Dashboard.vue`

- [ ] **Step 1: Create src/views/Dashboard.vue**

```vue
<template>
  <div class="dashboard">
    <h2 class="page-title">仪表盘</h2>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value">{{ stats.totalOrders }}</div>
          <div class="stat-label">总订单数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card stat-pending">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待处理</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card stat-transporting">
          <div class="stat-value">{{ stats.transporting }}</div>
          <div class="stat-label">运输中</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card stat-completed">
          <div class="stat-value">{{ stats.completed }}</div>
          <div class="stat-label">已完成</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="content-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>温度异常预警</span>
            </div>
          </template>
          <div v-if="alerts.length === 0" class="empty-state">暂无预警</div>
          <div v-else>
            <TemperatureAlert
              v-for="alert in alerts"
              :key="alert._id"
              :alert="alert"
            />
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>近期订单</span>
              <el-button type="primary" link @click="$router.push('/orders')">
                查看全部
              </el-button>
            </div>
          </template>
          <el-table :data="recentOrders" style="width: 100%">
            <el-table-column prop="orderNo" label="订单号" width="180" />
            <el-table-column prop="customerName" label="客户" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { orders, tracking } from '@/api/client'
import TemperatureAlert from '@/components/TemperatureAlert.vue'
import { ElMessage } from 'element-plus'

const stats = ref({
  totalOrders: 0,
  transporting: 0,
  pending: 0,
  completed: 0,
})
const alerts = ref([])
const recentOrders = ref([])

const statusMap = {
  pending: { label: '待处理', type: 'warning' },
  confirmed: { label: '已确认', type: '' },
  transporting: { label: '运输中', type: 'primary' },
  completed: { label: '已完成', type: 'success' },
  cancelled: { label: '已取消', type: 'danger' },
}

function getStatusType(status) {
  return statusMap[status]?.type || ''
}

function getStatusLabel(status) {
  return statusMap[status]?.label || status
}

async function fetchDashboardData() {
  try {
    const [allOrders, pendingRes, transportingRes, completedRes] = await Promise.all([
      orders.list({ pageSize: 1 }),
      orders.list({ status: 'pending', pageSize: 1 }),
      orders.list({ status: 'transporting', pageSize: 1 }),
      orders.list({ status: 'completed', pageSize: 1 }),
    ])

    stats.value = {
      totalOrders: allOrders.meta?.total || 0,
      pending: pendingRes.meta?.total || 0,
      transporting: transportingRes.meta?.total || 0,
      completed: completedRes.meta?.total || 0,
    }

    recentOrders.value = (allOrders.data || []).slice(0, 5)
  } catch (err) {
    ElMessage.error('获取数据失败')
  }
}

onMounted(fetchDashboardData)
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
}

.page-title {
  margin-bottom: 20px;
  font-size: 24px;
  color: #303133;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  padding: 20px 0;
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  color: #409eff;
}

.stat-label {
  margin-top: 8px;
  color: #909399;
  font-size: 14px;
}

.stat-pending .stat-value {
  color: #e6a23c;
}

.stat-transporting .stat-value {
  color: #409eff;
}

.stat-completed .stat-value {
  color: #67c23a;
}

.content-row {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #909399;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/Dashboard.vue
git commit -m "feat: add Dashboard view with stats and alerts"
```

---

### Task 14: Order Management Page & Form Component

**Files:**
- Create: `src/views/OrderList.vue`
- Create: `src/components/OrderForm.vue`

- [ ] **Step 1: Create src/components/OrderForm.vue**

```vue
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
```

- [ ] **Step 2: Create src/views/OrderList.vue**

```vue
<template>
  <div class="order-list">
    <div class="page-header">
      <h2 class="page-title">订单管理</h2>
      <el-button type="primary" @click="showCreateDialog">创建订单</el-button>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable>
            <el-option label="待处理" value="pending" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="运输中" value="transporting" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="温度范围">
          <el-select v-model="filters.tempRange" placeholder="全部" clearable>
            <el-option label="冷冻" value="frozen" />
            <el-option label="冷藏" value="cold" />
            <el-option label="恒温" value="constant" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="订单号/客户名" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchOrders">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="orders" v-loading="loading" style="width: 100%">
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="customerName" label="客户" width="120" />
        <el-table-column prop="cargoType" label="货物类型" width="100" />
        <el-table-column label="温度范围" width="140">
          <template #default="{ row }">
            <el-tag :type="getTempRangeType(row.tempRange)" size="small">
              {{ getTempRangeLabel(row.tempRange) }}
            </el-tag>
            <span class="temp-detail">
              {{ row.tempMin }}°C ~ {{ row.tempMax }}°C
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
            <el-dropdown @command="(cmd) => updateStatus(row, cmd)">
              <el-button link type="primary">
                更新状态<i class="el-icon-arrow-down el-icon--right" />
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="s in availableStatuses(row.status)"
                    :key="s.value"
                    :command="s.value"
                  >
                    {{ s.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button link type="danger" @click="deleteOrder(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @change="fetchOrders"
        />
      </div>
    </el-card>

    <OrderForm
      v-model:visible="dialogVisible"
      :order="currentOrder"
      @submit="handleCreate"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { orders } from '@/api/client'
import OrderForm from '@/components/OrderForm.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const ordersList = ref([])
const dialogVisible = ref(false)
const currentOrder = ref(null)

const filters = reactive({
  status: '',
  tempRange: '',
  keyword: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const statusMap = {
  pending: { label: '待处理', type: 'warning' },
  confirmed: { label: '已确认', type: '' },
  transporting: { label: '运输中', type: 'primary' },
  completed: { label: '已完成', type: 'success' },
  cancelled: { label: '已取消', type: 'danger' },
}

const tempRangeMap = {
  frozen: { label: '冷冻', type: 'primary' },
  cold: { label: '冷藏', type: 'success' },
  constant: { label: '恒温', type: 'warning' },
}

function getStatusType(status) {
  return statusMap[status]?.type || ''
}

function getStatusLabel(status) {
  return statusMap[status]?.label || status
}

function getTempRangeType(range) {
  return tempRangeMap[range]?.type || ''
}

function getTempRangeLabel(range) {
  return tempRangeMap[range]?.label || range
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

function availableStatuses(current) {
  const all = [
    { value: 'pending', label: '待处理' },
    { value: 'confirmed', label: '已确认' },
    { value: 'transporting', label: '运输中' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
  ]
  return all.filter((s) => s.value !== current)
}

async function fetchOrders() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (filters.status) params.status = filters.status
    if (filters.tempRange) params.tempRange = filters.tempRange

    const res = await orders.list(params)
    ordersList.value = res.data || []
    pagination.total = res.meta?.total || 0
  } catch (err) {
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

function showCreateDialog() {
  currentOrder.value = null
  dialogVisible.value = true
}

async function handleCreate(data) {
  try {
    await orders.create(data)
    ElMessage.success('订单创建成功')
    dialogVisible.value = false
    fetchOrders()
  } catch (err) {
    ElMessage.error('订单创建失败')
  }
}

async function updateStatus(order, status) {
  try {
    await orders.updateStatus(order._id, status)
    ElMessage.success('状态更新成功')
    fetchOrders()
  } catch (err) {
    ElMessage.error('状态更新失败')
  }
}

async function deleteOrder(order) {
  try {
    await ElMessageBox.confirm('确定删除该订单吗?', '提示', { type: 'warning' })
    await orders.delete(order._id)
    ElMessage.success('订单删除成功')
    fetchOrders()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('订单删除失败')
    }
  }
}

function viewDetail(order) {
  currentOrder.value = order
  dialogVisible.value = true
}

onMounted(fetchOrders)
</script>

<style scoped>
.order-list {
  max-width: 1200px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  color: #303133;
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.temp-detail {
  margin-left: 8px;
  color: #606266;
  font-size: 12px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/OrderForm.vue src/views/OrderList.vue
git commit -m "feat: add Order management page and form component"
```

---

### Task 15: Waybill Management Page & Form Component

**Files:**
- Create: `src/views/WaybillList.vue`
- Create: `src/components/WaybillForm.vue`

- [ ] **Step 1: Create src/components/WaybillForm.vue**

```vue
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
            v-for="order in orders"
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
import { orders, waybills } from '@/api/client'
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
```

- [ ] **Step 2: Create src/views/WaybillList.vue**

```vue
<template>
  <div class="waybill-list">
    <div class="page-header">
      <h2 class="page-title">转运单管理</h2>
      <el-button type="primary" @click="showCreateDialog">创建转运单</el-button>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true">
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable>
            <el-option label="待发车" value="pending" />
            <el-option label="运输中" value="transporting" />
            <el-option label="已签收" value="signed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchWaybills">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="waybills" v-loading="loading" style="width: 100%">
        <el-table-column prop="waybillNo" label="转运单号" width="180" />
        <el-table-column prop="orderNo" label="关联订单" width="180" />
        <el-table-column prop="carrierName" label="承运商" width="120" />
        <el-table-column prop="vehicleNo" label="车牌号" width="120" />
        <el-table-column prop="driverName" label="司机" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="currentLocation" label="当前位置" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewTracking(row)">查看轨迹</el-button>
            <el-dropdown @command="(cmd) => updateStatus(row, cmd)">
              <el-button link type="primary">
                更新状态<i class="el-icon-arrow-down el-icon--right" />
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="s in availableStatuses(row.status)"
                    :key="s.value"
                    :command="s.value"
                  >
                    {{ s.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @change="fetchWaybills"
        />
      </div>
    </el-card>

    <WaybillForm
      v-model:visible="dialogVisible"
      :waybill="currentWaybill"
      @submit="handleCreate"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { waybills } from '@/api/client'
import WaybillForm from '@/components/WaybillForm.vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const waybillsList = ref([])
const dialogVisible = ref(false)
const currentWaybill = ref(null)

const filters = reactive({
  status: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const statusMap = {
  pending: { label: '待发车', type: 'warning' },
  transporting: { label: '运输中', type: 'primary' },
  signed: { label: '已签收', type: 'success' },
}

function getStatusType(status) {
  return statusMap[status]?.type || ''
}

function getStatusLabel(status) {
  return statusMap[status]?.label || status
}

function availableStatuses(current) {
  const all = [
    { value: 'pending', label: '待发车' },
    { value: 'transporting', label: '运输中' },
    { value: 'signed', label: '已签收' },
  ]
  return all.filter((s) => s.value !== current)
}

async function fetchWaybills() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (filters.status) params.status = filters.status

    const res = await waybills.list(params)
    waybillsList.value = res.data || []
    pagination.total = res.meta?.total || 0
  } catch (err) {
    ElMessage.error('获取转运单列表失败')
  } finally {
    loading.value = false
  }
}

function showCreateDialog() {
  currentWaybill.value = null
  dialogVisible.value = true
}

async function handleCreate(data) {
  try {
    await waybills.create(data)
    ElMessage.success('转运单创建成功')
    dialogVisible.value = false
    fetchWaybills()
  } catch (err) {
    ElMessage.error('转运单创建失败')
  }
}

async function updateStatus(waybill, status) {
  try {
    await waybills.updateStatus(waybill._id, status)
    ElMessage.success('状态更新成功')
    fetchWaybills()
  } catch (err) {
    ElMessage.error('状态更新失败')
  }
}

function viewTracking(waybill) {
  router.push({ path: '/tracking', query: { waybillNo: waybill.waybillNo, waybillId: waybill._id } })
}

onMounted(fetchWaybills)
</script>

<style scoped>
.waybill-list {
  max-width: 1200px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  color: #303133;
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/WaybillForm.vue src/views/WaybillList.vue
git commit -m "feat: add Waybill management page and form component"
```

---

### Task 16: Tracking View & Timeline Component

**Files:**
- Create: `src/views/TrackingView.vue`
- Create: `src/components/TrackingTimeline.vue`
- Create: `src/components/TemperatureAlert.vue`

- [ ] **Step 1: Create src/components/TemperatureAlert.vue**

```vue
<template>
  <div class="temperature-alert" :class="alertClass">
    <el-icon class="alert-icon"><WarningFilled /></el-icon>
    <div class="alert-content">
      <div class="alert-title">{{ alertTitle }}</div>
      <div class="alert-detail">
        当前温度: {{ data.temperature }}°C | 要求范围: {{ data.tempMin }}°C ~ {{ data.tempMax }}°C
      </div>
      <div class="alert-time">{{ formatTime(data.timestamp) }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'

const props = defineProps({
  alert: { type: Object, required: true },
})

const data = computed(() => props.alert)

const alertClass = computed(() => {
  if (data.value.alertType === 'temp_under') return 'alert-cold'
  if (data.value.alertType === 'temp_over') return 'alert-warm'
  return 'alert-warning'
})

const alertTitle = computed(() => {
  switch (data.value.alertType) {
    case 'temp_under':
      return '温度过低预警'
    case 'temp_over':
      return '温度过高预警'
    case 'delay':
      return '延迟预警'
    default:
      return '异常预警'
  }
})

function formatTime(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.temperature-alert {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 4px;
  background-color: #fef0f0;
}

.alert-cold {
  background-color: #e8f4ff;
}

.alert-warm {
  background-color: #fdf6ec;
}

.alert-icon {
  font-size: 20px;
  color: #f56c6c;
  margin-right: 12px;
  margin-top: 2px;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.alert-detail {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}

.alert-time {
  font-size: 12px;
  color: #909399;
}
</style>
```

- [ ] **Step 2: Create src/components/TrackingTimeline.vue**

```vue
<template>
  <div class="tracking-timeline">
    <el-timeline>
      <el-timeline-item
        v-for="(log, index) in logs"
        :key="log._id || index"
        :timestamp="formatTime(log.timestamp)"
        placement="top"
        :type="getEventTypeColor(log.eventType)"
        :hollow="log.alertType ? false : true"
      >
        <el-card :class="{ 'alert-card': log.alertType }">
          <div class="timeline-header">
            <el-tag :type="getEventTypeTagType(log.eventType)" size="small">
              {{ getEventTypeLabel(log.eventType) }}
            </el-tag>
            <span class="operator">操作人: {{ log.operator }}</span>
          </div>
          <div class="timeline-location">
            <el-icon><Location /></el-icon>
            {{ log.location }}
          </div>
          <div class="timeline-temp">
            温度: <span :class="getTempClass(log, orderTemp)">{{ log.temperature }}°C</span>
            <span v-if="log.humidity !== undefined" class="humidity">
              | 湿度: {{ log.humidity }}%
            </span>
          </div>
          <div v-if="log.alertType" class="alert-badge">
            <el-tag type="danger" size="small">{{ getAlertLabel(log.alertType) }}</el-tag>
          </div>
          <div v-if="log.remarks" class="remarks">{{ log.remarks }}</div>
        </el-card>
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<script setup>
import { Location } from '@element-plus/icons-vue'

const props = defineProps({
  logs: { type: Array, default: () => [] },
  orderTemp: { type: Object, default: () => ({ min: 0, max: 0 }) },
})

const eventTypeMap = {
  pickup: { label: '取货', type: 'success', color: 'success' },
  transit: { label: '运输中', type: 'primary', color: 'primary' },
  delivery: { label: '送达', type: 'info', color: '' },
  signed: { label: '签收', type: 'success', color: 'success' },
  alert: { label: '预警', type: 'danger', color: 'danger' },
}

function getEventTypeLabel(type) {
  return eventTypeMap[type]?.label || type
}

function getEventTypeTagType(type) {
  return eventTypeMap[type]?.type || ''
}

function getEventTypeColor(type) {
  return eventTypeMap[type]?.color || ''
}

function getAlertLabel(type) {
  const map = {
    temp_over: '温度过高',
    temp_under: '温度过低',
    delay: '延迟',
  }
  return map[type] || type
}

function getTempClass(log, orderTemp) {
  if (!orderTemp) return ''
  if (log.temperature > orderTemp.max) return 'temp-high'
  if (log.temperature < orderTemp.min) return 'temp-low'
  return 'temp-normal'
}

function formatTime(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.tracking-timeline {
  padding: 20px 0;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.operator {
  color: #909399;
  font-size: 13px;
}

.timeline-location {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  color: #303133;
  font-weight: 500;
}

.timeline-temp {
  font-size: 14px;
  color: #606266;
}

.temp-high {
  color: #f56c6c;
  font-weight: bold;
}

.temp-low {
  color: #409eff;
  font-weight: bold;
}

.temp-normal {
  color: #67c23a;
  font-weight: bold;
}

.humidity {
  color: #909399;
}

.alert-card {
  border-color: #f56c6c;
}

.alert-badge {
  margin-top: 8px;
}

.remarks {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}
</style>
```

- [ ] **Step 3: Create src/views/TrackingView.vue**

```vue
<template>
  <div class="tracking-view">
    <h2 class="page-title">物流轨迹查询</h2>

    <el-card class="search-card">
      <el-form :inline="true">
        <el-form-item label="转运单号">
          <el-input
            v-model="waybillNo"
            placeholder="请输入转运单号"
            style="width: 300px"
            @keyup.enter="searchTracking"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchTracking">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="waybillInfo" class="info-card">
      <template #header>
        <div class="card-header">
          <span>转运单信息</span>
          <el-tag :type="getStatusType(waybillInfo.status)">
            {{ getStatusLabel(waybillInfo.status) }}
          </el-tag>
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="转运单号">{{ waybillInfo.waybillNo }}</el-descriptions-item>
        <el-descriptions-item label="关联订单">{{ waybillInfo.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="承运商">{{ waybillInfo.carrierName }}</el-descriptions-item>
        <el-descriptions-item label="车牌号">{{ waybillInfo.vehicleNo }}</el-descriptions-item>
        <el-descriptions-item label="司机">{{ waybillInfo.driverName }}</el-descriptions-item>
        <el-descriptions-item label="司机电话">{{ waybillInfo.driverPhone }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="logs.length > 0" class="timeline-card">
      <template #header>
        <div class="card-header">
          <span>轨迹记录</span>
          <el-button type="primary" size="small" @click="showAddLogDialog">
            添加记录
          </el-button>
        </div>
      </template>

      <div v-if="alerts.length > 0" class="alerts-section">
        <h4>温度预警</h4>
        <TemperatureAlert
          v-for="alert in alerts"
          :key="alert._id"
          :alert="alert"
        />
      </div>

      <TrackingTimeline :logs="sortedLogs" :order-temp="orderTempRange" />
    </el-card>

    <el-dialog
      v-model="addLogVisible"
      title="添加轨迹记录"
      width="500px"
    >
      <el-form :model="logForm" label-width="100px">
        <el-form-item label="地点">
          <el-input v-model="logForm.location" placeholder="请输入地点" />
        </el-form-item>
        <el-form-item label="温度(°C)">
          <el-input-number v-model="logForm.temperature" :min="-50" :max="50" />
        </el-form-item>
        <el-form-item label="湿度(%)">
          <el-input-number v-model="logForm.humidity" :min="0" :max="100" />
        </el-form-item>
        <el-form-item label="事件类型">
          <el-select v-model="logForm.eventType" placeholder="请选择">
            <el-option label="取货" value="pickup" />
            <el-option label="运输中" value="transit" />
            <el-option label="送达" value="delivery" />
            <el-option label="签收" value="signed" />
            <el-option label="预警" value="alert" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="logForm.operator" placeholder="请输入操作人" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="logForm.remarks" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addLogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitLog">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { waybills, tracking, orders } from '@/api/client'
import TrackingTimeline from '@/components/TrackingTimeline.vue'
import TemperatureAlert from '@/components/TemperatureAlert.vue'
import { ElMessage } from 'element-plus'

const route = useRoute()

const waybillNo = ref(route.query.waybillNo || '')
const waybillInfo = ref(null)
const logs = ref([])
const orderInfo = ref(null)
const addLogVisible = ref(false)

const logForm = reactive({
  location: '',
  temperature: 0,
  humidity: 0,
  eventType: 'transit',
  operator: '',
  remarks: '',
})

const alerts = computed(() =>
  logs.value.filter((log) => log.alertType)
)

const sortedLogs = computed(() =>
  [...logs.value].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
)

const orderTempRange = computed(() => {
  if (!orderInfo.value) return null
  return {
    min: orderInfo.value.tempMin,
    max: orderInfo.value.tempMax,
  }
})

const statusMap = {
  pending: { label: '待发车', type: 'warning' },
  transporting: { label: '运输中', type: 'primary' },
  signed: { label: '已签收', type: 'success' },
}

function getStatusType(status) {
  return statusMap[status]?.type || ''
}

function getStatusLabel(status) {
  return statusMap[status]?.label || status
}

async function searchTracking() {
  if (!waybillNo.value.trim()) {
    ElMessage.warning('请输入转运单号')
    return
  }

  try {
    // First get waybill details by listing with filter
    const wbRes = await waybills.list({ pageSize: 100 })
    const wb = (wbRes.data || []).find((w) => w.waybillNo === waybillNo.value)

    if (!wb) {
      ElMessage.warning('未找到该转运单')
      waybillInfo.value = null
      logs.value = []
      return
    }

    waybillInfo.value = wb

    // Fetch tracking logs
    const logRes = await tracking.list(wb._id)
    logs.value = logRes.data || []

    // Fetch associated order for temp range
    if (wb.orderId) {
      const orderRes = await orders.get(wb.orderId)
      orderInfo.value = orderRes.data
    }
  } catch (err) {
    ElMessage.error('查询失败')
  }
}

function showAddLogDialog() {
  addLogVisible.value = true
  Object.assign(logForm, {
    location: '',
    temperature: 0,
    humidity: 0,
    eventType: 'transit',
    operator: '',
    remarks: '',
  })
}

async function submitLog() {
  if (!logForm.location || !logForm.operator) {
    ElMessage.warning('请填写地点和操作人')
    return
  }

  try {
    await tracking.create({
      waybillId: waybillInfo.value._id,
      waybillNo: waybillInfo.value.waybillNo,
      ...logForm,
    })
    ElMessage.success('记录添加成功')
    addLogVisible.value = false
    searchTracking()
  } catch (err) {
    ElMessage.error('添加记录失败')
  }
}

onMounted(() => {
  if (route.query.waybillNo) {
    searchTracking()
  }
})
</script>

<style scoped>
.tracking-view {
  max-width: 900px;
}

.page-title {
  margin-bottom: 20px;
  font-size: 24px;
  color: #303133;
}

.search-card {
  margin-bottom: 20px;
}

.info-card {
  margin-bottom: 20px;
}

.timeline-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alerts-section {
  margin-bottom: 20px;
}

.alerts-section h4 {
  color: #f56c6c;
  margin-bottom: 12px;
}
</style>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/TemperatureAlert.vue src/components/TrackingTimeline.vue src/views/TrackingView.vue
git commit -m "feat: add Tracking view with timeline and temperature alert components"
```

---

## Chunk 6: Testing & Build

### Task 17: Run Full Test Suite

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected output:
```
PASS  tests/api/models.test.js
PASS  tests/api/routes.test.js

Test Suites: 2 passed, 2 total
Tests:       XX passed, XX total
```

- [ ] **Step 2: Fix any failing tests**

If any tests fail, review the error messages and fix the implementation code (not the tests).

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: Vite builds successfully, output to `dist/` directory.

- [ ] **Step 4: Verify build output**

```bash
ls -la dist/
```

Expected: Contains `index.html`, `assets/` folder with JS and CSS files.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "test: all tests passing, build successful"
```

---

## Chunk 7: Vercel Deployment

### Task 18: Deploy to Vercel

- [ ] **Step 1: Install Vercel CLI (if not installed)**

```bash
npm i -g vercel
```

- [ ] **Step 2: Login to Vercel**

```bash
vercel login
```

Follow the browser authentication flow.

- [ ] **Step 3: Configure MongoDB Atlas**

1. Create a MongoDB Atlas cluster (if not exists)
2. Create a database user with read/write permissions
3. Whitelist all IPs (0.0.0.0/0) for serverless access
4. Get the connection string: `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/coldchain?retryWrites=true&w=majority`

- [ ] **Step 4: Deploy to Vercel**

```bash
vercel --prod
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? **Select your account**
- Link to existing project? **No** (first deploy)
- Project name: **cold-chain-platform**
- Directory: **./**
- Override settings? **No**

- [ ] **Step 5: Set environment variables in Vercel**

```bash
vercel env add MONGODB_URI production
```

Paste your MongoDB Atlas connection string when prompted.

Or set via Vercel dashboard:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add `MONGODB_URI` with your MongoDB connection string
5. Select "Production" environment

- [ ] **Step 6: Verify deployment**

```bash
vercel --prod
```

Check the deployed URL in the output. Test:
- Frontend: `https://<your-project>.vercel.app/`
- API Health: `https://<your-project>.vercel.app/api/health`
- Orders API: `https://<your-project>.vercel.app/api/orders`

- [ ] **Step 7: Redeploy with env vars**

```bash
vercel --prod
```

Environment variables require a new deployment to take effect.

- [ ] **Step 8: Final verification**

Visit the deployed URL and test all features:
- Dashboard loads with stats
- Create an order
- List orders with pagination
- Create a waybill linked to an order
- Add tracking logs
- View tracking timeline

---

## Quick Reference Commands

### Development

```bash
# Install dependencies
npm install

# Start dev server (frontend + API proxy)
npm run dev

# Run API server only (for testing)
NODE_ENV=development MONGODB_URI=your_uri node api/index.js

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Preview production build
npm run preview
```

### Deployment

```bash
# Deploy to Vercel (preview)
vercel

# Deploy to production
vercel --prod

# Add environment variable
vercel env add MONGODB_URI production

# List deployments
vercel ls
```

### MongoDB

```bash
# Connect to MongoDB Atlas (using mongosh)
mongosh "mongodb+srv://<user>:<password>@<cluster>.mongodb.net/coldchain"

# List collections
show collections

# Check orders
db.orders.find().limit(5)
```

---

## Troubleshooting

### Common Issues

1. **MongoDB Connection Timeout**
   - Ensure MongoDB Atlas IP whitelist includes 0.0.0.0/0
   - Verify connection string is correct
   - Check network/firewall settings

2. **Vercel API 500 Errors**
   - Check `MONGODB_URI` environment variable is set
   - View logs: `vercel logs <deployment-url>`
   - Ensure all dependencies are in package.json

3. **CORS Errors**
   - API includes cors middleware
   - For local dev, Vite proxies /api to localhost:3000

4. **Build Fails**
   - Check Node.js version compatibility
   - Ensure all imports use correct paths
   - Run `npm run build` locally first

5. **MongoDB Memory Server Tests Slow**
   - First run downloads MongoDB binary
   - Subsequent runs use cached binary
   - Can set `MONGOMS_VERSION` to pin version

---

## Next Steps (Post-MVP)

- [ ] Add authentication & authorization
- [ ] Implement real-time temperature monitoring with WebSocket
- [ ] Add map visualization for tracking
- [ ] Export reports (PDF/Excel)
- [ ] Add notification system (email/SMS for alerts)
- [ ] Implement rate limiting on API
- [ ] Add comprehensive e2e tests with Cypress
- [ ] Set up CI/CD pipeline with GitHub Actions
