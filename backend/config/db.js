const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * Uses connection string from environment variable
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('MONGO_URI is not set. Please configure it in Render env vars.');
    process.exit(1);
  }

  // Mask credentials in logs while showing host/db for diagnostics
  const safeUri = (() => {
    try {
      const u = new URL(uri);
      const user = u.username ? '<user>' : '';
      const pass = u.password ? ':<pass>' : '';
      const auth = u.username ? `${user}${pass}@` : '';
      return `${u.protocol}//${auth}${u.host}${u.pathname}${u.search}`;
    } catch {
      return '<hidden>';
    }
  })();

  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 12000,
      socketTimeoutMS: 20000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Mongo URI (masked): ${safeUri}`);

    // Optional ping to ensure cluster responds
    try {
      await mongoose.connection.db.admin().command({ ping: 1 });
      console.log('MongoDB ping successful');
    } catch (pingErr) {
      console.warn('MongoDB ping failed:', pingErr.message);
    }

    mongoose.connection.on('error', (err) => {
      console.error('Mongo connection error:', err.message);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('Mongo disconnected');
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB.');
    console.error('Mongo URI (masked):', safeUri);
    console.error('Error:', error.message);
    if (error.name === 'MongooseServerSelectionError') {
      console.error('Hint: Check Atlas Network Access (IP allowlist) and Render env MONGO_URI.');
    }
    process.exit(1); // Exit with failure
  }
};

module.exports = connectDB;
