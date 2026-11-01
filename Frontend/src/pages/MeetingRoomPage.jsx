import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

// Subcomponents
import { MeetingLobby } from '../components/meeting/MeetingLobby.jsx';
import { MeetingStage } from '../components/meeting/MeetingStage.jsx';
import { MeetingControls } from '../components/meeting/MeetingControls.jsx';
import { MeetingSideDrawer } from '../components/meeting/MeetingSideDrawer.jsx';
import { RecordingModal } from '../components/meeting/RecordingModal.jsx';

import {
  Sparkles,
  Zap,
  Circle,
  Copy,
  Check,
  Radio,
  Shield,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Maximize2,
  Minimize2
} from 'lucide-react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

// Persistent Global Audio Element: guarantees remote voices never drop during pagination, grid changes, or screen resizing
const PersistentRemoteAudio = ({ socketId, stream, onAutoplayBlocked }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !stream) return;

    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }

    const p = el.play();
    if (p !== undefined) {
      p.catch((err) => {
        if (err.name === 'NotAllowedError') {
          onAutoplayBlocked?.(true);
        }
      });
    }

    const handleTrackEvent = () => {
      const playPromise = el.play();
      if (playPromise !== undefined) playPromise.catch(() => {});
    };

    if (stream && typeof stream.addEventListener === 'function') {
      try {
        stream.addEventListener('addtrack', handleTrackEvent);
        stream.addEventListener('removetrack', handleTrackEvent);
      } catch (e) {}
    }

    return () => {
      if (stream && typeof stream.removeEventListener === 'function') {
        try {
          stream.removeEventListener('addtrack', handleTrackEvent);
          stream.removeEventListener('removetrack', handleTrackEvent);
        } catch (e) {}
      }
    };
  }, [stream, socketId, onAutoplayBlocked]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  );
};

