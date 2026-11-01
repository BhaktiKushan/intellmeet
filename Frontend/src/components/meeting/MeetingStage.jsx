import React, { useState, useMemo, useEffect } from 'react';
import { ParticipantTile } from './ParticipantTile.jsx';
import {
  Monitor,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const MeetingStage = ({
  localUser,
  localStream,
  isAudioMuted,
  isVideoOff,
  isHandRaised,
  isScreenSharing,
  screenShareStream,
  remoteParticipants = [],
  remoteStreams = {},
  presenter = null, // { socketId, name } or null
  activeSpeakerId = null,
  currentUserId,
  isHost = false,
  onHostMute,
  onHostKick,
  layoutMode = 'auto', // 'auto' | 'grid' | 'stage'
  setLayoutMode
}) => {
  const [pinnedSocketId, setPinnedSocketId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Viewport & Orientation Detection for Mobile & Desktop
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [isPortrait, setIsPortrait] = useState(() => typeof window !== 'undefined' && window.innerHeight > window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Assemble full participant list including local user
  const localParticipantObj = useMemo(() => ({
    socketId: 'local',
    id: currentUserId || 'local',
    name: localUser?.name || 'You',
    avatar: localUser?.avatar,
    role: isHost ? 'host' : (localUser?.role || 'participant'),
    isAudioMuted,
    isVideoOff,
    isHandRaised,
    isSpeaking: activeSpeakerId === 'local'
  }), [currentUserId, localUser, isHost, isAudioMuted, isVideoOff, isHandRaised, activeSpeakerId]);

  // Determine if there is an active presentation
  const isSomeoneSharingScreen = isScreenSharing || !!presenter;
  const isPresenterLocal = isScreenSharing;

  // Effective presenter information
  const presenterName = isPresenterLocal ? 'You' : (presenter?.name || 'A participant');
  const presenterSocketId = isPresenterLocal ? 'local' : presenter?.socketId;

  // Stream of the presenter
  const presenterStream = isPresenterLocal
    ? (screenShareStream || localStream)
    : (presenterSocketId ? remoteStreams[presenterSocketId] : null);

  const hasPresenterVideo = Boolean(presenterStream && presenterStream.getVideoTracks && presenterStream.getVideoTracks().length > 0);

  // Clear pin if pinned peer left the room
  useEffect(() => {
    if (pinnedSocketId && pinnedSocketId !== 'local') {
      const exists = remoteParticipants.some(p => p.socketId === pinnedSocketId);
      if (!exists) setPinnedSocketId(null);
    }
  }, [pinnedSocketId, remoteParticipants]);

  // Determine which participant (if any) is spotlighted / staged
  const isStageModeActive = layoutMode === 'stage' || isSomeoneSharingScreen || !!pinnedSocketId;

  const togglePin = (socketId) => {
    if (pinnedSocketId === socketId) {
      setPinnedSocketId(null);
    } else {
      setPinnedSocketId(socketId);
    }
  };

  const toggleFullscreen = () => {
    const stageEl = document.getElementById('meeting-stage-container') || document.documentElement;
    if (!stageEl) return;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (stageEl.requestFullscreen) {
        stageEl.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      } else if (stageEl.webkitRequestFullscreen) {
        stageEl.webkitRequestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Filmstrip participants
  const getFilmstripParticipants = () => {
    if (isSomeoneSharingScreen) {
      return [localParticipantObj, ...remoteParticipants];
    } else if (pinnedSocketId) {
      const all = [localParticipantObj, ...remoteParticipants];
      return all.filter(p => p.socketId !== pinnedSocketId);
    }
    return [];
  };

  // ----------------------------------------------------
  // SCENARIO 1: STAGE / SPOTLIGHT / SCREEN SHARE MODE
  // ----------------------------------------------------
  if (isStageModeActive) {
    const filmstrip = getFilmstripParticipants();
    let stageContent = null;

    if (isSomeoneSharingScreen) {
      stageContent = (
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: '16px',
          overflow: 'hidden',
          background: '#040711',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)'
        }}>
          {hasPresenterVideo ? (
            <video
              key={`presenter-${presenterSocketId || 'screen'}`}
              ref={(el) => {
                if (el && el.srcObject !== presenterStream) {
                  el.srcObject = presenterStream;
                }
                if (el) {
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted={isPresenterLocal}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                background: '#020409'
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <Monitor size={48} color="#6366f1" style={{ marginBottom: '12px' }} />
              <p>Connecting to {presenterName}'s screen share presentation...</p>
            </div>
          )}

          {/* Presenter Name Pill */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(10, 15, 28, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#ffffff',
            fontSize: '0.85rem',
            fontWeight: 600,
            zIndex: 10
          }}>
            <Monitor size={14} color="#818cf8" />
            <span>{presenterName} is presenting</span>
            {isPresenterLocal && (
              <span style={{
                background: 'rgba(16, 185, 129, 0.25)',
                color: '#34d399',
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 700
              }}>
                You
              </span>
            )}
          </div>
        </div>
      );
    } else if (pinnedSocketId) {
      const pinnedPeer = pinnedSocketId === 'local'
        ? localParticipantObj
        : remoteParticipants.find(p => p.socketId === pinnedSocketId);

      const pinnedStream = pinnedSocketId === 'local'
        ? localStream
        : remoteStreams[pinnedSocketId];

      if (pinnedPeer) {
        stageContent = (
          <ParticipantTile
            peer={pinnedPeer}
            stream={pinnedStream}
            isLocal={pinnedSocketId === 'local'}
            isPinned={true}
            onPin={togglePin}
            isHost={isHost}
            currentUserId={currentUserId}
            onHostMute={onHostMute}
            onHostKick={onHostKick}
            aspectRatio="auto"
          />
        );
      }
    }

    return (
      <div
        id="meeting-stage-container"
        className="meeting-stage-layout"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          overflow: 'hidden',
          padding: isMobile ? '8px' : '14px',
          gap: isMobile ? '8px' : '14px',
          height: '100%',
          position: 'relative'
        }}
      >
        {/* Main Center Stage */}
        <div style={{
          flex: 1,
          height: isMobile ? '70%' : '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 0,
          minHeight: 0
        }}>
          {stageContent}
        </div>

        {/* Filmstrip (Participant Video Cards) */}
        <div
          className="meeting-filmstrip"
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'column',
            gap: '8px',
            overflowX: isMobile ? 'auto' : 'hidden',
            overflowY: isMobile ? 'hidden' : 'auto',
            paddingRight: isMobile ? '0' : '4px',
            width: isMobile ? '100%' : '240px',
            height: isMobile ? '30%' : '100%',
            flexShrink: 0
          }}
        >
          {filmstrip.map((peer) => {
            const isPeerLocal = peer.socketId === 'local';
            const peerStream = isPeerLocal ? localStream : remoteStreams[peer.socketId];
            return (
              <div
                key={peer.socketId}
                style={{
                  width: isMobile ? '160px' : '100%',
                  height: isMobile ? '100%' : 'auto',
                  aspectRatio: isMobile ? 'auto' : '16/9',
                  flexShrink: 0,
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}
              >
                <ParticipantTile
                  peer={peer}
                  stream={peerStream}
                  isLocal={isPeerLocal}
                  isPinned={pinnedSocketId === peer.socketId}
                  onPin={togglePin}
                  isHost={isHost}
                  currentUserId={currentUserId}
                  onHostMute={onHostMute}
                  onHostKick={onHostKick}
                  aspectRatio="auto"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SCENARIO 2: INTELLIGENT ADAPTIVE GRID LAYOUT (1 to 16+ Participants)
  // ----------------------------------------------------
  // Maintain a strictly stable participant grid:
  // - Local participant is always fixed at position 0.
  // - Remote participants maintain fixed positions throughout the meeting.
  // - Tiles are NEVER reordered when someone speaks, preventing flickering or video stream swapping.
  // - The active speaker is clearly highlighted with a glowing border/ring without moving their tile.
  const stableParticipants = useMemo(() => {
    const stableRemotes = [...remoteParticipants].sort((a, b) => {
      const idA = a.socketId || a.id || '';
      const idB = b.socketId || b.id || '';
      return idA.localeCompare(idB);
    });
    return [localParticipantObj, ...stableRemotes];
  }, [localParticipantObj, remoteParticipants]);

  const count = stableParticipants.length;

  // Calculate dynamic responsive grid configuration based on participant count & orientation
  let gridColumns = '1fr';
  let gridRows = '1fr';
  let maxWidth = '100%';
  let maxHeight = '100%';

  if (isMobile && isPortrait) {
    if (count === 1) {
      gridColumns = '1fr';
      gridRows = '1fr';
    } else if (count === 2) {
      gridColumns = '1fr';
      gridRows = '1fr 1fr';
    } else if (count === 3 || count === 4) {
      gridColumns = 'repeat(2, 1fr)';
      gridRows = 'repeat(2, 1fr)';
    } else if (count === 5 || count === 6) {
      gridColumns = 'repeat(2, 1fr)';
      gridRows = 'repeat(3, 1fr)';
    } else {
      gridColumns = 'repeat(2, 1fr)';
      gridRows = 'auto';
    }
  } else {
    // Landscape or Desktop / Laptop
    if (count === 1) {
      gridColumns = '1fr';
      gridRows = '1fr';
      maxWidth = '980px';
      maxHeight = '75vh';
    } else if (count === 2) {
      gridColumns = 'repeat(2, 1fr)';
      gridRows = '1fr';
      maxWidth = '1240px';
      maxHeight = '68vh';
    } else if (count === 3) {
      gridColumns = 'repeat(3, 1fr)';
      gridRows = '1fr';
      maxWidth = '1360px';
      maxHeight = '56vh';
    } else if (count === 4) {
      gridColumns = 'repeat(2, 1fr)';
      gridRows = 'repeat(2, 1fr)';
      maxWidth = '1200px';
      maxHeight = '72vh';
    } else if (count <= 6) {
      gridColumns = 'repeat(3, 1fr)';
      gridRows = 'repeat(2, 1fr)';
      maxWidth = '1380px';
      maxHeight = '72vh';
    } else if (count <= 8) {
      gridColumns = 'repeat(4, 1fr)';
      gridRows = 'repeat(2, 1fr)';
      maxWidth = '1480px';
      maxHeight = '72vh';
    } else {
      gridColumns = 'repeat(4, 1fr)';
      gridRows = 'auto';
      maxWidth = '1540px';
    }
  }

  return (
    <div
      id="meeting-stage-container"
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '8px' : '16px',
        overflowY: count > 6 && isMobile ? 'auto' : 'hidden',
        position: 'relative'
      }}
    >
      {/* Quick Fullscreen Toggle Button */}
      <button
        onClick={toggleFullscreen}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'rgba(10, 15, 28, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 20
        }}
        title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>

      {/* Dynamic Adaptive Video Grid Canvas */}
      <div
        className="meeting-grid-canvas"
        style={{
          width: '100%',
          height: (count <= 6 || !isMobile) ? '100%' : 'auto',
          maxWidth,
          maxHeight,
          display: 'grid',
          gridTemplateColumns: gridColumns,
          gridTemplateRows: gridRows,
          gap: isMobile ? '8px' : '14px',
          alignItems: 'stretch',
          justifyContent: 'center',
          margin: 'auto'
        }}
      >
        {stableParticipants.map((peer, idx) => {
          const isPeerLocal = peer.socketId === 'local';
          const peerStream = isPeerLocal ? localStream : remoteStreams[peer.socketId];
          const isOddLastTileOnMobile = isMobile && isPortrait && count === 3 && idx === 2;

          return (
            <div
              key={peer.socketId}
              style={{
                width: '100%',
                height: '100%',
                minHeight: isMobile && isPortrait && count > 2 ? '140px' : (isMobile ? '180px' : '200px'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gridColumn: isOddLastTileOnMobile ? '1 / -1' : undefined,
                borderRadius: '16px',
                overflow: 'hidden'
              }}
            >
              <ParticipantTile
                peer={peer}
                stream={peerStream}
                isLocal={isPeerLocal}
                isPinned={pinnedSocketId === peer.socketId}
                onPin={togglePin}
                isHost={isHost}
                currentUserId={currentUserId}
                onHostMute={onHostMute}
                onHostKick={onHostKick}
                aspectRatio="auto"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MeetingStage;
