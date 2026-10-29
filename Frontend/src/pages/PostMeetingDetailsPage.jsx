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
  Layers,
  Award
} from 'lucide-react';

// Safe helper to extract plain string from primitives or nested objects
const safeString = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    return (
      val.text ||
      val.description ||
      val.task ||
      val.name ||
      val.title ||
      val.takeaway ||
      val.decision ||
      val.question ||
      val.topic ||
      JSON.stringify(val)
    );
  }
  return fallback;
};

// Safe date formatter that will never throw on invalid dates
const safeFormatDate = (dateVal, options = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  if (!dateVal) return 'Recent';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      return typeof dateVal === 'string' ? dateVal : 'Recent';
    }
    return d.toLocaleDateString(undefined, options);
  } catch (e) {
    return 'Recent';
  }
};

// Safe extractor for action item properties
const getActionItemDetails = (item, idx = 0) => {
  if (!item) return { id: `item-${idx}`, task: 'Action item', assignee: 'Engineering Team', priority: 'medium', dueDate: 'In 3 days' };

  if (typeof item === 'string') {
    return {
      id: `item-${idx}`,
      task: item,
      assignee: 'Engineering Team',
      priority: 'medium',
      dueDate: 'In 3 days'
    };
  }

  const id = item.id || item._id || `item-${idx}`;
  const task = safeString(item.task || item.description, `Deliverable #${idx + 1}`);
  let assignee = 'Engineering Team';
  if (typeof item.assignee === 'string') {
    assignee = item.assignee;
  } else if (item.assignee && typeof item.assignee === 'object') {
    assignee = item.assignee.name || item.assignee.email || 'Engineering Team';
  } else if (item.assigneeId && typeof item.assigneeId === 'object') {
    assignee = item.assigneeId.name || item.assigneeId.email || 'Engineering Team';
  }

  const rawPriority = (item.priority || 'medium').toLowerCase();
  const priority = ['urgent', 'high', 'medium', 'low'].includes(rawPriority) ? rawPriority : 'medium';
  const dueDate = safeFormatDate(item.dueDate, { month: 'short', day: 'numeric' });

  return { id, task, assignee, priority, dueDate, rawDueDate: item.dueDate };
};

