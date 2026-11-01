import Meeting from '../models/Meeting.js';
import { detectLiveTopic, askAiAssistant, transcribeAudio } from './aiService.js';

export const setupSocketIO = (io) => {
  // Store active rooms in-memory: roomId -> { users: Map, hostSocketId, presenter, settings, recording }
  const rooms = new Map();

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join a meeting room
    socket.on('join-room', async ({ roomId, user }) => {
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Map(),
          hostSocketId: socket.id,
          presenter: null,
          settings: {
            allowScreenShare: true,
            muteOnJoin: false
          },
          recording: {
            isRecording: false,
            recordedBy: null
          }
        });
      }

      const room = rooms.get(roomId);
      const roomUsers = room.users;

      // Determine if user is host from DB or first in room
      let isHost = false;
      try {
        const meeting = await Meeting.findOne({ code: roomId });
        if (meeting && user?._id) {
          isHost = meeting.host.toString() === user._id.toString();
          if (meeting.settings) {
            room.settings.allowScreenShare = meeting.settings.allowScreenShare !== false;
            room.settings.muteOnJoin = !!meeting.settings.muteOnJoin;
          }
        }
      } catch (err) {
        console.warn('[Socket] Meeting lookup note:', err.message);
      }

      // If user is designated host or first user in empty room
      if (isHost || roomUsers.size === 0) {
        room.hostSocketId = socket.id;
        isHost = true;
      }

      const participantData = {
        socketId: socket.id,
        id: user?._id || user?.id || socket.id,
        name: user?.name || `Guest-${socket.id.slice(0, 4)}`,
        avatar: user?.avatar || '',
        role: isHost ? 'host' : (user?.role || 'participant'),
        isAudioMuted: user?.isAudioMuted !== undefined ? user.isAudioMuted : (room.settings.muteOnJoin && !isHost),
        isVideoOff: user?.isVideoOff !== undefined ? user.isVideoOff : false,
        isHandRaised: false,
        isSpeaking: false,
        joinedAt: new Date().toISOString()
      };

      roomUsers.set(socket.id, participantData);
      socket.roomId = roomId;
      socket.userRole = participantData.role;

      // Send existing participants & room state to the new user
      const existingParticipants = Array.from(roomUsers.values()).filter(p => p.socketId !== socket.id);
      socket.emit('all-users', existingParticipants);

      // Send initial room state (presenter, host, recording, settings)
      socket.emit('room-state', {
        hostSocketId: room.hostSocketId,
        presenter: room.presenter,
        recording: room.recording,
        settings: room.settings
      });

      if (room.currentTopic) {
        socket.emit('topic-detected', room.currentTopic);
      }

      // Notify other participants in the room
      socket.to(roomId).emit('user-connected', participantData);
      console.log(`[Socket] User ${participantData.name} (${socket.id}, role: ${participantData.role}) joined room: ${roomId}`);

      // Try updating meeting in database if it exists
      try {
        const meeting = await Meeting.findOne({ code: roomId });
        if (meeting && user?._id) {
          const alreadyIn = meeting.participants.some(p => p.user && p.user.toString() === user._id.toString());
          if (!alreadyIn) {
            meeting.participants.push({
              user: user._id,
              name: participantData.name,
              email: user.email || '',
              avatar: participantData.avatar,
              role: isHost ? 'host' : 'participant',
              joinedAt: new Date()
            });
            if (meeting.status === 'scheduled') {
              meeting.status = 'live';
              meeting.startedAt = meeting.startedAt || new Date();
            }
            await meeting.save();
          }
        }
      } catch (err) {
        console.warn('[Socket] Meeting participant DB sync warning:', err.message);
      }
    });

    // WebRTC Signaling: Offer
    socket.on('offer', ({ targetSocketId, callerSocketId, sdp }) => {
      io.to(targetSocketId).emit('offer', {
        callerSocketId: callerSocketId || socket.id,
        sdp
      });
    });

    // WebRTC Signaling: Answer
    socket.on('answer', ({ targetSocketId, callerSocketId, sdp }) => {
      io.to(targetSocketId).emit('answer', {
        callerSocketId: callerSocketId || socket.id,
        sdp
      });
    });

    // WebRTC Signaling: ICE Candidate
    socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('ice-candidate', {
        callerSocketId: socket.id,
        candidate
      });
    });

    // Media Controls: Audio / Video toggle
    socket.on('toggle-media', ({ roomId, type, enabled }) => {
      const room = rooms.get(roomId);
      if (room && room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        if (type === 'audio') user.isAudioMuted = !enabled;
        if (type === 'video') user.isVideoOff = !enabled;
      }
      socket.to(roomId).emit('user-media-toggled', {
        socketId: socket.id,
        type,
        enabled
      });
    });

    // Hand raise toggle
    socket.on('toggle-hand', ({ roomId, raised }) => {
      const room = rooms.get(roomId);
      if (room && room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        user.isHandRaised = raised;
      }
      io.to(roomId).emit('user-hand-toggled', {
        socketId: socket.id,
        raised
      });
    });

    // Active Speaker detection toggle
    socket.on('speaking-state', ({ roomId, isSpeaking }) => {
      const room = rooms.get(roomId);
      if (room && room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        user.isSpeaking = isSpeaking;
      }
      socket.to(roomId).emit('user-speaking', {
        socketId: socket.id,
        isSpeaking
      });
    });

    // Screen Sharing: Start presentation
    socket.on('start-screen-share', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const user = room.users.get(socket.id);
      const isHost = socket.id === room.hostSocketId || user?.role === 'host';

      // Enforce host permissions on screen sharing
      if (!room.settings.allowScreenShare && !isHost) {
        socket.emit('screen-share-denied', { message: 'Screen sharing has been disabled by the meeting host.' });
        return;
      }

      room.presenter = {
        socketId: socket.id,
        name: user?.name || 'Participant'
      };

      io.to(roomId).emit('screen-share-started', {
        socketId: socket.id,
        name: room.presenter.name
      });
      console.log(`[Socket] Screen share started by ${room.presenter.name} (${socket.id}) in ${roomId}`);
    });

    // Screen Sharing: Stop presentation
    socket.on('stop-screen-share', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room && room.presenter && room.presenter.socketId === socket.id) {
        room.presenter = null;
        io.to(roomId).emit('screen-share-stopped', {
          socketId: socket.id
        });
        console.log(`[Socket] Screen share stopped in ${roomId}`);
      }
    });

    // Host Controls: Mute a specific participant
    socket.on('host-mute-user', ({ roomId, targetSocketId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const sender = room.users.get(socket.id);
      const isAuthorizedHost = socket.id === room.hostSocketId || sender?.role === 'host';

      if (!isAuthorizedHost) {
        socket.emit('host-action-error', { message: 'Permission denied. Only the meeting host can mute participants.' });
        return;
      }

      if (room.users.has(targetSocketId)) {
        const target = room.users.get(targetSocketId);
        target.isAudioMuted = true;

        // Command the target client to mute audio track
        io.to(targetSocketId).emit('force-mute', { by: sender?.name || 'Host' });
        // Broadcast to all participants
        io.to(roomId).emit('user-media-toggled', {
          socketId: targetSocketId,
          type: 'audio',
          enabled: false
        });
        console.log(`[Socket] Host ${socket.id} muted participant ${targetSocketId} in ${roomId}`);
      }
    });

    // Host Controls: Mute ALL participants
    socket.on('host-mute-all', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const sender = room.users.get(socket.id);
      const isAuthorizedHost = socket.id === room.hostSocketId || sender?.role === 'host';

      if (!isAuthorizedHost) {
        socket.emit('host-action-error', { message: 'Permission denied. Only host can mute all participants.' });
        return;
      }

      room.users.forEach((u, sId) => {
        if (sId !== socket.id) {
          u.isAudioMuted = true;
          io.to(sId).emit('force-mute', { by: sender?.name || 'Host' });
          io.to(roomId).emit('user-media-toggled', {
            socketId: sId,
            type: 'audio',
            enabled: false
          });
        }
      });
      console.log(`[Socket] Host ${socket.id} muted all in ${roomId}`);
    });

    // Host Controls: Remove / Kick a participant
    socket.on('host-kick-user', ({ roomId, targetSocketId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const sender = room.users.get(socket.id);
      const isAuthorizedHost = socket.id === room.hostSocketId || sender?.role === 'host';

      if (!isAuthorizedHost) {
        socket.emit('host-action-error', { message: 'Permission denied. Only the host can remove participants.' });
        return;
      }

      if (room.users.has(targetSocketId)) {
        const target = room.users.get(targetSocketId);
        room.users.delete(targetSocketId);

        // Tell target they were removed
        io.to(targetSocketId).emit('kicked-from-meeting', {
          reason: 'You were removed from the meeting by the host.'
        });

        // Notify room
        io.to(roomId).emit('user-disconnected', {
          socketId: targetSocketId,
          participant: target,
          reason: 'kicked'
        });
        console.log(`[Socket] Host ${socket.id} removed participant ${targetSocketId} from ${roomId}`);
      }
    });

    // Host Controls: Toggle Room Screen Share Permission
    socket.on('host-toggle-screen-share-permission', ({ roomId, allowScreenShare }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const sender = room.users.get(socket.id);
      const isAuthorizedHost = socket.id === room.hostSocketId || sender?.role === 'host';

      if (!isAuthorizedHost) {
        socket.emit('host-action-error', { message: 'Permission denied. Host only.' });
        return;
      }

      room.settings.allowScreenShare = !!allowScreenShare;
      io.to(roomId).emit('meeting-settings-updated', room.settings);
      console.log(`[Socket] Screen share permission in ${roomId} set to: ${allowScreenShare}`);
    });

    // Recording status sync
    socket.on('recording-status', ({ roomId, isRecording, mode }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const user = room.users.get(socket.id);
      room.recording = {
        isRecording: !!isRecording,
        recordedBy: isRecording ? (user?.name || 'A participant') : null,
        mode: mode || 'composite'
      };

      io.to(roomId).emit('recording-status-changed', room.recording);
      console.log(`[Socket] Recording status in ${roomId}:`, room.recording);
    });

    // In-Meeting Chat
    socket.on('send-chat', async ({ roomId, message }) => {
      const chatItem = {
        id: message.id || `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        sender: message.sender || 'Anonymous',
        senderId: message.senderId,
        avatar: message.avatar || '',
        text: message.text,
        timestamp: new Date().toISOString()
      };

      // Broadcast to everyone in room including sender
      io.to(roomId).emit('receive-chat', chatItem);

      // Persist in meeting record if available
      try {
        await Meeting.findOneAndUpdate(
          { code: roomId },
          {
            $push: {
              chatMessages: {
                sender: chatItem.sender,
                senderId: chatItem.senderId,
                avatar: chatItem.avatar,
                text: chatItem.text,
                timestamp: new Date()
              }
            }
          }
        );
      } catch (e) {
        // Silently skip if meeting not yet saved
      }
    });

    // Typing indicator
    socket.on('typing', ({ roomId, user, isTyping }) => {
      socket.to(roomId).emit('user-typing', { user, isTyping });
    });

    // Real-Time Live Speech Transcription
    socket.on('live-transcript', async ({ roomId, item }) => {
      if (!item || !item.text) return;
      const room = rooms.get(roomId);
      const sender = room?.users.get(socket.id);

      // 1. Authoritative Speaker Verification & Identification
      let verifiedSpeaker = 'Unknown Speaker';
      let verifiedUserId = null;

      if (sender) {
        // Prevent acoustic bleed: if sender is marked muted, reject speech emitted from their socket
        if (sender.isAudioMuted) {
          console.log(`[Socket] Dropping transcript from muted participant ${sender.name} (${socket.id})`);
          return;
        }
        verifiedSpeaker = sender.name || item.speaker || 'Unknown Speaker';
        verifiedUserId = sender.id || sender.userId || item.userId || null;
      } else if (item.speaker && item.speaker !== 'Speaker' && item.speaker !== 'You' && item.speaker !== 'Host') {
        verifiedSpeaker = item.speaker;
        verifiedUserId = item.userId || null;
      }

      // Never allow generic fallback placeholders
      if (verifiedSpeaker === 'Speaker' || verifiedSpeaker === 'Host' || verifiedSpeaker === 'You') {
        verifiedSpeaker = 'Unknown Speaker';
      }

      const rawText = (item.text || '').trim();
      if (!rawText) return;

      const isFinal = item.isFinal !== false;
      const segmentId = item.segmentId || `seg-${verifiedUserId || socket.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // 2. Server-side Deduplication:
      // Drop repeated final sentences within 4 seconds from same speaker/socket
      if (room && isFinal) {
        room.seenSegments = room.seenSegments || new Map();
        const dedupKey = item.segmentId || `${verifiedUserId || socket.id}:${rawText.toLowerCase()}`;
        const now = Date.now();
        const lastSeen = room.seenSegments.get(dedupKey);
        if (lastSeen && (now - lastSeen < 4000)) {
          console.log(`[Socket] Dropping duplicate final segment [${dedupKey}]`);
          return;
        }
        room.seenSegments.set(dedupKey, now);

        // Prune old deduplication keys
        if (room.seenSegments.size > 200) {
          for (const [k, time] of room.seenSegments.entries()) {
            if (now - time > 15000) room.seenSegments.delete(k);
          }
        }
      }

      const transcriptItem = {
        segmentId,
        speaker: verifiedSpeaker,
        userId: verifiedUserId,
        participantId: verifiedUserId || socket.id,
        text: rawText,
        translation: (item.translation || '').trim(),
        targetLanguage: item.targetLanguage || '',
        timestamp: item.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isFinal
      };

      // 3. Broadcast to all peers in the room
      io.to(roomId).emit('transcript-update', transcriptItem);

      // 4. Update sliding window for Real-Time Topic Detection (finalized turns only)
      if (room && isFinal) {
        room.recentTranscript = room.recentTranscript || [];
        room.recentTranscript.push(transcriptItem);
        if (room.recentTranscript.length > 25) room.recentTranscript.shift();

        // Trigger topic detection on 3+ turns or every 2 new turns
        if (room.recentTranscript.length >= 3 && (room.recentTranscript.length % 2 === 1 || !room.currentTopic)) {
          detectLiveTopic(room.recentTranscript, room.title || 'Team Meeting')
            .then(topicData => {
              if (topicData && topicData.topic) {
                room.currentTopic = topicData;
                io.to(roomId).emit('topic-detected', topicData);
                Meeting.findOneAndUpdate(
                  { code: roomId },
                  {
                    $push: {
                      liveTopicTimeline: {
                        topic: topicData.topic,
                        keyPoints: (topicData.contributors || []).map(c => `${c.speaker}: ${c.point}`),
                        activeSpeaker: transcriptItem.speaker
                      }
                    }
                  }
                ).catch(() => {});
              }
            })
            .catch(err => console.warn('[Socket] Topic detection note:', err.message));
        }
      }

      // 5. Database Persistence: ONLY final segments, never duplicate
      if (isFinal) {
        try {
          await Meeting.findOneAndUpdate(
            { 
              code: roomId,
              'transcript.segmentId': { $ne: segmentId }
            },
            {
              $push: { transcript: transcriptItem }
            }
          );
        } catch (err) {
          console.warn('[Socket] Transcript persistence notice:', err.message);
        }
      }
    });

    // Real-Time Live Speech AI Translation
    socket.on('live-translation', async ({ roomId, item }) => {
      if (!item || (!item.translatedText && !item.translation)) return;
      const translationText = (item.translatedText || item.translation || '').trim();
      if (!translationText) return;

      const room = rooms.get(roomId);
      const sender = room?.users.get(socket.id);
      const verifiedSpeaker = sender?.name || item.speaker || 'Unknown Speaker';

      const translationItem = {
        segmentId: item.segmentId,
        speaker: verifiedSpeaker,
        userId: sender?.id || item.userId || null,
        originalText: (item.originalText || item.text || '').trim(),
        translatedText: translationText,
        targetLanguage: item.targetLanguage || 'en',
        timestamp: item.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      // Broadcast translated subtitle to all peers in the room
      io.to(roomId).emit('translation-update', translationItem);

      // Persist / update in Meeting document
      try {
        if (translationItem.segmentId) {
          await Meeting.findOneAndUpdate(
            { code: roomId, 'transcript.segmentId': translationItem.segmentId },
            {
              $set: {
                'transcript.$.translation': translationText,
                'transcript.$.targetLanguage': translationItem.targetLanguage
              }
            }
          );
        } else {
          await Meeting.findOneAndUpdate(
            { code: roomId },
            {
              $push: { translatedTranscript: translationItem }
            }
          );
        }
      } catch (err) {
        console.warn('[Socket] Translation persistence notice:', err.message);
      }
    });

    // Real-Time Mobile & Cross-Device Audio Speech Processing (Cross-Device AI Assistant)
    socket.on('mobile-audio-speech', async ({ roomId, audioBase64, mimeType, speaker, userId }) => {
      if (!audioBase64) return;
      const room = rooms.get(roomId);
      const sender = room?.users.get(socket.id);
      if (sender) sender.isAudioMuted = false;

      const verifiedSpeaker = sender?.name || speaker || 'Participant';
      try {
        const text = await transcribeAudio(audioBase64, mimeType);
        if (text && text.trim().length > 1) {
          const segmentId = `seg-mobile-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          const transcriptItem = {
            segmentId,
            speaker: verifiedSpeaker,
            userId: sender?.id || userId || null,
            participantId: sender?.id || socket.id,
            text: text.trim(),
            timestamp,
            isFinal: true
          };

          // Broadcast to all peers in the room
          io.to(roomId).emit('transcript-update', transcriptItem);

          // Update recent transcript for live topic detection & in-meeting AI assistant
          if (room) {
            room.recentTranscript = room.recentTranscript || [];
            room.recentTranscript.push(transcriptItem);
            if (room.recentTranscript.length > 25) room.recentTranscript.shift();

            if (room.recentTranscript.length >= 3 && (room.recentTranscript.length % 2 === 1 || !room.currentTopic)) {
              detectLiveTopic(room.recentTranscript, room.title || 'Team Meeting')
                .then(topicData => {
                  if (topicData && topicData.topic) {
                    room.currentTopic = topicData;
                    io.to(roomId).emit('topic-detected', topicData);
                  }
                })
                .catch(err => console.warn('[Socket] Topic detection note:', err.message));
            }
          }

          // Persist in MongoDB
          await Meeting.findOneAndUpdate(
            { code: roomId },
            {
              $push: { transcript: transcriptItem }
            }
          ).catch(err => console.warn('[Socket] Meeting transcript persist warning:', err.message));
        }
      } catch (err) {
        console.warn('[Socket] Mobile audio speech error:', err.message);
      }
    });

    // In-Meeting Real-time AI Assistant Query
    socket.on('ask-ai-assistant', async ({ roomId, question }) => {
      if (!question || !question.trim()) return;
      const room = rooms.get(roomId);
      try {
        const answer = await askAiAssistant(question, {
          transcript: room?.recentTranscript || [],
          liveTopic: room?.currentTopic || null
        }, room?.title || 'Team Meeting');
        socket.emit('ai-assistant-response', { question, answer, timestamp: new Date().toISOString() });
      } catch (err) {
        socket.emit('ai-assistant-response', { question, answer: 'AI Assistant temporarily unavailable. Please try again.', error: true });
      }
    });

    // Real-time Collaborative Whiteboard / Shared Notes Sync
    socket.on('whiteboard-draw', ({ roomId, drawData }) => {
      socket.to(roomId).emit('whiteboard-draw', drawData);
    });

    socket.on('whiteboard-clear', ({ roomId }) => {
      socket.to(roomId).emit('whiteboard-clear');
    });

    // Leave room
    socket.on('leave-room', () => {
      handleDisconnect(socket);
    });

    // Disconnect
    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });
  });

  const handleDisconnect = (socket) => {
    const roomId = socket.roomId;
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const roomUsers = room.users;
      const participant = roomUsers.get(socket.id);
      roomUsers.delete(socket.id);

      // If disconnected user was presenter, clear presenter & notify room
      if (room.presenter && room.presenter.socketId === socket.id) {
        room.presenter = null;
        io.to(roomId).emit('screen-share-stopped', { socketId: socket.id });
      }

      // If disconnected user was host, reassign host if participants remain
      if (room.hostSocketId === socket.id && roomUsers.size > 0) {
        const nextHost = roomUsers.values().next().value;
        if (nextHost) {
          room.hostSocketId = nextHost.socketId;
          nextHost.role = 'host';
          io.to(roomId).emit('host-changed', {
            newHostSocketId: nextHost.socketId,
            newHostName: nextHost.name
          });
        }
      }

      io.to(roomId).emit('user-disconnected', {
        socketId: socket.id,
        participant
      });

      if (roomUsers.size === 0) {
        rooms.delete(roomId);
      }
      console.log(`[Socket] User ${socket.id} left room: ${roomId}`);
    }
  };
};

