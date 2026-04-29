const http = require('http');
const app = require('./app');
const config = require('./config/env');
const { connectDatabase, mongoose } = require('./db/mongoose');
const logger = require('./utils/logger');

let listenersBound = false;

function bindProcessListeners(server) {
  if (listenersBound) {
    return;
  }

  listenersBound = true;

  const shutdown = async (signal) => {
    logger.info('Received shutdown signal.', { signal });

    server.close(async () => {
      try {
        await mongoose.connection.close();
        logger.info('HTTP server and MongoDB connection closed.');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown.', error);
        process.exit(1);
      }
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection.', reason instanceof Error ? reason : { reason });
  });
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception.', error);
  });
}

async function startServer() {
  try {
    await connectDatabase();

    const server = http.createServer(app);
    const port = config.server.port;

    server.listen(port, () => {
      logger.info('GyneCRM runtime listening.', {
        port,
        environment: config.env,
      });
    });

    bindProcessListeners(server);

    return server;
  } catch (error) {
    logger.error('Failed to start runtime foundation.', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = {
  startServer,
};
