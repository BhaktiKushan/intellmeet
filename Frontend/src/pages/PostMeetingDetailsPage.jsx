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
  AlertCircle,
  HelpCircle,
  FileText,
  Tag,
  CheckSquare
} from 'lucide-react';

export const PostMeetingDetailsPage = ({ meetingIdOrCode, onBack, onNavigateKanban }) => {
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'actions' | 'transcript'
  const [convertedTasks, setConvertedTasks] = useState(new Set());
  const [actionNotice, setActionNotice] = useState('');
  const [summaryError, setSummaryError] = useState('');

  // Defensive String Resolver (Ensures objects, null, undefined never crash React 19)
  const safeString = (val, fallback = '') => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
      if (val.text) return safeString(val.text, fallback);
      if (val.title) return safeString(val.title, fallback);
      if (val.decision) return safeString(val.decision, fallback);
      if (val.topic) return safeString(val.topic, fallback);
      if (val.question) return safeString(val.question, fallback);
      if (val.task) return safeString(val.task, fallback);
      if (val.name) return safeString(val.name, fallback);
      try {
        return JSON.stringify(val);
      } catch (e) {
        return fallback;
      }
    }
    return fallback;
  };

  // Safe Date Formatter
  const safeFormatDate = (dateVal) => {
    if (!dateVal) return 'Recently';
    const parsed = new Date(dateVal);
    if (isNaN(parsed.getTime())) return 'Recently';
    return parsed.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Action item details resolver
  const getActionItemDetails = (item, idx) => {
    if (typeof item === 'string') {
      return {
        id: `item-${idx}`,
        task: item,
        assignee: 'Engineering Team',
        priority: 'medium',
        dueDate: 'Soon'
      };
    }
    const assigneeName = typeof item.assigneeId === 'object' && item.assigneeId !== null
      ? (item.assigneeId.name || 'Team Member')
      : (item.assignee || 'Engineering Team');

    return {
      id: item.id || item._id || `item-${idx}`,
      task: safeString(item.task || item.description, `Deliverable #${idx + 1}`),
      assignee: safeString(assigneeName, 'Team Member'),
      priority: safeString(item.priority, 'medium').toLowerCase(),
      dueDate: safeFormatDate(item.dueDate)
    };
  };

  const loadMeetingDetails = async () => {
    setLoading(true);
    setSummaryError('');
    try {
      const res = await api.getMeeting(meetingIdOrCode);
      const meetingData = res.data;
      setMeeting(meetingData);

      // Track already converted tasks
      const converted = new Set();
      (meetingData.actionItems || []).forEach(item => {
        if (item.taskId) converted.add(item.id || item._id);
      });
      setConvertedTasks(converted);

      // If meeting is ended and summary is empty, auto-trigger AI intelligence
      if (meetingData && (!meetingData.summary || !meetingData.keyTakeaways || meetingData.keyTakeaways.length === 0)) {
        triggerAiGeneration(meetingData);
      }
    } catch (err) {
      console.error('Failed to load meeting details:', err);
      setSummaryError(err.message || 'Could not load meeting details.');
    } finally {
      setLoading(false);
    }
  };

  const triggerAiGeneration = async (currentMeeting) => {
    const targetId = currentMeeting?._id || currentMeeting?.code || meetingIdOrCode;
    if (!targetId) return;

    setReanalyzing(true);
    setSummaryError('');
    try {
      const res = await api.generateAiSummary(targetId, currentMeeting?.transcript || []);
      if (res.data) {
        setMeeting(prev => ({
          ...(prev || currentMeeting),
          summary: res.data.summary,
          topicsCovered: res.data.topicsCovered || [],
          keyTakeaways: res.data.keyTakeaways || [],
          keyDecisions: res.data.keyDecisions || [],
          importantQuestions: res.data.importantQuestions || [],
          actionItems: res.data.actionItems || []
        }));
      }
    } catch (err) {
      console.warn('Auto AI generation notice:', err.message);
      setSummaryError('AI intelligence generation took longer than expected. You can click "Retry Analysis" below.');
    } finally {
      setReanalyzing(false);
    }
  };

  useEffect(() => {
    if (meetingIdOrCode) {
      loadMeetingDetails();
    }
  }, [meetingIdOrCode]);

  const handleConvertToTask = async (actionItem, idx) => {
    const details = getActionItemDetails(actionItem, idx);
    try {
      const targetId = meeting?._id || meeting?.code || meetingIdOrCode;
      await api.convertActionItemToTask(targetId, details.id);
      setConvertedTasks(prev => new Set(prev).add(details.id));
      setActionNotice(`Task "${details.task.slice(0, 32)}..." added to Kanban board!`);
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      alert('Failed to convert action item to task: ' + err.message);
    }
  };

  const handleRegenerateAI = async () => {
    setReanalyzing(true);
    setSummaryError('');
    try {
      const targetId = meeting?._id || meeting?.code || meetingIdOrCode;
      const res = await api.generateAiSummary(targetId, meeting?.transcript || []);
      if (res.data) {
        setMeeting(prev => ({
          ...prev,
          summary: res.data.summary,
          topicsCovered: res.data.topicsCovered || [],
          keyTakeaways: res.data.keyTakeaways || [],
          keyDecisions: res.data.keyDecisions || [],
          importantQuestions: res.data.importantQuestions || [],
          actionItems: res.data.actionItems || []
        }));
        setActionNotice('AI Intelligence generated successfully using Google Gemini!');
        setTimeout(() => setActionNotice(''), 3500);
      }
    } catch (err) {
      setSummaryError('AI generation error: ' + err.message);
    } finally {
      setReanalyzing(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!meeting) return;
    const content = `# Meeting Intelligence Report: ${safeString(meeting.title, 'Team Meeting')}
**Date:** ${safeFormatDate(meeting.scheduledAt || meeting.createdAt)}
**Code:** ${safeString(meeting.code, meetingIdOrCode)}
**Duration:** ${meeting.durationMinutes || 1} minutes

## Executive Summary
${safeString(meeting.summary, 'N/A')}

${Array.isArray(meeting.topicsCovered) && meeting.topicsCovered.length > 0 ? `## Topics Covered\n${meeting.topicsCovered.map(t => `- ${safeString(t)}`).join('\n')}\n` : ''}
## Key Discussion Points
${(Array.isArray(meeting.keyTakeaways) ? meeting.keyTakeaways : []).map(t => `- ${safeString(t)}`).join('\n')}

${Array.isArray(meeting.keyDecisions) && meeting.keyDecisions.length > 0 ? `## Key Decisions Made\n${meeting.keyDecisions.map(d => `- ${safeString(d)}`).join('\n')}\n` : ''}
${Array.isArray(meeting.importantQuestions) && meeting.importantQuestions.length > 0 ? `## Important Questions\n${meeting.importantQuestions.map(q => `- ${safeString(q)}`).join('\n')}\n` : ''}
## Extracted Action Items
${(Array.isArray(meeting.actionItems) ? meeting.actionItems : []).map((a, i) => {
  const d = getActionItemDetails(a, i);
  return `- [ ] **${d.task}** (Assignee: ${d.assignee}, Priority: ${d.priority}, Due: ${d.dueDate})`;
}).join('\n')}

## Full Transcript
${(Array.isArray(meeting.transcript) ? meeting.transcript : []).map(t => `[${safeString(t?.timestamp, '')}] **${safeString(t?.speaker, 'Speaker')}:** ${safeString(t?.text, '')}`).join('\n')}
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Meeting_Summary_${safeString(meeting.code, 'meeting')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ----------------------------------------------------
  // LOADING STATE
  // ----------------------------------------------------
  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '80px auto', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 16px', color: '#818cf8' }} />
        <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700, marginBottom: '6px' }}>
          Loading AI Meeting Intelligence...
        </h3>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
          Retrieving session dialogue, transcript, and decisions.
        </p>
      </div>
    );
  }

  // ----------------------------------------------------
  // ERROR / NOT FOUND STATE
  // ----------------------------------------------------
  if (!meeting) {
    return (
      <div style={{ maxWidth: '680px', margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <div className="glass-panel" style={{ padding: '40px 32px' }}>
          <AlertCircle size={40} color="#f59e0b" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.4rem', marginBottom: '8px' }}>
            Meeting Details Not Found
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '24px', lineHeight: 1.5 }}>
            {summaryError || `The meeting details for "${meetingIdOrCode}" could not be retrieved from the server.`}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={loadMeetingDetails} className="btn btn-primary" style={{ fontSize: '0.88rem' }}>
              <RefreshCw size={15} />
              <span>Retry</span>
            </button>
            <button onClick={onBack} className="btn btn-secondary" style={{ fontSize: '0.88rem' }}>
              <ArrowLeft size={15} />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Safe normalized variables
  const meetingTitle = safeString(meeting.title, 'Meeting Session');
  const meetingCode = safeString(meeting.code, meetingIdOrCode);
  const meetingDescription = safeString(meeting.description, 'Enterprise collaboration session with automated AI speech intelligence.');
  const meetingDuration = meeting.durationMinutes || 1;
  const meetingDate = safeFormatDate(meeting.scheduledAt || meeting.createdAt);
  const participantsCount = Array.isArray(meeting.participants) ? meeting.participants.length : 1;

  const topicsList = Array.isArray(meeting.topicsCovered) ? meeting.topicsCovered : [];
  const takeawaysList = Array.isArray(meeting.keyTakeaways) ? meeting.keyTakeaways : [];
  const decisionsList = Array.isArray(meeting.keyDecisions) ? meeting.keyDecisions : [];
  const questionsList = Array.isArray(meeting.importantQuestions) ? meeting.importantQuestions : [];
  const actionItemsList = Array.isArray(meeting.actionItems) ? meeting.actionItems : [];
  const rawTranscriptList = Array.isArray(meeting.transcript) ? meeting.transcript : [];

  const filteredTranscript = rawTranscriptList.filter(t => {
    if (!t) return false;
    const text = safeString(t.text || (typeof t === 'string' ? t : ''));
    const speaker = safeString(t.speaker, '');
    return text.toLowerCase().includes(searchTerm.toLowerCase()) || speaker.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '32px 24px 80px' }}>
      
      {/* Top Action Bar */}
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
          style={{ padding: '8px 16px', fontSize: '0.88rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <button
            onClick={handleRegenerateAI}
            disabled={reanalyzing}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} className={reanalyzing ? 'animate-spin' : ''} />
            <span>{reanalyzing ? 'Analyzing with AI...' : 'Re-run AI Analysis'}</span>
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

      {/* Action Notification */}
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
          gap: '10px',
          fontSize: '0.88rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Reanalyzing Indicator */}
      {reanalyzing && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          color: '#a5b4fc',
          padding: '14px 20px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <Sparkles size={18} className="animate-spin" />
          <span>IntellMeet AI is analyzing the actual transcript and deriving fresh intelligence...</span>
        </div>
      )}

      {/* Error Alert */}
      {summaryError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#fca5a5',
          padding: '14px 20px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#ef4444" />
            <span style={{ fontSize: '0.88rem' }}>{summaryError}</span>
          </div>
          <button
            onClick={handleRegenerateAI}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.82rem', borderColor: 'rgba(239, 68, 68, 0.4)' }}
          >
            Retry Analysis
          </button>
        </div>
      )}

      {/* Meeting Header Card */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="badge badge-ended">AI Analyzed Session</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              Code: <code style={{ color: '#a5b4fc', fontWeight: 600, background: 'rgba(99, 102, 241, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>{meetingCode}</code>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="#818cf8" />
              {meetingDate}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} color="#818cf8" />
              {meetingDuration} mins
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={15} color="#818cf8" />
              {participantsCount} participants
            </span>
          </div>
        </div>

        <h1 style={{ fontSize: '1.9rem', color: '#fff', marginBottom: '8px', fontWeight: 800 }}>
          {meetingTitle}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
          {meetingDescription}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '28px',
        gap: '8px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'summary', label: 'AI Intelligence & Takeaways', icon: Sparkles },
          { id: 'actions', label: `Action Items (${actionItemsList.length})`, icon: CheckCircle2 },
          { id: 'transcript', label: `Transcript (${rawTranscriptList.length} turns)`, icon: FileText }
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
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: SUMMARY & TAKEAWAYS */}
      {/* ==================================================== */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Executive Summary Card */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={18} color="#818cf8" />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 700, margin: 0 }}>
                Executive Meeting Summary
              </h3>
            </div>

            <p style={{
              fontSize: '1rem',
              lineHeight: 1.7,
              color: 'var(--text-main)',
              margin: 0
            }}>
              {safeString(meeting.summary) || (
                <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  No verbal transcript was recorded for this meeting. Use the in-meeting microphone or chat during your meetings to automatically generate detailed AI summaries.
                </span>
              )}
            </p>
          </div>

          {/* Topics Covered (Pills) */}
          {topicsList.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Tag size={18} color="#818cf8" />
                <h3 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700, margin: 0 }}>
                  Topics Covered
                </h3>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {topicsList.map((topic, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      color: '#c7d2fe',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.84rem',
                      fontWeight: 600
                    }}
                  >
                    #{safeString(topic)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Discussion Points */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckSquare size={18} color="#818cf8" />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 700, margin: 0 }}>
                Key Discussion Points & Takeaways
              </h3>
            </div>

            {takeawaysList.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', margin: 0 }}>
                No key takeaways captured yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {takeawaysList.map((point, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: 'rgba(14, 21, 36, 0.6)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: '#a5b4fc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {idx + 1}
                    </div>
                    <span style={{ fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
                      {safeString(point)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Two-Column Grid: Decisions Made & Questions Raised */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            
            {/* Key Decisions */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <CheckCircle2 size={18} color="#10b981" />
                <h3 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700, margin: 0 }}>
                  Decisions Made ({decisionsList.length})
                </h3>
              </div>

              {decisionsList.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', margin: 0 }}>
                  No explicit decisions noted during this session.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {decisionsList.map((decision, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        fontSize: '0.88rem',
                        color: '#6ee7b7',
                        lineHeight: 1.5
                      }}
                    >
                      ✓ {safeString(decision)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Questions Raised */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <HelpCircle size={18} color="#f59e0b" />
                <h3 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700, margin: 0 }}>
                  Questions & Topics Raised ({questionsList.length})
                </h3>
              </div>

              {questionsList.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', margin: 0 }}>
                  No unresolved questions identified.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {questionsList.map((question, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        fontSize: '0.88rem',
                        color: '#fcd34d',
                        lineHeight: 1.5
                      }}
                    >
                      ? {safeString(question)}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: SMART ACTION ITEMS */}
      {/* ==================================================== */}
      {activeTab === 'actions' && (
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700, marginBottom: '4px' }}>
                AI-Extracted Action Items
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
                Tasks automatically extracted by AI from meeting speech with assignees, priorities, and deadlines.
              </p>
            </div>

            {onNavigateKanban && (
              <button
                onClick={onNavigateKanban}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                <KanbanSquare size={16} />
                <span>Go to Sprint Kanban</span>
              </button>
            )}
          </div>

          {actionItemsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-dim)' }}>
              <CheckCircle2 size={36} color="var(--text-dim)" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.95rem' }}>No actionable tasks detected in this session's transcript.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {actionItemsList.map((rawItem, idx) => {
                const item = getActionItemDetails(rawItem, idx);
                const isConverted = convertedTasks.has(item.id);

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      background: 'rgba(14, 21, 36, 0.7)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span className={`badge badge-priority-${item.priority}`}>
                          {item.priority.toUpperCase()}
                        </span>
                        <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                          {item.task}
                        </h4>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={13} color="#818cf8" />
                          <span>Owner: <strong style={{ color: '#fff' }}>{item.assignee}</strong></span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} color="#818cf8" />
                          <span>Due: {item.dueDate}</span>
                        </span>
                      </div>
                    </div>

                    <div>
                      {isConverted ? (
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#34d399',
                          fontSize: '0.84rem',
                          fontWeight: 600,
                          padding: '6px 14px',
                          borderRadius: '8px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          <Check size={14} />
                          <span>On Kanban Board</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleConvertToTask(rawItem, idx)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.82rem', padding: '7px 14px' }}
                        >
                          <KanbanSquare size={14} color="#818cf8" />
                          <span>Add to Kanban</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: VERBATIM TRANSCRIPT */}
      {/* ==================================================== */}
      {activeTab === 'transcript' && (
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700, marginBottom: '4px' }}>
                Verbatim Session Transcript
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
                Real-time speech converted to text with exact speaker identification and timestamps.
              </p>
            </div>

            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                placeholder="Search dialogue or speaker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '36px', fontSize: '0.85rem', width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredTranscript.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '48px 0', fontSize: '0.9rem' }}>
                {searchTerm ? `No transcript turns matching "${searchTerm}"` : 'No verbal speech was captured during this session.'}
              </p>
            ) : (
              filteredTranscript.map((rawLine, idx) => {
                const speaker = safeString(rawLine?.speaker, 'Speaker');
                const text = safeString(rawLine?.text || (typeof rawLine === 'string' ? rawLine : ''));
                const timestamp = safeString(rawLine?.timestamp, '');

                return (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: 'rgba(14, 21, 36, 0.5)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(speaker)}`}
                      alt={speaker}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>{speaker}</span>
                        {timestamp && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                            {timestamp}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                        {text}
                      </p>
                      {rawLine?.translation && (
                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '0.84rem', color: '#38bdf8', lineHeight: 1.4 }}>
                          <span style={{ fontSize: '0.68rem', background: 'rgba(56, 189, 248, 0.15)', color: '#7dd3fc', padding: '1px 5px', borderRadius: '3px', marginRight: '6px', fontWeight: 700 }}>
                            {(rawLine.targetLanguage || 'Translated').toUpperCase()}
                          </span>
                          {rawLine.translation}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default PostMeetingDetailsPage;
