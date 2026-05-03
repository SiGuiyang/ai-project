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
