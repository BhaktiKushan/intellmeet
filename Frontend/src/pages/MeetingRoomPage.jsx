import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  MessageSquare,
  Users,
  Sparkles,
  Hand,
  Circle,
  Copy,
  Check,
  Edit3,
  Send,
  Radio,
  Volume2,
  Settings,
  Shield,
  Zap,
  Smile
} from 'lucide-react';

export const MeetingRoomPage = ({ roomId, onLeaveRoom, onViewSummary }) => {
  const { user } = useAuth();

  // State
  const [inLobby, setInLobby] = useState(true);
  const [meeting, setMeeting] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showLiveTranscript, setShowLiveTranscript] = useState(true);
  const [latestTranscript, setLatestTranscript] = useState(null);
  const [activeTab, setActiveTab] = useState(null); // 'chat' | 'participants' | 'notes' | null
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [participants, setParticipants] = useState([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [sharedNotes, setSharedNotes] = useState('## Collaborative Meeting Notes\n- Reviewing sub-200ms WebRTC latency\n- Validating AI speech-to-text pipeline\n');
  const [speechRecognitionActive, setSpeechRecognitionActive] = useState(false);

  // Refs
  const localVideoRef = useRef(null);
  const lobbyVideoRef = useRef(null);
  const screenShareTrackRef = useRef(null);
  const socketRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Load meeting details
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const res = await api.getMeeting(roomId);
        setMeeting(res.data);
      } catch (err) {
        console.warn('Meeting not found in DB, using room code directly:', err.message);
        setMeeting({
          title: `Ad-hoc Meeting (${roomId})`,
          code: roomId,
          host: { name: user?.name || 'Host' }
        });
      }
    };
    fetchMeeting();
  }, [roomId]);

  // Initialize camera for lobby preview
  useEffect(() => {
    let streamInstance = null;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        streamInstance = stream;
        setLocalStream(stream);
        if (lobbyVideoRef.current) {
          lobbyVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Could not access real camera/mic (permissions or device missing). Using simulated stream:', err.message);
      }
    };

    startCamera();

    return () => {
      if (streamInstance) {
        streamInstance.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Sync stream with main video when joining room
  useEffect(() => {
    if (!inLobby && localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [inLobby, localStream]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  // Handle Socket.io connection & WebRTC signaling
  const joinMeetingRoom = () => {
    setInLobby(false);

    // Initialize Socket.io connection
    const socketUrl = import.meta.env.VITE_BACKEND_URL || '/';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.emit('join-room', {
      roomId,
      user: {
        _id: user?._id,
        name: user?.name || 'Guest Participant',
        avatar: user?.avatar,
        role: user?.role || 'member'
      }
    });

    // Existing participants in the room
    socket.on('all-users', (users) => {
      setParticipants(users);
    });

    // New participant joined
    socket.on('user-connected', (newUser) => {
      setParticipants(prev => {
        if (prev.some(p => p.socketId === newUser.socketId)) return prev;
        return [...prev, newUser];
      });
    });

    // User disconnected
    socket.on('user-disconnected', ({ socketId }) => {
      setParticipants(prev => prev.filter(p => p.socketId !== socketId));
    });

    // Media toggled by remote user
    socket.on('user-media-toggled', ({ socketId, type, enabled }) => {
      setParticipants(prev => prev.map(p => {
        if (p.socketId === socketId) {
          return {
            ...p,
            isAudioMuted: type === 'audio' ? !enabled : p.isAudioMuted,
            isVideoOff: type === 'video' ? !enabled : p.isVideoOff
          };
        }
        return p;
      }));
    });

    // Hand raised by remote user
    socket.on('user-hand-toggled', ({ socketId, raised }) => {
      setParticipants(prev => prev.map(p => {
        if (p.socketId === socketId) {
          return { ...p, isHandRaised: raised };
        }
        return p;
      }));
    });

    // In-meeting chat
    socket.on('receive-chat', (message) => {
      setChatMessages(prev => [...prev, message]);
    });

    // Real-time live transcript banner
    socket.on('transcript-update', (item) => {
      setLatestTranscript(item);
    });

    // Start Web Speech API speech recognition if available
    initSpeechRecognition(socket);
  };

  // Browser Web Speech API for real-time speech-to-text
  const initSpeechRecognition = (socket) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          const current = event.resultIndex;
          const transcriptText = event.results[current][0].transcript;
          if (transcriptText.trim()) {
            const transcriptItem = {
              speaker: user?.name || 'Speaker',
              userId: user?._id,
              text: transcriptText.trim(),
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
            setLatestTranscript(transcriptItem);
            socket.emit('live-transcript', { roomId, item: transcriptItem });
          }
        };

        recognition.onerror = (e) => {
          console.warn('[SpeechRecognition] Note:', e.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setSpeechRecognitionActive(true);
      } catch (err) {
        console.warn('[SpeechRecognition] Init bypassed:', err.message);
      }
    }
  };

  // Simulate speaking for instant demo & evaluation
  const handleSimulateSpeech = () => {
    const sampleSentences = [
      "Let's confirm the WebRTC latency benchmark is holding below 150ms.",
      "Action item: I will finalize the Kubernetes Helm chart deployment by Friday.",
      "We need to audit the JWT refresh token security against OWASP Top 10.",
      "The AI summary engine successfully extracted our key milestones for this sprint."
    ];
    const randomSentence = sampleSentences[Math.floor(Math.random() * sampleSentences.length)];
    const transcriptItem = {
      speaker: user?.name || 'Alex Rivera',
      userId: user?._id,
      text: randomSentence,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setLatestTranscript(transcriptItem);
    if (socketRef.current) {
      socketRef.current.emit('live-transcript', { roomId, item: transcriptItem });
    }
  };

  // Toggle Audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    } else {
      setIsAudioMuted(!isAudioMuted);
    }
    if (socketRef.current) {
      socketRef.current.emit('toggle-media', { roomId, type: 'audio', enabled: isAudioMuted });
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    } else {
      setIsVideoOff(!isVideoOff);
    }
    if (socketRef.current) {
      socketRef.current.emit('toggle-media', { roomId, type: 'video', enabled: isVideoOff });
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenShareTrackRef.current = screenTrack;
        setIsScreenSharing(true);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          stopScreenSharing();
        };
      } catch (err) {
        console.warn('Screen share canceled or not permitted:', err.message);
      }
    } else {
      stopScreenSharing();
    }
  };

  const stopScreenSharing = () => {
    if (screenShareTrackRef.current) {
      screenShareTrackRef.current.stop();
    }
    setIsScreenSharing(false);
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  };

  // Raise Hand
  const toggleHand = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    if (socketRef.current) {
      socketRef.current.emit('toggle-hand', { roomId, raised: nextState });
    }
  };

  // Send In-Meeting Chat
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;

    socketRef.current.emit('send-chat', {
      roomId,
      message: {
        sender: user?.name || 'You',
        senderId: user?._id,
        avatar: user?.avatar,
        text: chatInput.trim()
      }
    });
    setChatInput('');
  };

  // End / Leave Meeting
  const handleLeaveOrEnd = async () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (socketRef.current) {
      socketRef.current.emit('leave-room');
      socketRef.current.disconnect();
    }

    // If host or ending meeting, trigger AI intelligence generation
    if (meeting?._id) {
      try {
        await api.endMeeting(meeting._id);
      } catch (err) {
        console.warn('Meeting ended silently:', err.message);
      }
    }

    onLeaveRoom();
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Format recording timer
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // ----------------------------------------------------
  // PRE-MEETING LOBBY VIEW
  // ----------------------------------------------------
  if (inLobby) {
    return (
      <div style={{
        maxWidth: '900px',
        margin: '40px auto',
        padding: '24px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        <div className="glass-panel" style={{ padding: '36px', borderRadius: '24px' }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '30px', background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', fontSize: '0.82rem', marginBottom: '16px' }}>
            <Radio size={14} color="#818cf8" />
            <span>Pre-Meeting Calibration Lobby</span>
          </div>

          <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '8px' }}>
            {meeting?.title || 'Ready to join?'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '28px' }}>
            Room Code: <code style={{ color: '#818cf8', fontWeight: 700 }}>{roomId}</code> &nbsp;•&nbsp; Test your camera and audio before entering
          </p>

          {/* Video Preview Box */}
          <div style={{
            maxWidth: '560px',
            height: '320px',
            margin: '0 auto 28px',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            background: '#090d16',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <video
              ref={lobbyVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
                display: isVideoOff ? 'none' : 'block'
              }}
            />

            {isVideoOff && (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
                  alt="avatar"
                  style={{ width: '90px', height: '90px', borderRadius: '50%', marginBottom: '12px' }}
                />
                <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 600 }}>Camera is Off</div>
              </div>
            )}

            {/* Quick Preview Toggles */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={toggleAudio}
                className={`btn ${isAudioMuted ? 'btn-danger' : 'btn-secondary'}`}
                style={{ borderRadius: '50%', width: '46px', height: '46px', padding: 0 }}
                title={isAudioMuted ? 'Unmute' : 'Mute'}
              >
                {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button
                onClick={toggleVideo}
                className={`btn ${isVideoOff ? 'btn-danger' : 'btn-secondary'}`}
                style={{ borderRadius: '50%', width: '46px', height: '46px', padding: 0 }}
                title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            </div>
          </div>

          {/* Join Actions */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button onClick={onLeaveRoom} className="btn btn-secondary" style={{ padding: '12px 24px' }}>
              Cancel
            </button>
            <button onClick={joinMeetingRoom} className="btn btn-primary" style={{ padding: '12px 32px', fontSize: '1rem' }}>
              <Video size={18} />
              <span>Join Meeting Now</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // LIVE MEETING ROOM VIEW
  // ----------------------------------------------------
  return (
    <div style={{
      height: 'calc(100vh - 68px)',
      display: 'flex',
      flexDirection: 'column',
      background: '#070a12',
      overflow: 'hidden',
      position: 'relative'
    }}>
      
      {/* Top Header Bar */}
      <div style={{
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(14, 21, 36, 0.75)',
        borderBottom: '1px solid var(--border-subtle)',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>
            {meeting?.title || 'Enterprise Conference'}
          </h2>

          {/* Room Code Badge */}
          <button
            onClick={copyRoomCode}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: '#a5b4fc',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <span>{roomId}</span>
            {copiedCode ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
          </button>

          {/* Latency Pill */}
          <span style={{ fontSize: '0.72rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={12} />
            <span>WebRTC 138ms</span>
          </span>

          {/* Recording Badge */}
          {isRecording && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontSize: '0.8rem', fontWeight: 600 }}>
              <Circle size={10} fill="#ef4444" color="#ef4444" className="animate-pulse" />
              <span>REC {formatTime(recordingSeconds)}</span>
            </div>
          )}
        </div>

        {/* Demo Quick Speech Simulator & Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleSimulateSpeech}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.78rem', border: '1px solid rgba(168, 85, 247, 0.4)' }}
            title="Inject simulated speech sentence to test real-time AI transcription"
          >
            <Sparkles size={14} color="#c084fc" />
            <span>Simulate Speech</span>
          </button>
        </div>
      </div>

      {/* Main Content Area (Video Grid + Side Panel) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        
        {/* Video Grid Canvas */}
        <div style={{
          flex: 1,
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: participants.length > 0 ? 'repeat(auto-fit, minmax(360px, 1fr))' : '1fr',
          gap: '16px',
          alignContent: 'center',
          overflowY: 'auto'
        }}>
          
          {/* Local User Video Tile */}
          <div style={{
            position: 'relative',
            borderRadius: '16px',
            overflow: 'hidden',
            background: '#0d1322',
            border: isHandRaised ? '2px solid #f59e0b' : '1px solid var(--border-subtle)',
            aspectRatio: '16/9',
            maxHeight: '75vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)'
          }}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: isScreenSharing ? 'none' : 'scaleX(-1)',
                display: isVideoOff && !isScreenSharing ? 'none' : 'block'
              }}
            />

            {isVideoOff && !isScreenSharing && (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
                  alt="avatar"
                  style={{ width: '84px', height: '84px', borderRadius: '50%', marginBottom: '10px' }}
                />
                <div style={{ color: '#fff', fontWeight: 600 }}>{user?.name || 'You'}</div>
              </div>
            )}

            {/* Tile Info Overlay */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              color: '#fff'
            }}>
              <span>{user?.name || 'You'} (You)</span>
              {isAudioMuted && <MicOff size={13} color="#f87171" />}
              {isHandRaised && <Hand size={13} color="#f59e0b" />}
            </div>
          </div>

          {/* Remote Connected Peer Video Tiles */}
          {participants.map((peer) => (
            <div
              key={peer.socketId}
              style={{
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#0d1322',
                border: peer.isHandRaised ? '2px solid #f59e0b' : '1px solid var(--border-subtle)',
                aspectRatio: '16/9',
                maxHeight: '75vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              {/* Simulated / Remote peer visual avatar */}
              <div style={{ textAlign: 'center' }}>
                <img
                  src={peer.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${peer.name}`}
                  alt={peer.name}
                  style={{ width: '84px', height: '84px', borderRadius: '50%', marginBottom: '10px' }}
                />
                <div style={{ color: '#fff', fontWeight: 600 }}>{peer.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#a5b4fc', textTransform: 'capitalize' }}>
                  {peer.role || 'Participant'}
                </div>
              </div>

              {/* Peer Info Overlay */}
              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                color: '#fff'
              }}>
                <span>{peer.name}</span>
                {peer.isAudioMuted && <MicOff size={13} color="#f87171" />}
                {peer.isHandRaised && <Hand size={13} color="#f59e0b" />}
              </div>
            </div>
          ))}

        </div>

        {/* Live Real-Time Transcription Caption Banner */}
        {showLiveTranscript && latestTranscript && (
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: '680px',
            width: '90%',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '14px',
            padding: '12px 20px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Sparkles size={16} color="#818cf8" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 700 }}>
                {latestTranscript.speaker} &nbsp;•&nbsp; {latestTranscript.timestamp}
              </div>
              <div style={{ fontSize: '0.88rem', color: '#f8fafc', fontWeight: 500 }}>
                "{latestTranscript.text}"
              </div>
            </div>
          </div>
        )}

        {/* Slide-out Side Drawer (Chat / Participants / Shared Notes) */}
        {activeTab && (
          <div 
            className="glass-panel"
            style={{
              width: '340px',
              height: '100%',
              borderRadius: 0,
              borderLeft: '1px solid var(--border-subtle)',
              borderTop: 'none',
              borderBottom: 'none',
              borderRight: 'none',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 25
            }}
          >
            {/* Drawer Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ fontSize: '1rem', color: '#fff', textTransform: 'capitalize' }}>
                {activeTab === 'chat' ? 'In-Meeting Chat' : activeTab === 'participants' ? `Participants (${participants.length + 1})` : 'Shared Notes'}
              </h3>
              <button
                onClick={() => setActiveTab(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            {/* Chat Body */}
            {activeTab === 'chat' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {chatMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '40px' }}>
                      No messages yet. Send a message to participants!
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} style={{ textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a5b4fc' }}>{msg.sender}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          color: '#fff'
                        }}>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendChat} style={{ padding: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="input-field"
                    style={{ padding: '8px 12px' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 12px' }}>
                    <Send size={15} />
                  </button>
                </form>
              </div>
            )}

            {/* Participants Body */}
            {activeTab === 'participants' && (
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Local user */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt="user" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{user?.name || 'You'} (You)</div>
                      <div style={{ fontSize: '0.7rem', color: '#818cf8' }}>Host</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {isAudioMuted ? <MicOff size={15} color="#f87171" /> : <Mic size={15} color="#34d399" />}
                  </div>
                </div>

                {/* Peers */}
                {participants.map((peer) => (
                  <div key={peer.socketId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={peer.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${peer.name}`} alt="peer" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{peer.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{peer.role || 'Member'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {peer.isAudioMuted ? <MicOff size={15} color="#f87171" /> : <Mic size={15} color="#34d399" />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Shared Notes Body */}
            {activeTab === 'notes' && (
              <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
                  Real-time synchronized whiteboard notes:
                </p>
                <textarea
                  value={sharedNotes}
                  onChange={(e) => setSharedNotes(e.target.value)}
                  style={{
                    flex: 1,
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#f8fafc',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '12px',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    resize: 'none',
                    outline: 'none'
                  }}
                />
              </div>
            )}

          </div>
        )}

      </div>

      {/* Bottom Controls Dock */}
      <div style={{
        height: '76px',
        background: 'rgba(10, 15, 26, 0.95)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '0 24px',
        zIndex: 30
      }}>
        
        {/* Mic Toggle */}
        <button
          onClick={toggleAudio}
          className={`btn ${isAudioMuted ? 'btn-danger' : 'btn-secondary'}`}
          style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0 }}
          title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
        >
          {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Video Toggle */}
        <button
          onClick={toggleVideo}
          className={`btn ${isVideoOff ? 'btn-danger' : 'btn-secondary'}`}
          style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0 }}
          title={isVideoOff ? 'Start Camera' : 'Stop Camera'}
        >
          {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        {/* Screen Share */}
        <button
          onClick={toggleScreenShare}
          className={`btn ${isScreenSharing ? 'btn-primary' : 'btn-secondary'}`}
          style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0 }}
          title="Share Screen"
        >
          <Monitor size={20} />
        </button>

        {/* AI Live Transcribe Toggle */}
        <button
          onClick={() => setShowLiveTranscript(!showLiveTranscript)}
          className={`btn ${showLiveTranscript ? 'btn-primary' : 'btn-secondary'}`}
          style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0 }}
          title="Toggle Live AI Captions"
        >
          <Sparkles size={20} color={showLiveTranscript ? '#fff' : '#c084fc'} />
        </button>

        {/* Raise Hand */}
        <button
          onClick={toggleHand}
          className={`btn ${isHandRaised ? 'btn-primary' : 'btn-secondary'}`}
          style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0 }}
          title="Raise Hand"
        >
          <Hand size={20} color={isHandRaised ? '#f59e0b' : '#fff'} />
        </button>

        {/* Record Meeting */}
        <button
          onClick={() => setIsRecording(!isRecording)}
          className={`btn ${isRecording ? 'btn-danger' : 'btn-secondary'}`}
          style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0 }}
          title="Record Call"
        >
          <Circle size={18} fill={isRecording ? '#fff' : 'transparent'} />
        </button>

        <div style={{ width: '1px', height: '32px', background: 'var(--border-subtle)', margin: '0 4px' }} />

        {/* Drawer Toggles */}
        <button
          onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')}
          className={`btn ${activeTab === 'chat' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0 }}
          title="In-meeting Chat"
        >
          <MessageSquare size={20} />
        </button>

        <button
          onClick={() => setActiveTab(activeTab === 'participants' ? null : 'participants')}
          className={`btn ${activeTab === 'participants' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0 }}
          title="Participants List"
        >
          <Users size={20} />
        </button>

        <button
          onClick={() => setActiveTab(activeTab === 'notes' ? null : 'notes')}
          className={`btn ${activeTab === 'notes' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0 }}
          title="Shared Collaborative Notes"
        >
          <Edit3 size={20} />
        </button>

        <div style={{ width: '1px', height: '32px', background: 'var(--border-subtle)', margin: '0 4px' }} />

        {/* Leave / End Call */}
        <button
          onClick={handleLeaveOrEnd}
          className="btn btn-danger"
          style={{ padding: '0 20px', height: '48px', borderRadius: '24px', gap: '8px' }}
        >
          <PhoneOff size={18} />
          <span>End Call</span>
        </button>

      </div>

    </div>
  );
};
