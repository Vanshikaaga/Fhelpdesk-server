const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
require('dotenv').config();

let mongoServer;

const connectDB = async () => {
  try {
    // Check if MONGODB_URI is provided and use it
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('MongoDB Connected using provided URI');
      return;
    }
    
    // If no MONGODB_URI, use in-memory MongoDB
    console.log('No MongoDB URI provided, using in-memory MongoDB');
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('MongoDB Connected using in-memory server');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// Close MongoDB connection when the Node process ends
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

module.exports = connectDB; 