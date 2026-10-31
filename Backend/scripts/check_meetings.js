import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Meeting from '../models/Meeting.js';

async function checkMeetings() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const iqooMeetings = await Meeting.find({ title: { $regex: 'iqoo', $options: 'i' } }).lean();
  console.log('=== IQOO MEETINGS FOUND ===');
  console.log('Count:', iqooMeetings.length);
  iqooMeetings.forEach((m, idx) => {
    console.log(`[${idx + 1}] ID: ${m._id}, Code: ${m.code}, Title: '${m.title}', Status: ${m.status}, Host: ${m.host}, ScheduledAt: ${m.scheduledAt}, CreatedAt: ${m.createdAt}`);
  });

  const allMeetings = await Meeting.find().sort({ createdAt: -1 }).limit(30).lean();
  console.log('\n=== RECENT 30 MEETINGS ===');
  console.log('Total recent queried:', allMeetings.length);
  allMeetings.forEach((m, idx) => {
    console.log(`[${idx + 1}] ID: ${m._id}, Code: ${m.code}, Title: '${m.title}', Status: ${m.status}, ScheduledAt: ${m.scheduledAt}, CreatedAt: ${m.createdAt}`);
  });

  // Check group by title count
  const duplicates = await Meeting.aggregate([
    { $group: { _id: '$title', count: { $sum: 1 }, ids: { $push: '$_id' }, codes: { $push: '$code' }, createdAts: { $push: '$createdAt' } } },
    { $match: { count: { $gt: 1 } } }
  ]);
  console.log('\n=== DUPLICATE TITLES IN MONGODB ===');
  console.log(JSON.stringify(duplicates, null, 2));

  await mongoose.disconnect();
}

checkMeetings().catch(err => {
  console.error(err);
  process.exit(1);
});

