import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import {
  Video,
  Plus,
  Users,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  CheckCircle2,
  FileText,
  KanbanSquare,
  Shield,
  Activity,
  Layers,
  TrendingUp,
  Radio,
  ExternalLink
} from 'lucide-react';

export const DashboardPage = ({
  onJoinMeeting,
  onViewMeetingDetails,
  onNavigateTab
}) => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [creatingInstant, setCreatingInstant] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleDesc, setScheduleDesc] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  const loadDashboardData = async () => {
    try {
      const [meetingsRes, tasksRes] = await Promise.allSettled([
        api.getMeetings(),
        api.getTasks()
      ]);

      if (meetingsRes.status === 'fulfilled' && meetingsRes.value.data) {
        setMeetings(meetingsRes.value.data);
      }
      if (tasksRes.status === 'fulfilled' && tasksRes.value.data) {
        setTasks(tasksRes.value.data);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Quick Action 1: Instant Meeting
  const handleStartInstantMeeting = async () => {
    setCreatingInstant(true);
    try {
      const randomCode = `meet-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
      const res = await api.createMeeting({
        title: `${user?.name?.split(' ')[0] || 'Team'}'s Instant Meeting`,
        description: 'Instant collaboration session created from Dashboard.',
        code: randomCode,
        status: 'live',
        scheduledAt: new Date()
      });
      const meetingCode = res.data?.code || randomCode;
      onJoinMeeting(meetingCode);
    } catch (err) {
      alert('Failed to create instant meeting: ' + err.message);
    } finally {
      setCreatingInstant(false);
    }
  };

  // Quick Action 2: Join by Room Code
  const handleJoinByCode = (e) => {
    e.preventDefault();
    const cleanCode = joinCode.trim();
    if (!cleanCode) return;
    onJoinMeeting(cleanCode);
  };

  // Quick Action 3: Schedule New Meeting
  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    if (!scheduleTitle.trim()) return;

    try {
      const randomCode = `meet-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
      const scheduleDateTime = scheduleDate && scheduleTime
        ? new Date(`${scheduleDate}T${scheduleTime}`)
        : new Date(Date.now() + 3600000);

      await api.createMeeting({
        title: scheduleTitle.trim(),
        description: scheduleDesc.trim() || 'Scheduled enterprise meeting.',
        code: randomCode,
        status: 'scheduled',
        scheduledAt: scheduleDateTime
      });

      setShowScheduleModal(false);
      setScheduleTitle('');
      setScheduleDate('');
      setScheduleTime('');
      setScheduleDesc('');
      loadDashboardData();
    } catch (err) {
      alert('Failed to schedule meeting: ' + err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  // Calculations for Overview Statistics
  const totalMeetings = meetings.length;
  const completedMeetings = meetings.filter(m => m.status === 'ended');
  const summarizedMeetings = completedMeetings.filter(m => m.summary && m.summary.trim().length > 0);
  const scheduledMeetings = meetings.filter(m => m.status === 'scheduled');
  const recentMeetings = [...meetings].sort((a, b) => new Date(b.createdAt || b.scheduledAt) - new Date(a.createdAt || a.scheduledAt)).slice(0, 4);
  const hoursSaved = Math.max(1, Math.round(summarizedMeetings.length * 0.75 * 10) / 10);
  const openTasks = tasks.filter(t => t.status !== 'done');

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '32px 24px 80px' }}>
      
      {/* 1. WORKSPACE COMMAND HEADER */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0] || 'Leader'}</span> 👋
            </h1>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '20px',
              background: 'rgba(99, 102, 241, 0.2)',
              color: '#a5b4fc',
              border: '1px solid rgba(99, 102, 241, 0.4)'
            }}>
              {user?.role === 'admin' ? 'Workspace Admin' : 'Active Member'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0 }}>
            Here is your enterprise workspace overview, recent meetings, and AI meeting intelligence.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            color: '#34d399',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '6px 14px',
            borderRadius: '20px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            AI Engine Operational
          </span>
        </div>
      </div>

      {/* 2. PROMINENT HERO ACTION BAR: CREATE & JOIN CONTROLS */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        borderRadius: '20px',
        marginBottom: '36px',
        background: 'linear-gradient(135deg, rgba(18, 26, 44, 0.85) 0%, rgba(14, 21, 36, 0.95) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={handleStartInstantMeeting}
              disabled={creatingInstant}
              className="btn btn-primary"
              style={{
                padding: '13px 24px',
                fontSize: '0.98rem',
                fontWeight: 700,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <Video size={20} />
              <span>{creatingInstant ? 'Starting Call...' : 'Create Instant Meeting'}</span>
            </button>

            <button
              onClick={() => setShowScheduleModal(true)}
              className="btn btn-secondary"
              style={{
                padding: '13px 22px',
                fontSize: '0.95rem',
                fontWeight: 600,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Calendar size={18} color="#818cf8" />
              <span>Schedule Meeting</span>
            </button>
          </div>

          {/* Join Meeting by Code Input Bar */}
          <form 
            onSubmit={handleJoinByCode}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              maxWidth: '380px',
              width: '100%'
            }}
          >
            <input
              type="text"
              placeholder="Enter meeting code (e.g. meet-arch-9921)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="input-field"
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '0.9rem',
                background: 'rgba(8, 12, 20, 0.7)'
              }}
            />
            <button
              type="submit"
              disabled={!joinCode.trim()}
              className="btn btn-secondary"
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                background: joinCode.trim() ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: joinCode.trim() ? '#a5b4fc' : 'var(--text-dim)',
                borderColor: joinCode.trim() ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-subtle)'
              }}
            >
              Join Call
            </button>
          </form>
        </div>
      </div>

      {/* 3. WORKSPACE METRICS OVERVIEW CARDS */}
      <div className="dashboard-stats-grid">
        {/* Metric 1 */}
        <div className="glass-panel" style={{ padding: '22px 24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Meetings</span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Video size={18} color="#818cf8" />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
            {totalMeetings}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Across all team channels
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel" style={{ padding: '22px 24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hours Saved by AI</span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(168, 85, 247, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={18} color="#c084fc" />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
            {hoursSaved} hrs
          </div>
          <div style={{ fontSize: '0.78rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={12} />
            Auto-summarization & action items
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel" style={{ padding: '22px 24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>AI Summaries Ready</span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={18} color="#34d399" />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
            {summarizedMeetings.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            From {completedMeetings.length} completed calls
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel" style={{ padding: '22px 24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Kanban Tasks</span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <KanbanSquare size={18} color="#fbbf24" />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
            {openTasks.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Sprint action items assigned
          </div>
        </div>
      </div>

      {/* 4. MAIN DASHBOARD CONTENT: 2 COLUMNS */}
      <div className="dashboard-main-grid">
        
        {/* LEFT COLUMN: RECENT MEETINGS & UPCOMING SESSIONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Section: Recent Meetings */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700, margin: 0 }}>
                  Recent Meetings
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                  Latest sessions hosted or recorded in your workspace
                </p>
              </div>

              <button
                onClick={() => onNavigateTab('meetings')}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.82rem',
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>View All Meetings</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {recentMeetings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
                <Video size={36} color="var(--text-dim)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: '0.9rem', margin: 0 }}>No meetings recorded yet.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click "Create Instant Meeting" above to start your first session.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {recentMeetings.map((m) => {
                  const isEnded = m.status === 'ended';
                  const isLive = m.status === 'live';
                  const hasSummary = Boolean(m.summary && m.summary.trim().length > 0);

                  return (
                    <div
                      key={m._id || m.code}
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        background: 'rgba(14, 21, 36, 0.7)',
                        border: '1px solid var(--border-subtle)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span className={`badge badge-${m.status || 'scheduled'}`}>
                            {m.status?.toUpperCase() || 'SCHEDULED'}
                          </span>
                          <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                            {m.title}
                          </h4>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} color="#818cf8" />
                            {new Date(m.scheduledAt || m.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} color="#818cf8" />
                            {m.durationMinutes || 1}m
                          </span>
                          <span style={{ color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                            {m.code}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isEnded ? (
                          <button
                            onClick={() => onViewMeetingDetails(m._id || m.code)}
                            className="btn btn-secondary"
                            style={{
                              fontSize: '0.82rem',
                              padding: '7px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: hasSummary ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                              borderColor: hasSummary ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-subtle)',
                              color: hasSummary ? '#a5b4fc' : 'var(--text-main)'
                            }}
                          >
                            <Sparkles size={14} color="#818cf8" />
                            <span>View AI Summary</span>
                          </button>
                        ) : isLive ? (
                          <button
                            onClick={() => onJoinMeeting(m.code)}
                            className="btn btn-primary"
                            style={{
                              fontSize: '0.82rem',
                              padding: '7px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Video size={14} />
                            <span>Join Now</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onJoinMeeting(m.code)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.82rem', padding: '7px 14px' }}
                          >
                            Start Session
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Scheduled Sessions */}
          {scheduledMeetings.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Calendar size={18} color="#818cf8" />
                <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 700, margin: 0 }}>
                  Upcoming Scheduled Sessions ({scheduledMeetings.length})
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {scheduledMeetings.slice(0, 3).map(m => (
                  <div
                    key={m._id || m.code}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: 'rgba(14, 21, 36, 0.5)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{m.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(m.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <button
                      onClick={() => onJoinMeeting(m.code)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      Start Call
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: ACTION ITEMS & WORKSPACE SHORTCUTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Recent Action Items Widget */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#34d399" />
                <h3 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700, margin: 0 }}>
                  Action Items
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('kanban')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                Sprint Board &rarr;
              </button>
            </div>

            {openTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 10px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                All action items are complete! Extracted meeting tasks will appear here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {openTasks.slice(0, 4).map(task => (
                  <div
                    key={task._id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: 'rgba(14, 21, 36, 0.6)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className={`badge badge-priority-${task.priority || 'medium'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        {task.priority?.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {task.assigneeName || 'Assigned'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                      {task.title}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Share Personal Meeting Room */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#fff', fontWeight: 700, marginBottom: '8px' }}>
              Your Personal Meeting Space
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.4 }}>
              Share your permanent room code with team members for instant calls anytime.
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(8, 12, 20, 0.7)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '12px'
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.88rem', color: '#a5b4fc', fontWeight: 600 }}>
                {`meet-${user?._id?.slice(-8) || 'team-space'}`}
              </span>
              <button
                onClick={() => copyToClipboard(`meet-${user?._id?.slice(-8) || 'team-space'}`)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedCode ? '#34d399' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                title="Copy code"
              >
                {copiedCode ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>

            <button
              onClick={() => onJoinMeeting(`meet-${user?._id?.slice(-8) || 'team-space'}`)}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.85rem', padding: '9px' }}
            >
              Enter Personal Room
            </button>
          </div>

          {/* AI Intelligence Engine Status */}
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', background: 'rgba(99, 102, 241, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles size={16} color="#818cf8" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
                Google Gemini AI Intelligence
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Transcripts and in-meeting speech are analyzed automatically at the conclusion of every session to extract key takeaways, decisions, and action deliverables.
            </p>
          </div>

        </div>

      </div>

      {/* 5. SCHEDULE MEETING MODAL */}
      {showScheduleModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px', borderRadius: '18px' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700, marginBottom: '6px' }}>
              Schedule Upcoming Meeting
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Plan a future collaboration session with automated AI transcription and summary.
            </p>

            <form onSubmit={handleScheduleMeeting} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Product Architecture Review"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Agenda / Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe key objectives or discussion topics..."
                  value={scheduleDesc}
                  onChange={(e) => setScheduleDesc(e.target.value)}
                  className="input-field"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
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

    </div>
  );
};

export default DashboardPage;
