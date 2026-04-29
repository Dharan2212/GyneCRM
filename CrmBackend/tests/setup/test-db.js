const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let connected = false;
let mongoMemoryServer = null;
let dbModule = null;

function clearModuleCache(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch (error) {
    // ignore cache misses
  }
}

async function resolveDatabaseUri() {
  if (process.env.TEST_DB_CON_STRING && process.env.TEST_DB_CON_STRING.trim()) {
    return {
      uri: process.env.TEST_DB_CON_STRING.trim(),
      dbName: process.env.TEST_DB_NAME || process.env.DB_NAME_DEV || 'gynecrm_src_runtime_test',
      mode: 'external',
    };
  }

  if (!mongoMemoryServer) {
    mongoMemoryServer = await MongoMemoryServer.create({
      instance: {
        dbName: process.env.TEST_DB_NAME || 'gynecrm_src_runtime_test',
      },
    });
  }

  return {
    uri: mongoMemoryServer.getUri(),
    dbName: process.env.TEST_DB_NAME || 'gynecrm_src_runtime_test',
    mode: 'memory',
  };
}

async function getDbModule() {
  if (dbModule) {
    return dbModule;
  }

  const resolved = await resolveDatabaseUri();
  process.env.DB_CON_STRING_DEV = resolved.uri;
  process.env.MONGODB_URL = resolved.uri;
  process.env.DB_NAME_DEV = resolved.dbName;
  process.env.MONGODB_REPLICA_SET = resolved.mode === 'memory' ? '' : (process.env.MONGODB_REPLICA_SET || '');

  clearModuleCache(path.resolve(__dirname, '../../src/config/env.js'));
  clearModuleCache(path.resolve(__dirname, '../../src/db/mongoose.js'));

  dbModule = require('../../src/db/mongoose');
  return dbModule;
}

async function ensureIndexes(mongoose) {
  const models = mongoose.models || {};
  await Promise.all(
    Object.values(models).map(async (Model) => {
      if (typeof Model.init === 'function') {
        try {
          await Model.init();
        } catch (error) {
          // Ignore duplicate/background index build conflicts during repeated test runs.
        }
      }
    }),
  );
}

async function connectTestDatabase() {
  const { connectDatabase, mongoose } = await getDbModule();

  if (connected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await connectDatabase();
  connected = true;
  await ensureIndexes(mongoose);
  return mongoose.connection;
}

async function clearDatabase() {
  const { mongoose } = await getDbModule();

  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = Object.values(mongoose.connection.collections || {});
  for (const collection of collections) {
    await collection.deleteMany({});
  }
}

async function disconnectTestDatabase() {
  if (dbModule) {
    const { mongoose } = dbModule;

    if (mongoose.connection.readyState === 1) {
      const collections = Object.values(mongoose.connection.collections || {});
      for (const collection of collections) {
        try {
          await collection.deleteMany({});
        } catch (error) {
          // ignore cleanup errors during shutdown
        }
      }
      await mongoose.connection.close();
    }
  }

  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    mongoMemoryServer = null;
  }

  dbModule = null;
  connected = false;
}

module.exports = {
  connectTestDatabase,
  clearDatabase,
  disconnectTestDatabase,
};
