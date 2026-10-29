import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  Radio,
  Shield,
  Copy,
  Check,
  Volume2,
  AlertCircle,
  ArrowLeft,
  Users
} from 'lucide-react';

export const MeetingLobby = ({
  roomId,
  meeting,
  user,
  onJoin,
  onCancel,
  localStream,
  isAudioMuted,
  isVideoOff,
  onToggleAudio,
  onToggleVideo,
  audioDevices = [],
  videoDevices = [],
  audioOutputDevices = [],
  selectedAudioDeviceId,
  selectedVideoDeviceId,
  selectedAudioOutputDeviceId,
  onSelectAudioDevice,
  onSelectVideoDevice,
  onSelectAudioOutputDevice,
  permissionError
}) => {
  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  const [audioLevel, setAudioLevel] = useState(0);
  const [displayName, setDisplayName] = useState(user?.name || 'Guest User');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);

  // Bind video element to local stream
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Real-time audio volume visualizer using Web Audio API AnalyserNode
  useEffect(() => {
    if (!localStream || isAudioMuted) {
      setAudioLevel(0);
      return;
    }

    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const micStream = new MediaStream([audioTracks[0]]);
      const source = audioCtx.createMediaStreamSource(micStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const level = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(level);
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('[Lobby Audio Meter] Web Audio not available:', e.message);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch (e) {}
      }
    };
  }, [localStream, isAudioMuted]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div style={{
      maxWidth: '1040px',
      margin: '32px auto',
      padding: '16px',
      position: 'relative',
      zIndex: 1
    }}>
      {/* Top Breadcrumb / Return */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={onCancel}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            color: '#475569',
            fontSize: '0.88rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Permission Warning Notice if Camera / Mic Denied */}
      {permissionError && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.88rem'
        }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Device Permission Required:</strong> {permissionError}. Please allow camera and microphone access in your browser address bar to participate with audio and video.
          </div>
        </div>
      )}

      {/* Main Pre-Join Container */}
      <div
        className="glass-panel lobby-container"
        style={{
          borderRadius: '20px',
          padding: '36px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '36px',
          alignItems: 'center',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)'
        }}
      >
        {/* Left Column: Video Preview Box & Level Meter */}
        <div>
          <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            borderRadius: '16px',
            overflow: 'hidden',
            background: '#070a14',
            border: '2px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            {/* Local Camera Video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: isMirrored ? 'scaleX(-1)' : 'none',
                display: isVideoOff ? 'none' : 'block'
              }}
            />

            {/* Avatar Fallback if camera is off */}
            {isVideoOff && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
                  alt="avatar"
                  style={{
                    width: '92px',
                    height: '92px',
                    borderRadius: '50%',
                    marginBottom: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    objectFit: 'cover'
                  }}
                />
                <div style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 600 }}>Camera is Turned Off</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                  Others will see your profile photo
                </div>
              </div>
            )}

            {/* Quick Preview Toggles (Floating in video preview bottom) */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              zIndex: 10
            }}>
              <button
                onClick={onToggleAudio}
                className={`control-btn ${isAudioMuted ? 'control-btn-danger' : 'control-btn-active'}`}
                style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0 }}
                title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <button
                onClick={onToggleVideo}
                className={`control-btn ${isVideoOff ? 'control-btn-danger' : 'control-btn-active'}`}
                style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0 }}
                title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              >
                {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            </div>

            {/* Mirror Toggle Top Right */}
            <button
              onClick={() => setIsMirrored(!isMirrored)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0, 0, 0, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                borderRadius: '20px',
                padding: '4px 10px',
                fontSize: '0.72rem',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)'
              }}
            >
              {isMirrored ? 'Mirrored' : 'Normal'}
            </button>
          </div>

          {/* Real-Time Microphone Volume Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#f8fafc',
            padding: '10px 14px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <Volume2 size={16} color={audioLevel > 15 ? '#059669' : '#94a3b8'} />
            <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${audioLevel}%`,
                  background: 'linear-gradient(90deg, #059669 0%, #0284c7 100%)',
                  borderRadius: '3px',
                  transition: 'width 0.1s ease-out'
                }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', minWidth: '48px', fontWeight: 500 }}>
              {isAudioMuted ? 'Muted' : audioLevel > 15 ? 'Speaking' : 'Quiet'}
            </span>
          </div>
        </div>

        {/* Right Column: Meeting Info, Display Name & Device Selectors */}
        <div>
          {/* Header Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(79, 70, 229, 0.08)',
            border: '1px solid rgba(79, 70, 229, 0.25)',
            color: '#4f46e5',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 600,
            marginBottom: '12px'
          }}>
            <Radio size={14} color="#4f46e5" />
            <span>Ready to Join</span>
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            {meeting?.title || 'Enterprise Conference'}
          </h2>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '24px',
            color: '#64748b',
            fontSize: '0.88rem'
          }}>
            <span>Room Code:</span>
            <button
              onClick={copyCode}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '4px 10px',
                color: '#4f46e5',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <span>{roomId}</span>
              {copiedCode ? <Check size={12} color="#059669" /> : <Copy size={12} />}
            </button>
          </div>

          {/* User Display Name Confirmation */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Your Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-field"
              placeholder="Enter your name"
            />
          </div>

          {/* Device Selection Dropdowns (Microphone & Camera) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
            {/* Microphone Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                Microphone
              </label>
              <select
                value={selectedAudioDeviceId}
                onChange={(e) => onSelectAudioDevice(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.82rem', padding: '8px 10px' }}
              >
                {audioDevices.length === 0 && <option value="">Default Microphone</option>}
                {audioDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Mic ${d.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Camera Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                Camera
              </label>
              <select
                value={selectedVideoDeviceId}
                onChange={(e) => onSelectVideoDevice(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.82rem', padding: '8px 10px' }}
              >
                {videoDevices.length === 0 && <option value="">Default Camera</option>}
                {videoDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Join Actions */}
          <div style={{ display: 'flex', gap: '14px' }}>
            <button
              onClick={onCancel}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '12px', borderRadius: '10px' }}
            >
              Cancel
            </button>
            <button
              onClick={() => onJoin(displayName)}
              className="btn btn-primary"
              style={{
                flex: 2,
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '0.98rem',
                fontWeight: 600
              }}
            >
              <Video size={18} />
              <span>Join Meeting</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingLobby;
