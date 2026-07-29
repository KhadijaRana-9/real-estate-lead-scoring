const mongoose = require('mongoose');
const connectDB = require('../../src/config/db');

beforeAll(async () => {
  await connectDB(process.env.MONGO_URI);
});

afterAll(async () => {
  // Drop the whole test database rather than individual collections -
  // guarantees no test file can leak state into the next one, including
  // indexes created by a schema change.
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
