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

app.use('/api/orders', orderRoutes);
app.use('/api/waybills', waybillRoutes);
app.use('/api/tracking', trackingRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const handler = serverless(app);

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  connectDB(process.env.MONGODB_URI || 'mongodb://localhost:27017/coldchain').then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}

module.exports = handler;