export const MeetingRoomPage = ({ roomId, onLeaveRoom, onViewSummary, onCancelLobby }) => {
  const { user } = useAuth();

  // Navigation & Lifecycle State
  const [inLobby, setInLobby] = useState(true);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [meeting, setMeeting] = useState(null);
  const [userRole, setUserRole] = useState('participant'); // 'host' | 'participant'
  const [hostSocketId, setHostSocketId] = useState(null);

  // Media Streams State
  const [localStream, setLocalStream] = useState(null);
  const [screenShareStream, setScreenShareStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { [socketId]: MediaStream }
  const [remoteParticipants, setRemoteParticipants] = useState([]); // Array of participant objects

  // Media Toggles
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);

  // Presenter / Layout State
  const [presenter, setPresenter] = useState(null); // { socketId, name } or null
  const [layoutMode, setLayoutMode] = useState('auto'); // 'auto' | 'grid' | 'stage'
  const [allowScreenShare, setAllowScreenShare] = useState(true);

  // Hardware Devices State
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState('');
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState('');
  const [selectedAudioOutputDeviceId, setSelectedAudioOutputDeviceId] = useState('');
  const [permissionError, setPermissionError] = useState(null);

  // In-Meeting Collaboration & Drawers
  const [activeTab, setActiveTab] = useState(null); // 'chat' | 'participants' | 'notes' | 'info' | null
  const [chatMessages, setChatMessages] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [sharedNotes, setSharedNotes] = useState('## Meeting Collaboration & Action Items\n- Enterprise low-latency WebRTC verified\n- Multi-track recording with mixed audio ready\n');
  const [transcriptLog, setTranscriptLog] = useState([]);
  const lastFinalTextRef = useRef(null);
  const isAudioMutedRef = useRef(false);
  useEffect(() => {
    isAudioMutedRef.current = isAudioMuted;
  }, [isAudioMuted]);

  // In-Meeting Real-Time AI Assistant State
  const [aiAssistantChat, setAiAssistantChat] = useState([
    {
      id: 'welcome',
      answer: 'Hello! I am your IntellMeet in-meeting AI assistant. Ask me questions, request summaries, or check action items while the meeting is in progress.'
    }
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const mobileAudioRecorderRef = useRef(null);
  const mobileAudioIntervalRef = useRef(null);
  const confirmedNameRef = useRef('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Live Topic & Mobile Audio Stability State
  const [liveTopic, setLiveTopic] = useState(null);
  const [showLiveTopic, setShowLiveTopic] = useState(true);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const unlockAudio = useCallback(() => {
    document.querySelectorAll('audio').forEach(a => {
      if (a.paused && a.srcObject) {
        a.play().catch(() => {});
      }
    });
    setAutoplayBlocked(false);
  }, []);

  // Live AI Speech Attributed Subtitle Banner
  const [latestLiveSpeech, setLatestLiveSpeech] = useState(null); // { speaker, text, timestamp, isInterim }
  const [showLiveSpeech, setShowLiveSpeech] = useState(true);
  const speechFadeTimeoutRef = useRef(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingModalOpen, setRecordingModalOpen] = useState(false);
  const [recordingModalMode, setRecordingModalMode] = useState('select'); // 'select' | 'preview'
  const [completedRecording, setCompletedRecording] = useState(null);

  // Refs for WebRTC & Audio Processing
  const localStreamRef = useRef(null);
  const screenShareTrackRef = useRef(null);
  const originalCameraTrackRef = useRef(null);
  const remoteStreamsRef = useRef({});
  const peersRef = useRef({}); // { [socketId]: RTCPeerConnection }
  const peerStatesRef = useRef({}); // { [socketId]: { isMakingOffer: boolean, isPolite: boolean } }
  const peerOffersRef = useRef({}); // { [socketId]: () => Promise<void> }
  const iceQueueRef = useRef({}); // { [socketId]: [candidate] }
  const socketRef = useRef(null);
  const recognitionRef = useRef(null);
  const recordingTimerRef = useRef(null);

  // Web Audio Mixer Refs
  const recordingAudioCtxRef = useRef(null);
  const recordingDestinationRef = useRef(null);
  const recordingMediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingStartTimeRef = useRef(null);
  const recordingCanvasRef = useRef(null);
  const recordingAnimFrameRef = useRef(null);

  // Local Mic Level Analyser for Active Speaker Detection
  const speechAnalyserAudioCtxRef = useRef(null);
  const speechAnimFrameRef = useRef(null);

  // Synchronized Transcript & Chat History Refs for AI Summary Generation
  const transcriptLogRef = useRef([]);
  const chatMessagesRef = useRef([]);
  const isSpeechRecognitionActiveRef = useRef(true);
  const isCleaningUpRef = useRef(false);

  // ----------------------------------------------------
  // Instant Media and Connection Termination (Camera, Mic, WebRTC)
  // ----------------------------------------------------
  const terminateAllMediaAndConnections = useCallback(() => {
    isSpeechRecognitionActiveRef.current = false;
    isCleaningUpRef.current = true;
    // 1. Stop all tracks in localStreamRef immediately to turn off camera & mic hardware lights
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach(track => {
          try {
            track.enabled = false;
            track.stop();
          } catch (e) {}
        });
      } catch (e) {}
      localStreamRef.current = null;
    }

    if (originalCameraTrackRef.current) {
      try {
        originalCameraTrackRef.current.enabled = false;
        originalCameraTrackRef.current.stop();
      } catch (e) {}
      originalCameraTrackRef.current = null;
    }

    // 2. Stop any active screen sharing tracks
    if (screenShareTrackRef.current) {
      try {
        screenShareTrackRef.current.enabled = false;
        screenShareTrackRef.current.stop();
      } catch (e) {}
      screenShareTrackRef.current = null;
    }

    // 3. Stop recording recorder and canvas loop
    if (recordingMediaRecorderRef.current && recordingMediaRecorderRef.current.state !== 'inactive') {
      try {
        recordingMediaRecorderRef.current.stop();
      } catch (e) {}
      recordingMediaRecorderRef.current = null;
    }
    if (recordingAnimFrameRef.current) {
      try { cancelAnimationFrame(recordingAnimFrameRef.current); } catch (e) {}
      recordingAnimFrameRef.current = null;
    }

    // 4. Close Web Audio contexts
    if (speechAnalyserAudioCtxRef.current && speechAnalyserAudioCtxRef.current.state !== 'closed') {
      try { speechAnalyserAudioCtxRef.current.close(); } catch (e) {}
      speechAnalyserAudioCtxRef.current = null;
    }
    if (recordingAudioCtxRef.current && recordingAudioCtxRef.current.state !== 'closed') {
      try { recordingAudioCtxRef.current.close(); } catch (e) {}
      recordingAudioCtxRef.current = null;
    }

    // 5. Stop speech recognition & mobile audio recorder
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (mobileAudioIntervalRef.current) {
      clearTimeout(mobileAudioIntervalRef.current);
      mobileAudioIntervalRef.current = null;
    }
    if (mobileAudioRecorderRef.current) {
      try { mobileAudioRecorderRef.current.stop(); } catch (e) {}
      mobileAudioRecorderRef.current = null;
    }

    // 6. Close all WebRTC peer connections and release track senders
    if (peersRef.current) {
      Object.values(peersRef.current).forEach(pc => {
        try {
          if (pc.getSenders) {
            pc.getSenders().forEach(sender => {
              if (sender.track) {
                try {
                  sender.track.enabled = false;
                  sender.track.stop();
                } catch (e) {}
              }
            });
          }
          pc.close();
        } catch (e) {}
      });
      peersRef.current = {};
    }

    // 7. Clear all HTML media elements (releases browser hardware handles)
    try {
      document.querySelectorAll('video, audio').forEach(mediaEl => {
        if (mediaEl.srcObject) {
          try {
            if (mediaEl.srcObject.getTracks) {
              mediaEl.srcObject.getTracks().forEach(t => {
                t.enabled = false;
                t.stop();
              });
            }
          } catch (e) {}
          mediaEl.srcObject = null;
        }
      });
    } catch (e) {}

    // 8. Disconnect WebSocket signaling
    if (socketRef.current) {
      try {
        socketRef.current.emit('leave-room');
        socketRef.current.disconnect();
      } catch (e) {}
      socketRef.current = null;
    }

    // 9. Reset state
    setLocalStream(null);
    setScreenShareStream(null);
  }, []);

  // Guarantee cleanup on page navigation, tab close, back/forward, and component unmount
  useEffect(() => {
    const handleCleanup = () => {
      terminateAllMediaAndConnections();
    };

    window.addEventListener('beforeunload', handleCleanup);
    window.addEventListener('pagehide', handleCleanup);
    window.addEventListener('popstate', handleCleanup);

    return () => {
      window.removeEventListener('beforeunload', handleCleanup);
      window.removeEventListener('pagehide', handleCleanup);
      window.removeEventListener('popstate', handleCleanup);
      terminateAllMediaAndConnections();
    };
  }, [terminateAllMediaAndConnections]);

  // Keep stream refs updated and sync tracks to peer connections
  useEffect(() => {
    localStreamRef.current = localStream;
    if (localStream) {
      Object.values(peersRef.current).forEach(pc => {
        if (pc.signalingState === 'closed') return;
        const senders = pc.getSenders();
        localStream.getTracks().forEach(track => {
          // If screen sharing is active, do not overwrite the active screen share video track
          if (track.kind === 'video' && screenShareTrackRef.current) return;
          const sender = senders.find(s => s.track && s.track.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track).catch(() => {});
          } else {
            try { pc.addTrack(track, localStream); } catch (e) {}
          }
        });
      });
    }
  }, [localStream]);

  useEffect(() => {
    remoteStreamsRef.current = remoteStreams;
  }, [remoteStreams]);

  // Resume any media elements that browser autoplay may have suspended
  useEffect(() => {
    if (inLobby) return;
    const unlockMedia = () => {
      document.querySelectorAll('audio').forEach(audio => {
        if (audio.paused && audio.srcObject) {
          audio.play().catch(() => {});
        }
      });
      document.querySelectorAll('video').forEach(video => {
        if (video.paused && video.srcObject) {
          video.play().catch(() => {});
        }
      });
    };
    window.addEventListener('click', unlockMedia);
    window.addEventListener('touchstart', unlockMedia);
    window.addEventListener('keydown', unlockMedia);
    return () => {
      window.removeEventListener('click', unlockMedia);
      window.removeEventListener('touchstart', unlockMedia);
      window.removeEventListener('keydown', unlockMedia);
    };
  }, [inLobby]);

  // Load meeting metadata
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const res = await api.getMeeting(roomId);
        if (res.data) {
          setMeeting(res.data);
          const isUserHost = res.data.host?._id === user?._id || res.data.host === user?._id;
          if (isUserHost) {
            setUserRole('host');
          }
          if (res.data.settings?.allowScreenShare !== undefined) {
            setAllowScreenShare(res.data.settings.allowScreenShare);
          }
        }
      } catch (err) {
        setMeeting({
          title: `Ad-hoc Meeting (${roomId})`,
          code: roomId,
          host: { name: user?.name || 'Host' }
        });
      }
    };
    fetchMeeting();
  }, [roomId, user]);

  // Enumerate hardware devices
  const updateDeviceList = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(d => d.kind === 'audioinput');
      const cams = devices.filter(d => d.kind === 'videoinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');

      setAudioDevices(mics);
      setVideoDevices(cams);
      setAudioOutputDevices(outputs);

      if (mics.length > 0 && !selectedAudioDeviceId) setSelectedAudioDeviceId(mics[0].deviceId);
      if (cams.length > 0 && !selectedVideoDeviceId) setSelectedVideoDeviceId(cams[0].deviceId);
      if (outputs.length > 0 && !selectedAudioOutputDeviceId) setSelectedAudioOutputDeviceId(outputs[0].deviceId);
    } catch (e) {
      console.warn('[Devices] Enumeration warning:', e.message);
    }
  }, [selectedAudioDeviceId, selectedVideoDeviceId, selectedAudioOutputDeviceId]);

  // Initial camera and mic capture for pre-join lobby
  useEffect(() => {
    let activeStream = null;

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true,
          audio: selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : true
        });
        activeStream = stream;
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (stream.getVideoTracks().length > 0) {
          originalCameraTrackRef.current = stream.getVideoTracks()[0];
        }
        setPermissionError(null);
        await updateDeviceList();
      } catch (err) {
        console.warn('[Media Init] Could not access user media:', err.message);
        setPermissionError(err.message || 'Camera or microphone access denied');
      }
    };

    initMedia();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Switch camera device
  const handleSelectVideoDevice = async (deviceId) => {
    setSelectedVideoDeviceId(deviceId);
    if (!localStream) return;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStream.getVideoTracks()[0];

      if (oldVideoTrack) {
        localStream.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }
      localStream.addTrack(newVideoTrack);
      originalCameraTrackRef.current = newVideoTrack;

      // Update peer connections
      Object.values(peersRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(newVideoTrack);
      });

      setLocalStream(new MediaStream(localStream.getTracks()));
    } catch (err) {
      console.warn('[Device Switch] Video switch error:', err.message);
    }
  };

  // Switch mic device
  const handleSelectAudioDevice = async (deviceId) => {
    setSelectedAudioDeviceId(deviceId);
    if (!localStream) return;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
        video: false
      });
      const newAudioTrack = newStream.getAudioTracks()[0];
      const oldAudioTrack = localStream.getAudioTracks()[0];

      if (oldAudioTrack) {
        localStream.removeTrack(oldAudioTrack);
        oldAudioTrack.stop();
      }
      localStream.addTrack(newAudioTrack);

      // Update peer connections
      Object.values(peersRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
        if (sender) sender.replaceTrack(newAudioTrack);
      });

      setLocalStream(new MediaStream(localStream.getTracks()));
    } catch (err) {
      console.warn('[Device Switch] Audio switch error:', err.message);
    }
  };

  // Active speaker detection for local mic
  useEffect(() => {
    if (!localStream || isAudioMuted || inLobby) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      speechAnalyserAudioCtxRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const micStream = new MediaStream([audioTrack]);
      const source = audioCtx.createMediaStreamSource(micStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false;

      const checkSpeech = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const isSpeakingNow = avg > 18;

        if (isSpeakingNow !== wasSpeaking) {
          wasSpeaking = isSpeakingNow;
          setActiveSpeakerId(isSpeakingNow ? 'local' : null);
          if (socketRef.current) {
            socketRef.current.emit('speaking-state', { roomId, isSpeaking: isSpeakingNow });
          }
        }
        speechAnimFrameRef.current = requestAnimationFrame(checkSpeech);
      };

      checkSpeech();
    } catch (e) {
      // Non-fatal
    }

    return () => {
      if (speechAnimFrameRef.current) cancelAnimationFrame(speechAnimFrameRef.current);
      if (speechAnalyserAudioCtxRef.current && speechAnalyserAudioCtxRef.current.state !== 'closed') {
        try { speechAnalyserAudioCtxRef.current.close(); } catch (e) {}
      }
    };
  }, [localStream, isAudioMuted, inLobby]);

  // Recording elapsed timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
      setRecordingSeconds(0);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecording]);

  // ----------------------------------------------------
  // WebRTC Peer Connection Factory
  // ----------------------------------------------------
  const createPeerConnection = (targetSocketId, isInitiator, socket) => {
    if (peersRef.current[targetSocketId]) {
      return peersRef.current[targetSocketId];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[targetSocketId] = pc;

    // Determine deterministic politeness for Perfect Negotiation:
    // If local socket ID is lexicographically greater than target socket ID, this peer is polite.
    const isPolite = socket?.id ? (socket.id > targetSocketId) : !isInitiator;
    peerStatesRef.current[targetSocketId] = { isMakingOffer: false, isPolite };

    // Add local media tracks (ensuring screen share track is attached if currently presenting)
    if (screenShareTrackRef.current) {
      try {
        pc.addTrack(screenShareTrackRef.current, localStreamRef.current || new MediaStream());
      } catch (e) {
        console.warn('[WebRTC] add screen share track note:', e);
      }
    } else if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        try { pc.addTrack(videoTrack, localStreamRef.current); } catch (e) {}
      }
    }

    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        try { pc.addTrack(audioTrack, localStreamRef.current); } catch (e) {}
      }
    }

    // Ensure audio and video transceivers exist so reception is guaranteed even if local device lacks mic/camera
    const senders = pc.getSenders();
    const hasAudioSender = senders.some(s => s.track && s.track.kind === 'audio');
    const hasVideoSender = senders.some(s => s.track && s.track.kind === 'video');
    if (!hasAudioSender) {
      try { pc.addTransceiver('audio', { direction: 'recvonly' }); } catch (e) {}
    }
    if (!hasVideoSender) {
      try { pc.addTransceiver('video', { direction: screenShareTrackRef.current ? 'sendrecv' : 'recvonly' }); } catch (e) {}
    }

    // Remote track arrived
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track (${event.track?.kind}) from ${targetSocketId}, id: ${event.track?.id}`);

      const updateRemoteStream = () => {
        setRemoteStreams(prev => {
          const existing = prev[targetSocketId];
          let updatedStream;
          if (existing) {
            if (!existing.getTracks().some(t => t.id === event.track.id)) {
              existing.addTrack(event.track);
            }
            updatedStream = new MediaStream(existing.getTracks());
          } else {
            const incomingStream = event.streams && event.streams[0];
            if (incomingStream) {
              updatedStream = new MediaStream(incomingStream.getTracks());
            } else {
              updatedStream = new MediaStream([event.track]);
            }
          }
          return { ...prev, [targetSocketId]: updatedStream };
        });
      };

      updateRemoteStream();

      event.track.onunmute = () => {
        console.log(`[WebRTC] Track unmuted (${event.track?.kind}) from ${targetSocketId}`);
        updateRemoteStream();
      };

      event.track.onended = () => {
        console.log(`[WebRTC] Track ended (${event.track?.kind}) from ${targetSocketId}`);
        updateRemoteStream();
      };

      // If recording is active, dynamically connect new peer audio to mixer destination!
      if (recordingAudioCtxRef.current && recordingDestinationRef.current && event.track?.kind === 'audio') {
        try {
          if (recordingAudioCtxRef.current.state === 'suspended') {
            recordingAudioCtxRef.current.resume();
          }
          const peerStream = new MediaStream([event.track]);
          const peerSource = recordingAudioCtxRef.current.createMediaStreamSource(peerStream);
          const peerGain = recordingAudioCtxRef.current.createGain();
          peerGain.gain.value = 1.0;
          peerSource.connect(peerGain);
          peerGain.connect(recordingDestinationRef.current);
        } catch (err) {
          console.warn('[Recording Mixer] Peer audio connect note:', err);
        }
      }
    };

    // Forward ICE candidate
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes for reconnect recovery
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection with ${targetSocketId} state:`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        try { pc.restartIce(); } catch (e) {}
      }
    };

    const makeOffer = async () => {
      const state = peerStatesRef.current[targetSocketId];
      if (!state || state.isMakingOffer) return;
      if (pc.signalingState !== 'stable') return;

      try {
        state.isMakingOffer = true;
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);
        if (socket) {
          socket.emit('offer', {
            targetSocketId,
            callerSocketId: socket.id,
            sdp: pc.localDescription
          });
        }
      } catch (err) {
        console.error('[WebRTC] Offer error:', err);
      } finally {
        if (peerStatesRef.current[targetSocketId]) {
          peerStatesRef.current[targetSocketId].isMakingOffer = false;
        }
      }
    };

    peerOffersRef.current[targetSocketId] = makeOffer;

    pc.onnegotiationneeded = () => {
      // Perfect Negotiation safely resolves glare and lets any participant start/stop screen share
      makeOffer();
    };

    // Trigger offer immediately if designated initiator!
    if (isInitiator) {
      makeOffer();
    }

    return pc;
  };

  // ----------------------------------------------------
  // Join Room & Initialize Socket.IO Signaling
  // ----------------------------------------------------
  const handleJoinMeeting = (confirmedName) => {
    setInLobby(false);

    const rawSocketUrl = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' ? '/' : 'https://intellmeet-backend-uuk5.onrender.com');
    const socketUrl = rawSocketUrl.trim().replace(/\/$/, '');
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    const tabId = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('intellmeet_tab_id')) || `tab_${Math.random().toString(36).substring(2, 9)}`;
    const participantSessionId = `${user?._id || 'guest'}_${tabId}`;
    confirmedNameRef.current = confirmedName || user?.name || 'Guest Participant';

    socket.emit('join-room', {
      roomId,
      user: {
        _id: user?._id,
        sessionId: participantSessionId,
        name: confirmedName || user?.name || 'Guest Participant',
        avatar: user?.avatar,
        role: userRole,
        isAudioMuted,
        isVideoOff
      }
    });

    // Room initial state (host, presenter, recording, settings)
    socket.on('room-state', (state) => {
      if (state.hostSocketId) setHostSocketId(state.hostSocketId);
      if (state.presenter) setPresenter(state.presenter);
      if (state.recording?.isRecording) setIsRecording(true);
      if (state.settings?.allowScreenShare !== undefined) {
        setAllowScreenShare(state.settings.allowScreenShare);
      }
    });

    // Existing participants
    socket.on('all-users', (users) => {
      setRemoteParticipants(users);
      users.forEach(existingUser => {
        createPeerConnection(existingUser.socketId, true, socket);
      });
    });

    // New participant joined
    socket.on('user-connected', (newUser) => {
      setRemoteParticipants(prev => {
        if (prev.some(p => p.socketId === newUser.socketId)) return prev;
        return [...prev, newUser];
      });
      // Prepare receiver peer connection with local tracks already attached
      createPeerConnection(newUser.socketId, false, socket);
    });

    // WebRTC Offer with Perfect Negotiation
    socket.on('offer', async ({ callerSocketId, sdp }) => {
      console.log(`[WebRTC] Received offer from ${callerSocketId}`);
      const pc = createPeerConnection(callerSocketId, false, socket);
      const peerState = peerStatesRef.current[callerSocketId] || { isMakingOffer: false, isPolite: true };

      try {
        const isOfferCollision = peerState.isMakingOffer || pc.signalingState !== 'stable';
        if (isOfferCollision) {
          if (!peerState.isPolite) {
            console.log(`[WebRTC] Glare collision detected: impolite peer ignoring offer from ${callerSocketId}`);
            return;
          }
          console.log(`[WebRTC] Glare collision detected: polite peer rolling back local offer for ${callerSocketId}`);
          await pc.setLocalDescription({ type: 'rollback' });
        }

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('answer', {
          targetSocketId: callerSocketId,
          callerSocketId: socket.id,
          sdp: answer
        });

        // Drain ICE queue
        if (iceQueueRef.current[callerSocketId]) {
          const queued = iceQueueRef.current[callerSocketId];
          delete iceQueueRef.current[callerSocketId];
          for (const cand of queued) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (iceErr) {
              console.warn('[WebRTC] ICE candidate drain error:', iceErr);
            }
          }
        }
      } catch (err) {
        console.error('[WebRTC] Offer handling error:', err);
      }
    });

    // WebRTC Answer
    socket.on('answer', async ({ callerSocketId, sdp }) => {
      console.log(`[WebRTC] Received answer from ${callerSocketId}`);
      const pc = peersRef.current[callerSocketId];
      if (pc) {
        try {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            if (iceQueueRef.current[callerSocketId]) {
              const queued = iceQueueRef.current[callerSocketId];
              delete iceQueueRef.current[callerSocketId];
              for (const cand of queued) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (iceErr) {
                  console.warn('[WebRTC] ICE candidate drain error:', iceErr);
                }
              }
            }
          } else {
            console.warn(`[WebRTC] Ignoring answer from ${callerSocketId} in state: ${pc.signalingState}`);
          }
        } catch (err) {
          console.error('[WebRTC] Answer handling error:', err);
        }
      }
    });

    // WebRTC ICE Candidate
    socket.on('ice-candidate', async ({ callerSocketId, candidate }) => {
      if (!candidate) return;
      const pc = peersRef.current[callerSocketId];
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] ICE candidate error:', err);
        }
      } else {
        if (!iceQueueRef.current[callerSocketId]) {
          iceQueueRef.current[callerSocketId] = [];
        }
        iceQueueRef.current[callerSocketId].push(candidate);
      }
    });

    // User disconnected / left
    socket.on('user-disconnected', ({ socketId }) => {
      setRemoteParticipants(prev => prev.filter(p => p.socketId !== socketId));
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].close();
        delete peersRef.current[socketId];
      }
      if (peerStatesRef.current[socketId]) {
        delete peerStatesRef.current[socketId];
      }
      if (peerOffersRef.current[socketId]) {
        delete peerOffersRef.current[socketId];
      }
      if (iceQueueRef.current[socketId]) {
        delete iceQueueRef.current[socketId];
      }
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      // Clear presenter if this peer was sharing
      setPresenter(prev => (prev?.socketId === socketId ? null : prev));
    });

    // Screen sharing started by someone
    socket.on('screen-share-started', (data) => {
      setPresenter({
        socketId: data.socketId,
        name: data.name
      });
      // When a remote peer presents, ensure their video tile is not masked as video-off
      setRemoteParticipants(prev => prev.map(p => {
        if (p.socketId === data.socketId) {
          return { ...p, isVideoOff: false };
        }
        return p;
      }));
    });

    // Screen sharing stopped
    socket.on('screen-share-stopped', () => {
      setPresenter(null);
    });

    // Screen share permission denied
    socket.on('screen-share-denied', ({ message }) => {
      alert(message || 'Screen sharing is currently restricted by the host.');
    });

    // Host actions: Force mute command received
    socket.on('force-mute', ({ by }) => {
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
          setIsAudioMuted(true);
          isAudioMutedRef.current = true;
          if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (e) {}
          }
          setInterimTranscript(null);
        }
      }
      alert(`You were muted by ${by || 'the host'}.`);
    });

    // Host actions: Kicked from meeting
    socket.on('kicked-from-meeting', ({ reason }) => {
      alert(reason || 'You were removed from the meeting by the host.');
      handleLeaveOrEnd();
    });

    socket.on('meeting-ended-by-host', () => {
      alert('The meeting was ended by the host.');
      handleLeaveOrEnd();
    });

    // Host actions: Settings updated
    socket.on('meeting-settings-updated', (settings) => {
      if (settings?.allowScreenShare !== undefined) {
        setAllowScreenShare(settings.allowScreenShare);
      }
    });

    // Remote media toggled
    socket.on('user-media-toggled', ({ socketId, type, enabled }) => {
      setRemoteParticipants(prev => prev.map(p => {
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

    // Hand raised toggle
    socket.on('user-hand-toggled', ({ socketId, raised }) => {
      setRemoteParticipants(prev => prev.map(p => {
        if (p.socketId === socketId) {
          return { ...p, isHandRaised: raised };
        }
        return p;
      }));
    });

    // Active speaker indication
    socket.on('user-speaking', ({ socketId, isSpeaking }) => {
      setRemoteParticipants(prev => prev.map(p => {
        if (p.socketId === socketId) {
          return { ...p, isSpeaking };
        }
        return p;
      }));
      if (isSpeaking) {
        setActiveSpeakerId(socketId);
      } else if (activeSpeakerId === socketId) {
        setActiveSpeakerId(null);
      }
    });

    // Recording status synchronized across all participants
    socket.on('recording-status-changed', (recState) => {
      setIsRecording(recState.isRecording);
    });

    // Chat received
    socket.on('receive-chat', (message) => {
      setChatMessages(prev => {
        const next = [...prev, message];
        chatMessagesRef.current = next;
        return next;
      });
      if (activeTab !== 'chat') {
        setUnreadChatCount(prev => prev + 1);
      }
    });

    // Real-Time Live Speech Subtitle Stream (Attributed to participant currently speaking)
    socket.on('live-interim-speech', ({ item }) => {
      if (item && item.text) {
        setLatestLiveSpeech(item);
        if (speechFadeTimeoutRef.current) clearTimeout(speechFadeTimeoutRef.current);
        speechFadeTimeoutRef.current = setTimeout(() => {
          setLatestLiveSpeech(prev => (prev?.isInterim ? null : prev));
        }, 5000);
      }
    });

    // Real-Time Final Speech Transcript & Topic Intelligence
    socket.on('transcript-update', (item) => {
      if (!item || !item.text || item.isFinal === false) return;

      // Update Live Floating Subtitle Banner with verified speaker name
      setLatestLiveSpeech({
        speaker: item.speaker,
        text: item.text,
        isInterim: false,
        timestamp: item.timestamp
      });
      if (speechFadeTimeoutRef.current) clearTimeout(speechFadeTimeoutRef.current);
      speechFadeTimeoutRef.current = setTimeout(() => {
        setLatestLiveSpeech(null);
      }, 7500);

      setTranscriptLog(prev => {
        if (item.segmentId && prev.some(t => t.segmentId === item.segmentId)) {
          return prev;
        }
        const last = prev[prev.length - 1];
        if (
          last &&
          last.speaker === item.speaker &&
          last.text.trim().toLowerCase() === item.text.trim().toLowerCase()
        ) {
          return prev;
        }

        const next = [...prev, item];
        transcriptLogRef.current = next;
        return next;
      });
    });

    // In-Meeting AI Assistant responses from server
    socket.on('ai-assistant-response', ({ question, answer }) => {
      setIsAiThinking(false);
      if (answer) {
        setAiAssistantChat(prev => [...prev, { id: `a-${Date.now()}`, answer }]);
      }
    });

    // Real-Time Live AI Topic Detection updates
    socket.on('topic-detected', (topicData) => {
      if (topicData && topicData.topic) {
        setLiveTopic(topicData);
      }
    });

    // Start Web Speech API transcription
    initSpeechRecognition(socket);
  };

  // In-Meeting AI Assistant Query Handler
  const handleAskAiAssistant = async (question) => {
    if (!question || !question.trim() || isAiThinking) return;
    const userTurn = { id: `q-${Date.now()}`, question: question.trim() };
    setAiAssistantChat(prev => [...prev, userTurn]);
    setIsAiThinking(true);

    try {
      const res = await api.askAiAssistant({
        question: question.trim(),
        transcript: transcriptLogRef.current,
        liveTopic,
        title: meeting?.title || 'Team Meeting',
        notes: sharedNotes
      });

      const answer = res?.data?.answer || 'I could not generate an answer at this time.';
      setAiAssistantChat(prev => [...prev, { id: `a-${Date.now()}`, answer }]);
    } catch (err) {
      console.warn('[AI Assistant] Query error:', err.message);
      if (socketRef.current) {
        socketRef.current.emit('ask-ai-assistant', { roomId, question: question.trim() });
      } else {
        setAiAssistantChat(prev => [
          ...prev,
          { id: `err-${Date.now()}`, answer: 'AI Assistant temporarily unavailable. Please verify your connection.' }
        ]);
      }
    } finally {
      setIsAiThinking(false);
    }
  };

  // Cross-Device Audio Stream Processor (Mobile devices & browsers without Web Speech API)
  const startMobileAudioAssistant = useCallback((socket) => {
    if (!socket || isCleaningUpRef.current) return;
    if (mobileAudioRecorderRef.current) return;

    if (!localStreamRef.current) {
      setTimeout(() => startMobileAudioAssistant(socket), 1000);
      return;
    }
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (!audioTrack) {
      setTimeout(() => startMobileAudioAssistant(socket), 1000);
      return;
    }

    try {
      let activeMimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported(activeMimeType)) activeMimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(activeMimeType)) activeMimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(activeMimeType)) activeMimeType = '';
      }

      const audioStream = new MediaStream([audioTrack]);

      const recordSlice = () => {
        if (isCleaningUpRef.current) return;
        if (isAudioMutedRef.current || !isSpeechRecognitionActiveRef.current) {
          mobileAudioIntervalRef.current = setTimeout(recordSlice, 800);
          return;
        }

        try {
          const chunks = [];
          const recorder = activeMimeType
            ? new MediaRecorder(audioStream, { mimeType: activeMimeType })
            : new MediaRecorder(audioStream);
          mobileAudioRecorderRef.current = recorder;

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = () => {
            if (chunks.length > 0 && !isAudioMutedRef.current && isSpeechRecognitionActiveRef.current && !isCleaningUpRef.current) {
              const completeBlob = new Blob(chunks, { type: activeMimeType || 'audio/webm' });
              if (completeBlob.size > 1200) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const res = reader.result;
                  if (res && typeof res === 'string') {
                    const base64Audio = res.split(',')[1];
                    if (base64Audio && socketRef.current) {
                      socketRef.current.emit('mobile-audio-speech', {
                        roomId,
                        audioBase64: base64Audio,
                        mimeType: completeBlob.type || activeMimeType || 'audio/webm',
                        speaker: confirmedNameRef.current || user?.name || 'Participant',
                        userId: user?._id || null
                      });
                    }
                  }
                };
                reader.readAsDataURL(completeBlob);
              }
            }
            if (!isCleaningUpRef.current && !isAudioMutedRef.current && isSpeechRecognitionActiveRef.current) {
              mobileAudioIntervalRef.current = setTimeout(recordSlice, 300);
            }
          };

          recorder.start();
          setTimeout(() => {
            if (recorder && recorder.state === 'recording') {
              try { recorder.stop(); } catch (e) {}
            }
          }, 3500);
        } catch (recErr) {
          mobileAudioIntervalRef.current = setTimeout(recordSlice, 2000);
        }
      };

      recordSlice();
    } catch (err) {
      console.warn('[AudioProcessor] Init note:', err.message);
    }
  }, [roomId, user]);

  // Robust Desktop & Laptop Web Speech API (English only) with automatic mobile fallback
  const initSpeechRecognition = useCallback((socket) => {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      startMobileAudioAssistant(socket);
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      const handleFinalTranscript = (finalText) => {
        if (!finalText || isAudioMutedRef.current || isCleaningUpRef.current) return;

        const cleanText = finalText.trim();
        if (!cleanText) return;

        const now = Date.now();
        const normalized = cleanText.toLowerCase().replace(/[.,!?;:]/g, '').trim();
        if (
          lastFinalTextRef.current &&
          lastFinalTextRef.current.text === normalized &&
          now - lastFinalTextRef.current.time < 3500
        ) {
          return;
        }
        lastFinalTextRef.current = { text: normalized, time: now };

        const speakerName = confirmedNameRef.current || user?.name || 'Participant';
        const segmentId = `seg-${user?._id || socketRef.current?.id || 'anon'}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const transcriptItem = {
          segmentId,
          speaker: speakerName,
          userId: user?._id || null,
          participantId: user?._id || socketRef.current?.id || null,
          text: cleanText,
          timestamp,
          isFinal: true
        };

        // Immediately show final sentence with speaker name on local UI
        setLatestLiveSpeech({
          speaker: speakerName,
          text: cleanText,
          isInterim: false,
          timestamp
        });
        if (speechFadeTimeoutRef.current) clearTimeout(speechFadeTimeoutRef.current);
        speechFadeTimeoutRef.current = setTimeout(() => {
          setLatestLiveSpeech(null);
        }, 7500);

        setTranscriptLog(prev => {
          if (prev.some(t => t.segmentId === segmentId)) return prev;
          const next = [...prev, transcriptItem];
          transcriptLogRef.current = next;
          return next;
        });

        if (socketRef.current) {
          socketRef.current.emit('live-transcript', { roomId, item: transcriptItem });
        }
      };

      recognition.onresult = (event) => {
        if (isAudioMutedRef.current || isCleaningUpRef.current) return;
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            const text = result[0].transcript;
            if (text && text.trim()) {
              handleFinalTranscript(text.trim());
            }
          } else {
            interimText += result[0].transcript;
          }
        }
        if (interimText && interimText.trim()) {
          const speakerName = confirmedNameRef.current || user?.name || 'You';
          const interimItem = {
            speaker: speakerName,
            text: interimText.trim(),
            isInterim: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setLatestLiveSpeech(interimItem);
          if (socketRef.current) {
            socketRef.current.emit('live-interim-speech', { roomId, item: interimItem });
          }
          if (speechFadeTimeoutRef.current) clearTimeout(speechFadeTimeoutRef.current);
          speechFadeTimeoutRef.current = setTimeout(() => {
            setLatestLiveSpeech(prev => (prev?.isInterim ? null : prev));
          }, 4500);
        }
      };

      recognition.onend = () => {
        if (!isAudioMutedRef.current && isSpeechRecognitionActiveRef.current && !isCleaningUpRef.current && socketRef.current) {
          setTimeout(() => {
            if (!isAudioMutedRef.current && isSpeechRecognitionActiveRef.current && !isCleaningUpRef.current && socketRef.current) {
              initSpeechRecognition(socketRef.current);
            }
          }, 300);
        }
      };

      recognition.onerror = (err) => {
        if (err.error !== 'no-speech' && err.error !== 'aborted') {
          console.warn('[SpeechRecognition] Desktop engine event:', err.error);
          if (err.error === 'audio-capture' || err.error === 'not-allowed' || err.error === 'service-not-allowed' || err.error === 'network') {
            startMobileAudioAssistant(socket);
          }
        }
      };

      if (!isAudioMutedRef.current) {
        try { recognition.start(); } catch (e) {}
      }
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('[SpeechRecognition] Desktop init fallback to audio stream:', err.message);
      startMobileAudioAssistant(socket);
    }
  }, [roomId, user, startMobileAudioAssistant]);

  // ----------------------------------------------------
  // Audio & Video Toggles
  // ----------------------------------------------------
  const toggleAudio = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const nextEnabled = !audioTrack.enabled;
        audioTrack.enabled = nextEnabled;
        const nextMuted = !nextEnabled;
        setIsAudioMuted(nextMuted);
        isAudioMutedRef.current = nextMuted;

        if (nextMuted) {
          if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (e) {}
          }
        } else {
          if (isSpeechRecognitionActiveRef.current && socketRef.current) {
            initSpeechRecognition(socketRef.current);
          }
        }

        if (socketRef.current) {
          socketRef.current.emit('toggle-media', { roomId, type: 'audio', enabled: nextEnabled });
        }
      }
    } else {
      const nextMuted = !isAudioMuted;
      setIsAudioMuted(nextMuted);
      isAudioMutedRef.current = nextMuted;
    }
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        if (socketRef.current) {
          socketRef.current.emit('toggle-media', { roomId, type: 'video', enabled: videoTrack.enabled });
        }
      }
    } else {
      setIsVideoOff(!isVideoOff);
    }
  };

  // ----------------------------------------------------
  // Screen Sharing (Highest Priority Feature)
  // ----------------------------------------------------
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      // Check permission from host settings
      const isUserHost = userRole === 'host' || user?._id === meeting?.host?._id;
      if (!allowScreenShare && !isUserHost) {
        alert('Screen sharing has been locked by the meeting host.');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('Screen sharing is not supported by your mobile browser or operating system. Please use Chrome, Edge, or Firefox on a computer.');
        return;
      }

      try {
        let screenStream;
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              cursor: 'always',
              displaySurface: 'monitor'
            },
            audio: true
          });
        } catch (audioErr) {
          // Fallback to video-only if audio capture throws or is unsupported
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true
          });
        }

        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) {
          throw new Error('No screen video track captured.');
        }

        screenShareTrackRef.current = screenTrack;
        setScreenShareStream(screenStream);
        setIsScreenSharing(true);

        // Ensure video transceiver direction is 'sendrecv', replace/add track, and negotiate
        for (const [targetSocketId, pc] of Object.entries(peersRef.current)) {
          if (pc.signalingState === 'closed') continue;
          try {
            const transceivers = pc.getTransceivers ? pc.getTransceivers() : [];
            let videoTransceiver = transceivers.find(t => t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video');

            if (!videoTransceiver) {
              try {
                videoTransceiver = pc.addTransceiver(screenTrack, { direction: 'sendrecv', streams: [screenStream] });
              } catch (e) {
                console.warn('[Screen Share] addTransceiver note:', e);
              }
            } else {
              videoTransceiver.direction = 'sendrecv';
              const sender = videoTransceiver.sender || pc.getSenders().find(s => s.track && s.track.kind === 'video') || pc.getSenders().find(s => s.track === null);
              if (sender) {
                await sender.replaceTrack(screenTrack).catch(err => {
                  console.warn('[Screen Share replaceTrack note]:', err);
                });
              } else {
                try {
                  pc.addTrack(screenTrack, screenStream);
                } catch (err) {
                  console.warn('[Screen Share addTrack note]:', err);
                }
              }
            }
          } catch (err) {
            console.warn(`[Screen Share] Peer track update note (${targetSocketId}):`, err);
          }

          // Trigger SDP renegotiation so peer accepts video in sendrecv
          if (peerOffersRef.current[targetSocketId]) {
            peerOffersRef.current[targetSocketId]();
          }
        }

        // Notify socket server and all peers
        if (socketRef.current) {
          socketRef.current.emit('start-screen-share', { roomId });
        }

        // Handle user clicking native browser "Stop sharing" bar
        screenTrack.onended = () => {
          stopScreenSharing();
        };
      } catch (err) {
        if (err.name !== 'NotAllowedError') {
          console.warn('[Screen Share] Canceled or not supported:', err.message);
        }
      }
    } else {
      stopScreenSharing();
    }
  };

  const stopScreenSharing = () => {
    if (screenShareTrackRef.current) {
      try {
        screenShareTrackRef.current.onended = null;
        screenShareTrackRef.current.stop();
      } catch (e) {}
      screenShareTrackRef.current = null;
    }
    setScreenShareStream(null);
    setIsScreenSharing(false);

    // Restore original camera track on all peer connections
    const originalVideoTrack = originalCameraTrackRef.current || (localStreamRef.current && localStreamRef.current.getVideoTracks()[0]);
    for (const [targetSocketId, pc] of Object.entries(peersRef.current)) {
      if (pc.signalingState === 'closed') continue;
      try {
        const transceivers = pc.getTransceivers ? pc.getTransceivers() : [];
        const videoTransceiver = transceivers.find(t => t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video');

        if (videoTransceiver) {
          if (originalVideoTrack && !isVideoOff) {
            videoTransceiver.direction = 'sendrecv';
            const sender = videoTransceiver.sender || pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
              sender.replaceTrack(originalVideoTrack).catch(() => {});
            }
          } else {
            videoTransceiver.direction = 'recvonly';
            const sender = videoTransceiver.sender || pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
              sender.replaceTrack(null).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn(`[Stop Screen Share] Track restore note (${targetSocketId}):`, err);
      }

      // Trigger SDP renegotiation so remote peer adjusts back
      if (peerOffersRef.current[targetSocketId]) {
        peerOffersRef.current[targetSocketId]();
      }
    }

    // Notify socket server
    if (socketRef.current) {
      socketRef.current.emit('stop-screen-share', { roomId });
    }
  };

  // Raise / Lower Hand
  const toggleHand = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    if (socketRef.current) {
      socketRef.current.emit('toggle-hand', { roomId, raised: nextState });
    }
  };

  // Send In-Meeting Chat
  const handleSendChat = (text) => {
    if (!text || !socketRef.current) return;
    socketRef.current.emit('send-chat', {
      roomId,
      message: {
        sender: user?.name || 'You',
        senderId: user?._id,
        avatar: user?.avatar,
        text
      }
    });
  };

  // ----------------------------------------------------
  // Host Management Controls
  // ----------------------------------------------------
  const handleHostMuteUser = (targetSocketId) => {
    if (socketRef.current) {
      socketRef.current.emit('host-mute-user', { roomId, targetSocketId });
    }
  };

  const handleHostMuteAll = () => {
    if (socketRef.current) {
      socketRef.current.emit('host-mute-all', { roomId });
    }
  };

  const handleHostKickUser = (targetSocketId) => {
    if (confirm('Are you sure you want to remove this participant from the meeting?')) {
      if (socketRef.current) {
        socketRef.current.emit('host-kick-user', { roomId, targetSocketId });
      }
    }
  };

  const handleToggleScreenSharePermission = (allowed) => {
    setAllowScreenShare(allowed);
    if (socketRef.current) {
      socketRef.current.emit('host-toggle-screen-share-permission', {
        roomId,
        allowScreenShare: allowed
      });
    }
  };

  // ----------------------------------------------------
  // Full-Screen & Meeting Recording with Mixed Audio
  // ----------------------------------------------------
  const handleOpenRecordingDialog = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setRecordingModalMode('select');
      setRecordingModalOpen(true);
    }
  };

  const startRecording = async (mode) => {
    try {
      recordedChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      let videoStreamToRecord = null;
      let displayStream = null;

      // 1. Capture Video Track
      if (mode === 'screen') {
        // Mode B: Entire Screen / Window / Tab Picker
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'monitor' },
          audio: true
        });
        videoStreamToRecord = displayStream;
      } else {
        // Mode A: Meeting Composition Canvas
        // Creates a 1280x720 30fps canvas rendering the meeting layout
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        recordingCanvasRef.current = canvas;
        const ctx = canvas.getContext('2d');

        const renderCompositeFrame = () => {
          try {
            // Draw dark meeting background
            const grad = ctx.createLinearGradient(0, 0, 1280, 720);
            grad.addColorStop(0, '#070a14');
            grad.addColorStop(1, '#0e1526');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1280, 720);

            // If someone is sharing screen, draw screen in center stage
            const currentPresenterStream = isScreenSharing
              ? screenShareStream
              : (presenter?.socketId ? remoteStreamsRef.current[presenter.socketId] : null);

            if (currentPresenterStream) {
              const stageVideo = document.querySelector('#meeting-stage-container video');
              if (stageVideo && stageVideo.readyState >= 2 && stageVideo.videoWidth > 0 && stageVideo.videoHeight > 0) {
                try {
                  const aspect = stageVideo.videoWidth / stageVideo.videoHeight;
                  let drawW = 1240;
                  let drawH = drawW / aspect;
                  if (drawH > 680) {
                    drawH = 680;
                    drawW = drawH * aspect;
                  }
                  const drawX = (1280 - drawW) / 2;
                  const drawY = (720 - drawH) / 2;
                  ctx.drawImage(stageVideo, drawX, drawY, drawW, drawH);
                } catch (e) {}
              }
            } else {
              // Render video tiles from meeting grid
              const videoEls = document.querySelectorAll('#meeting-stage-container video');
              if (videoEls.length === 1) {
                const v = videoEls[0];
                if (v && v.readyState >= 2 && v.videoWidth > 0) {
                  try { ctx.drawImage(v, 160, 40, 960, 640); } catch (e) {}
                }
              } else if (videoEls.length >= 2) {
                const w = 600;
                const h = 338;
                if (videoEls[0] && videoEls[0].readyState >= 2 && videoEls[0].videoWidth > 0) {
                  try { ctx.drawImage(videoEls[0], 25, 190, w, h); } catch (e) {}
                }
                if (videoEls[1] && videoEls[1].readyState >= 2 && videoEls[1].videoWidth > 0) {
                  try { ctx.drawImage(videoEls[1], 655, 190, w, h); } catch (e) {}
                }
              }
            }

            // Watermark badge: IntellMeet Meeting
            ctx.fillStyle = 'rgba(10, 15, 26, 0.85)';
            ctx.fillRect(20, 20, 260, 38);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(`IntellMeet: ${roomId}`, 32, 44);
          } catch (e) {}

          recordingAnimFrameRef.current = requestAnimationFrame(renderCompositeFrame);
        };

        renderCompositeFrame();
        const captureFn = canvas.captureStream || canvas.mozCaptureStream;
        videoStreamToRecord = captureFn ? captureFn.call(canvas, 30) : (localStreamRef.current || null);
      }

      // 2. Web Audio Multi-Track Mixer
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      recordingAudioCtxRef.current = audioCtx;
      const destination = audioCtx.createMediaStreamDestination();
      recordingDestinationRef.current = destination;

      // Keep active audio pipeline flowing to prevent silent idle sleeping
      try {
        const osc = audioCtx.createOscillator();
        const silentGain = audioCtx.createGain();
        silentGain.gain.value = 0.00001;
        osc.connect(silentGain);
        silentGain.connect(destination);
        osc.start();
      } catch (e) {}

      // Mix local microphone
      if (localStreamRef.current) {
        const localAudioTracks = localStreamRef.current.getAudioTracks();
        if (localAudioTracks.length > 0 && localAudioTracks[0].readyState === 'live') {
          try {
            const micStream = new MediaStream([localAudioTracks[0]]);
            const micSource = audioCtx.createMediaStreamSource(micStream);
            const micGain = audioCtx.createGain();
            micGain.gain.value = 1.0;
            micSource.connect(micGain);
            micGain.connect(destination);
          } catch (e) {
            console.warn('[Recording Mixer] Mic connect note:', e);
          }
        }
      }

      // Mix all remote participant audio streams
      Object.entries(remoteStreamsRef.current).forEach(([peerId, rStream]) => {
        if (rStream) {
          const remoteAudioTracks = rStream.getAudioTracks();
          if (remoteAudioTracks.length > 0 && remoteAudioTracks[0].readyState === 'live') {
            try {
              const peerStream = new MediaStream([remoteAudioTracks[0]]);
              const peerSource = audioCtx.createMediaStreamSource(peerStream);
              const peerGain = audioCtx.createGain();
              peerGain.gain.value = 1.0;
              peerSource.connect(peerGain);
              peerGain.connect(destination);
            } catch (e) {
              console.warn(`[Recording Mixer] Peer ${peerId} audio note:`, e);
            }
          }
        }
      });

      // Mix system/display audio if captured via Mode B
      if (displayStream) {
        const dispAudioTracks = displayStream.getAudioTracks();
        if (dispAudioTracks.length > 0 && dispAudioTracks[0].readyState === 'live') {
          try {
            const dispStream = new MediaStream([dispAudioTracks[0]]);
            const dispSource = audioCtx.createMediaStreamSource(dispStream);
            const dispGain = audioCtx.createGain();
            dispGain.gain.value = 1.0;
            dispSource.connect(dispGain);
            dispGain.connect(destination);
          } catch (e) {
            console.warn('[Recording Mixer] Display audio note:', e);
          }
        }
      }

      // 3. Assemble tracks to record
      const tracks = [];
      if (videoStreamToRecord && videoStreamToRecord.getVideoTracks().length > 0) {
        tracks.push(videoStreamToRecord.getVideoTracks()[0]);
      }
      if (destination.stream.getAudioTracks().length > 0) {
        const recAudioTrack = destination.stream.getAudioTracks()[0];
        recAudioTrack.enabled = true;
        tracks.push(recAudioTrack);
      }

      const streamToRecord = new MediaStream(tracks);

      // Determine supported MIME type
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType) && MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';

      const options = {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
        audioBitsPerSecond: 128000
      };
      const recorder = options.mimeType ? new MediaRecorder(streamToRecord, options) : new MediaRecorder(streamToRecord);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (recordingAnimFrameRef.current) cancelAnimationFrame(recordingAnimFrameRef.current);
        if (recordingAudioCtxRef.current && recordingAudioCtxRef.current.state !== 'closed') {
          try { recordingAudioCtxRef.current.close(); } catch (e) {}
        }

        const durationSeconds = Math.round((Date.now() - (recordingStartTimeRef.current || Date.now())) / 1000);

        if (recordedChunksRef.current.length > 0) {
          const fileType = recorder.mimeType || 'video/webm';
          const blob = new Blob(recordedChunksRef.current, { type: fileType });
          const url = URL.createObjectURL(blob);

          setCompletedRecording({
            url,
            blob,
            duration: durationSeconds,
            mimeType: fileType
          });
          setRecordingModalMode('preview');
          setRecordingModalOpen(true);
        }

        setIsRecording(false);
        if (socketRef.current) {
          socketRef.current.emit('recording-status', { roomId, isRecording: false });
        }
      };

      // Auto finalize if user stops screen capture from browser UI
      if (displayStream && displayStream.getVideoTracks().length > 0) {
        displayStream.getVideoTracks()[0].onended = () => {
          if (recorder.state !== 'inactive') recorder.stop();
        };
      }

      recorder.start(1000);
      recordingMediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Broadcast recording state to room
      if (socketRef.current) {
        socketRef.current.emit('recording-status', { roomId, isRecording: true, mode });
      }
    } catch (err) {
      console.error('[Recording Error]:', err);
      alert('Could not start recording: ' + err.message);
      setIsRecording(false);
    }
  };

  const pauseRecording = () => {
    if (recordingMediaRecorderRef.current && recordingMediaRecorderRef.current.state === 'recording') {
      try {
        recordingMediaRecorderRef.current.pause();
        setIsRecordingPaused(true);
      } catch (e) {
        console.warn('[Recording] pause error:', e);
      }
    }
  };

  const resumeRecording = () => {
    if (recordingMediaRecorderRef.current && recordingMediaRecorderRef.current.state === 'paused') {
      try {
        recordingMediaRecorderRef.current.resume();
        setIsRecordingPaused(false);
      } catch (e) {
        console.warn('[Recording] resume error:', e);
      }
    }
  };

  const stopRecording = () => {
    if (recordingMediaRecorderRef.current && recordingMediaRecorderRef.current.state !== 'inactive') {
      recordingMediaRecorderRef.current.stop();
      setIsRecordingPaused(false);
    }
  };

  const handleSaveRecordingToHistory = async (recData) => {
    const meetingId = meeting?._id || roomId;
    await api.saveRecording(meetingId, {
      recordingUrl: recData.url,
      durationMinutes: Math.max(1, Math.round(recData.duration / 60))
    });
  };

  // ----------------------------------------------------
  // End / Leave Meeting
  // ----------------------------------------------------
  const handleLeaveOrEnd = async () => {
    setIsEndingSession(true);

    // 1. Immediately stop camera, microphone, screen share, and WebRTC connections
    terminateAllMediaAndConnections();

    const targetMeetingId = meeting?._id || meeting?.code || roomId;
    let finalMeetingCode = meeting?.code || roomId;

    if (targetMeetingId) {
      try {
        const res = await api.endMeeting(targetMeetingId, {
          transcript: transcriptLogRef.current.length > 0 ? transcriptLogRef.current : transcriptLog,
          chatMessages: chatMessagesRef.current.length > 0 ? chatMessagesRef.current : chatMessages
        });
        if (res?.data?.code) {
          finalMeetingCode = res.data.code;
        }
      } catch (err) {
        console.warn('[Leave Call] End meeting sync note:', err);
      }
    }

    if (onViewSummary) {
      onViewSummary(finalMeetingCode || meeting?.code || targetMeetingId || roomId);
    } else if (onLeaveRoom) {
      onLeaveRoom();
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ----------------------------------------------------
  // SESSION FINALIZING VIEW (Prevents blank screens while saving)
  // ----------------------------------------------------
  if (isEndingSession) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main, #070a12)',
        color: '#fff',
        padding: '24px'
      }}>
        <div className="glass-panel" style={{
          background: 'rgba(14, 21, 36, 0.95)',
          padding: '36px 44px',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          textAlign: 'center',
          maxWidth: '460px',
          width: '100%'
        }}>
          <Sparkles size={32} className="animate-spin" color="#818cf8" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>
            Finalizing Meeting & AI Summary
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
            Releasing media hardware and generating AI intelligence...
          </p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // PRE-MEETING LOBBY VIEW
  // ----------------------------------------------------
  if (inLobby) {
    return (
      <MeetingLobby
        roomId={roomId}
        meeting={meeting}
        user={user}
        localStream={localStream}
        isAudioMuted={isAudioMuted}
        isVideoOff={isVideoOff}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        audioDevices={audioDevices}
        videoDevices={videoDevices}
        audioOutputDevices={audioOutputDevices}
        selectedAudioDeviceId={selectedAudioDeviceId}
        selectedVideoDeviceId={selectedVideoDeviceId}
        selectedAudioOutputDeviceId={selectedAudioOutputDeviceId}
        onSelectAudioDevice={handleSelectAudioDevice}
        onSelectVideoDevice={handleSelectVideoDevice}
        onSelectAudioOutputDevice={(id) => setSelectedAudioOutputDeviceId(id)}
        permissionError={permissionError}
        onJoin={handleJoinMeeting}
        onCancel={() => {
          terminateAllMediaAndConnections();
          if (onCancelLobby) {
            onCancelLobby();
          } else {
            onLeaveRoom();
          }
        }}
      />
    );
  }

  // ----------------------------------------------------
  // LIVE MEETING ROOM VIEW
  // ----------------------------------------------------
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#070a14',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Top Header Bar */}
      <header
        className="meeting-top-bar"
        style={{
          height: '56px',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(10, 15, 26, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-subtle)',
          zIndex: 25
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 700, margin: 0 }}>
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
              color: '#818cf8',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <span>{roomId}</span>
            {copiedCode ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
          </button>

          {/* WebRTC Latency Metric */}
          <span style={{ fontSize: '0.74rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={12} />
            <span>WebRTC 124ms</span>
          </span>

          {/* Recording Badge */}
          {isRecording && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#f87171',
              fontSize: '0.78rem',
              fontWeight: 700,
              background: 'rgba(239, 68, 68, 0.15)',
              padding: '3px 8px',
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <Circle size={8} fill="#ef4444" color="#ef4444" className="animate-pulse" />
              <span>REC</span>
            </div>
          )}
        </div>

        {/* Right Section: Presenter Indicator & Participant count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {presenter && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#818cf8',
              fontSize: '0.82rem',
              fontWeight: 600
            }}>
              <span>Presenting: <strong>{isScreenSharing ? 'You' : (presenter?.name || 'Participant')}</strong></span>
            </div>
          )}
        </div>
      </header>

      {/* Persistent Global Audio Mesh: guarantees remote voices never drop during pagination, grid changes, or screen resizing */}
      <div style={{ display: 'none' }} aria-hidden="true">
        {Object.entries(remoteStreams).map(([sId, stream]) => (
          <PersistentRemoteAudio
            key={sId}
            socketId={sId}
            stream={stream}
            onAutoplayBlocked={() => setAutoplayBlocked(true)}
          />
        ))}
      </div>

      {/* Mobile Autoplay Permission Recovery Banner */}
      {autoplayBlocked && (
        <div
          onClick={unlockAudio}
          style={{
            position: 'absolute',
            top: '72px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '24px',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)',
            zIndex: 45,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontWeight: 700,
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <Volume2 size={16} />
          <span>Audio paused by mobile browser. Tap here to enable participant voices.</span>
        </div>
      )}

      {/* Real-Time Live AI Topic Detection Banner */}
      {liveTopic && liveTopic.topic && (
        <div
          className="live-topic-dock-pill"
          style={{
            position: 'absolute',
            top: '72px',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: '680px',
            width: '92%',
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '12px',
            padding: showLiveTopic ? '10px 16px' : '6px 14px',
            zIndex: 28,
            boxShadow: 'var(--shadow-md)',
            transition: 'all 0.25s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
              <span style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                CURRENT TOPIC
              </span>
              <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {liveTopic.topic}
              </h4>
            </div>

            <button
              onClick={() => setShowLiveTopic(!showLiveTopic)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
              title={showLiveTopic ? 'Minimize topic' : 'Expand topic'}
            >
              {showLiveTopic ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {showLiveTopic && (
            <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px' }}>
              {liveTopic.summary && (
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: '0 0 6px', lineHeight: 1.4 }}>
                  {liveTopic.summary}
                </p>
              )}
              {Array.isArray(liveTopic.contributors) && liveTopic.contributors.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {liveTopic.contributors.slice(0, 3).map((c, i) => (
                    <div key={i} style={{ fontSize: '0.76rem', color: '#94a3b8', lineHeight: 1.3 }}>
                      <strong style={{ color: '#818cf8' }}>{c.speaker}:</strong> {c.point}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Workspace Canvas (Video Stage + Side Drawer) */}
      <div 
        onClick={unlockAudio}
        style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}
      >
        {/* Intelligent Video Stage (Screen Share Priority, Spotlight, Grid) */}
        <MeetingStage
          localUser={user}
          localStream={localStream}
          isAudioMuted={isAudioMuted}
          isVideoOff={isVideoOff}
          isHandRaised={isHandRaised}
          isScreenSharing={isScreenSharing}
          screenShareStream={screenShareStream}
          remoteParticipants={remoteParticipants}
          remoteStreams={remoteStreams}
          presenter={presenter}
          activeSpeakerId={activeSpeakerId}
          currentUserId={user?._id}
          isHost={userRole === 'host'}
          onHostMute={handleHostMuteUser}
          onHostKick={handleHostKickUser}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
        />



        {/* Slide-out Side Drawer (Chat, Participants, Transcript & Translations, Notes, Info) */}
        <MeetingSideDrawer
          activeTab={activeTab}
          onClose={() => setActiveTab(null)}
          chatMessages={chatMessages}
          onSendChat={handleSendChat}
          participants={remoteParticipants}
          localUser={user}
          isAudioMuted={isAudioMuted}
          isVideoOff={isVideoOff}
          isHost={userRole === 'host'}
          onHostMuteUser={handleHostMuteUser}
          onHostMuteAll={handleHostMuteAll}
          onHostKickUser={handleHostKickUser}
          allowScreenShare={allowScreenShare}
          onToggleScreenSharePermission={handleToggleScreenSharePermission}
          sharedNotes={sharedNotes}
          onUpdateNotes={setSharedNotes}
          roomId={roomId}
          meeting={meeting}
          liveTopic={liveTopic}
          transcriptLog={transcriptLog}
          latestLiveSpeech={latestLiveSpeech}
          aiAssistantChat={aiAssistantChat}
          onAskAssistant={handleAskAiAssistant}
          isAiThinking={isAiThinking}
        />
      </div>

      {/* Real-Time Live AI Speech Subtitle Banner (Attributed to participant currently speaking) */}
      {showLiveSpeech && latestLiveSpeech?.text && (
        <div
          className="live-speech-subtitle-banner"
          style={{
            position: 'absolute',
            bottom: typeof window !== 'undefined' && window.innerWidth <= 768 ? '86px' : '96px',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: typeof window !== 'undefined' && window.innerWidth <= 768 ? '94%' : '760px',
            width: 'max-content',
            background: 'rgba(8, 12, 22, 0.94)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(99, 102, 241, 0.5)',
            borderRadius: '24px',
            padding: typeof window !== 'undefined' && window.innerWidth <= 768 ? '8px 14px' : '10px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.75)',
            zIndex: 35,
            pointerEvents: 'auto',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: latestLiveSpeech.isInterim ? '#f59e0b' : '#10b981',
            boxShadow: latestLiveSpeech.isInterim ? '0 0 10px #f59e0b' : '0 0 10px #10b981',
            flexShrink: 0
          }} />
          <span style={{
            color: '#818cf8',
            fontWeight: 700,
            fontSize: typeof window !== 'undefined' && window.innerWidth <= 768 ? '0.82rem' : '0.9rem',
            whiteSpace: 'nowrap'
          }}>
            {latestLiveSpeech.speaker}:
          </span>
          <span style={{
            color: latestLiveSpeech.isInterim ? '#cbd5e1' : '#ffffff',
            fontSize: typeof window !== 'undefined' && window.innerWidth <= 768 ? '0.82rem' : '0.9rem',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: typeof window !== 'undefined' && window.innerWidth <= 768 ? 'nowrap' : 'normal',
            maxWidth: typeof window !== 'undefined' && window.innerWidth <= 768 ? '230px' : '580px'
          }}>
            "{latestLiveSpeech.text}"
          </span>
        </div>
      )}

      {/* Bottom Meeting Controls Dock */}
      <MeetingControls
        isAudioMuted={isAudioMuted}
        onToggleAudio={toggleAudio}
        isVideoOff={isVideoOff}
        onToggleVideo={toggleVideo}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={toggleScreenShare}
        isRecording={isRecording}
        isRecordingPaused={isRecordingPaused}
        onPauseRecording={pauseRecording}
        onResumeRecording={resumeRecording}
        recordingSeconds={recordingSeconds}
        onToggleRecording={handleOpenRecordingDialog}
        showLiveSpeech={showLiveSpeech}
        onToggleLiveSpeech={() => setShowLiveSpeech(v => !v)}
        isHandRaised={isHandRaised}
        onToggleHand={toggleHand}
        activeTab={activeTab}
        onToggleTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'chat') setUnreadChatCount(0);
        }}
        unreadChatCount={unreadChatCount}
        participantCount={remoteParticipants.length + 1}
        onLeaveCall={handleLeaveOrEnd}
        isHost={userRole === 'host'}
        roomId={roomId}
        layoutMode={layoutMode}
        onToggleLayoutMode={() => setLayoutMode(layoutMode === 'grid' ? 'stage' : 'grid')}
        audioDevices={audioDevices}
        videoDevices={videoDevices}
        selectedAudioDeviceId={selectedAudioDeviceId}
        selectedVideoDeviceId={selectedVideoDeviceId}
        onSelectAudioDevice={handleSelectAudioDevice}
        onSelectVideoDevice={handleSelectVideoDevice}
      />

      {/* Recording Management Modal */}
      <RecordingModal
        isOpen={recordingModalOpen}
        onClose={() => setRecordingModalOpen(false)}
        mode={recordingModalMode}
        onStartRecording={startRecording}
        completedRecording={completedRecording}
        onSaveToHistory={handleSaveRecordingToHistory}
      />
    </div>
  );
};
