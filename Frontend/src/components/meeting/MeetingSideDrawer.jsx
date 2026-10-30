import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Users,
  Edit3,
  Send,
  Mic,
  MicOff,
  Video,
  VideoOff,
  UserX,
  Shield,
  ShieldAlert,
  Search,
  Lock,
  Unlock,
  Check,
  Copy,
  Info,
  Sparkles,
  Globe
} from 'lucide-react';

export const MeetingSideDrawer = ({
  activeTab,
  onClose,
  chatMessages = [],
  onSendChat,
  participants = [], // Array of remote participants
  localUser,
  isAudioMuted,
  isVideoOff,
  isHost = false,
  onHostMuteUser,
  onHostMuteAll,
  onHostKickUser,
  allowScreenShare = true,
  onToggleScreenSharePermission,
  sharedNotes = '',
  onUpdateNotes,
  roomId,
  meeting,
  transcriptLog = [],
  targetLanguage = 'none',
  onSelectTargetLanguage
}) => {
  const [chatInput, setChatInput] = useState('');
  const [participantSearch, setParticipantSearch] = useState('');
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  if (!activeTab) return null;

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyFullTranscript = () => {
    if (!transcriptLog || transcriptLog.length === 0) return;
    const formatted = transcriptLog.map(t => {
      let turn = `[${t.timestamp || '00:00'}] ${t.speaker || 'Participant'}: ${t.text}`;
      if (t.translation) {
        turn += `\n  🌐 (${(t.targetLanguage || 'Translated').toUpperCase()}): ${t.translation}`;
      }
      return turn;
    }).join('\n\n');
    navigator.clipboard.writeText(formatted);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  // Filter participants
  const allParticipants = [
    {
      socketId: 'local',
      name: localUser?.name || 'You',
      avatar: localUser?.avatar,
      role: isHost ? 'host' : (localUser?.role || 'participant'),
      isAudioMuted,
      isVideoOff,
      isLocal: true
    },
    ...participants.map(p => ({ ...p, isLocal: false }))
  ];

  const filteredParticipants = allParticipants.filter(p =>
    (p.name || '').toLowerCase().includes(participantSearch.toLowerCase())
  );

  return (
    <aside
      className="meeting-side-drawer glass-panel"
      style={{
        width: '360px',
        height: '100%',
        borderRadius: 0,
        borderLeft: '1px solid var(--border-subtle)',
        borderTop: 'none',
        borderBottom: 'none',
        borderRight: 'none',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 35,
        background: 'rgba(10, 15, 26, 0.96)',
        backdropFilter: 'blur(24px)'
      }}
    >
      {/* Drawer Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeTab === 'chat' && <MessageSquare size={18} color="#818cf8" />}
          {activeTab === 'participants' && <Users size={18} color="#818cf8" />}
          {activeTab === 'transcript' && <Sparkles size={18} color="#818cf8" />}
          {activeTab === 'notes' && <Edit3 size={18} color="#818cf8" />}
          {activeTab === 'info' && <Info size={18} color="#818cf8" />}
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
            {activeTab === 'chat' && 'In-Meeting Chat'}
            {activeTab === 'participants' && `Participants (${allParticipants.length})`}
            {activeTab === 'transcript' && 'Live AI Transcript & Translation'}
            {activeTab === 'notes' && 'Shared Collaborative Notes'}
            {activeTab === 'info' && 'Meeting Information'}
          </h3>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Close drawer"
        >
          <X size={18} />
        </button>
      </div>

      {/* ---------------- CHAT TAB ---------------- */}
      {activeTab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Chat Messages Body */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {chatMessages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: 'var(--text-dim)',
                fontSize: '0.85rem',
                margin: 'auto',
                padding: '24px'
              }}>
                <MessageSquare size={32} color="var(--border-subtle)" style={{ marginBottom: '10px' }} />
                <p>No messages sent yet.</p>
                <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>Messages sent here are visible to all meeting participants.</p>
              </div>
            ) : (
              chatMessages.map((msg, i) => {
                const isMe = msg.senderId === localUser?._id || msg.sender === localUser?.name;
                return (
                  <div key={msg.id || i} style={{ textAlign: isMe ? 'right' : 'left' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '3px',
                      justifyContent: isMe ? 'flex-end' : 'flex-start'
                    }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isMe ? '#818cf8' : '#a5b4fc' }}>
                        {isMe ? 'You' : msg.sender}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div style={{
                      display: 'inline-block',
                      background: isMe ? 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)' : 'rgba(255, 255, 255, 0.07)',
                      color: '#ffffff',
                      padding: '8px 14px',
                      borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      fontSize: '0.88rem',
                      lineHeight: 1.4,
                      maxWidth: '85%',
                      wordBreak: 'break-word',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Input Form */}
          <form
            onSubmit={handleChatSubmit}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '8px',
              background: 'rgba(8, 12, 20, 0.6)'
            }}
          >
            <input
              type="text"
              placeholder="Send message to everyone..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="input-field"
              style={{ padding: '9px 14px', fontSize: '0.88rem' }}
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="btn btn-primary"
              style={{ padding: '0 14px', height: '40px', borderRadius: '10px' }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {/* ---------------- PARTICIPANTS TAB ---------------- */}
      {activeTab === 'participants' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search bar */}
          <div style={{ padding: '12px 16px 8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search participants..."
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '32px', fontSize: '0.82rem', padding: '7px 10px 7px 32px' }}
              />
            </div>
          </div>

          {/* Host Management Controls (Visible to Host only) */}
          {isHost && (
            <div style={{
              margin: '0 16px 8px',
              padding: '10px 12px',
              background: 'rgba(99, 102, 241, 0.1)',
              borderRadius: '10px',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Shield size={14} color="#818cf8" />
                <span>Host Controls:</span>
              </span>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={onHostMuteAll}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.72rem', borderRadius: '6px' }}
                  title="Mute all participants"
                >
                  <MicOff size={12} color="#f87171" />
                  <span>Mute All</span>
                </button>

                <button
                  onClick={() => onToggleScreenSharePermission(!allowScreenShare)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.72rem', borderRadius: '6px' }}
                  title={allowScreenShare ? 'Lock screen sharing for members' : 'Allow members to share screen'}
                >
                  {allowScreenShare ? <Unlock size={12} color="#34d399" /> : <Lock size={12} color="#f87171" />}
                  <span>{allowScreenShare ? 'Sharing On' : 'Locked'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Participants List */}
          <div style={{
            flex: 1,
            padding: '8px 16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {filteredParticipants.map((p) => (
              <div
                key={p.socketId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                {/* User avatar & info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <img
                    src={p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`}
                    alt={p.name}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name} {p.isLocal && '(You)'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: p.role === 'host' ? '#818cf8' : 'var(--text-dim)', textTransform: 'capitalize' }}>
                      {p.role || 'Participant'}
                    </div>
                  </div>
                </div>

                {/* Status & Host Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {/* Mic status */}
                  {p.isAudioMuted ? (
                    <MicOff size={14} color="#f87171" />
                  ) : (
                    <Mic size={14} color="#34d399" />
                  )}

                  {/* Camera status */}
                  {p.isVideoOff ? (
                    <VideoOff size={14} color="#f87171" />
                  ) : (
                    <Video size={14} color="#34d399" />
                  )}

                  {/* Host Quick Actions for Remote Peer */}
                  {isHost && !p.isLocal && (
                    <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
                      <button
                        onClick={() => onHostMuteUser(p.socketId)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: 'none',
                          color: '#f87171',
                          borderRadius: '6px',
                          padding: '4px',
                          cursor: 'pointer'
                        }}
                        title="Mute participant"
                      >
                        <MicOff size={12} />
                      </button>
                      <button
                        onClick={() => onHostKickUser(p.socketId)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: 'none',
                          color: '#f87171',
                          borderRadius: '6px',
                          padding: '4px',
                          cursor: 'pointer'
                        }}
                        title="Remove participant"
                      >
                        <UserX size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- TRANSCRIPT & TRANSLATION TAB ---------------- */}
      {activeTab === 'transcript' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Controls Bar: Target Language + Search */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#a5b4fc', fontWeight: 600 }}>
                <Globe size={15} color="#818cf8" />
                <span>Live AI Translation:</span>
              </div>
              <select
                value={targetLanguage}
                onChange={(e) => onSelectTargetLanguage?.(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.78rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="none">Off (Original Audio)</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="es">Spanish (Español)</option>
                <option value="fr">French (Français)</option>
                <option value="de">German (Deutsch)</option>
                <option value="ja">Japanese (日本語)</option>
                <option value="zh">Chinese (中文)</option>
                <option value="ar">Arabic (العربية)</option>
                <option value="pt">Portuguese (Português)</option>
                <option value="ru">Russian (Русский)</option>
                <option value="it">Italian (Italiano)</option>
                <option value="bn">Bengali (বাংলা)</option>
              </select>
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                value={transcriptSearch}
                onChange={(e) => setTranscriptSearch(e.target.value)}
                placeholder="Search spoken turns..."
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Transcript Turns List */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {transcriptLog.length === 0 ? (
              <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-dim)', padding: '24px' }}>
                <Sparkles size={28} color="#818cf8" style={{ marginBottom: '8px', opacity: 0.8 }} />
                <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Listening for meeting speech...
                </p>
                <p style={{ fontSize: '0.78rem', marginTop: '6px' }}>
                  Speak through your microphone to see continuous real-time transcription and multilingual AI translation.
                </p>
              </div>
            ) : (
              transcriptLog
                .filter(t => !transcriptSearch || (t.text || '').toLowerCase().includes(transcriptSearch.toLowerCase()) || (t.translation || '').toLowerCase().includes(transcriptSearch.toLowerCase()) || (t.speaker || '').toLowerCase().includes(transcriptSearch.toLowerCase()))
                .map((turn, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px 12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8' }}>
                        {turn.speaker || 'Speaker'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        {turn.timestamp || '00:00'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.84rem', color: '#f8fafc', lineHeight: 1.4 }}>
                      "{turn.text}"
                    </div>

                    {turn.translation && (
                      <div style={{
                        marginTop: '6px',
                        paddingTop: '6px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        fontSize: '0.82rem',
                        color: '#38bdf8',
                        lineHeight: 1.4
                      }}>
                        <span style={{ fontSize: '0.68rem', background: 'rgba(56, 189, 248, 0.15)', color: '#7dd3fc', padding: '1px 5px', borderRadius: '3px', marginRight: '6px', fontWeight: 700 }}>
                          {(turn.targetLanguage || targetLanguage).toUpperCase()}
                        </span>
                        {turn.translation}
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>

          {/* Transcript Bottom Action */}
          {transcriptLog.length > 0 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(10, 15, 26, 0.8)' }}>
              <button
                onClick={copyFullTranscript}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {copiedTranscript ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                <span>{copiedTranscript ? 'Copied Full Transcript!' : 'Copy Entire Transcript'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---------------- SHARED NOTES TAB ---------------- */}
      {activeTab === 'notes' && (
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Real-time collaborative notes. All participants see synchronized updates.
          </p>
          <textarea
            value={sharedNotes}
            onChange={(e) => onUpdateNotes(e.target.value)}
            style={{
              flex: 1,
              width: '100%',
              background: 'rgba(15, 23, 42, 0.85)',
              color: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '14px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              resize: 'none',
              outline: 'none'
            }}
            placeholder="Type meeting notes, action items, or agenda points here..."
          />
        </div>
      )}

      {/* ---------------- INFO TAB ---------------- */}
      {activeTab === 'info' && (
        <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
              Meeting Title
            </label>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
              {meeting?.title || 'Enterprise Conference'}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
              Room Code
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '8px 12px',
              borderRadius: '8px',
              marginTop: '4px'
            }}>
              <code style={{ color: '#818cf8', fontWeight: 700 }}>{roomId}</code>
              <button
                onClick={copyRoomLink}
                style={{ background: 'transparent', border: 'none', color: '#a5b4fc', cursor: 'pointer' }}
              >
                {copiedLink ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <button
            onClick={copyRoomLink}
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', borderRadius: '10px' }}
          >
            {copiedLink ? 'Copied Join Link!' : 'Copy Shareable Link'}
          </button>
        </div>
      )}
    </aside>
  );
};
