import mongoose from 'mongoose';

let memoryServer = null;

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  // Attempt to connect to provided MONGO_URI (MongoDB Atlas)
  if (uri) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000
      });
      console.log(`[Database] MongoDB Atlas Connected: ${conn.connection.host}`);
      return true;
    } catch (err) {
      console.warn(`[Database] MongoDB Atlas connection warning: ${err.message}`);
    }
  }

  // Attempt local MongoDB
  try {
    const conn = await mongoose.connect('mongodb://127.0.0.1:27017/intellmeet', {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`[Database] Local MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.log('[Database] Local MongoDB not detected. Attempting In-Memory MongoDB...');
  }

  // Resilient In-Memory MongoDB Fallback
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    const conn = await mongoose.connect(memoryUri);
    console.log(`[Database] In-Memory MongoDB Started & Connected: ${conn.connection.host}`);
    return true;
  } catch (memErr) {
    console.warn('[Database] In-Memory MongoDB not available in this environment:', memErr.message);
  }

  return false;
};

export const closeDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
};