export const PostMeetingDetailsPage = ({ meetingIdOrCode, onBack, onNavigateKanban }) => {
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'actions' | 'transcript'
  const [convertedTasks, setConvertedTasks] = useState(new Set());
  const [actionNotice, setActionNotice] = useState('');

  const loadMeetingDetails = async () => {
    if (!meetingIdOrCode) {
      setLoading(false);
      setSummaryError('No meeting identifier provided.');
      return;
    }

    try {
      setLoading(true);
      setSummaryError(null);

      const res = await api.getMeeting(meetingIdOrCode);
      const meetingData = res?.data || res;

      if (!meetingData) {
        throw new Error(`Meeting "${meetingIdOrCode}" was not found.`);
      }

      setMeeting(meetingData);

      // Track existing converted tasks
      const converted = new Set();
      (meetingData.actionItems || []).forEach(item => {
        if (item?.taskId) converted.add(item.id || item._id);
      });
      setConvertedTasks(converted);

      // If summary is completely missing, trigger generation
      const hasSummary = Boolean(meetingData.summary && meetingData.summary.trim().length > 0);
      const hasTakeaways = Array.isArray(meetingData.keyTakeaways) && meetingData.keyTakeaways.length > 0;

      if (!hasSummary || !hasTakeaways) {
        triggerAiGeneration(meetingData);
      }
    } catch (err) {
      console.error('Failed to load meeting details:', err);
      setSummaryError(err.message || 'Unable to retrieve meeting intelligence.');
    } finally {
      setLoading(false);
    }
  };

  const triggerAiGeneration = async (currentMeeting) => {
    const targetId = currentMeeting?._id || currentMeeting?.code || meetingIdOrCode;
    if (!targetId) return;

    setReanalyzing(true);
    setSummaryError(null);
    try {
      const transcriptToSend = Array.isArray(currentMeeting?.transcript) ? currentMeeting.transcript : [];
      const res = await api.generateAiSummary(targetId, transcriptToSend);

      if (res?.data) {
        setMeeting(prev => ({
          ...(prev || currentMeeting),
          summary: safeString(res.data.summary, prev?.summary || 'Meeting concluded.'),
          topicsCovered: Array.isArray(res.data.topicsCovered) ? res.data.topicsCovered : [],
          keyTakeaways: Array.isArray(res.data.keyTakeaways) ? res.data.keyTakeaways : [],
          keyDecisions: Array.isArray(res.data.keyDecisions) ? res.data.keyDecisions : [],
          importantQuestions: Array.isArray(res.data.importantQuestions) ? res.data.importantQuestions : [],
          actionItems: Array.isArray(res.data.actionItems) ? res.data.actionItems : []
        }));
      }
    } catch (err) {
      console.warn('AI summary generation note:', err.message);
      setSummaryError('Failed to generate AI summary: ' + (err.message || 'Service unavailable'));
    } finally {
      setReanalyzing(false);
    }
  };

  useEffect(() => {
    loadMeetingDetails();
  }, [meetingIdOrCode]);

  const handleConvertToTask = async (actionItem) => {
    try {
      const targetId = meeting?._id || meeting?.code || meetingIdOrCode;
      const itemId = actionItem.id || actionItem._id;
      await api.convertActionItemToTask(targetId, itemId);
      setConvertedTasks(prev => new Set(prev).add(itemId));
      setActionNotice(`Action item pushed to Kanban board!`);
      setTimeout(() => setActionNotice(''), 4000);
      loadMeetingDetails();
    } catch (err) {
      alert('Failed to convert action item to task: ' + (err.message || 'Error'));
    }
  };

  const handleRegenerateAI = async () => {
    setReanalyzing(true);
    setSummaryError(null);
    try {
      const targetId = meeting?._id || meeting?.code || meetingIdOrCode;
      const transcriptToSend = Array.isArray(meeting?.transcript) ? meeting.transcript : [];
      const res = await api.generateAiSummary(targetId, transcriptToSend);
      if (res?.data) {
        setMeeting(prev => ({
          ...prev,
          summary: safeString(res.data.summary),
          topicsCovered: Array.isArray(res.data.topicsCovered) ? res.data.topicsCovered : [],
          keyTakeaways: Array.isArray(res.data.keyTakeaways) ? res.data.keyTakeaways : [],
          keyDecisions: Array.isArray(res.data.keyDecisions) ? res.data.keyDecisions : [],
          importantQuestions: Array.isArray(res.data.importantQuestions) ? res.data.importantQuestions : [],
          actionItems: Array.isArray(res.data.actionItems) ? res.data.actionItems : []
        }));
      }
    } catch (err) {
      setSummaryError('Failed to regenerate summary: ' + (err.message || 'Service error'));
    } finally {
      setReanalyzing(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!meeting) return;
    const dateStr = safeFormatDate(meeting.scheduledAt || meeting.createdAt);
    const content = `# Meeting Intelligence Report: ${safeString(meeting.title, 'Meeting Session')}
**Date:** ${dateStr}
**Code:** ${safeString(meeting.code, 'N/A')}
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
      <div style={{ maxWidth: '900px', margin: '80px auto', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 16px', color: '#4f46e5' }} />
        <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, marginBottom: '6px' }}>
          Loading AI Meeting Intelligence...
        </h3>
        <p style={{ fontSize: '0.92rem', color: '#64748b' }}>
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
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '40px 32px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <AlertCircle size={40} color="#f59e0b" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ color: '#0f172a', fontWeight: 800, fontSize: '1.4rem', marginBottom: '8px' }}>
            Meeting Details Not Found
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '24px', lineHeight: 1.5 }}>
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
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#059669',
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
          background: '#eef2ff',
          border: '1px solid #c7d2fe',
          color: '#4338ca',
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
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '14px 20px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#dc2626" />
            <span style={{ fontSize: '0.88rem' }}>{summaryError}</span>
          </div>
          <button
            onClick={handleRegenerateAI}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.82rem', borderColor: '#fca5a5' }}
          >
            Retry Analysis
          </button>
        </div>
      )}

      {/* Meeting Header Card */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px', marginBottom: '28px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="badge badge-ended">AI Analyzed Session</span>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Code: <code style={{ color: '#4f46e5', fontWeight: 600, background: '#eef2ff', padding: '2px 6px', borderRadius: '4px' }}>{meetingCode}</code>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="#4f46e5" />
              {meetingDate}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} color="#4f46e5" />
              {meetingDuration} min{meetingDuration === 1 ? '' : 's'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={15} color="#4f46e5" />
              {participantsCount} participant{participantsCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <h1 style={{ fontSize: '1.85rem', color: '#0f172a', fontWeight: 800, marginBottom: '8px' }}>
          {meetingTitle}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '850px', margin: 0 }}>
          {meetingDescription}
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '28px',
        gap: '8px'
      }}>
        {[
          { id: 'summary', label: 'AI Executive Summary & Insights', icon: Sparkles },
          { id: 'actions', label: `Action Items (${actionItemsList.length})`, icon: CheckCircle2 },
          { id: 'transcript', label: `Transcript (${rawTranscriptList.length} turns)`, icon: Users }
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
                borderBottom: isActive ? '2px solid #4f46e5' : '2px solid transparent',
                color: isActive ? '#4f46e5' : '#64748b',
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

      {/* ==================================================== */}
      {/* TAB 1: EXECUTIVE SUMMARY & INSIGHTS */}
      {/* ==================================================== */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Executive Summary Card */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(79, 70, 229, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={20} color="#4f46e5" />
              </div>
              <h2 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
                AI Executive Summary
              </h2>
            </div>

            <p style={{
              fontSize: '1rem',
              color: '#334155',
              lineHeight: 1.7,
              background: '#f8fafc',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              margin: 0
            }}>
              {safeString(meeting.summary, 'Summary generation in progress or no dialogue was recorded.')}
            </p>
          </div>

          {/* Topics Covered */}
          {topicsList.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#4f46e5" />
                <span>Topics Covered</span>
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {topicsList.map((topic, i) => (
                  <span key={i} style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    color: '#334155'
                  }}>
                    {safeString(topic)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Discussion Points / Takeaways */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: 700, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="#4f46e5" />
              <span>Key Discussion Points</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {takeawaysList.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                  No discussion points extracted. Record live speech or use chat during meetings to generate AI insights.
                </p>
              ) : (
                takeawaysList.map((takeaway, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <span style={{ color: '#4f46e5', fontWeight: 800, marginTop: '1px' }}>•</span>
                    <span style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.5 }}>
                      {safeString(takeaway)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Decisions Made */}
          {decisionsList.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="#059669" />
                <span>Decisions Made</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {decisionsList.map((decision, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    fontSize: '0.92rem',
                    color: '#166534'
                  }}>
                    <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{safeString(decision)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Important Questions Raised */}
          {questionsList.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={18} color="#d97706" />
                <span>Important Questions & Inquiries</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {questionsList.map((q, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    fontSize: '0.92rem',
                    color: '#92400e'
                  }}>
                    <HelpCircle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{safeString(q)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items Quick Preview */}
          {actionItemsList.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KanbanSquare size={18} color="#4f46e5" />
                  <span>Action Items & Deliverables ({actionItemsList.length})</span>
                </h3>
                <button
                  onClick={() => setActiveTab('actions')}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                >
                  Manage All Action Items
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {actionItemsList.slice(0, 3).map((rawItem, idx) => {
                  const item = getActionItemDetails(rawItem, idx);
                  return (
                    <div key={item.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`badge badge-priority-${item.priority}`} style={{ textTransform: 'capitalize' }}>
                          {item.priority}
                        </span>
                        <span style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 600 }}>
                          {item.task}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Owner: {item.assignee}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: SMART ACTION ITEMS */}
      {/* ==================================================== */}
      {activeTab === 'actions' && (
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, marginBottom: '4px' }}>
                Extracted Action Items ({actionItemsList.length})
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                Automatically derived commitments with designated owners and urgency levels
              </p>
            </div>

            <button 
              onClick={() => onNavigateKanban && onNavigateKanban()}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              <KanbanSquare size={16} />
              <span>Go to Team Kanban Board</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {actionItemsList.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '30px', margin: 0 }}>
                No action items were identified in this meeting discussion.
              </p>
            ) : (
              actionItemsList.map((rawItem, idx) => {
                const item = getActionItemDetails(rawItem, idx);
                const isConverted = convertedTasks.has(item.id) || !!rawItem?.taskId;

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
                      background: '#f8fafc',
                      border: isConverted ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span className={`badge badge-priority-${item.priority}`} style={{ textTransform: 'capitalize' }}>
                          {item.priority}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          Due: {item.dueDate}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '0.98rem', color: '#0f172a', fontWeight: 600, marginBottom: '6px' }}>
                        {item.task}
                      </h4>

                      <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={13} color="#4f46e5" />
                        <span>Owner: <strong style={{ color: '#0f172a' }}>{item.assignee}</strong></span>
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
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#059669',
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
                          style={{ padding: '8px 14px', fontSize: '0.82rem', borderRadius: '8px' }}
                        >
                          <KanbanSquare size={15} />
                          <span>Push to Kanban Board</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: VERBATIM TRANSCRIPT */}
      {/* ==================================================== */}
      {activeTab === 'transcript' && (
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, marginBottom: '4px' }}>
                Full Timestamped Speech Transcript
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                Verbatim speech captures tagged with participant identifiers
              </p>
            </div>

            {/* Transcript Search Box */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '11px' }} />
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
              <p style={{ color: '#64748b', textAlign: 'center', padding: '30px', margin: 0 }}>
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
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(speaker)}`}
                      alt={speaker}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>{speaker}</span>
                        {timestamp && (
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                            {timestamp}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                        {text}
                      </p>
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
