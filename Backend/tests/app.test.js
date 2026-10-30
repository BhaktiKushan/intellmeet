import test from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { app, server } from '../server.js';

test('IntellMeet Complete Enterprise Test Suite', async (suite) => {
  const SERVER_URL = 'http://127.0.0.1:5000';
  let authToken = '';
  let testMeetingCode = '';
  let client1 = null;
  let client2 = null;

  // Wait briefly for server initialization if needed
  await new Promise(r => setTimeout(r, 400));

  await suite.test('Part 1: REST API, Authentication & Meeting Management', async (t) => {
    await t.test('1. Health check endpoint responds with online status', async () => {
      const res = await fetch(`${SERVER_URL}/api/health`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.status, 'online');
      assert.equal(body.service, 'IntellMeet Enterprise API');
    });

    await t.test('2. Auth demo-login succeeds for admin', async () => {
      const res = await fetch(`${SERVER_URL}/api/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.accessToken, 'Access token should be returned');
      assert.equal(body.data.role, 'admin');
      authToken = body.data.accessToken;
    });

    await t.test('2b. Auth register & login flow succeeds', async () => {
      const testEmail = `testuser_${Date.now()}@example.com`;
      const res = await fetch(`${SERVER_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jordan Smith',
          email: testEmail,
          password: 'Password123!'
        })
      });
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.accessToken, 'Access token should be returned');
      assert.equal(body.data.email, testEmail);
      assert.equal(body.data.name, 'Jordan Smith');

      // Test Login with newly registered user
      const loginRes = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'Password123!'
        })
      });
      assert.equal(loginRes.status, 200);
      const loginBody = await loginRes.json();
      assert.equal(loginBody.success, true);
      assert.ok(loginBody.data.accessToken);

      // Test Login with invalid password
      const badLoginRes = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword!'
        })
      });
      assert.equal(badLoginRes.status, 401);
    });

    await t.test('3. Auth /me endpoint returns authenticated user profile', async () => {
      const res = await fetch(`${SERVER_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.email);
    });

    await t.test('4. Create new meeting with settings', async () => {
      const res = await fetch(`${SERVER_URL}/api/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Executive Architecture Review',
          description: 'WebRTC & SFU Scalability Testing',
          settings: {
            allowScreenShare: true,
            muteOnJoin: false,
            aiTranscriptionEnabled: true
          }
        })
      });
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.code, 'Meeting code should be generated');
      assert.equal(body.data.title, 'Executive Architecture Review');
      testMeetingCode = body.data.code;
    });

    await t.test('5. Get meeting details by code', async () => {
      const res = await fetch(`${SERVER_URL}/api/meetings/${testMeetingCode}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.code, testMeetingCode);
    });

    await t.test('6. Save meeting recording details', async () => {
      const res = await fetch(`${SERVER_URL}/api/meetings/${testMeetingCode}/recording`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          recordingUrl: 'blob:intellmeet-recording-sample',
          durationMinutes: 12
        })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.isRecorded, true);
      assert.equal(body.data.durationMinutes, 12);
    });

    await t.test('7. End meeting and trigger AI summary with actual transcript', async () => {
      const realisticTranscript = [
        { speaker: 'Alice Chen', text: 'Good morning everyone. Today we need to decide on our deployment architecture for Version 2.', timestamp: '10:00:00 AM' },
        { speaker: 'Bob Smith', text: 'I recommend we deploy the new authentication microservice using Docker and Kubernetes.', timestamp: '10:00:45 AM' },
        { speaker: 'Carol Danvers', text: 'Agreed, we will proceed with Kubernetes. What is our deadline for the migration?', timestamp: '10:01:20 AM' },
        { speaker: 'Alice Chen', text: 'We agreed the migration deadline is Friday at 5 PM. Bob, will you finish the database scripts?', timestamp: '10:01:50 AM' },
        { speaker: 'Bob Smith', text: 'Yes, I will finalize the database migration scripts by Thursday.', timestamp: '10:02:15 AM' }
      ];

      const res = await fetch(`${SERVER_URL}/api/meetings/${testMeetingCode}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          transcript: realisticTranscript
        })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.status, 'ended');
      assert.ok(body.data.summary, 'Summary should be generated');
      assert.ok(body.data.summary.length > 20, 'Summary should be substantial');
      assert.ok(Array.isArray(body.data.keyTakeaways), 'keyTakeaways should be an array');
      assert.ok(body.data.keyTakeaways.length > 0, 'keyTakeaways should have points');
      assert.ok(Array.isArray(body.data.actionItems), 'actionItems should be an array');
      assert.ok(body.data.actionItems.length > 0, 'actionItems should have items');
      assert.ok(Array.isArray(body.data.topicsBreakdown), 'topicsBreakdown should be an array');
      assert.ok(Array.isArray(body.data.personWiseSummary), 'personWiseSummary should be an array');

      // Verify that fetching the meeting returns the saved summary
      const getRes = await fetch(`${SERVER_URL}/api/meetings/${testMeetingCode}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert.equal(getRes.status, 200);
      const getBody = await getRes.json();
      assert.equal(getBody.data.summary, body.data.summary, 'Summary must be persisted in database');
    });

    await t.test('8. Retrieve user tasks (Kanban)', async () => {
      const res = await fetch(`${SERVER_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
    });

    await t.test('9. AI Speech Translation endpoint translates text into target languages', async () => {
      const res = await fetch(`${SERVER_URL}/api/ai/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          text: 'Good morning everyone, let us start the meeting.',
          targetLanguage: 'es'
        })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.targetLanguage, 'es');
      assert.ok(body.data.translatedText, 'Should return translated text');
    });

    await t.test('9b. AI Live Topic Detection endpoint returns detected topic and summary', async () => {
      const res = await fetch(`${SERVER_URL}/api/ai/detect-topic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          recentTurns: [
            { speaker: 'Alice', text: 'Let us discuss our cloud deployment budget and AWS hosting.' },
            { speaker: 'Bob', text: 'The AWS budget needs to cover our multi-region Kubernetes cluster.' }
          ],
          title: 'Cloud Budget Review'
        })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.topic, 'Topic name should be returned');
      assert.ok(body.data.summary, 'Topic summary should be returned');
      assert.ok(Array.isArray(body.data.contributors), 'Contributors should be an array');
    });

    await t.test('10. AI summary returns accurate empty state when no transcript was recorded', async () => {
      const res = await fetch(`${SERVER_URL}/api/ai/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          transcript: [],
          title: 'Empty Meeting'
        })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.summary.includes('No spoken transcript'), 'Must not generate fake summary');
      assert.equal(body.data.actionItems.length, 0, 'Action items must be empty when no conversation exists');
    });
  });

  await suite.test('Part 2: Real-Time WebRTC Signaling, Screen Share & Host Controls', async (t) => {
    const testRoomId = `socket-suite-${Date.now()}`;

    await t.test('1. Client 1 connects and joins room as Host', async () => {
      client1 = io(SERVER_URL, { transports: ['websocket'] });

      await new Promise((resolve) => {
        client1.on('connect', () => {
          client1.emit('join-room', {
            roomId: testRoomId,
            user: { _id: 'user-host-1', name: 'Host Alex', role: 'host' }
          });
        });

        client1.on('room-state', (state) => {
          assert.ok(state, 'Room state should be returned');
          assert.equal(state.settings.allowScreenShare, true);
          resolve();
        });
      });
    });

    await t.test('2. Client 2 connects, Client 1 receives user-connected notification', async () => {
      client2 = io(SERVER_URL, { transports: ['websocket'] });

      const connectedPromise = new Promise((resolve) => {
        client1.once('user-connected', (newUser) => {
          assert.equal(newUser.name, 'Participant Sarah');
          resolve();
        });
      });

      client2.emit('join-room', {
        roomId: testRoomId,
        user: { _id: 'user-participant-2', name: 'Participant Sarah', role: 'participant' }
      });

      await connectedPromise;
    });

    await t.test('3. Client 2 starts screen sharing, Client 1 receives screen-share-started event', async () => {
      const screenSharePromise = new Promise((resolve) => {
        client1.once('screen-share-started', (data) => {
          assert.equal(data.name, 'Participant Sarah');
          assert.equal(data.socketId, client2.id);
          resolve();
        });
      });

      client2.emit('start-screen-share', { roomId: testRoomId });
      await screenSharePromise;
    });

    await t.test('4. Client 2 stops screen sharing, Client 1 receives screen-share-stopped event', async () => {
      const stopPromise = new Promise((resolve) => {
        client1.once('screen-share-stopped', (data) => {
          assert.equal(data.socketId, client2.id);
          resolve();
        });
      });

      client2.emit('stop-screen-share', { roomId: testRoomId });
      await stopPromise;
    });

    await t.test('5. Host mutes Client 2, Client 2 receives force-mute command', async () => {
      const forceMutePromise = new Promise((resolve) => {
        client2.once('force-mute', (data) => {
          assert.ok(data, 'Force mute payload should be received');
          resolve();
        });
      });

      client1.emit('host-mute-user', {
        roomId: testRoomId,
        targetSocketId: client2.id
      });

      await forceMutePromise;
    });

    await t.test('5b. Live Speech Transcription broadcasts transcript-update to room', async () => {
      const transcriptPromise = new Promise((resolve) => {
        client1.once('transcript-update', (data) => {
          assert.equal(data.speaker, 'Participant Sarah');
          assert.equal(data.text, 'We are verifying the live speech transcription engine.');
          resolve();
        });
      });

      client2.emit('live-transcript', {
        roomId: testRoomId,
        item: {
          speaker: 'Participant Sarah',
          text: 'We are verifying the live speech transcription engine.'
        }
      });

      await transcriptPromise;
    });

    await t.test('5c. Live AI Translation broadcasts translation-update to room', async () => {
      const translationPromise = new Promise((resolve) => {
        client1.once('translation-update', (data) => {
          assert.equal(data.speaker, 'Participant Sarah');
          assert.equal(data.targetLanguage, 'es');
          assert.ok(data.translatedText.length > 0);
          resolve();
        });
      });

      client2.emit('live-translation', {
        roomId: testRoomId,
        item: {
          speaker: 'Participant Sarah',
          originalText: 'Hello everyone',
          translatedText: 'Hola a todos',
          targetLanguage: 'es'
        }
      });

      await translationPromise;
    });

    await t.test('6. Host kicks Client 2, Client 2 receives kicked-from-meeting notification', async () => {
      const kickPromise = new Promise((resolve) => {
        client2.once('kicked-from-meeting', (data) => {
          assert.ok(data.reason.includes('host'));
          resolve();
        });
      });

      client1.emit('host-kick-user', {
        roomId: testRoomId,
        targetSocketId: client2.id
      });

      await kickPromise;
    });
  });

  suite.after(() => {
    if (client1) client1.disconnect();
    if (client2) client2.disconnect();
    setTimeout(() => {
      process.exit(0);
    }, 200);
  });
});
