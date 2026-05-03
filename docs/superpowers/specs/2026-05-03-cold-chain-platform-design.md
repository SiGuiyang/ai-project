# 冷链物流PaaS平台设计文档

## 概述

设计一套冷链物流PaaS平台，包含订单管理、转运单管理、物流轨迹追踪三大核心业务模块。前后端一体部署到 Vercel，使用 MongoDB Atlas 作为数据库。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 (Composition API) + Vite + Element Plus + Vue Router + Pinia + Axios |
| 后端 | Node.js + Express + Mongoose (MongoDB ODM) |
| 数据库 | MongoDB Atlas (云托管) |
| 部署 | Vercel (前端静态资源 + Serverless API) |
| 验证 | Zod (请求参数校验) |

## 架构设计

### 部署架构

```
用户请求 → Vercel Edge CDN
              ├── 前端: Vite 构建的 Vue 3 SPA (静态资源)
              └── API: Vercel Serverless Functions (Express 路由)
                        └── MongoDB Atlas (数据库)
```

### 项目结构

```
cold-chain-platform/
├── api/                          # Vercel Serverless API
│   └── index.js                  # Express 应用入口 (路由分发)
├── api/routes/                   # 路由模块
│   ├── orders.js                 # 订单相关 API
│   ├── waybills.js               # 转运单相关 API
│   └── tracking.js               # 物流轨迹相关 API
├── api/models/                   # Mongoose 数据模型
│   ├── Order.js
│   ├── Waybill.js
│   └── TrackingLog.js
├── api/utils/
│   └── response.js               # 统一响应格式工具
├── src/                          # Vue 3 前端
│   ├── views/
│   │   ├── OrderList.vue         # 订单列表 + 创建
│   │   ├── WaybillList.vue       # 转运单列表 + 创建
│   │   ├── TrackingView.vue      # 物流轨迹查询
│   │   └── Dashboard.vue         # 首页仪表盘
│   ├── components/
│   │   ├── OrderForm.vue         # 订单表单组件
│   │   ├── WaybillForm.vue       # 转运单表单组件
│   │   ├── TrackingTimeline.vue  # 轨迹时间线组件
│   │   └── TemperatureAlert.vue  # 温度预警组件
│   ├── api/                      # API 请求封装
│   │   └── index.js
│   ├── router/
│   │   └── index.js
│   ├── stores/
│   │   └── app.js
│   ├── App.vue
│   └── main.js
├── public/                       # 静态资源
├── vercel.json                   # Vercel 部署配置
├── package.json                  # 项目依赖
├── vite.config.js                # Vite 配置
└── index.html                    # HTML 入口
```

## 数据库设计

### Order (订单集合)

```javascript
{
  _id: ObjectId,
  orderNo: String,              // 订单编号 (自动生成: CC-YYYYMMDD-XXXX)
  customerName: String,         // 客户名称
  customerPhone: String,        // 客户电话
  pickupAddress: String,        // 取货地址
  pickupContact: String,        // 取货联系人
  pickupPhone: String,          // 取货电话
  deliveryAddress: String,      // 送货地址
  deliveryContact: String,      // 收货联系人
  deliveryPhone: String,        // 收货电话
  cargoType: String,            // 货物类型 (食品/药品/生鲜/其他)
  cargoWeight: Number,          // 货物重量(kg)
  cargoVolume: Number,          // 货物体积(m³)
  tempMin: Number,              // 最低温度要求(°C)
  tempMax: Number,              // 最高温度要求(°C)
  tempRange: String,            // 温度范围分类: frozen/cold/constant
  status: String,               // pending/confirmed/transporting/completed/cancelled
  remarks: String,              // 备注
  createdAt: Date,
  updatedAt: Date
}
```

### Waybill (转运单集合)

