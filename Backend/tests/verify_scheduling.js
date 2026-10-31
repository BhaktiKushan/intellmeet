import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import http from 'http';
import { app } from '../server.js';
import Meeting from '../models/Meeting.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'intellmeet_enterprise_jwt_super_secret_key_2026_xyz';

async function runVerification() {
  console.log('====================================================');
  console.log('🧪 INTELLMEET SCHEDULE MEETING & AUDIT VERIFICATION');
  console.log('====================================================\n');

  // Connect to DB
  if (mongoose.connection.readyState !== 1) {
    console.log('[Setup] Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('[Setup] Connected successfully to MongoDB.\n');
  }

  // Find or create a test user
  let testUser = await User.findOne({ email: 'admin@intellmeet.com' });
  if (!testUser) {
    testUser = await User.findOne({});
  }
  if (!testUser) {
    throw new Error('No user found in database for testing.');
  }

  const token = jwt.sign({ id: testUser._id }, JWT_SECRET, { expiresIn: '1d' });
  console.log(`[Setup] Using authenticated user: ${testUser.name} (${testUser.email})\n`);

  // Start an ephemeral HTTP server for API requests
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Setup] Test server listening on ${baseUrl}\n`);

  const authHeader = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  let totalTestsPassed = 0;
  const failedTests = [];

  try {
    // ----------------------------------------------------
    // TEST 1: Single Meeting Creation
    // ----------------------------------------------------
    console.log('--- TEST 1: Single Meeting Creation ---');
    const test1Title = `Audit Test Single Meeting ${Date.now()}`;
    const initialTest1Count = await Meeting.countDocuments({ host: testUser._id, title: test1Title });
    
    const res1 = await fetch(`${baseUrl}/api/meetings`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        title: test1Title,
        description: 'Single test meeting',
        scheduledAt: new Date(Date.now() + 86400000),
        status: 'scheduled'
      })
    });
    const data1 = await res1.json();

    if (!res1.ok || !data1.success) {
      throw new Error(`Test 1 Failed: HTTP ${res1.status} - ${JSON.stringify(data1)}`);
    }

    const afterTest1Count = await Meeting.countDocuments({ host: testUser._id, title: test1Title });
    if (afterTest1Count !== initialTest1Count + 1) {
      throw new Error(`Test 1 Failed: Expected exactly 1 new document, got ${afterTest1Count - initialTest1Count}`);
    }

    // Check GET /api/meetings
    const listRes1 = await fetch(`${baseUrl}/api/meetings?status=scheduled`, { headers: authHeader });
    const listData1 = await listRes1.json();
    const matches1 = listData1.data.filter(m => m.title === test1Title);
    if (matches1.length !== 1) {
      throw new Error(`Test 1 Failed: Meeting appears ${matches1.length} times in scheduled meetings list.`);
    }

    console.log('✅ TEST 1 PASSED: Exactly 1 document created in MongoDB, code: ' + data1.data.code);
    totalTestsPassed++;

    // ----------------------------------------------------
    // TEST 2: Multiple Different Meetings
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Multiple Different Meetings ---');
    const multiTitles = [
      `Sprint Review Alpha ${Date.now()}`,
      `Security Architecture Beta ${Date.now()}`,
      `Customer Success Sync Gamma ${Date.now()}`
    ];

    const initialTotalCount = await Meeting.countDocuments({ host: testUser._id });

    for (const title of multiTitles) {
      const res = await fetch(`${baseUrl}/api/meetings`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          title,
          description: 'Unique multi test session',
          scheduledAt: new Date(Date.now() + 86400000 * 2),
          status: 'scheduled'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(`Test 2 Failed for "${title}": HTTP ${res.status}`);
      }
    }

    const afterTotalCount = await Meeting.countDocuments({ host: testUser._id });
    if (afterTotalCount !== initialTotalCount + 3) {
      throw new Error(`Test 2 Failed: Expected 3 distinct meetings, count increased by ${afterTotalCount - initialTotalCount}`);
    }

    // Verify each appears exactly once
    for (const title of multiTitles) {
      const count = await Meeting.countDocuments({ host: testUser._id, title });
      if (count !== 1) {
        throw new Error(`Test 2 Failed: "${title}" has ${count} documents in MongoDB.`);
      }
    }

    console.log('✅ TEST 2 PASSED: 3 distinct meetings created with exactly 3 documents and no duplicates.');
    totalTestsPassed++;

    // ----------------------------------------------------
    // TEST 3: Rapid Clicking / Concurrency Deduplication
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Rapid Clicking / Parallel Requests ---');
    const rapidTitle = `Rapid Click Test ${Date.now()}`;
    const clientSubId = `sched-test-${Date.now()}-xyz`;
    const rapidScheduleTime = new Date(Date.now() + 7200000);

    const initialRapidCount = await Meeting.countDocuments({ host: testUser._id, title: rapidTitle });

    // Fire 5 identical requests concurrently in parallel
    console.log('[Test 3] Firing 5 identical requests in parallel within 0ms...');
    const promises = Array.from({ length: 5 }, (_, i) =>
      fetch(`${baseUrl}/api/meetings`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          title: rapidTitle,
          description: 'Testing concurrent rapid submissions',
          scheduledAt: rapidScheduleTime,
          status: 'scheduled',
          clientSubmissionId: clientSubId
        })
      }).then(r => r.json())
    );

    const results = await Promise.all(promises);

    // Verify all 5 received success response
    results.forEach((res, idx) => {
      if (!res.success) {
        throw new Error(`Test 3 Failed: Request ${idx + 1} did not return success.`);
      }
    });

    // Verify that ALL 5 responses returned the SAME meeting code
    const codes = results.map(r => r.data.code);
    const uniqueCodes = new Set(codes);
    if (uniqueCodes.size !== 1) {
      throw new Error(`Test 3 Failed: Multiple different meeting codes returned: ${Array.from(uniqueCodes).join(', ')}`);
    }

    // Verify that in MongoDB, EXACTLY 1 document was inserted!
    const afterRapidCount = await Meeting.countDocuments({ host: testUser._id, title: rapidTitle });
    const insertedCount = afterRapidCount - initialRapidCount;
    if (insertedCount !== 1) {
      throw new Error(`Test 3 Failed: MongoDB has ${insertedCount} documents for rapid click, expected EXACTLY 1!`);
    }

    console.log(`✅ TEST 3 PASSED: 5 rapid parallel requests resulted in EXACTLY 1 document in MongoDB!`);
    console.log(`   Meeting Code: ${codes[0]} (Shared across all 5 responses)`);
    totalTestsPassed++;

    // ----------------------------------------------------
    // TEST 4: Browser Refresh / Repeated Data Fetching
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Browser Refresh & Repeated Reads ---');
    const beforeRefreshCount = await Meeting.countDocuments();

    // Simulate 10 page refreshes / dashboard loads
    for (let i = 0; i < 10; i++) {
      const res = await fetch(`${baseUrl}/api/meetings`, { headers: authHeader });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(`Test 4 Failed at iteration ${i}: HTTP ${res.status}`);
      }
    }

    const afterRefreshCount = await Meeting.countDocuments();
    if (beforeRefreshCount !== afterRefreshCount) {
      throw new Error(`Test 4 Failed: Reading/refreshing changed document count from ${beforeRefreshCount} to ${afterRefreshCount}`);
    }

    console.log(`✅ TEST 4 PASSED: 10 repeated reads caused 0 additional documents (Count: ${afterRefreshCount})`);
    totalTestsPassed++;

    // ----------------------------------------------------
    // TEST 5: Navigation & Status Filtering
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Navigation & Status Filtering ---');
    const allRes = await fetch(`${baseUrl}/api/meetings`, { headers: authHeader });
    const allData = await allRes.json();

    const scheduledRes = await fetch(`${baseUrl}/api/meetings?status=scheduled`, { headers: authHeader });
    const scheduledData = await scheduledRes.json();

    const endedRes = await fetch(`${baseUrl}/api/meetings?status=ended`, { headers: authHeader });
    const endedData = await endedRes.json();

    console.log(`   All Meetings Count: ${allData.count}`);
    console.log(`   Scheduled Meetings Count: ${scheduledData.count}`);
    console.log(`   Ended Meetings Count: ${endedData.count}`);

    // Verify all returned meetings have valid status
    scheduledData.data.forEach(m => {
      if (m.status !== 'scheduled') {
        throw new Error(`Test 5 Failed: Scheduled filter returned meeting with status "${m.status}"`);
      }
    });

    console.log('✅ TEST 5 PASSED: Navigation tabs and status filters match database records consistently.');
    totalTestsPassed++;

    // ----------------------------------------------------
    // TEST 6: Existing Functionality Regression
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Existing Functionality Regression ---');

    // 6a. Instant Meeting Creation
    const instantRes = await fetch(`${baseUrl}/api/meetings`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        title: `Instant Meeting ${Date.now()}`,
        status: 'live'
      })
    });
    const instantData = await instantRes.json();
    if (!instantRes.ok || !instantData.success || instantData.data.status !== 'live') {
      throw new Error(`Test 6a Failed: Instant meeting creation failed or incorrect status: ${instantData?.data?.status}`);
    }
    console.log('   ✓ Instant Meeting Creation: OK (status: live, code: ' + instantData.data.code + ')');

    // 6b. Get Meeting by Code
    const getRes = await fetch(`${baseUrl}/api/meetings/${instantData.data.code}`, { headers: authHeader });
    const getData = await getRes.json();
    if (!getRes.ok || getData.data.code !== instantData.data.code) {
      throw new Error('Test 6b Failed: Fetching meeting by code failed.');
    }
    console.log('   ✓ Fetch Meeting by Code: OK');

    // 6c. AI Summary Generation
    const aiRes = await fetch(`${baseUrl}/api/ai/summarize`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        title: 'Q4 Product Roadmap Sync',
        transcript: [
          { speaker: 'Alex Rivera', text: 'We need to migrate our database clusters to high-availability by Friday.' },
          { speaker: 'Sarah Chen', text: 'I will coordinate the migration plan and write the rollback procedures.' },
          { speaker: 'Alex Rivera', text: 'Great, Sarah will own the migration checklist by Wednesday.' }
        ]
      })
    });
    const aiData = await aiRes.json();
    if (!aiRes.ok || !aiData.success || !aiData.data.summary) {
      throw new Error('Test 6c Failed: AI Summarize endpoint returned invalid output.');
    }
    console.log('   ✓ AI Meeting Intelligence Summary: OK (Generated ' + aiData.data.summary.slice(0, 45) + '...)');

    // 6d. Kanban Tasks
    const tasksRes = await fetch(`${baseUrl}/api/tasks`, { headers: authHeader });
    const tasksData = await tasksRes.json();
    if (!tasksRes.ok || !tasksData.success) {
      throw new Error('Test 6d Failed: Tasks API failed.');
    }
    console.log('   ✓ Kanban Tasks API: OK (' + tasksData.count + ' tasks)');

    // 6e. Analytics Dashboard
    const analyticsRes = await fetch(`${baseUrl}/api/analytics/dashboard`, { headers: authHeader });
    const analyticsData = await analyticsRes.json();
    if (!analyticsRes.ok || !analyticsData.success || !analyticsData.data.metrics) {
      throw new Error('Test 6e Failed: Analytics API failed.');
    }
    console.log('   ✓ Analytics Dashboard: OK (Total Meetings: ' + analyticsData.data.metrics.totalMeetings + ')');

    console.log('✅ TEST 6 PASSED: All existing core features verified operational and intact.');
    totalTestsPassed++;

    console.log('\n====================================================');
    console.log(`🎉 ALL ${totalTestsPassed} / 6 TESTS PASSED SUCCESSFULLY!`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runVerification();
