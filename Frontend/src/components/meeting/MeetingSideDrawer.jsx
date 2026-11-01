import React, { useState, useRef, useEffect } from 'react';
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
  Search,
  Lock,
  Unlock,
  Check,
  Copy,
  Info,
  Sparkles,
  Bot,
  CornerDownLeft,
  Loader2,
  FileText,
  ListTodo,
  CheckCircle2,
  Lightbulb
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
  liveTopic = null,
  transcriptLog = [],
  latestLiveSpeech = null,
  aiAssistantChat = [],
  onAskAssistant,
  isAiThinking = false
}) => {
  const [chatInput, setChatInput] = useState('');
  const [assistantInput, setAssistantInput] = useState('');
  const [participantSearch, setParticipantSearch] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  const assistantEndRef = useRef(null);
  const voiceRecognitionRef = useRef(null);

  // Auto-scroll AI assistant conversation on new messages
  useEffect(() => {
    if (activeTab === 'assistant' && assistantEndRef.current) {
      assistantEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiAssistantChat, activeTab, isAiThinking]);

  if (!activeTab) return null;

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  const handleAssistantSubmit = (e) => {
    if (e) e.preventDefault();
    if (!assistantInput.trim() || isAiThinking) return;
    onAskAssistant?.(assistantInput.trim());
    setAssistantInput('');
  };

  const handleQuickPrompt = (promptText) => {
    if (isAiThinking) return;
    onAskAssistant?.(promptText);
  };

  // Quick Voice Query for AI Assistant (Laptop & Mobile)
  const toggleVoiceQuery = () => {
    if (isVoiceListening) {
      if (voiceRecognitionRef.current) {
        try { voiceRecognitionRef.current.stop(); } catch (e) {}
      }
      setIsVoiceListening(false);
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Speech recognition is not supported in this browser. Please type your query in the input box.');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => setIsVoiceListening(true);
      rec.onresult = (evt) => {
        const spoken = evt.results?.[0]?.[0]?.transcript || '';
        if (spoken.trim()) {
          setAssistantInput(spoken.trim());
          onAskAssistant?.(spoken.trim());
        }
      };
      rec.onerror = () => setIsVoiceListening(false);
      rec.onend = () => setIsVoiceListening(false);

      voiceRecognitionRef.current = rec;
      rec.start();
    } catch (e) {
      setIsVoiceListening(false);
    }
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Assemble full participant list including local user
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
        width: '380px',
        maxWidth: '100vw',
        height: '100%',
        borderRadius: 0,
        borderLeft: '1px solid var(--border-subtle)',
        borderTop: 'none',
        borderBottom: 'none',
        borderRight: 'none',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 35,
        background: 'rgba(10, 15, 26, 0.98)',
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
          {activeTab === 'conversation' && <FileText size={18} color="#10b981" />}
          {activeTab === 'assistant' && <Sparkles size={18} color="#c084fc" />}
          {activeTab === 'chat' && <MessageSquare size={18} color="#818cf8" />}
          {activeTab === 'participants' && <Users size={18} color="#818cf8" />}
          {activeTab === 'notes' && <Edit3 size={18} color="#818cf8" />}
          {activeTab === 'info' && <Info size={18} color="#818cf8" />}
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            {activeTab === 'conversation' && 'Live AI Speech Feed'}
            {activeTab === 'assistant' && 'AI Meeting Assistant'}
            {activeTab === 'chat' && 'In-Meeting Chat'}
            {activeTab === 'participants' && `Participants (${allParticipants.length})`}
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

      {/* ---------------- IN-MEETING AI ASSISTANT TAB ---------------- */}
      {activeTab === 'assistant' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Active Live Topic Card */}
          {liveTopic && liveTopic.topic && (
            <div style={{
              margin: '12px 14px 6px',
              padding: '12px 14px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.65rem', background: '#6366f1', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
                  Live Topic
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                  {liveTopic.topic}
                </span>
              </div>
              {liveTopic.summary && (
                <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0, lineHeight: 1.35 }}>
                  {liveTopic.summary}
                </p>
              )}
            </div>
          )}

          {/* Quick Prompt Suggestions */}
          <div style={{
            padding: '8px 14px 10px',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <button
              onClick={() => handleQuickPrompt('Summarize the meeting discussion so far in concise bullet points')}
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.74rem', whiteSpace: 'nowrap', borderRadius: '16px', gap: '4px' }}
            >
              <FileText size={12} color="#818cf8" />
              <span>Summarize So Far</span>
            </button>
            <button
              onClick={() => handleQuickPrompt('What are the key action items and deliverables discussed?')}
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.74rem', whiteSpace: 'nowrap', borderRadius: '16px', gap: '4px' }}
            >
              <ListTodo size={12} color="#34d399" />
              <span>Action Items</span>
            </button>
            <button
              onClick={() => handleQuickPrompt('What important decisions have been made in this meeting?')}
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.74rem', whiteSpace: 'nowrap', borderRadius: '16px', gap: '4px' }}
            >
              <CheckCircle2 size={12} color="#f59e0b" />
              <span>Decisions</span>
            </button>
          </div>

          {/* AI Assistant Chat Stream */}
          <div style={{
            flex: 1,
            padding: '14px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* System Intro Message */}
            <div style={{
              display: 'flex',
              gap: '10px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Bot size={18} color="#ffffff" />
              </div>
              <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                <strong style={{ color: '#ffffff', display: 'block', marginBottom: '2px' }}>
                  IntellMeet AI Assistant
                </strong>
                I am listening to your meeting in English. Ask me to summarize key points, track tasks, or clarify any topic anytime!
              </div>
            </div>

            {/* Conversation turns */}
            {aiAssistantChat.map((turn, i) => (
              <div key={turn.id || i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {turn.question && (
                  <div style={{
                    alignSelf: 'flex-end',
                    background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                    color: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: '12px 12px 2px 12px',
                    fontSize: '0.85rem',
                    maxWidth: '88%',
                    lineHeight: 1.4
                  }}>
                    {turn.question}
                  </div>
                )}
                {turn.answer && (
                  <div style={{
                    alignSelf: 'flex-start',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    color: '#f8fafc',
                    padding: '10px 12px',
                    borderRadius: '12px 12px 12px 2px',
                    fontSize: '0.84rem',
                    maxWidth: '94%',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Sparkles size={13} color="#c084fc" />
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#c084fc' }}>
                        IntellMeet AI
                      </span>
                    </div>
                    {turn.answer}
                  </div>
                )}
              </div>
            ))}

            {/* In-Flight Thinking Indicator */}
            {isAiThinking && (
              <div style={{
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px',
                color: '#c7d2fe',
                fontSize: '0.8rem'
              }}>
                <Loader2 size={14} className="animate-spin" color="#818cf8" />
                <span>IntellMeet AI is analyzing the meeting...</span>
              </div>
            )}

            <div ref={assistantEndRef} />
          </div>

          {/* Assistant Input Dock */}
          <form
            onSubmit={handleAssistantSubmit}
            style={{
              padding: '12px 14px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'rgba(8, 12, 20, 0.75)',
              display: 'flex',
              gap: '6px',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              placeholder={isVoiceListening ? 'Listening to your voice...' : 'Ask AI Assistant about this meeting...'}
              value={assistantInput}
              onChange={(e) => setAssistantInput(e.target.value)}
              disabled={isAiThinking}
              className="input-field"
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '0.84rem',
                borderColor: isVoiceListening ? '#ec4899' : undefined
              }}
            />

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={toggleVoiceQuery}
              className={`control-btn ${isVoiceListening ? 'control-btn-danger' : 'control-btn-active'}`}
              style={{ width: '38px', height: '38px', borderRadius: '10px', padding: 0 }}
              title={isVoiceListening ? 'Stop listening' : 'Ask by voice'}
            >
              {isVoiceListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!assistantInput.trim() || isAiThinking}
              className="btn btn-primary"
              style={{ width: '38px', height: '38px', borderRadius: '10px', padding: 0 }}
              title="Submit query"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

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

      {/* ---------------- LIVE AI SPEECH / CONVERSATION FEED TAB ---------------- */}
      {activeTab === 'conversation' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.08)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.8rem', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span>Real-time verbatim conversation stream with speaker identification</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {transcriptLog.length === 0 && !latestLiveSpeech ? (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px 16px', fontSize: '0.88rem' }}>
                <FileText size={32} color="#10b981" style={{ margin: '0 auto 12px', opacity: 0.7 }} />
                <p style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>No speech recorded yet</p>
                <p style={{ fontSize: '0.8rem' }}>When participants speak with an unmuted microphone, their speech turns will appear here in real time.</p>
              </div>
            ) : (
              <>
                {transcriptLog.map((turn, i) => (
                  <div
                    key={turn.segmentId || i}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      borderRadius: '12px',
                      padding: '12px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#818cf8' }}>
                        {turn.speaker}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {turn.timestamp}
                      </span>
                    </div>
                    <p style={{ color: '#f1f5f9', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
                      "{turn.text}"
                    </p>
                  </div>
                ))}

                {/* Real-time active turn if currently speaking */}
                {latestLiveSpeech?.isInterim && latestLiveSpeech?.text && (
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      animation: 'pulse 1.5s infinite'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f59e0b' }}>
                        {latestLiveSpeech.speaker} (Speaking now...)
                      </span>
                    </div>
                    <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                      "{latestLiveSpeech.text}"
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default MeetingSideDrawer;
