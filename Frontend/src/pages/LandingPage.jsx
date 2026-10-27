import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Video,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  Monitor,
  Circle,
  Sparkles,
  Zap,
  CheckCircle2,
  Users,
  Layout,
  Layers,
  ChevronRight
} from 'lucide-react';

export const LandingPage = () => {
  const { login, register, demoLogin } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (authMode === 'login') {
        await login(email, password);
      } else if (authMode === 'register') {
        await register({ name, email, password, role: 'member', department });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async (role = 'admin') => {
    setError('');
    setLoading(true);
    try {
      await demoLogin(role);
    } catch (err) {
      setError(err.message || 'Demo sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const scrollToAuth = () => {
    const el = document.getElementById('auth-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 68px)', position: 'relative', overflowX: 'hidden' }}>
      
      {/* ---------------- 1. HERO SECTION ---------------- */}
      <section style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '54px 24px 72px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Release Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '30px',
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          color: '#a5b4fc',
          fontSize: '0.84rem',
          fontWeight: 600,
          marginBottom: '24px'
        }}>
          <Sparkles size={15} color="#818cf8" />
          <span>IntellMeet 2.0 Enterprise Release &bull; Next-Gen WebRTC & AI Intelligence</span>
        </div>

        {/* Hero Headline */}
        <h1 style={{
          fontSize: 'clamp(2.4rem, 5vw, 4rem)',
          fontWeight: 900,
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          color: '#ffffff',
          maxWidth: '960px',
          margin: '0 auto 20px'
        }}>
          Intelligent Video Meetings with <span className="gradient-text">Studio Clarity & AI Synthesis</span>
        </h1>

        {/* Hero Subtitle */}
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: 'var(--text-muted)',
          maxWidth: '720px',
          margin: '0 auto 36px',
          lineHeight: 1.6
        }}>
          Ultra-low-latency video conferencing inspired by Google Meet and Zoom. Prominent screen sharing, full multi-track meeting recording, host governance, and real-time AI speech-to-action workflows.
        </p>

        {/* Hero CTA Action Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '54px'
        }}>
          <button
            onClick={() => handleDemoSignIn('admin')}
            className="btn btn-primary"
            style={{
              padding: '14px 28px',
              fontSize: '1rem',
              fontWeight: 700,
              borderRadius: '14px',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)'
            }}
          >
            <Zap size={18} />
            <span>Launch Instant Demo (Admin)</span>
          </button>

          <button
            onClick={scrollToAuth}
            className="btn btn-secondary"
            style={{
              padding: '14px 28px',
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: '14px'
            }}
          >
            <span>Sign In / Create Account</span>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Hero Interactive Video Room Mockup */}
        <div style={{
          maxWidth: '1080px',
          margin: '0 auto',
          borderRadius: '24px',
          overflow: 'hidden',
          background: '#070a14',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.2)',
          position: 'relative'
        }}>
          {/* Mockup Top Bar */}
          <div style={{
            background: 'rgba(10, 15, 26, 0.9)',
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
            color: '#a5b4fc'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              <span style={{ fontWeight: 700, color: '#ffffff', marginLeft: '6px' }}>Sprint 42 Architecture & WebRTC Sync</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={13} />
                <span>124ms Latency</span>
              </span>
              <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                REC 18:42
              </span>
            </div>
          </div>

          {/* Mockup Meeting Stage: Prominent Screen Share + Side Filmstrip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 240px',
            gap: '12px',
            padding: '16px',
            background: '#040711',
            minHeight: '360px'
          }}>
            {/* Center Stage: Screen Share Preview */}
            <div style={{
              borderRadius: '16px',
              overflow: 'hidden',
              background: '#0a0f1d',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}>
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: 'rgba(10, 15, 26, 0.85)',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                color: '#ffffff',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}>
                <Monitor size={12} color="#818cf8" />
                <span>Sarah Chen is presenting: Distributed WebRTC Topology</span>
              </div>

              {/* Graphical Representation of Screen Share Content */}
              <div style={{
                width: '85%',
                height: '70%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px dashed rgba(99, 102, 241, 0.4)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '12px',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.25)', color: '#818cf8', fontSize: '0.8rem', fontWeight: 700 }}>
                    Client Peer A
                  </div>
                  <span style={{ color: '#34d399', fontWeight: 800 }}>&harr; WebRTC 120ms &harr;</span>
                  <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.25)', color: '#34d399', fontSize: '0.8rem', fontWeight: 700 }}>
                    Client Peer B
                  </div>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                  Screen content is rendered in crisp, high-resolution priority stage with preserved aspect ratio.
                </div>
              </div>
            </div>

            {/* Filmstrip Mockup */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{
                aspectRatio: '16/9',
                borderRadius: '12px',
                background: '#0d1322',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt="Alex"
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ position: 'absolute', bottom: '6px', left: '8px', fontSize: '0.7rem', color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '8px' }}>
                  Alex Rivera (Host)
                </span>
              </div>

              <div style={{
                aspectRatio: '16/9',
                borderRadius: '12px',
                background: '#0d1322',
                border: '2px solid #06b6d4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 0 16px rgba(6, 182, 212, 0.35)'
              }}>
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80"
                  alt="Sarah"
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ position: 'absolute', bottom: '6px', left: '8px', fontSize: '0.7rem', color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '8px' }}>
                  Sarah Chen (Speaking)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 2. ENTERPRISE VALUE PILLARS ---------------- */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '36px 24px 64px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '24px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Pillar 1 */}
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '20px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8',
            marginBottom: '18px'
          }}>
            <Monitor size={24} />
          </div>
          <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '8px' }}>
            Prominent Screen Sharing
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Automated presenter stage layout. Presenter stream takes center stage with preserved aspect ratio, while participants form an organized filmstrip.
          </p>
        </div>

        {/* Pillar 2 */}
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '20px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f87171',
            marginBottom: '18px'
          }}>
            <Circle size={22} fill="#ef4444" />
          </div>
          <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '8px' }}>
            Multi-Audio Meeting Recording
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Canvas stage composite or full-desktop capture with Web Audio API multi-mic mixing. Captures your voice and all remote participants with instant playback and download.
          </p>
        </div>

        {/* Pillar 3 */}
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '20px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399',
            marginBottom: '18px'
          }}>
            <ShieldCheck size={24} />
          </div>
          <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '8px' }}>
            Server-Enforced Host Controls
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Enterprise host roles enforced at the socket level. Host can mute participants, remove disruptive users, lock screen sharing, and manage meeting settings.
          </p>
        </div>

        {/* Pillar 4 */}
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '20px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'rgba(168, 85, 247, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#c084fc',
            marginBottom: '18px'
          }}>
            <Sparkles size={24} />
          </div>
          <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '8px' }}>
            AI Synthesis & Kanban Integration
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Real-time speech-to-text captions, automated post-meeting executive summaries, and 1-click conversion of action items into Kanban tasks.
          </p>
        </div>
      </section>

      {/* ---------------- 3. AUTHENTICATION & DEMO LOGIN ---------------- */}
      <section
        id="auth-section"
        style={{
          maxWidth: '520px',
          margin: '0 auto 80px',
          padding: '0 20px',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div
          className="glass-panel"
          style={{
            borderRadius: '24px',
            padding: '36px 32px',
            border: '1px solid rgba(99, 102, 241, 0.28)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
            background: 'rgba(14, 21, 36, 0.95)',
            backdropFilter: 'blur(20px)'
          }}
        >
          {/* Quick Demo Login Buttons */}
          <div style={{ marginBottom: '28px' }}>
            <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Instant Demo Access (One Click):
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleDemoSignIn('admin')}
                className="btn btn-secondary"
                style={{ padding: '8px 10px', fontSize: '0.8rem', justifyContent: 'flex-start', border: '1px solid rgba(99, 102, 241, 0.3)' }}
              >
                <ShieldCheck size={14} color="#818cf8" />
                <span>Alex (Admin/Host)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoSignIn('member')}
                className="btn btn-secondary"
                style={{ padding: '8px 10px', fontSize: '0.8rem', justifyContent: 'flex-start', border: '1px solid rgba(16, 185, 129, 0.3)' }}
              >
                <UserIcon size={14} color="#34d399" />
                <span>Sarah (Member)</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>OR USE CREDENTIALS</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          </div>

          {/* Switcher: Sign In vs Create Account */}
          <div style={{
            display: 'flex',
            background: 'rgba(10, 15, 26, 0.85)',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setError(''); }}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '8px',
                border: 'none',
                background: authMode === 'login' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                color: authMode === 'login' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: authMode === 'login' ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setError(''); }}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '8px',
                border: 'none',
                background: authMode === 'register' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                color: authMode === 'register' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: authMode === 'register' ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '10px 14px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {authMode === 'register' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    placeholder="Alex Rivera"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '38px' }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Work Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '38px', paddingRight: '38px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.96rem',
                fontWeight: 700,
                borderRadius: '12px'
              }}
            >
              <span>{loading ? 'Authenticating...' : authMode === 'login' ? 'Sign In to Workspace' : 'Create Enterprise Account'}</span>
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