```javascript
{
  _id: ObjectId,
  waybillNo: String,            // 转运单号 (自动生成: WB-YYYYMMDD-XXXX)
  orderId: ObjectId,            // 关联订单ID
  orderNo: String,              // 关联订单号
  carrierName: String,          // 承运商名称
  vehicleNo: String,            // 车牌号
  vehiclePlate: String,         // 车辆类型
  driverName: String,           // 司机姓名
  driverPhone: String,          // 司机电话
  status: String,               // pending/transporting/signed
  currentLocation: String,      // 当前位置
  estimatedArrival: Date,       // 预计到达时间
  createdAt: Date,
  updatedAt: Date
}
```

### TrackingLog (轨迹记录集合)

```javascript
{
  _id: ObjectId,
  waybillId: ObjectId,          // 关联转运单ID
  waybillNo: String,            // 转运单号
  timestamp: Date,              // 记录时间
  location: String,             // 地点描述
  latitude: Number,             // 纬度
  longitude: Number,            // 经度
  temperature: Number,          // 当前温度(°C)
  humidity: Number,             // 当前湿度(%)
  eventType: String,            // pickup/transit/signed/alert/delivery
  operator: String,             // 操作人
  remarks: String,              // 备注
  alertType: String,            // 预警类型: temp_over/temp_under/delay (可选)
  createdAt: Date
}
```

## API 端点设计

### 订单 API

```
POST   /api/orders              创建订单 (201)
GET    /api/orders              订单列表 (200)
GET    /api/orders/:id          订单详情 (200)
PATCH  /api/orders/:id/status   更新订单状态 (200)
DELETE /api/orders/:id          删除订单 (204)
```

**GET /api/orders 查询参数:**
- `page`: 页码 (默认1)
- `pageSize`: 每页条数 (默认20)
- `status`: 状态筛选
- `tempRange`: 温度范围筛选

### 转运单 API

```
POST   /api/waybills            创建转运单 (201)
GET    /api/waybills            转运单列表 (200)
GET    /api/waybills/:id        转运单详情 (200)
PATCH  /api/waybills/:id/status 更新转运单状态 (200)
```

**GET /api/waybills 查询参数:**
- `page`: 页码 (默认1)
- `pageSize`: 每页条数 (默认20)
- `orderId`: 按订单筛选
- `status`: 状态筛选

### 物流轨迹 API

```
POST   /api/tracking            记录物流节点 (201)
GET    /api/tracking/:waybillId 查询轨迹 (200)
GET    /api/tracking/:waybillId/latest 最新位置 (200)
```

## 前端页面设计

### 仪表盘 (Dashboard)
- 统计数据卡片：总订单数、运输中、待处理、已完成
- 温度异常预警列表
- 近期订单列表

### 订单管理 (OrderList)
- 订单表格 (el-table)：订单号、客户、温度范围、状态、创建时间
- 搜索筛选：状态、温度范围、关键词
- 创建订单按钮 → 弹出表单 (el-dialog)
- 操作列：查看详情、更新状态

### 转运单管理 (WaybillList)
- 转运单表格：转运单号、关联订单、承运商、司机、状态
- 创建转运单 (需选择关联订单)
- 操作列：查看轨迹、更新状态

### 物流轨迹 (TrackingView)
- 输入转运单号查询
- 时间线组件 (el-timeline) 展示轨迹
- 温度折线图 (可选)
- 异常预警高亮显示

## 响应格式

### 成功响应

```json
{
  "data": { ... },
  "message": "操作成功"
}
```

### 列表响应

```json
{
  "data": [...],
  "meta": { "total": 100, "page": 1, "pageSize": 20 },
  "message": "查询成功"
}
```

### 错误响应

```json
{
  "error": {
    "code": "validation_error",
    "message": "参数校验失败",
    "details": [...]
  }
}
```

## 温度范围定义

| 类型 | 标识 | 温度范围 |
|------|------|----------|
| 冷冻 | frozen | ≤ -18°C |
| 冷藏 | cold | 0°C ~ 8°C |
| 恒温 | constant | 8°C ~ 15°C |

## Vercel 部署配置

- `vercel.json` 配置 API 路由和前端构建
- 环境变量 `MONGODB_URI` 在 Vercel 控制台配置
- API 通过 `/api/*` 路由到 Serverless Functions
