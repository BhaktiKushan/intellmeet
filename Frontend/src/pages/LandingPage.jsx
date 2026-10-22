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
  ArrowRight
} from 'lucide-react';

export const LandingPage = () => {
  const { login, register } = useAuth();
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

  const handleFillAdmin = () => {
    setEmail('admin@intellmeet.com');
    setPassword('Password123!');
    setError('');
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 68px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative',
      zIndex: 1
    }}>
      {/* Background ambient decorative glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translate(-50%, -20%)',
        width: '560px',
        height: '560px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.05) 45%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Main Authentication Card */}
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          borderRadius: '24px',
          padding: '40px 36px',
          border: '1px solid rgba(99, 102, 241, 0.28)',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.65), 0 0 32px rgba(99, 102, 241, 0.12)',
          background: 'rgba(14, 21, 36, 0.92)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          zIndex: 1,
          textAlign: 'center'
        }}
      >
        {/* Header Branding */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
          marginBottom: '20px'
        }}>
          <Video size={28} color="#ffffff" />
        </div>

        <h1 style={{
          fontSize: '1.65rem',
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-0.02em',
          marginBottom: '8px',
          fontFamily: 'var(--font-heading)'
        }}>
          {authMode === 'login' ? 'Sign in to IntellMeet' : 'Create an Account'}
        </h1>

        <p style={{
          fontSize: '0.9rem',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
          marginBottom: '28px'
        }}>
          {authMode === 'login'
            ? 'Access your enterprise video meetings and workspace'
            : 'Get started with high-definition meetings & AI synthesis'}
        </p>

        {/* Tab Switcher: Sign In & Create Account */}
        <div style={{
          display: 'flex',
          background: 'rgba(10, 15, 26, 0.85)',
          padding: '4px',
          borderRadius: '12px',
          marginBottom: '28px',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setError(''); }}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '9px',
              border: 'none',
              background: authMode === 'login' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
              color: authMode === 'login' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: authMode === 'login' ? 700 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'var(--font-body)',
              boxShadow: authMode === 'login' ? '0 4px 14px rgba(99, 102, 241, 0.35)' : 'none'
            }}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => { setAuthMode('register'); setError(''); }}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '9px',
              border: 'none',
              background: authMode === 'register' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
              color: authMode === 'register' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: authMode === 'register' ? 700 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'var(--font-body)',
              boxShadow: authMode === 'register' ? '0 4px 14px rgba(99, 102, 241, 0.35)' : 'none'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Feedback Banner */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '12px 14px',
            borderRadius: '10px',
            marginBottom: '22px',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'left'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form: Sign In */}
        {authMode === 'login' ? (
          <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
            {/* Work Email */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '8px'
              }}>
                Work Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail 
                  size={18} 
                  color="var(--text-dim)" 
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} 
                />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  style={{
                    paddingLeft: '44px',
                    paddingRight: '14px',
                    paddingTop: '13px',
                    paddingBottom: '13px',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '26px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleFillAdmin}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '0.76rem',
                    color: '#818cf8',
                    cursor: 'pointer',
                    fontWeight: 600,
                    padding: 0
                  }}
                >
                  Fill Admin Creds
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock 
                  size={18} 
                  color="var(--text-dim)" 
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} 
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  style={{
                    paddingLeft: '44px',
                    paddingRight: '44px',
                    paddingTop: '13px',
                    paddingBottom: '13px',
                    fontSize: '0.95rem'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              {!loading && <ArrowRight size={18} />}
            </button>

            {/* Switch to Register */}
            <div style={{
              textAlign: 'center',
              marginTop: '22px',
              fontSize: '0.85rem',
              color: 'var(--text-dim)'
            }}>
              Don't have an enterprise account?{' '}
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setError(''); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#818cf8',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  padding: 0
                }}
              >
                Create one now
              </button>
            </div>
          </form>
        ) : (
          /* Form: Create Account */
          <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
            {/* Full Name */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '8px'
              }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <UserIcon 
                  size={18} 
                  color="var(--text-dim)" 
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} 
                />
                <input
                  type="text"
                  required
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  style={{
                    paddingLeft: '44px',
                    paddingRight: '14px',
                    paddingTop: '13px',
                    paddingBottom: '13px',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>

            {/* Work Email */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '8px'
              }}>
                Work Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail 
                  size={18} 
                  color="var(--text-dim)" 
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} 
                />
                <input
                  type="email"
                  required
                  placeholder="alex@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  style={{
                    paddingLeft: '44px',
                    paddingRight: '14px',
                    paddingTop: '13px',
                    paddingBottom: '13px',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '8px'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock 
                  size={18} 
                  color="var(--text-dim)" 
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} 
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  style={{
                    paddingLeft: '44px',
                    paddingRight: '44px',
                    paddingTop: '13px',
                    paddingBottom: '13px',
                    fontSize: '0.95rem'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Department */}
            <div style={{ marginBottom: '26px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '8px'
              }}>
                Department
              </label>
              <div style={{ position: 'relative' }}>
                <Briefcase 
                  size={18} 
                  color="var(--text-dim)" 
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} 
                />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="input-field"
                  style={{
                    paddingLeft: '44px',
                    paddingRight: '14px',
                    paddingTop: '13px',
                    paddingBottom: '13px',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    appearance: 'auto'
                  }}
                >
                  <option value="Engineering">Engineering & DevOps</option>
                  <option value="Product">Product & Design</option>
                  <option value="Architecture">Cloud Architecture</option>
                  <option value="Executive">Executive Leadership</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>{loading ? 'Creating Account...' : 'Create Account & Join'}</span>
              {!loading && <ArrowRight size={18} />}
            </button>

            {/* Switch to Sign In */}
            <div style={{
              textAlign: 'center',
              marginTop: '22px',
              fontSize: '0.85rem',
              color: 'var(--text-dim)'
            }}>
              Already have an enterprise account?{' '}
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(''); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#818cf8',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  padding: 0
                }}
              >
                Sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
