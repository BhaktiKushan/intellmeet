import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import {
  Video,
  Search,
  Filter,
  Calendar,
  Clock,
  Users,
  Sparkles,
  Copy,
  Check,
  Play,
  CheckCircle2,
  FileText,
  AlertCircle,
  Plus,
  RefreshCw,
  Info,
  X,
  ArrowLeft
} from 'lucide-react';

export const MeetingsPage = ({
  onBack,
  onJoinMeeting,
  onViewMeetingDetails,
  onNavigateTab
}) => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'ended' | 'scheduled' | 'recorded'
  const [copiedCode, setCopiedCode] = useState('');
  const [selectedMeetingForDetails, setSelectedMeetingForDetails] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const res = await api.getMeetings();
      if (res.data) {
        setMeetings(res.data);
      }
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const randomCode = `meet-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
      const scheduledAt = newDate && newTime
        ? new Date(`${newDate}T${newTime}`)
        : new Date();

      const res = await api.createMeeting({
        title: newTitle.trim(),
        description: newDesc.trim() || 'Meeting session created in Meeting Hub.',
        code: randomCode,
        status: newDate ? 'scheduled' : 'live',
        scheduledAt
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewDate('');
      setNewTime('');

      if (!newDate) {
        // If instant, join immediately
        onJoinMeeting(res.data?.code || randomCode);
      } else {
        loadMeetings();
      }
    } catch (err) {
      alert('Failed to create meeting: ' + err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  // Filter meetings
  const filteredMeetings = meetings.filter(m => {
    // Text search
    const matchesSearch = 
      (m.title && m.title.toLowerCase().includes(search.toLowerCase())) ||
      (m.code && m.code.toLowerCase().includes(search.toLowerCase())) ||
      (m.description && m.description.toLowerCase().includes(search.toLowerCase())) ||
      (m.host?.name && m.host.name.toLowerCase().includes(search.toLowerCase()));

    // Status filter
    let matchesStatus = true;
    if (statusFilter === 'ended') {
      matchesStatus = m.status === 'ended';
    } else if (statusFilter === 'scheduled') {
      matchesStatus = m.status === 'scheduled';
    } else if (statusFilter === 'recorded') {
      matchesStatus = Boolean(m.isRecorded || m.recordingUrl);
    }

    return matchesSearch && matchesStatus;
  });

  const countEnded = meetings.filter(m => m.status === 'ended').length;
  const countScheduled = meetings.filter(m => m.status === 'scheduled').length;
  const countRecorded = meetings.filter(m => m.isRecorded || m.recordingUrl).length;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '32px 24px 80px' }}>
      
      {/* Top Back Navigation Button */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={onBack || (() => onNavigateTab ? onNavigateTab('dashboard') : window.history.back())}
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            fontSize: '0.86rem',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#a5b4fc',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* 1. PAGE HEADER */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        marginBottom: '28px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              Meeting Hub & History
            </h1>
            <span className="badge badge-priority-medium">Enterprise Archive</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Manage, search, and review all completed meeting transcripts, recordings, and AI-generated summaries.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={loadMeetings}
            className="btn btn-secondary"
            title="Refresh meetings"
            style={{ padding: '10px 14px' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{
              padding: '10px 20px',
              fontSize: '0.92rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Plus size={18} />
            <span>New Meeting</span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS BAR */}
      <div className="glass-panel" style={{
        padding: '18px 24px',
        borderRadius: '16px',
        marginBottom: '28px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        {/* Filter Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          {[
            { id: 'all', label: `All Meetings (${meetings.length})` },
            { id: 'ended', label: `Completed (${countEnded})` },
            { id: 'scheduled', label: `Upcoming (${countScheduled})` },
            { id: 'recorded', label: `Recorded (${countRecorded})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: statusFilter === tab.id ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: statusFilter === tab.id ? '#a5b4fc' : 'var(--text-muted)',
                fontWeight: statusFilter === tab.id ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '280px', flex: '1', maxWidth: '400px' }}>
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            placeholder="Search by title, room code, or host..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '38px', fontSize: '0.88rem', width: '100%' }}
          />
        </div>
      </div>

      {/* 3. MEETINGS LIST / CARDS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 16px', color: '#818cf8' }} />
          <p style={{ fontSize: '0.95rem' }}>Loading workspace meetings...</p>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', borderRadius: '18px' }}>
          <Video size={42} color="var(--text-dim)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>
            No meetings found
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '460px', margin: '0 auto 20px' }}>
            {search ? `No meetings match "${search}". Try adjusting your search or filter.` : 'No meetings have been scheduled or recorded yet in this workspace.'}
          </p>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ fontSize: '0.88rem' }}>
            Schedule Meeting
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredMeetings.map((m) => {
            const isEnded = m.status === 'ended';
            const isLive = m.status === 'live';
            const isScheduled = m.status === 'scheduled';
            const hasSummary = Boolean(m.summary && m.summary.trim().length > 0);
            const hasRecording = Boolean(m.isRecorded || m.recordingUrl);
            const dateStr = new Date(m.scheduledAt || m.createdAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            const timeStr = new Date(m.scheduledAt || m.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={m._id || m.code}
                className="glass-panel"
                style={{
                  padding: '22px 26px',
                  borderRadius: '16px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                  transition: 'transform 0.2s ease, border-color 0.2s ease'
                }}
              >
                {/* Left: Meeting Details & Badges */}
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span className={`badge badge-${m.status || 'scheduled'}`}>
                      {m.status?.toUpperCase() || 'SCHEDULED'}
                    </span>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                      {m.title}
                    </h3>

                    {/* Room Code with Copy */}
                    <button
                      onClick={() => copyToClipboard(m.code)}
                      style={{
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        color: '#a5b4fc',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Copy meeting code"
                    >
                      <span>{m.code}</span>
                      {copiedCode === m.code ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                    </button>
                  </div>

                  {m.description && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 10px', lineHeight: 1.4 }}>
                      {m.description}
                    </p>
                  )}

                  {/* Metadata Row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '18px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={13} color="#818cf8" />
                      {dateStr} at {timeStr}
                    </span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={13} color="#818cf8" />
                      {m.durationMinutes || 1} min session
                    </span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Users size={13} color="#818cf8" />
                      {(m.participants || []).length || 1} participant{((m.participants || []).length !== 1) ? 's' : ''}
                    </span>

                    {/* AI Summary Badge Indicator */}
                    {hasSummary && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#c084fc',
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }}>
                        <Sparkles size={12} />
                        AI Summary Ready
                      </span>
                    )}

                    {/* Recording Badge Indicator */}
                    {hasRecording && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#34d399',
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }}>
                        <Play size={12} />
                        Recording Saved
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                  {/* Dedicated View AI Summary Button */}
                  {isEnded && (
                    <button
                      onClick={() => onViewMeetingDetails(m._id || m.code)}
                      className="btn btn-primary"
                      style={{
                        padding: '9px 18px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Sparkles size={15} />
                      <span>View AI Summary</span>
                    </button>
                  )}

                  {isLive && (
                    <button
                      onClick={() => onJoinMeeting(m.code)}
                      className="btn btn-primary"
                      style={{
                        padding: '9px 18px',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Video size={15} />
                      <span>Join Live Meeting</span>
                    </button>
                  )}

                  {isScheduled && (
                    <button
                      onClick={() => onJoinMeeting(m.code)}
                      className="btn btn-secondary"
                      style={{ padding: '9px 16px', fontSize: '0.85rem' }}
                    >
                      Start Call
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedMeetingForDetails(m)}
                    className="btn btn-secondary"
                    style={{ padding: '9px 14px', fontSize: '0.85rem' }}
                    title="View details"
                  >
                    <Info size={15} />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. MEETING DETAILS MODAL */}
      {selectedMeetingForDetails && (
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', padding: '28px', borderRadius: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge badge-${selectedMeetingForDetails.status || 'scheduled'}`}>
                  {selectedMeetingForDetails.status?.toUpperCase()}
                </span>
                <span style={{ fontFamily: 'monospace', color: '#a5b4fc', fontSize: '0.85rem' }}>
                  {selectedMeetingForDetails.code}
                </span>
              </div>
              <button
                onClick={() => setSelectedMeetingForDetails(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <h3 style={{ fontSize: '1.3rem', color: '#fff', fontWeight: 700, marginBottom: '8px' }}>
              {selectedMeetingForDetails.title}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px', lineHeight: 1.5 }}>
              {selectedMeetingForDetails.description || 'Enterprise collaboration session.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(14, 21, 36, 0.6)', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Hosted By:</span>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                  {selectedMeetingForDetails.host?.name || 'Workspace Host'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(14, 21, 36, 0.6)', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Scheduled / Started:</span>
                <span style={{ color: '#fff', fontSize: '0.85rem' }}>
                  {new Date(selectedMeetingForDetails.scheduledAt || selectedMeetingForDetails.createdAt).toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(14, 21, 36, 0.6)', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Session Duration:</span>
                <span style={{ color: '#fff', fontSize: '0.85rem' }}>
                  {selectedMeetingForDetails.durationMinutes || 1} minutes
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(14, 21, 36, 0.6)', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Participants Count:</span>
                <span style={{ color: '#fff', fontSize: '0.85rem' }}>
                  {(selectedMeetingForDetails.participants || []).length || 1}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {selectedMeetingForDetails.status === 'ended' && (
                <button
                  onClick={() => {
                    const id = selectedMeetingForDetails._id || selectedMeetingForDetails.code;
                    setSelectedMeetingForDetails(null);
                    onViewMeetingDetails(id);
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem' }}
                >
                  <Sparkles size={14} />
                  <span>View AI Summary</span>
                </button>
              )}

              {selectedMeetingForDetails.status !== 'ended' && (
                <button
                  onClick={() => {
                    const code = selectedMeetingForDetails.code;
                    setSelectedMeetingForDetails(null);
                    onJoinMeeting(code);
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem' }}
                >
                  <Video size={14} />
                  <span>Join Session</span>
                </button>
              )}

              <button
                onClick={() => setSelectedMeetingForDetails(null)}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CREATE MEETING MODAL */}
      {showCreateModal && (
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
              Create or Schedule Meeting
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Configure meeting details, AI speech transcription, and schedule time.
            </p>

            <form onSubmit={handleCreateMeeting} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Engineering Sync"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Date (Leave blank for instant)
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Time
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Description / Agenda
                </label>
                <textarea
                  rows={3}
                  placeholder="Key topics and goals for this session..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="input-field"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {newDate ? 'Schedule Meeting' : 'Start Instant Call'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default MeetingsPage;
