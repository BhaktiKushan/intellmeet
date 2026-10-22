import Meeting from '../models/Meeting.js';

export const setupSocketIO = (io) => {
  // Store active rooms in-memory for instant lookups
  const rooms = new Map(); // roomId -> Map(socketId -> userData)

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join a meeting room
    socket.on('join-room', async ({ roomId, user }) => {
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }

      const roomUsers = rooms.get(roomId);
      const participantData = {
        socketId: socket.id,
        id: user?._id || user?.id || socket.id,
        name: user?.name || `Guest-${socket.id.slice(0, 4)}`,
        avatar: user?.avatar || '',
        role: user?.role || 'participant',
        isAudioMuted: false,
        isVideoOff: false,
        isHandRaised: false
      };

      roomUsers.set(socket.id, participantData);
      socket.roomId = roomId;

      // Send existing participants in the room to the new user
      const existingParticipants = Array.from(roomUsers.values()).filter(p => p.socketId !== socket.id);
      socket.emit('all-users', existingParticipants);

      // Notify other participants in the room
      socket.to(roomId).emit('user-connected', participantData);
      console.log(`[Socket] User ${participantData.name} (${socket.id}) joined room: ${roomId}`);

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
              role: meeting.host.toString() === user._id.toString() ? 'host' : 'participant',
              joinedAt: new Date()
            });
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
      const roomUsers = rooms.get(roomId);
      if (roomUsers && roomUsers.has(socket.id)) {
        const user = roomUsers.get(socket.id);
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
      const roomUsers = rooms.get(roomId);
      if (roomUsers && roomUsers.has(socket.id)) {
        const user = roomUsers.get(socket.id);
        user.isHandRaised = raised;
      }
      io.to(roomId).emit('user-hand-toggled', {
        socketId: socket.id,
        raised
      });
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
      const transcriptItem = {
        speaker: item.speaker || 'Speaker',
        userId: item.userId,
        text: item.text,
        timestamp: item.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      // Broadcast live caption banner to all peers in the room
      io.to(roomId).emit('transcript-update', transcriptItem);

      // Persist in Meeting transcript array
      try {
        await Meeting.findOneAndUpdate(
          { code: roomId },
          {
            $push: { transcript: transcriptItem }
          }
        );
      } catch (err) {
        // Non-fatal
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
      const roomUsers = rooms.get(roomId);
      const participant = roomUsers.get(socket.id);
      roomUsers.delete(socket.id);

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
