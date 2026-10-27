import test from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { app, server } from '../server.js';

test('IntellMeet Complete Enterprise Test Suite', async (suite) => {
  const SERVER_URL = 'http://localhost:5000';
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

    await t.test('7. End meeting and trigger summary', async () => {
      const res = await fetch(`${SERVER_URL}/api/meetings/${testMeetingCode}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.status, 'ended');
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
