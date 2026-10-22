import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  Download,
  Printer,
  KanbanSquare,
  ArrowLeft,
  RefreshCw,
  Search,
  Check,
  AlertCircle
} from 'lucide-react';

export const PostMeetingDetailsPage = ({ meetingIdOrCode, onBack, onNavigateKanban }) => {
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'transcript' | 'actions'
  const [convertedTasks, setConvertedTasks] = useState(new Set());
  const [actionNotice, setActionNotice] = useState('');

  const loadMeetingDetails = async () => {
    try {
      const res = await api.getMeeting(meetingIdOrCode);
      const meetingData = res.data;
      setMeeting(meetingData);

      // Track existing converted tasks
      const converted = new Set();
      (meetingData.actionItems || []).forEach(item => {
        if (item.taskId) converted.add(item.id);
      });
      setConvertedTasks(converted);

      // If summary is not yet generated, auto-trigger Gemini intelligence
      if (meetingData && (!meetingData.summary || !meetingData.keyTakeaways || meetingData.keyTakeaways.length === 0)) {
        triggerAiGeneration(meetingData);
      }
    } catch (err) {
      console.error('Failed to load meeting details:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerAiGeneration = async (currentMeeting) => {
    const targetId = currentMeeting?._id || meetingIdOrCode;
    if (!targetId) return;

    setReanalyzing(true);
    try {
      const res = await api.generateAiSummary(targetId, currentMeeting?.transcript || []);
      if (res.data) {
        setMeeting(prev => ({
          ...(prev || currentMeeting),
          summary: res.data.summary,
          keyTakeaways: res.data.keyTakeaways,
          actionItems: res.data.actionItems
        }));
      }
    } catch (err) {
      console.warn('Auto AI generation warning:', err.message);
    } finally {
      setReanalyzing(false);
    }
  };

  useEffect(() => {
    loadMeetingDetails();
  }, [meetingIdOrCode]);

  const handleConvertToTask = async (actionItem) => {
    try {
      const targetId = meeting?._id || meetingIdOrCode;
      await api.convertActionItemToTask(targetId, actionItem.id);
      setConvertedTasks(prev => new Set(prev).add(actionItem.id));
      setActionNotice(`Task "${actionItem.task.slice(0, 30)}..." pushed to Kanban board!`);
      setTimeout(() => setActionNotice(''), 4000);
      loadMeetingDetails();
    } catch (err) {
      alert('Failed to convert action item to task: ' + err.message);
    }
  };

  const handleRegenerateAI = async () => {
    setReanalyzing(true);
    try {
      const targetId = meeting?._id || meetingIdOrCode;
      const res = await api.generateAiSummary(targetId, meeting?.transcript || []);
      setMeeting(prev => ({
        ...prev,
        summary: res.data.summary,
        keyTakeaways: res.data.keyTakeaways,
        actionItems: res.data.actionItems
      }));
      setActionNotice('AI Intelligence generated with Google Gemini 3.8 Flash!');
      setTimeout(() => setActionNotice(''), 3000);
    } catch (err) {
      alert('AI generation error: ' + err.message);
    } finally {
      setReanalyzing(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!meeting) return;
    const content = `# Meeting Report: ${meeting.title}
**Date:** ${new Date(meeting.scheduledAt || meeting.createdAt).toLocaleString()}
**Code:** ${meeting.code}
**Duration:** ${meeting.durationMinutes || 30} minutes

## Executive Summary
${meeting.summary || 'N/A'}

## Key Takeaways
${(meeting.keyTakeaways || []).map(t => `- ${t}`).join('\n')}

## Extracted Action Items
${(meeting.actionItems || []).map(a => `- [ ] **${a.task}** (Assignee: ${a.assignee}, Priority: ${a.priority}, Due: ${new Date(a.dueDate).toLocaleDateString()})`).join('\n')}

## Full Transcript
${(meeting.transcript || []).map(t => `[${t.timestamp}] **${t.speaker}:** ${t.text}`).join('\n')}
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Meeting_Summary_${meeting.code}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '60px auto', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 16px', color: '#818cf8' }} />
        <p>Loading AI Meeting Intelligence...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div style={{ maxWidth: '800px', margin: '60px auto', textAlign: 'center' }}>
        <h2 style={{ color: '#fff' }}>Meeting not found</h2>
        <button onClick={onBack} className="btn btn-secondary" style={{ marginTop: '16px' }}>
          Back to Meetings
        </button>
      </div>
    );
  }

  const filteredTranscript = (meeting.transcript || []).filter(t => 
    t.text.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.speaker.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '32px 24px 80px' }}>
      
      {/* Back button & Action Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <button 
          onClick={onBack}
          className="btn btn-secondary"
          style={{ padding: '8px 14px', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleRegenerateAI}
            disabled={reanalyzing}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} className={reanalyzing ? 'animate-spin' : ''} />
            <span>{reanalyzing ? 'Analyzing...' : 'Re-run AI Analysis'}</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            <Download size={15} />
            <span>Export Markdown</span>
          </button>

          <button
            onClick={() => window.print()}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem' }}
          >
            <Printer size={15} />
            <span>Print Report (PDF)</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          color: '#34d399',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle2 size={18} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Meeting Header Card */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="badge badge-ended">AI Analyzed Session</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              Code: <code style={{ color: '#a5b4fc', fontWeight: 600 }}>{meeting.code}</code>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="#818cf8" />
              {new Date(meeting.scheduledAt || meeting.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} color="#818cf8" />
              {meeting.durationMinutes || 45} mins
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={15} color="#818cf8" />
              {(meeting.participants || []).length || 4} participants
            </span>
          </div>
        </div>

        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '10px' }}>
          {meeting.title}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '850px' }}>
          {meeting.description || 'Enterprise collaboration session with automated AI speech transcription and action items.'}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '28px',
        gap: '8px'
      }}>
        {[
          { id: 'summary', label: 'AI Executive Summary & Takeaways', icon: Sparkles },
          { id: 'actions', label: `Smart Action Items (${(meeting.actionItems || []).length})`, icon: CheckCircle2 },
          { id: 'transcript', label: `Transcript (${(meeting.transcript || []).length} turns)`, icon: Users }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                color: isActive ? '#a5b4fc' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.92rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: AI Executive Summary & Takeaways */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Executive Summary Card */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={20} color="#818cf8" />
              </div>
              <h2 style={{ fontSize: '1.25rem', color: '#fff' }}>AI Executive Summary</h2>
            </div>

            <p style={{
              fontSize: '1rem',
              color: '#f8fafc',
              lineHeight: 1.7,
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              {meeting.summary || 'Summary is being processed...'}
            </p>
          </div>

          {/* Key Takeaways Card */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '18px' }}>
              Key Decisions & Takeaways
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(meeting.keyTakeaways || []).map((takeaway, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <CheckCircle2 size={18} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                    {takeaway}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: Smart Action Items (One-Click to Kanban) */}
      {activeTab === 'actions' && (
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '4px' }}>
                Extracted Action Items ({meeting.actionItems?.length || 0})
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Automatically derived commitments with designated owners and urgency levels
              </p>
            </div>

            <button 
              onClick={() => onNavigateKanban()}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              <KanbanSquare size={16} />
              <span>Go to Team Kanban Board</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(meeting.actionItems || []).map((item) => {
              const isConverted = convertedTasks.has(item.id) || !!item.taskId;

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '18px 20px',
                    borderRadius: '12px',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: isConverted ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-subtle)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span className={`badge badge-priority-${item.priority || 'medium'}`}>
                        {item.priority}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        Due: {new Date(item.dueDate || Date.now() + 86400000 * 3).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.98rem', color: '#fff', fontWeight: 600, marginBottom: '6px' }}>
                      {item.task}
                    </h4>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={13} color="#818cf8" />
                      <span>Owner: <strong style={{ color: '#c7d2fe' }}>{item.assignee || 'Engineering Team'}</strong></span>
                    </div>
                  </div>

                  {/* Convert Button */}
                  <div>
                    {isConverted ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        fontSize: '0.82rem',
                        fontWeight: 600
                      }}>
                        <Check size={15} />
                        <span>Tracked on Kanban</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleConvertToTask(item)}
                        className="btn btn-primary"
                        style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                      >
                        <KanbanSquare size={15} />
                        <span>Push to Kanban Board</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Full Timestamped Transcript */}
      {activeTab === 'transcript' && (
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '4px' }}>
                Full Timestamped Speech Transcript
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Verbatim speech captures tagged with participant identifiers
              </p>
            </div>

            {/* Transcript Search Box */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
              <input
                type="text"
                placeholder="Search transcript..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '32px', padding: '8px 12px 8px 32px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredTranscript.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '30px' }}>
                No transcript turns matching "{searchTerm}"
              </p>
            ) : (
              filteredTranscript.map((line, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${line.speaker}`}
                    alt={line.speaker}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>{line.speaker}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                        {line.timestamp}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                      {line.text}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
