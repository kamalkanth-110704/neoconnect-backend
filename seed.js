require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const DEMO_USERS = [
  { name: 'Venkata Ramana Reddy', email: 'staff@demo.com', password: 'demo1234', role: 'staff', department: 'Engineering' },
  { name: 'Lakshmi Prasanna Devi', email: 'sec@demo.com', password: 'demo1234', role: 'secretariat', department: 'Management' },
  { name: 'Srinivas Rao Yadav', email: 'cm@demo.com', password: 'demo1234', role: 'case_manager', department: 'HR' },
  { name: 'Kamalkanth', email: 'admin@demo.com', password: 'demo1234', role: 'admin', department: 'IT' },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[SEED] Connected to MongoDB');
  for (const u of DEMO_USERS) {
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log('[SEED] Skipping ' + u.email);
      continue;
    }
    await User.create(u);
    console.log('[SEED] Created: ' + u.email);
  }
  console.log('[SEED] Done! Password for all: demo1234');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[SEED] Error:', err.message);
  process.exit(1);
});