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
  Search,
  Zap
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
        marginBottom: '28px'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            Welcome back, <span className="gradient-text">{user?.name || 'Engineer'}</span> 👋
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            {user?.title || 'Enterprise Team Lead'} &nbsp;•&nbsp; {user?.department || 'Product & Engineering'}
          </p>
        </div>
      </div>

      {/* Prominent Action Hub: Create Meeting & Join Meeting (Requirement 3) */}
      <div 
        className="glass-panel"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px 28px',
          marginBottom: '32px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}
      >
        <div style={{ maxWidth: '440px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
            Start or Join a Video Meeting
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Launch a real-time room with AI synthesis or enter a meeting code to connect with your team.
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Prominent Create Meeting Button */}
          <button
            onClick={handleCreateInstant}
            className="btn btn-primary"
            style={{
              padding: '11px 22px',
              fontSize: '0.95rem',
              fontWeight: 600,
              borderRadius: '10px',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Video size={18} />
            <span>Create Meeting</span>
          </button>

          {/* Prominent Join Meeting Form & Button */}
          <form onSubmit={handleJoinByCode} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              placeholder="Enter meeting code..."
              value={meetingCodeInput}
              onChange={(e) => setMeetingCodeInput(e.target.value)}
              className="input-field"
              style={{
                padding: '10px 14px',
                fontSize: '0.92rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                width: '220px'
              }}
            />
            <button
              type="submit"
              className="btn btn-secondary"
              style={{
                padding: '10px 18px',
                fontSize: '0.92rem',
                fontWeight: 600,
                borderRadius: '10px',
                whiteSpace: 'nowrap'
              }}
            >
              Join Meeting
            </button>
          </form>
        </div>
      </div>

      {/* Live Meeting Alert Callout if any */}
      {liveMeetings.length > 0 && (
        <div 
          className="glass-panel"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
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
              <h4 style={{ fontSize: '1.05rem', color: '#0f172a', marginBottom: '2px' }}>
                {liveMeetings[0].title}
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                Code: <code style={{ color: '#4f46e5', fontWeight: 600, background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>{liveMeetings[0].code}</code> &nbsp;•&nbsp; Ready for instant peer connection
              </p>
            </div>
          </div>
          <button 
            onClick={() => onJoinMeeting(liveMeetings[0].code)}
            className="btn btn-primary"
            style={{ boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
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
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            transition: 'all 0.2s',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
          }}>
            <Video size={24} color="#fff" />
          </div>
          <h3 style={{ fontSize: '1.15rem', color: '#0f172a', marginBottom: '4px' }}>
            New Instant Meeting
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
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
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            transition: 'all 0.2s',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(2, 132, 199, 0.1)',
            border: '1px solid rgba(2, 132, 199, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px'
          }}>
            <Calendar size={22} color="#0284c7" />
          </div>
          <h3 style={{ fontSize: '1.15rem', color: '#0f172a', marginBottom: '4px' }}>
            Schedule Meeting
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
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
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            transition: 'all 0.2s',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(5, 150, 105, 0.1)',
            border: '1px solid rgba(5, 150, 105, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px'
          }}>
            <CheckCircle2 size={22} color="#059669" />
          </div>
          <h3 style={{ fontSize: '1.15rem', color: '#0f172a', marginBottom: '4px' }}>
            Team Kanban Board
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
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
            { label: 'Total Meetings', val: analytics.metrics?.totalMeetings || 0, icon: Video, color: '#4f46e5' },
            { label: 'Follow-Up Time Saved', val: '52%', sub: `${analytics.metrics?.hoursSavedByAI || 0} hrs saved`, icon: Clock, color: '#0284c7' },
            { label: 'Kanban Tasks Closed', val: `${analytics.metrics?.completedTasks || 0} / ${analytics.metrics?.totalTasks || 0}`, sub: `${analytics.metrics?.taskCompletionRate || 0}% completion`, icon: CheckCircle2, color: '#059669' },
            { label: 'AI Meeting Intelligence', val: 'Operational', sub: 'Whisper + NLP Engine', icon: Sparkles, color: '#7c3aed' }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="glass-panel"
                style={{
                  padding: '20px',
                  borderRadius: '14px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>{item.label}</span>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `${item.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={16} color={item.color} />
                  </div>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                  {item.val}
                </div>
                {item.sub && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    {item.sub}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Meetings List / Table Section */}
      <div 
        className="glass-panel"
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          border: '1px solid #e2e8f0',
          padding: '28px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Section Header & Filters */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Your Enterprise Meetings
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              Live sessions, scheduled team reviews, and recorded sessions with AI summaries
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Meetings' },
              { id: 'live', label: 'Live Now' },
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'ended', label: 'Ended / Past' },
              { id: 'recordings', label: 'Recordings' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  border: filter === tab.id ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                  background: filter === tab.id ? '#eef2ff' : '#ffffff',
                  color: filter === tab.id ? '#4f46e5' : '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: filter === tab.id ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Meeting Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
            Loading meetings from cloud...
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
            <Video size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>No meetings found</p>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Create a meeting or schedule one to get started.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px'
          }}>
            {filteredMeetings.map(meeting => (
              <div
                key={meeting._id || meeting.code}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className={`badge badge-${meeting.status}`}>
                      {meeting.status}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 700, fontFamily: 'monospace' }}>
                      {meeting.code}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    {meeting.title}
                  </h3>

                  {meeting.description && (
                    <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4, marginBottom: '10px' }}>
                      {meeting.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#64748b' }}>
                    <Users size={13} />
                    <span>
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
                  borderTop: '1px solid #e2e8f0'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} />
                    <span>{new Date(meeting.scheduledAt || meeting.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>

                  {meeting.status === 'ended' || Boolean(meeting.summary) ? (
                    <button
                      onClick={() => onViewMeetingDetails(meeting.code || meeting._id)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                    >
                      <Sparkles size={14} color="#4f46e5" />
                      <span>View AI Summary</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onJoinMeeting(meeting.code)}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '8px' }}
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
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '32px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.35rem', color: '#0f172a', fontWeight: 700, marginBottom: '6px' }}>
              Schedule Enterprise Meeting
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
              Configure a secure WebRTC room with server-enforced governance and AI transcription.
            </p>

            <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
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
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
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
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#4f46e5', marginBottom: '8px' }}>
                  MEETING PERMISSIONS & GOVERNANCE:
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#334155', cursor: 'pointer', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={scheduleSettings.allowScreenShare}
                    onChange={(e) => setScheduleSettings(s => ({ ...s, allowScreenShare: e.target.checked }))}
                  />
                  <span>Allow participants to share their screens</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#334155', cursor: 'pointer', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={scheduleSettings.muteOnJoin}
                    onChange={(e) => setScheduleSettings(s => ({ ...s, muteOnJoin: e.target.checked }))}
                  />
                  <span>Mute participants automatically upon joining</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
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
                  style={{ borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ borderRadius: '8px' }}>
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
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '28px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                  {playbackRecording.title}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#4f46e5' }}>
                  Meeting Code: {playbackRecording.code} &bull; {playbackRecording.duration} mins recorded
                </span>
              </div>
              <button
                onClick={() => setPlaybackRecording(null)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '14px', overflow: 'hidden', background: '#050811', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {playbackRecording.url && playbackRecording.url.startsWith('blob:') ? (
                <video src={playbackRecording.url} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                  <Video size={48} color="#4f46e5" style={{ margin: '0 auto 12px' }} />
                  <div style={{ color: '#0f172a', fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
                    Multi-Track Recorded Session
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.82rem' }}>
                    This session contains captured video composition and synchronized audio tracks.
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setPlaybackRecording(null)} className="btn btn-secondary" style={{ borderRadius: '8px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardPage;
