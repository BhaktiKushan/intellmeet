import React, { useRef, useEffect, useState } from 'react';
import {
  Mic,
  MicOff,
  Hand,
  MoreVertical,
  Pin,
  PinOff,
  UserX,
  Volume2,
  VolumeX,
  Monitor,
  Shield,
  Wifi
} from 'lucide-react';

export const ParticipantTile = ({
  peer,
  stream,
  isLocal = false,
  isScreenShare = false,
  isPinned = false,
  onPin,
  isHost = false,
  currentUserId,
  onHostMute,
  onHostKick,
  aspectRatio = '16/9'
}) => {
  const videoRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isAudioElementMuted, setIsAudioElementMuted] = useState(false);

  const [, setTrackRevision] = useState(0);

  // Re-evaluate whenever tracks are added or removed dynamically
  useEffect(() => {
    if (!stream || typeof stream.addEventListener !== 'function') return;
    const handleTracks = () => setTrackRevision(r => r + 1);
    try {
      stream.addEventListener('addtrack', handleTracks);
      stream.addEventListener('removetrack', handleTracks);
      const audioTracks = stream.getAudioTracks ? stream.getAudioTracks() : [];
      const videoTracks = stream.getVideoTracks ? stream.getVideoTracks() : [];
      audioTracks.forEach(t => {
        t.addEventListener('unmute', handleTracks);
        t.addEventListener('ended', handleTracks);
      });
      videoTracks.forEach(t => {
        t.addEventListener('unmute', handleTracks);
        t.addEventListener('ended', handleTracks);
      });
    } catch (e) {}
    return () => {
      try {
        stream.removeEventListener('addtrack', handleTracks);
        stream.removeEventListener('removetrack', handleTracks);
      } catch (e) {}
    };
  }, [stream]);

  const hasVideoStream = Boolean(stream && typeof stream.getVideoTracks === 'function' && stream.getVideoTracks().length > 0 && !peer.isVideoOff);
  const isSpeaking = peer.isSpeaking && !peer.isAudioMuted;

  useEffect(() => {
    const el = videoRef.current;
    if (el && stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch(() => {});
    }
  }, [stream, isLocal, hasVideoStream]);

  // Toggle local speaker audio for this specific remote peer
  const toggleMutePeerAudio = (e) => {
    e.stopPropagation();
    const nextMuted = !isAudioElementMuted;
    setIsAudioElementMuted(nextMuted);
    if (stream && typeof stream.getAudioTracks === 'function') {
      stream.getAudioTracks().forEach(t => {
        t.enabled = !nextMuted;
      });
    }
  };

  return (
    <div
      className={`participant-tile ${isSpeaking ? 'participant-tile-speaking' : ''} ${peer.isHandRaised ? 'participant-tile-hand-raised' : ''}`}
      style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#0d1322',
        aspectRatio: (aspectRatio && aspectRatio !== 'auto') ? aspectRatio : undefined,
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isSpeaking
          ? '0 0 0 2px #06b6d4, 0 8px 24px rgba(6, 182, 212, 0.35)'
          : peer.isHandRaised
          ? '0 0 0 2px #f59e0b, 0 8px 24px rgba(245, 158, 11, 0.35)'
          : 'var(--shadow-md)',
        border: isSpeaking
          ? '2px solid #06b6d4'
          : peer.isHandRaised
          ? '2px solid #f59e0b'
          : '1px solid var(--border-subtle)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        userSelect: 'none'
      }}
    >
      {/* Video Element (Direct hardware-accelerated video rendering) */}
      <video
        key={`video-elem-${peer.socketId}`}
        ref={(el) => {
          videoRef.current = el;
          if (el && stream) {
            if (el.srcObject !== stream) {
              el.srcObject = stream;
            }
            el.play().catch(() => {});
          }
        }}
        autoPlay
        playsInline
        muted={true}
        style={{
          width: '100%',
          height: '100%',
          objectFit: isScreenShare ? 'contain' : 'cover',
          transform: isLocal && !isScreenShare ? 'scaleX(-1)' : 'none',
          position: 'absolute',
          inset: 0,
          opacity: hasVideoStream ? 1 : 0,
          pointerEvents: hasVideoStream ? 'auto' : 'none',
          background: '#050811'
        }}
      />

      {/* Fallback Avatar when camera is turned off */}
      {!hasVideoStream && (
        <div style={{
          textAlign: 'center',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            position: 'relative',
            width: '84px',
            height: '84px',
            marginBottom: '12px'
          }}>
            <img
              src={peer.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${peer.name || 'User'}`}
              alt={peer.name}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)'
              }}
            />
            {isSpeaking && (
              <span className="speaking-wave-ring" />
            )}
          </div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
            {peer.name} {isLocal && '(You)'}
          </div>
          <div style={{
            fontSize: '0.74rem',
            color: '#a5b4fc',
            textTransform: 'capitalize',
            marginTop: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {peer.role === 'host' && <Shield size={12} color="#818cf8" />}
            {peer.role || 'Participant'}
          </div>
        </div>
      )}

      {/* Top Left: Hand Raised Badge */}
      {peer.isHandRaised && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          background: 'rgba(245, 158, 11, 0.92)',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '4px 10px',
          fontSize: '0.75rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backdropFilter: 'blur(8px)',
          zIndex: 5,
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
        }}>
          <Hand size={13} />
          <span>Hand Raised</span>
        </div>
      )}

      {/* Top Right: Pin & Quick Tile Controls */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        zIndex: 5
      }}>
        {onPin && (
          <button
            onClick={(e) => { e.stopPropagation(); onPin(peer.socketId); }}
            style={{
              background: isPinned ? 'rgba(99, 102, 241, 0.85)' : 'rgba(0, 0, 0, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease'
            }}
            title={isPinned ? 'Unpin participant' : 'Pin to main view'}
          >
            {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
        )}

        {/* Remote audio mute toggle */}
        {!isLocal && (
          <button
            onClick={toggleMutePeerAudio}
            style={{
              background: isAudioElementMuted ? 'rgba(239, 68, 68, 0.85)' : 'rgba(0, 0, 0, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)'
            }}
            title={isAudioElementMuted ? 'Unmute on your speakers' : 'Mute for yourself'}
          >
            {isAudioElementMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        )}

        {/* Host Management Dropdown (if viewer is host & this is a remote peer) */}
        {isHost && !isLocal && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              style={{
                background: 'rgba(0, 0, 0, 0.55)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)'
              }}
              title="Host Actions"
            >
              <MoreVertical size={14} />
            </button>

            {showMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '38px',
                  right: 0,
                  background: 'rgba(15, 23, 42, 0.96)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '6px',
                  width: '180px',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    if (onHostMute) onHostMute(peer.socketId);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  className="hover-bg-subtle"
                >
                  <MicOff size={14} color="#f87171" />
                  <span>Mute Participant</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    if (onHostKick) onHostKick(peer.socketId);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f87171',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  className="hover-bg-subtle"
                >
                  <UserX size={14} />
                  <span>Remove From Meeting</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar: Participant Name & Badges */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        right: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'none'
      }}>
        {/* Name Tag Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(10, 15, 26, 0.75)',
          backdropFilter: 'blur(10px)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.8rem',
          color: '#ffffff',
          fontWeight: 500,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          maxWidth: '80%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {peer.name} {isLocal && '(You)'}
          </span>

          {/* Role Badge */}
          {peer.role === 'host' && (
            <span style={{
              background: 'rgba(99, 102, 241, 0.25)',
              color: '#818cf8',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '10px',
              border: '1px solid rgba(99, 102, 241, 0.4)'
            }}>
              Host
            </span>
          )}

          {isScreenShare && (
            <span style={{
              background: 'rgba(16, 185, 129, 0.25)',
              color: '#34d399',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Monitor size={10} />
              <span>Presenting</span>
            </span>
          )}

          {/* Muted indicator */}
          {peer.isAudioMuted ? (
            <MicOff size={13} color="#f87171" />
          ) : isSpeaking ? (
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#34d399',
              boxShadow: '0 0 6px #34d399'
            }} />
          ) : null}
        </div>

        {/* Network Quality Indicator */}
        <div style={{
          background: 'rgba(10, 15, 26, 0.75)',
          backdropFilter: 'blur(10px)',
          padding: '4px 8px',
          borderRadius: '20px',
          fontSize: '0.72rem',
          color: '#34d399',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Wifi size={12} color="#34d399" />
        </div>
      </div>
    </div>
  );
};
