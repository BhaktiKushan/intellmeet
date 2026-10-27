import React, { useState } from 'react';
import { ParticipantTile } from './ParticipantTile.jsx';
import {
  Monitor,
  Maximize2,
  Minimize2,
  Grid,
  Square,
  Shield,
  Radio
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

  // Assemble full participant list including local user
  const localParticipantObj = {
    socketId: 'local',
    id: currentUserId || 'local',
    name: localUser?.name || 'You',
    avatar: localUser?.avatar,
    role: isHost ? 'host' : (localUser?.role || 'participant'),
    isAudioMuted,
    isVideoOff,
    isHandRaised,
    isSpeaking: activeSpeakerId === 'local'
  };

  // Determine if there is an active presentation
  const isSomeoneSharingScreen = isScreenSharing || !!presenter;
  const isPresenterLocal = isScreenSharing;

  // Effective presenter information
  const presenterName = isPresenterLocal ? 'You' : (presenter?.name || 'A participant');
  const presenterSocketId = isPresenterLocal ? 'local' : presenter?.socketId;

  // Stream of the presenter
  const presenterStream = isPresenterLocal
    ? (screenShareStream || localStream)
    : remoteStreams[presenterSocketId];

  // Determine which participant (if any) is spotlighted / staged:
  // Priority: 1. Screen Sharing (Highest Priority) -> 2. User Pin -> 3. Grid
  const isStageModeActive = layoutMode === 'stage' || isSomeoneSharingScreen || !!pinnedSocketId;

  const togglePin = (socketId) => {
    if (pinnedSocketId === socketId) {
      setPinnedSocketId(null);
    } else {
      setPinnedSocketId(socketId);
    }
  };

  const toggleFullscreen = () => {
    const stageEl = document.getElementById('meeting-stage-container');
    if (!stageEl) return;

    if (!document.fullscreenElement) {
      stageEl.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // All participants except the one currently shown on the central stage
  const getFilmstripParticipants = () => {
    if (isSomeoneSharingScreen) {
      // Show ALL participants in the filmstrip (local + remotes)
      return [localParticipantObj, ...remoteParticipants];
    } else if (pinnedSocketId) {
      // Show everyone except the pinned one
      const all = [localParticipantObj, ...remoteParticipants];
      return all.filter(p => p.socketId !== pinnedSocketId);
    }
    return [];
  };

  // ----------------------------------------------------
  // SCENARIO 1: STAGE / PRESENTATION MODE (Screen Share or Pin)
  // ----------------------------------------------------
  if (isStageModeActive) {
    const filmstrip = getFilmstripParticipants();

    // Determine what goes on the main stage
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
          {/* Main Stage Screen Video */}
          <video
            autoPlay
            playsInline
            muted={isPresenterLocal}
            ref={(el) => {
              if (el && presenterStream) {
                if (el.srcObject !== presenterStream) {
                  el.srcObject = presenterStream;
                }
                el.play().catch(() => {});
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              background: '#040711'
            }}
          />

          {/* Presenter Indicator Header Overlay */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(10, 15, 28, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: '24px',
            padding: '6px 14px',
            color: '#ffffff',
            fontSize: '0.86rem',
            fontWeight: 600,
            zIndex: 10,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)'
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.35)',
              color: '#818cf8'
            }}>
              <Monitor size={14} />
            </span>
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

          {/* Fullscreen & Stage Actions */}
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 10
          }}>
            <button
              onClick={toggleFullscreen}
              style={{
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
                transition: 'all 0.2s ease'
              }}
              title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      );
    } else if (pinnedSocketId) {
      // A specific participant is pinned to the stage
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
            aspectRatio="16/9"
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
          overflow: 'hidden',
          padding: '12px',
          gap: '12px',
          height: '100%',
          position: 'relative'
        }}
      >
        {/* Main Center Stage (Largest Viewport for Screen Sharing) */}
        <div style={{
          flex: 1,
          height: '100%',
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
            flexDirection: 'column',
            gap: '10px',
            overflowY: 'auto',
            paddingRight: '4px',
            minWidth: '220px',
            maxWidth: '260px'
          }}
        >
          {filmstrip.map((peer) => {
            const isPeerLocal = peer.socketId === 'local';
            const peerStream = isPeerLocal ? localStream : remoteStreams[peer.socketId];
            return (
              <div
                key={peer.socketId}
                style={{
                  width: '100%',
                  aspectRatio: '16/9',
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
                  aspectRatio="16/9"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SCENARIO 2: INTELLIGENT BALANCED GRID LAYOUT
  // ----------------------------------------------------
  const allParticipants = [localParticipantObj, ...remoteParticipants];
  const count = allParticipants.length;

  // Calculate dynamic responsive grid configuration
  let gridColumns = '1fr';
  let maxWidth = '840px';
  if (count === 2) {
    gridColumns = 'repeat(auto-fit, minmax(320px, 1fr))';
    maxWidth = '1120px';
  } else if (count >= 3 && count <= 4) {
    gridColumns = 'repeat(2, 1fr)';
    maxWidth = '1160px';
  } else if (count >= 5 && count <= 6) {
    gridColumns = 'repeat(3, 1fr)';
    maxWidth = '1280px';
  } else if (count > 6) {
    gridColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
    maxWidth = '100%';
  }

  return (
    <div
      id="meeting-stage-container"
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
        height: '100%'
      }}
    >
      <div
        className="meeting-grid-canvas"
        style={{
          width: '100%',
          maxWidth,
          display: 'grid',
          gridTemplateColumns: gridColumns,
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 'auto'
        }}
      >
        {allParticipants.map((peer) => {
          const isPeerLocal = peer.socketId === 'local';
          const peerStream = isPeerLocal ? localStream : remoteStreams[peer.socketId];
          return (
            <div
              key={peer.socketId}
              style={{
                width: '100%',
                maxHeight: count <= 2 ? '68vh' : '44vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
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
                aspectRatio="16/9"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
