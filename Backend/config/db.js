import mongoose from 'mongoose';

let memoryServer = null;

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  // Attempt to connect to provided MONGO_URI if available
  if (uri) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000
      });
      console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (err) {
      console.warn(`[Database] Could not connect to MONGO_URI (${err.message}). Falling back to In-Memory MongoDB...`);
    }
  }

  // Attempt local default MongoDB
  try {
    const conn = await mongoose.connect('mongodb://127.0.0.1:27017/intellmeet', {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`[Database] Local MongoDB Connected: ${conn.connection.host}`);
    return;
  } catch (err) {
    console.log('[Database] Local MongoDB instance not detected. Launching resilient In-Memory MongoDB...');
  }

  // Resilient In-Memory MongoDB Server for 100% zero-config execution
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    const conn = await mongoose.connect(memoryUri);
    console.log(`[Database] In-Memory MongoDB Started & Connected: ${conn.connection.host}`);
  } catch (memErr) {
    console.error('[Database] Failed to initialize in-memory MongoDB:', memErr.message);
  }
};

export const closeDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
};
