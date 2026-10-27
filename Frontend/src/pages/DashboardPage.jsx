import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Video, 
  Plus, 
  Calendar, 
  ArrowRight, 
  Clock, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  ExternalLink,
  Radio,
  FileText,
  Search
} from 'lucide-react';

export const DashboardPage = ({ onJoinMeeting, onViewMeetingDetails, onNavigateTab }) => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meetingCodeInput, setMeetingCodeInput] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'live' | 'scheduled' | 'ended' | 'recordings'
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDesc, setNewMeetingDesc] = useState('');
  const [playbackRecording, setPlaybackRecording] = useState(null);
  const [scheduleSettings, setScheduleSettings] = useState({
    allowScreenShare: true,
    muteOnJoin: false,
    aiTranscriptionEnabled: true
  });

  const loadDashboardData = async () => {
    try {
      const [meetingsRes, analyticsRes] = await Promise.all([
        api.getMeetings(),
        api.getDashboardAnalytics()
      ]);
      setMeetings(meetingsRes.data || []);
      setAnalytics(analyticsRes.data || null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleCreateInstant = async () => {
    try {
      const res = await api.createMeeting({
        title: `${user?.name?.split(' ')[0] || 'Team'}'s Instant Meeting`,
        description: 'Instant ad-hoc collaboration room'
      });
      if (res.data && res.data.code) {
        onJoinMeeting(res.data.code);
      }
    } catch (err) {
      alert('Failed to create instant meeting: ' + err.message);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createMeeting({
        title: newMeetingTitle || 'Engineering Standup',
        description: newMeetingDesc,
        settings: scheduleSettings
      });
      setShowScheduleModal(false);
      setNewMeetingTitle('');
      setNewMeetingDesc('');
      loadDashboardData();
    } catch (err) {
      alert('Failed to schedule meeting: ' + err.message);
    }
  };

  const handleJoinByCode = (e) => {
    e.preventDefault();
    if (!meetingCodeInput.trim()) return;
    onJoinMeeting(meetingCodeInput.trim());
  };

  const filteredMeetings = meetings.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'recordings') return m.isRecorded || !!m.recordingUrl;
    return m.status === filter;
  });

  const liveMeetings = meetings.filter(m => m.status === 'live');

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px 64px' }}>
      
      {/* Welcome Banner */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
            Welcome back, <span className="gradient-text">{user?.name || 'Engineer'}</span> 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {user?.title || 'Enterprise Team Lead'} &nbsp;•&nbsp; {user?.department || 'Product & Engineering'}
          </p>
        </div>

        {/* Join by Code Input */}
        <form onSubmit={handleJoinByCode} style={{ display: 'flex', gap: '8px', minWidth: '320px' }}>
          <input
            type="text"
            placeholder="Enter meeting code (e.g. meet-demo-live)"
            value={meetingCodeInput}
            onChange={(e) => setMeetingCodeInput(e.target.value)}
            className="input-field"
            style={{ padding: '9px 14px' }}
          />
          <button type="submit" className="btn btn-secondary">
            Join
          </button>
        </form>
      </div>

      {/* Live Meeting Alert Callout if any */}
      {liveMeetings.length > 0 && (
        <div 
          className="glass-panel"
          style={{
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            padding: '16px 24px',
            borderRadius: '14px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span className="badge badge-live" style={{ padding: '6px 12px' }}>
              Meeting in Progress
            </span>
            <div>
              <h4 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '2px' }}>
                {liveMeetings[0].title}
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Code: <code style={{ color: '#a5b4fc', fontWeight: 600 }}>{liveMeetings[0].code}</code> &nbsp;•&nbsp; Ready for instant peer connection
              </p>
            </div>
          </div>
          <button 
            onClick={() => onJoinMeeting(liveMeetings[0].code)}
            className="btn btn-primary"
            style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}
          >
            <Radio size={16} />
            <span>Join Active Call</span>
          </button>
        </div>
      )}

      {/* Quick Launch Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '36px'
      }}>
        {/* Instant Meeting Launcher */}
        <div 
          onClick={handleCreateInstant}
          className="glass-panel"
          style={{
            padding: '24px',
            cursor: 'pointer',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
          }}>
            <Video size={24} color="#fff" />
          </div>
          <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '4px' }}>
            New Instant Meeting
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Generate a secure WebRTC room and start conferring immediately with live transcription.
          </p>
        </div>

        {/* Schedule Meeting Launcher */}
        <div 
          onClick={() => setShowScheduleModal(true)}
          className="glass-panel"
          style={{
            padding: '24px',
            cursor: 'pointer',
            borderRadius: '16px',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px'
          }}>
            <Calendar size={22} color="#06b6d4" />
          </div>
          <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '4px' }}>
            Schedule Meeting
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Plan upcoming design syncs, sprint planning, and client architecture reviews.
          </p>
        </div>

        {/* View Kanban Board */}
        <div 
          onClick={() => onNavigateTab('kanban')}
          className="glass-panel"
          style={{
            padding: '24px',
            cursor: 'pointer',
            borderRadius: '16px',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px'
          }}>
            <CheckCircle2 size={22} color="#10b981" />
          </div>
          <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '4px' }}>
            Team Kanban Board
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Manage tasks and action items auto-extracted from past meetings.
          </p>
        </div>
      </div>

      {/* Analytics KPI Highlights */}
      {analytics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '40px'
        }}>
          {[
            { label: 'Total Meetings', val: analytics.metrics?.totalMeetings || 0, icon: Video, color: '#6366f1' },
            { label: 'Follow-Up Time Saved', val: '52%', sub: `${analytics.metrics?.hoursSavedByAI || 0} hrs saved`, icon: Clock, color: '#38bdf8' },
            { label: 'Kanban Tasks Closed', val: `${analytics.metrics?.completedTasks || 0} / ${analytics.metrics?.totalTasks || 0}`, sub: `${analytics.metrics?.taskCompletionRate || 0}% completion`, icon: CheckCircle2, color: '#34d399' },
            { label: 'AI Meeting Intelligence', val: 'Operational', sub: 'Whisper + NLP Engine', icon: Sparkles, color: '#c084fc' }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="glass-panel" style={{ padding: '18px 20px', borderRadius: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>{item.label}</span>
                  <Icon size={18} color={item.color} />
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{item.val}</div>
                {item.sub && (
                  <div style={{ fontSize: '0.75rem', color: item.color, marginTop: '2px', fontWeight: 500 }}>
                    {item.sub}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Meetings Section */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', color: '#fff' }}>Your Enterprise Meetings</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Access live calls, upcoming appointments, and past AI-analyzed transcripts
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'live', label: 'Live Now' },
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'ended', label: 'Past & Summarized' },
              { id: 'recordings', label: 'Recordings Available' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: filter === tab.id ? 600 : 500,
                  background: filter === tab.id ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                  color: filter === tab.id ? '#a5b4fc' : 'var(--text-dim)',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Meetings Grid */}
        {filteredMeetings.length === 0 ? (
          <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', borderRadius: '16px' }}>
            <Video size={36} color="var(--text-dim)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '6px' }}>No meetings found</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Create an instant meeting or schedule a session to collaborate with your team.
            </p>
            <button onClick={handleCreateInstant} className="btn btn-primary">
              <Plus size={16} />
              <span>Start Instant Meeting</span>
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '20px'
          }}>
            {filteredMeetings.map((meeting) => (
              <div 
                key={meeting._id}
                className="glass-panel"
                style={{
                  padding: '22px',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  border: meeting.status === 'live' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`badge ${
                        meeting.status === 'live' ? 'badge-live' : meeting.status === 'scheduled' ? 'badge-scheduled' : 'badge-ended'
                      }`}>
                        {meeting.status}
                      </span>
                      {(meeting.isRecorded || meeting.recordingUrl) && (
                        <button
                          onClick={() => setPlaybackRecording({
                            title: meeting.title,
                            code: meeting.code,
                            url: meeting.recordingUrl || 'demo-recording',
                            duration: meeting.durationMinutes || 15
                          })}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            color: '#f87171',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Circle size={8} fill="#ef4444" color="#ef4444" />
                          <span>Watch Recording</span>
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Code: <code style={{ color: '#a5b4fc', fontWeight: 600 }}>{meeting.code}</code>
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '8px', lineHeight: 1.3 }}>
                    {meeting.title}
                  </h3>

                  <p style={{
                    fontSize: '0.84rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: '14px'
                  }}>
                    {meeting.description || 'Enterprise collaboration session.'}
                  </p>

                  {/* Summary Snippet if ended */}
                  {meeting.status === 'ended' && meeting.summary && (
                    <div style={{
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      color: '#c7d2fe',
                      marginBottom: '14px',
                      display: 'flex',
                      gap: '8px'
                    }}>
                      <Sparkles size={16} color="#818cf8" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {meeting.summary}
                      </div>
                    </div>
                  )}

                  {/* Participants Avatars */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', marginLeft: '6px' }}>
                      {(meeting.participants || []).slice(0, 4).map((p, pIdx) => (
                        <img
                          key={pIdx}
                          src={p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`}
                          alt={p.name}
                          title={p.name}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            border: '2px solid #0e1524',
                            marginLeft: '-6px',
                            objectFit: 'cover'
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {(meeting.participants || []).length || 1} participant{((meeting.participants || []).length || 1) > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Card Action */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} />
                    <span>{new Date(meeting.scheduledAt || meeting.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>

                  {meeting.status === 'ended' ? (
                    <button
                      onClick={() => onViewMeetingDetails(meeting.code || meeting._id)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      <Sparkles size={14} color="#818cf8" />
                      <span>View AI Summary</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onJoinMeeting(meeting.code)}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    >
                      <Video size={14} />
                      <span>Join Room</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '32px', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '1.35rem', color: '#fff', marginBottom: '8px' }}>
              Schedule Enterprise Meeting
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Configure a secure WebRTC room with server-enforced governance and AI transcription.
            </p>

            <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Meeting Topic / Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Cloud Infrastructure Roadmap"
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Agenda & Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Key discussion points, architecture goals..."
                  value={newMeetingDesc}
                  onChange={(e) => setNewMeetingDesc(e.target.value)}
                  className="input-field"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Governance & Media Settings */}
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '8px' }}>
                  MEETING PERMISSIONS & GOVERNANCE:
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#ffffff', cursor: 'pointer', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={scheduleSettings.allowScreenShare}
                    onChange={(e) => setScheduleSettings(s => ({ ...s, allowScreenShare: e.target.checked }))}
                  />
                  <span>Allow participants to share their screens</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#ffffff', cursor: 'pointer', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={scheduleSettings.muteOnJoin}
                    onChange={(e) => setScheduleSettings(s => ({ ...s, muteOnJoin: e.target.checked }))}
                  />
                  <span>Mute participants automatically upon joining</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#ffffff', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={scheduleSettings.aiTranscriptionEnabled}
                    onChange={(e) => setScheduleSettings(s => ({ ...s, aiTranscriptionEnabled: e.target.checked }))}
                  />
                  <span>Enable AI live speech-to-text and automated summary</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Schedule Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recording Playback Modal */}
      {playbackRecording && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(4, 7, 15, 0.85)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '28px', borderRadius: '20px', background: 'rgba(14, 21, 36, 0.98)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 800 }}>
                  {playbackRecording.title}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#818cf8' }}>
                  Meeting Code: {playbackRecording.code} &bull; {playbackRecording.duration} mins recorded
                </span>
              </div>
              <button
                onClick={() => setPlaybackRecording(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '14px', overflow: 'hidden', background: '#050811', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {playbackRecording.url && playbackRecording.url.startsWith('blob:') ? (
                <video src={playbackRecording.url} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                  <Video size={48} color="#818cf8" style={{ margin: '0 auto 12px' }} />
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
                    Multi-Track Recorded Session
                  </div>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                    This session contains captured video composition and synchronized audio tracks.
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setPlaybackRecording(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

