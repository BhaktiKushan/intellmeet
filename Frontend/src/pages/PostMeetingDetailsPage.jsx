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

export const PostMeetingDetailsPage = ({ meetingIdOrCode, onBack, onNavigateKanban }) => {
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'transcript' | 'actions'
  const [convertedTasks, setConvertedTasks] = useState(new Set());
  const [actionNotice, setActionNotice] = useState('');

  const loadMeetingDetails = async () => {
    try {
      setLoading(true);
      setSummaryError(null);
      const res = await api.getMeeting(meetingIdOrCode);
      const meetingData = res.data;
      setMeeting(meetingData);

      // Track existing converted tasks
      const converted = new Set();
      (meetingData?.actionItems || []).forEach(item => {
        if (item.taskId) converted.add(item.id);
      });
      setConvertedTasks(converted);

      // If summary is not yet generated, auto-trigger Gemini intelligence
      if (meetingData && (!meetingData.summary || !meetingData.keyTakeaways || meetingData.keyTakeaways.length === 0)) {
        triggerAiGeneration(meetingData);
      }
    } catch (err) {
      console.error('Failed to load meeting details:', err);
      setSummaryError(err.message || 'Failed to load meeting details.');
    } finally {
      setLoading(false);
    }
  };

  const triggerAiGeneration = async (currentMeeting) => {
    const targetId = currentMeeting?._id || meetingIdOrCode;
    if (!targetId) return;

    setReanalyzing(true);
    setSummaryError(null);
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
      console.warn('AI summary generation note:', err.message);
      setSummaryError('Failed to generate AI summary: ' + (err.message || 'Network error'));
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
    setSummaryError(null);
    try {
      const targetId = meeting?._id || meetingIdOrCode;
      const res = await api.generateAiSummary(targetId, meeting?.transcript || []);
      setMeeting(prev => ({
        ...prev,
        summary: res.data.summary,
        topicsCovered: res.data.topicsCovered || [],
        keyTakeaways: res.data.keyTakeaways || [],
        keyDecisions: res.data.keyDecisions || [],
        importantQuestions: res.data.importantQuestions || [],
        actionItems: res.data.actionItems || []
      }));
    } catch (err) {
      setSummaryError('Failed to regenerate summary: ' + (err.message || 'Error communicating with AI service'));
    } finally {
      setReanalyzing(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!meeting) return;
    const content = `# Meeting Intelligence Report: ${meeting.title}
**Date:** ${new Date(meeting.scheduledAt || meeting.createdAt).toLocaleString()}
**Code:** ${meeting.code}
**Duration:** ${meeting.durationMinutes || 30} minutes

## Executive Summary
${meeting.summary || 'N/A'}

${meeting.topicsCovered && meeting.topicsCovered.length > 0 ? `## Topics Covered\n${meeting.topicsCovered.map(t => `- ${t}`).join('\n')}\n` : ''}
## Key Discussion Points
${(meeting.keyTakeaways || []).map(t => `- ${t}`).join('\n')}

${meeting.keyDecisions && meeting.keyDecisions.length > 0 ? `## Key Decisions Made\n${meeting.keyDecisions.map(d => `- ${d}`).join('\n')}\n` : ''}
${meeting.importantQuestions && meeting.importantQuestions.length > 0 ? `## Important Questions\n${meeting.importantQuestions.map(q => `- ${q}`).join('\n')}\n` : ''}
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
      <div style={{ maxWidth: '1000px', margin: '60px auto', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 16px', color: '#4f46e5' }} />
        <p style={{ fontSize: '1rem', fontWeight: 500 }}>Loading AI Meeting Intelligence...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div style={{ maxWidth: '800px', margin: '60px auto', textAlign: 'center' }}>
        <h2 style={{ color: '#0f172a', fontWeight: 700 }}>Meeting details not found</h2>
        <p style={{ color: '#64748b', marginTop: '8px' }}>The requested meeting code ({meetingIdOrCode}) could not be retrieved.</p>
        <button onClick={onBack} className="btn btn-secondary" style={{ marginTop: '16px' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const filteredTranscript = (meeting.transcript || []).filter(t => 
    (t.text || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.speaker || '').toLowerCase().includes(searchTerm.toLowerCase())
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

      {/* Action Notification Notice */}
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

      {/* AI Intelligence In-Progress Loading Indicator */}
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
          <span>IntellMeet AI is analyzing the actual transcript, extracting decisions, questions, and action items...</span>
        </div>
      )}

      {/* AI Generation Error State */}
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
              Code: <code style={{ color: '#4f46e5', fontWeight: 600, background: '#eef2ff', padding: '2px 6px', borderRadius: '4px' }}>{meeting.code}</code>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="#4f46e5" />
              {new Date(meeting.scheduledAt || meeting.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} color="#4f46e5" />
              {meeting.durationMinutes || 1} min{meeting.durationMinutes === 1 ? '' : 's'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={15} color="#4f46e5" />
              {(meeting.participants || []).length || 1} participant{((meeting.participants || []).length || 1) > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <h1 style={{ fontSize: '1.85rem', color: '#0f172a', fontWeight: 800, marginBottom: '8px' }}>
          {meeting.title}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '850px', margin: 0 }}>
          {meeting.description || 'Enterprise collaboration session with automated AI speech intelligence.'}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '28px',
        gap: '8px'
      }}>
        {[
          { id: 'summary', label: 'AI Executive Summary & Insights', icon: Sparkles },
          { id: 'actions', label: `Action Items (${(meeting.actionItems || []).length})`, icon: CheckCircle2 },
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

      {/* TAB 1: AI Executive Summary & Insights */}
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
              {meeting.summary || 'Summary is being processed...'}
            </p>
          </div>

          {/* Topics Covered */}
          {meeting.topicsCovered && meeting.topicsCovered.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#4f46e5" />
                <span>Topics Covered</span>
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {meeting.topicsCovered.map((topic, i) => (
                  <span key={i} style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    color: '#334155'
                  }}>
                    {topic}
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
              {(meeting.keyTakeaways || []).map((takeaway, idx) => (
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
                    {takeaway}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Decisions Made */}
          {meeting.keyDecisions && meeting.keyDecisions.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="#059669" />
                <span>Decisions Made</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {meeting.keyDecisions.map((decision, idx) => (
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
                    <span>{decision}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Important Questions Raised */}
          {meeting.importantQuestions && meeting.importantQuestions.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={18} color="#d97706" />
                <span>Important Questions & Issues Raised</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {meeting.importantQuestions.map((q, idx) => (
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
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items Quick Preview */}
          {meeting.actionItems && meeting.actionItems.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KanbanSquare size={18} color="#4f46e5" />
                  <span>Action Items & Deliverables ({meeting.actionItems.length})</span>
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
                {meeting.actionItems.slice(0, 3).map((item) => (
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
                      <span className={`badge badge-priority-${item.priority || 'medium'}`} style={{ textTransform: 'capitalize' }}>
                        {item.priority}
                      </span>
                      <span style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 600 }}>
                        {item.task}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      Owner: {item.assignee || 'Team'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: Smart Action Items */}
      {activeTab === 'actions' && (
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, marginBottom: '4px' }}>
                Extracted Action Items ({meeting.actionItems?.length || 0})
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
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
            {(meeting.actionItems || []).length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '30px', margin: 0 }}>
                No action items were identified in this meeting discussion.
              </p>
            ) : (
              (meeting.actionItems || []).map((item) => {
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
                      background: '#f8fafc',
                      border: isConverted ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span className={`badge badge-priority-${item.priority || 'medium'}`}>
                          {item.priority}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          Due: {new Date(item.dueDate || Date.now() + 86400000 * 3).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '0.98rem', color: '#0f172a', fontWeight: 600, marginBottom: '6px' }}>
                        {item.task}
                      </h4>

                      <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={13} color="#4f46e5" />
                        <span>Owner: <strong style={{ color: '#0f172a' }}>{item.assignee || 'Engineering Team'}</strong></span>
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

      {/* TAB 3: Full Timestamped Transcript */}
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
              filteredTranscript.map((line, idx) => (
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
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${line.speaker}`}
                    alt={line.speaker}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>{line.speaker}</span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                        {line.timestamp}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
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

export default PostMeetingDetailsPage;
