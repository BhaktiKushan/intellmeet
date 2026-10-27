import React, { useState } from 'react';
import {
  Circle,
  Monitor,
  Layout,
  Volume2,
  Download,
  Save,
  X,
  Check,
  AlertCircle,
  FileVideo,
  Clock,
  Sparkles
} from 'lucide-react';

export const RecordingModal = ({
  isOpen,
  onClose,
  mode = 'select', // 'select' | 'preview'
  onStartRecording,
  completedRecording = null, // { url, blob, duration, mimeType }
  onSaveToHistory
}) => {
  const [selectedMode, setSelectedMode] = useState('composite'); // 'composite' | 'screen'
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleStart = () => {
    onStartRecording(selectedMode);
    onClose();
  };

  const handleSave = async () => {
    if (!onSaveToHistory || !completedRecording) return;
    setIsSaving(true);
    try {
      await onSaveToHistory(completedRecording);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      alert('Failed to save recording: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!completedRecording?.url) return;
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = completedRecording.url;
    const ext = completedRecording.mimeType?.includes('mp4') ? 'mp4' : 'webm';
    a.download = `IntellMeet_Recording_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 400);
  };

  const formatSecs = (secs) => {
    const mins = Math.floor((secs || 0) / 60);
    const rem = (secs || 0) % 60;
    return `${mins}m ${rem}s`;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(4, 7, 15, 0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 100
    }}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: mode === 'preview' ? '680px' : '560px',
          borderRadius: '24px',
          padding: '32px',
          background: 'rgba(14, 21, 36, 0.96)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75)',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim)',
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        {/* MODE 1: SELECT RECORDING MODE */}
        {mode === 'select' && (
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '14px'
            }}>
              <Circle size={10} fill="#ef4444" color="#ef4444" />
              <span>Recording Configuration</span>
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Choose Recording Mode
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Select how you would like to capture this enterprise meeting session.
            </p>

            {/* Mode Option Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              {/* Option A: Meeting Composition */}
              <div
                onClick={() => setSelectedMode('composite')}
                style={{
                  border: selectedMode === 'composite' ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
                  background: selectedMode === 'composite' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '16px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px'
                }}
              >
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8',
                  flexShrink: 0
                }}>
                  <Layout size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff' }}>
                      Meeting Stage Composition (Recommended)
                    </span>
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#34d399',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}>
                      Instant
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Captures the live meeting window with intelligent screen share focus, active speaker video tiles, and multi-track mixed audio (local mic + all remote participants).
                  </p>
                </div>
              </div>

              {/* Option B: Full Desktop / Screen Capture */}
              <div
                onClick={() => setSelectedMode('screen')}
                style={{
                  border: selectedMode === 'screen' ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
                  background: selectedMode === 'screen' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '16px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px'
                }}
              >
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(168, 85, 247, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#c084fc',
                  flexShrink: 0
                }}>
                  <Monitor size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff' }}>
                      Entire Desktop or Window Capture
                    </span>
                    <span style={{
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: '#a5b4fc',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}>
                      System Audio
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Prompts you to select your entire screen, application window, or browser tab. Includes system/tab audio (when permitted) mixed with your microphone.
                  </p>
                </div>
              </div>
            </div>

            {/* Audio Mixing Notice */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '0.8rem',
              color: 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '24px'
            }}>
              <Volume2 size={16} color="#34d399" style={{ flexShrink: 0 }} />
              <span>
                Web Audio API compositor will automatically synchronize and mix microphone tracks with remote participant voices without audio feedback.
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onClose}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '12px', borderRadius: '12px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                className="btn btn-danger"
                style={{
                  flex: 2,
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Circle size={14} fill="#ffffff" />
                <span>Start Recording Now</span>
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: RECORDING COMPLETED PREVIEW & DOWNLOAD */}
        {mode === 'preview' && completedRecording && (
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '14px'
            }}>
              <Check size={14} />
              <span>Recording Finalized</span>
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Meeting Recording Ready
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Your meeting video and audio have been compiled successfully. You can preview, download, or save it to meeting history.
            </p>

            {/* Video Player */}
            <div style={{
              width: '100%',
              aspectRatio: '16/9',
              borderRadius: '16px',
              overflow: 'hidden',
              background: '#040711',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '18px',
              boxShadow: 'var(--shadow-md)'
            }}>
              <video
                src={completedRecording.url}
                controls
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            {/* Video Metadata Pills */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'rgba(15, 23, 42, 0.65)',
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              marginBottom: '24px',
              fontSize: '0.82rem',
              color: 'var(--text-muted)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="#818cf8" />
                <span>Duration: <strong>{formatSecs(completedRecording.duration)}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileVideo size={14} color="#34d399" />
                <span>Size: <strong>{formatBytes(completedRecording.blob?.size)}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="#c084fc" />
                <span>Format: <strong>{completedRecording.mimeType || 'video/webm'}</strong></span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleDownload}
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px 18px', borderRadius: '12px', fontWeight: 700 }}
              >
                <Download size={16} />
                <span>Download Video</span>
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving || savedSuccess}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '12px 18px', borderRadius: '12px', fontWeight: 600 }}
              >
                {savedSuccess ? (
                  <>
                    <Check size={16} color="#34d399" />
                    <span>Saved to History!</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>{isSaving ? 'Saving...' : 'Save to History'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
