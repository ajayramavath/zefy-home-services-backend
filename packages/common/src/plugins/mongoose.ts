import fp from "fastify-plugin";
import mongoose from "mongoose";

export default fp(async (app, opts: { uri: string; retries?: number }) => {
  const { uri, retries = 5 } = opts;

  const connectWithRetry = async (attempt = 1): Promise<void> => {
    try {
      app.log.info(`🔗 Connecting to MongoDB (attempt ${attempt}/${retries}): ${uri}`);

      await mongoose.connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 1
      });

      app.log.info('✅ MongoDB connected successfully');

      await mongoose.connection.db.admin().ping();
      app.log.info('🏓 MongoDB ping successful');

    } catch (error) {
      app.log.error(`❌ MongoDB connection attempt ${attempt} failed:`, error.message);

      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        app.log.info(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return connectWithRetry(attempt + 1);
      } else {
        throw new Error(`Failed to connect to MongoDB after ${retries} attempts: ${error.message}`);
      }
    }
  };

  await connectWithRetry();

  app.decorate('mongooseReady', () => mongoose.connection.readyState === 1);
  app.decorate('mongooseState', () => {
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    return states[mongoose.connection.readyState] || 'unknown';
  });

  mongoose.connection.on('error', (error) => {
    app.log.error('❌ MongoDB error:', error);
  });

  mongoose.connection.on('disconnected', () => {
    app.log.warn('⚠️ MongoDB disconnected');
  });

  app.addHook("onClose", async () => {
    await mongoose.connection.close();
    app.log.info('🔒 MongoDB connection closed');
  });
}, {
  name: 'mongoose-plugin'
});