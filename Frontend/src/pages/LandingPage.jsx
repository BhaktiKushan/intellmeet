import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Video, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  ShieldCheck, 
  KanbanSquare, 
  Clock, 
  TrendingUp, 
  Cpu, 
  Users, 
  ArrowRight,
  Lock,
  Mail,
  User as UserIcon
} from 'lucide-react';

export const LandingPage = () => {
  const { login, register, demoLogin } = useAuth();
  const [authMode, setAuthMode] = useState('demo'); // 'demo' | 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
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
        await register({ name, email, password, role: 'member' });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (role) => {
    setLoading(true);
    setError('');
    try {
      await demoLogin(role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '40px 24px 80px' }}>
      {/* Hero Section */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        
        {/* Release Tag */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '30px',
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          marginBottom: '24px'
        }}>
          <Sparkles size={16} color="#818cf8" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe' }}>
            Production-Grade MERN Full-Stack System with AI Intelligence
          </span>
        </div>

        {/* Hero Title */}
        <h1 style={{
          fontSize: 'clamp(2.4rem, 5vw, 4.2rem)',
          fontWeight: 800,
          lineHeight: 1.15,
          marginBottom: '20px',
          letterSpacing: '-0.03em'
        }}>
          Where Enterprise Meetings Turn Into <br />
          <span className="gradient-text">Actionable Intelligence</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: 'var(--text-muted)',
          maxWidth: '780px',
          margin: '0 auto 36px',
          lineHeight: 1.6
        }}>
          Transform corporate discussions with real-time WebRTC video, live AI speech-to-text, 
          automated executive summaries, and smart action item synchronization directly into Kanban workflows.
        </p>

        {/* Impact Metric Chips */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '48px'
        }}>
          {[
            { label: 'Follow-Up Time Reduction', val: '40–60%', icon: Clock, color: '#38bdf8' },
            { label: 'Team Productivity Boost', val: '+25–40%', icon: TrendingUp, color: '#4ade80' },
            { label: 'Latency SLA Target', val: '< 200 ms', icon: Zap, color: '#fbbf24' },
            { label: 'Availability Benchmark', val: '99.95% SLA', icon: ShieldCheck, color: '#a78bfa' }
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div 
                key={idx} 
                className="glass-panel" 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <Icon size={18} color={stat.color} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>{stat.val}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Quick Launch & Auth Box */}
        <div 
          className="glass-panel"
          style={{
            maxWidth: '520px',
            margin: '0 auto 64px',
            padding: '32px',
            borderRadius: '20px',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            boxShadow: 'var(--shadow-glow)'
          }}
        >
          {/* Mode Tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.8)',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '24px'
          }}>
            {[
              { id: 'demo', label: '⚡ Instant Demo (No Login)' },
              { id: 'login', label: 'Sign In' },
              { id: 'register', label: 'Create Account' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setAuthMode(tab.id); setError(''); }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: authMode === tab.id ? 700 : 500,
                  color: authMode === tab.id ? '#ffffff' : 'var(--text-dim)',
                  background: authMode === tab.id ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '18px',
              textAlign: 'left'
            }}>
              {error}
            </div>
          )}

          {/* Quick Demo Mode */}
          {authMode === 'demo' && (
            <div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                Select a pre-seeded enterprise role to explore full WebRTC meetings, AI summaries, and Kanban management instantly:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={() => handleDemo('admin')}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '0.95rem' }}
                >
                  <ShieldCheck size={18} />
                  <span>Launch as Alex Rivera (VP of Engineering - Admin)</span>
                </button>

                <button
                  onClick={() => handleDemo('member')}
                  disabled={loading}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '14px', fontSize: '0.95rem' }}
                >
                  <Users size={18} />
                  <span>Launch as Sarah Chen (Lead Architect - Member)</span>
                </button>
              </div>

              <div style={{ marginTop: '16px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                ✓ Connected to MongoDB Atlas &nbsp;•&nbsp; ✓ Pre-seeded realistic meetings & action items
              </div>
            </div>
          )}

          {/* Login or Register Form */}
          {(authMode === 'login' || authMode === 'register') && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {authMode === 'register' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <UserIcon size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jordan Miller"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', marginBottom: '6px' }}>
                  Work Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
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

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '38px' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', marginTop: '6px' }}
              >
                {loading ? 'Authenticating...' : authMode === 'login' ? 'Sign In to Workspace' : 'Create Enterprise Account'}
              </button>
            </form>
          )}
        </div>

        {/* Feature Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          textAlign: 'left'
        }}>
          {[
            {
              title: 'Sub-200ms WebRTC Real-Time Video',
              desc: 'High-definition peer-to-peer audio and video streaming, screen sharing, and media mute controls with Socket.io signaling.',
              icon: Video,
              color: '#6366f1'
            },
            {
              title: 'AI Meeting Intelligence & Transcription',
              desc: 'Dual-pipeline speech-to-text with OpenAI Whisper and Web Speech API fallback. Real-time captions as participants talk.',
              icon: Sparkles,
              color: '#a855f7'
            },
            {
              title: 'Smart Action Item Extraction',
              desc: 'Natural language processing automatically identifies commitments, assignees, deadlines, and priorities from spoken dialogues.',
              icon: CheckCircle2,
              color: '#06b6d4'
            },
            {
              title: 'Interactive Team Kanban Board',
              desc: 'Push AI-extracted action items to project boards in one click. Track Backlog, To Do, In Progress, In Review, and Done.',
              icon: KanbanSquare,
              color: '#10b981'
            },
            {
              title: 'Enterprise Security & OWASP Top 10',
              desc: 'JWT authentication with refresh tokens, bcrypt password hashing, express-rate-limit protection, and role-based access control.',
              icon: ShieldCheck,
              color: '#f59e0b'
            },
            {
              title: 'Production Observability & Metrics',
              desc: 'Comprehensive analytics dashboard tracking meeting frequency, time saved by AI, and task closure velocity.',
              icon: TrendingUp,
              color: '#ec4899'
            }
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div 
                key={idx}
                className="glass-panel"
                style={{
                  padding: '24px',
                  borderRadius: '16px',
                  transition: 'transform 0.2s, border-color 0.2s'
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: `${feature.color}15`,
                  border: `1px solid ${feature.color}35`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <Icon size={22} color={feature.color} />
                </div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '8px', color: '#fff' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
