const mongoose = require('mongoose');

async function connectDB(mongoUri) {
  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error(`Application failed to start: could not connect to MongoDB (${err.message})`);
    process.exit(1);
  }
}

module.exports = connectDB;
