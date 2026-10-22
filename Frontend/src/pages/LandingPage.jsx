import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Video, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  ShieldCheck, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight,
  Eye,
  EyeOff,
  Radio,
  Mic,
  Activity,
  AlertCircle
} from 'lucide-react';

export const LandingPage = () => {
  const { login, register, demoLogin } = useAuth();
  const [authMode, setAuthMode] = useState('demo'); // 'demo' | 'login' | 'register'
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
    <div style={{
      minHeight: 'calc(100vh - 68px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px',
      position: 'relative',
      zIndex: 1
    }}>
      <div style={{
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '40px',
        alignItems: 'center'
      }}>

        {/* Left Side: Real Meeting Experience Showcase */}
        <div style={{ textAlign: 'left' }}>
          
          {/* Status Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '24px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            marginBottom: '20px'
          }}>
            <Radio size={14} color="#818cf8" className="animate-pulse" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#c7d2fe' }}>
              Real-Time WebRTC & AI Intelligence
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2.2rem, 4vw, 3.4rem)',
            fontWeight: 800,
            lineHeight: 1.18,
            marginBottom: '16px',
            letterSpacing: '-0.03em',
            color: '#fff'
          }}>
            Experience video meetings designed for <span className="gradient-text">engineering teams</span>
          </h1>

          <p style={{
            fontSize: '1.05rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: '32px',
            maxWidth: '520px'
          }}>
            HD audio/video conferencing with sub-200ms latency, automatic Gemini 3.8 Flash intelligence summaries, and direct Kanban task extraction.
          </p>

          {/* Interactive Live Meeting Canvas Mockup */}
          <div 
            className="glass-panel"
            style={{
              borderRadius: '20px',
              padding: '16px',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(10, 16, 28, 0.85)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {/* Mockup Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '12px',
              marginBottom: '12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>Architecture Sync</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>#meet-live-alpha</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#34d399' }}>
                <Zap size={12} />
                <span>WebRTC 128ms</span>
              </div>
            </div>

            {/* Mockup Video Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '12px'
            }}>
              {/* Tile 1 */}
              <div style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#0f172a',
                aspectRatio: '16/10',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80" 
                  alt="Alex"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '6px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(6px)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Mic size={10} color="#34d399" />
                  <span>Alex (Speaking)</span>
                </div>
              </div>

              {/* Tile 2 */}
              <div style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#0f172a',
                aspectRatio: '16/10',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <img 
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80" 
                  alt="Sarah"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '6px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(6px)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  color: '#fff'
                }}>
                  <span>Sarah (Architect)</span>
                </div>
              </div>
            </div>

            {/* Mockup Live AI Caption Banner */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '10px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Sparkles size={14} color="#818cf8" />
              <div style={{ fontSize: '0.76rem', color: '#c7d2fe', lineHeight: 1.4 }}>
                <span style={{ fontWeight: 600, color: '#fff' }}>Live AI Intelligence:</span> "Deployment schedule verified. Action items pushed to Kanban board."
              </div>
            </div>
          </div>

          {/* Feature Highlights Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle2 size={13} color="#34d399" /> Sub-200ms WebRTC Mesh
            </span>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle2 size={13} color="#34d399" /> Google Gemini 3.8 Flash
            </span>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle2 size={13} color="#34d399" /> Instant Kanban Sync
            </span>
          </div>

        </div>

        {/* Right Side: Big, Beautiful Auth Portal */}
        <div 
          className="glass-panel"
          style={{
            borderRadius: '24px',
            padding: '36px 32px',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            boxShadow: 'var(--shadow-glow)',
            background: 'rgba(14, 21, 36, 0.88)'
          }}
        >
          {/* Mode Switcher Tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(10, 15, 26, 0.8)',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '28px',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={() => { setAuthMode('demo'); setError(''); }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: authMode === 'demo' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                color: authMode === 'demo' ? '#fff' : 'var(--text-muted)',
                fontWeight: authMode === 'demo' ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Zap size={15} />
              <span>1-Click Demo</span>
            </button>

            <button
              type="button"
              onClick={() => { setAuthMode('login'); setError(''); }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: authMode === 'login' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                color: authMode === 'login' ? '#fff' : 'var(--text-muted)',
                fontWeight: authMode === 'login' ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => { setAuthMode('register'); setError(''); }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: authMode === 'register' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                color: authMode === 'register' ? '#fff' : 'var(--text-muted)',
                fontWeight: authMode === 'register' ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Create Account
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '12px 14px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Tab 1: 1-Click Instant Demo Evaluation */}
          {authMode === 'demo' && (
            <div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5, textAlign: 'left' }}>
                Instant zero-friction evaluation. Choose a simulated corporate profile to enter the workspace immediately:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                {/* Admin Persona */}
                <div 
                  onClick={() => !loading && handleDemo('admin')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.25)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img 
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" 
                      alt="Alex"
                      style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Alex Rivera</div>
                      <div style={{ fontSize: '0.78rem', color: '#818cf8', fontWeight: 600 }}>VP of Engineering • Admin</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>Host controls, meeting recording, AI synthesis</div>
                    </div>
                  </div>
                  <button 
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ padding: '8px 14px', fontSize: '0.82rem', pointerEvents: 'none' }}
                  >
                    {loading ? 'Entering...' : 'Enter as Admin'}
                  </button>
                </div>

                {/* Member Persona */}
                <div 
                  onClick={() => !loading && handleDemo('member')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img 
                      src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80" 
                      alt="Sarah"
                      style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Sarah Chen</div>
                      <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>Lead Architect • Member</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>Real-time chat, screen sharing, Kanban tasks</div>
                    </div>
                  </div>
                  <button 
                    disabled={loading}
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '0.82rem', pointerEvents: 'none' }}
                  >
                    {loading ? 'Entering...' : 'Enter as Member'}
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                Instant evaluation mode enabled. No passwords or setup needed.
              </div>
            </div>
          )}

          {/* Tab 2: Standard Sign In */}
          {authMode === 'login' && (
            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Work Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '44px', padding: '13px 14px 13px 44px', fontSize: '0.95rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Password
                  </label>
                  <span 
                    onClick={() => { setEmail('admin@intellmeet.com'); setPassword('Password123!'); }}
                    style={{ fontSize: '0.76rem', color: '#818cf8', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Fill Admin Creds
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '44px', paddingRight: '44px', padding: '13px 44px 13px 44px', fontSize: '0.95rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '13px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700, borderRadius: '12px' }}
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '0.84rem', color: 'var(--text-dim)' }}>
                Don't have an enterprise account?{' '}
                <span 
                  onClick={() => { setAuthMode('register'); setError(''); }} 
                  style={{ color: '#818cf8', cursor: 'pointer', fontWeight: 600 }}
                >
                  Create one now
                </span>
              </div>
            </form>
          )}

          {/* Tab 3: Create Enterprise Account */}
          {authMode === 'register' && (
            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                  <input
                    type="text"
                    required
                    placeholder="Alex Johnson"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '44px', padding: '12px 14px 12px 44px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Work Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                  <input
                    type="email"
                    required
                    placeholder="alex@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '44px', padding: '12px 14px 12px 44px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '44px', paddingRight: '44px', padding: '12px 44px 12px 44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '12px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="input-field"
                  style={{ padding: '12px 14px', cursor: 'pointer' }}
                >
                  <option value="Engineering">Engineering & DevOps</option>
                  <option value="Product">Product & Design</option>
                  <option value="Architecture">Cloud Architecture</option>
                  <option value="Executive">Executive Leadership</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700, borderRadius: '12px' }}
              >
                {loading ? 'Creating Account...' : 'Create Account & Join'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '0.84rem', color: 'var(--text-dim)' }}>
                Already have an enterprise account?{' '}
                <span 
                  onClick={() => { setAuthMode('login'); setError(''); }} 
                  style={{ color: '#818cf8', cursor: 'pointer', fontWeight: 600 }}
                >
                  Sign in
                </span>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
