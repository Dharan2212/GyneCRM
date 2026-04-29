const mongoose = require('mongoose');
const config = require('../config/env');

let listenersBound = false;

function shouldSilenceLogs() {
  return process.env.NODE_ENV === 'test' && String(process.env.TEST_DB_SILENT_LOGS || '').toLowerCase() === 'true';
}

function bindConnectionEvents() {
  if (listenersBound) {
    return;
  }

  listenersBound = true;
  const connection = mongoose.connection;
  connection.setMaxListeners(10);

  if (shouldSilenceLogs()) {
    return;
  }

  connection.on('connected', () => {
    console.log('[src] MongoDB connected successfully.');
  });

  connection.on('error', (error) => {
    console.error('[src] MongoDB connection error:', error.message);
  });

  connection.on('disconnected', () => {
    console.warn('[src] MongoDB disconnected.');
  });

  connection.on('reconnected', () => {
    console.log('[src] MongoDB reconnected.');
  });
}

async function connectDatabase() {
  bindConnectionEvents();

  const options = {
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 30000),
  };

  if (config.database.dbName) {
    options.dbName = config.database.dbName;
  }

  if (config.database.replicaSet) {
    options.replicaSet = config.database.replicaSet;
  }

  await mongoose.connect(config.database.uri, options);
  return mongoose.connection;
}

module.exports = {
  connectDatabase,
  mongoose,
};
