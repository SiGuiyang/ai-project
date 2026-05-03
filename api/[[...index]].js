const express = require('express');
const cors = require('cors');
const connectDB = require('../server/lib/db');

const orderRoutes = require('../server/routes/orders');
const waybillRoutes = require('../server/routes/waybills');
const trackingRoutes = require('../server/routes/tracking');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/orders', orderRoutes);
app.use('/api/waybills', waybillRoutes);
app.use('/api/tracking', trackingRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

let dbConnected = false;

module.exports = async (req, res) => {
  if (!dbConnected && process.env.MONGODB_URI) {
    await connectDB(process.env.MONGODB_URI);
    dbConnected = true;
  }
  app(req, res);
};
