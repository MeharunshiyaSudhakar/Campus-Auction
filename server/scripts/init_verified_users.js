const mongoose = require('mongoose');
const User = require('../src/models/User');

async function init() {
  await mongoose.connect('mongodb://127.0.0.1:27017/campus_auction');
  const result = await User.updateMany(
    { email: { $in: ['aarav@campus.edu', 'priya@campus.edu', 'rohan@campus.edu', 'photo_owner@campus.edu', 'sniperseller@campus.edu'] } },
    { $set: { emailVerified: true } }
  );
  console.log('Updated seed/test users:', result);
  process.exit(0);
}

init();
