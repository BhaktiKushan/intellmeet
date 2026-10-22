import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Video, 
  LayoutDashboard, 
  KanbanSquare, 
  BarChart3, 
  FileText, 
  Plus, 
  LogOut, 
  User as UserIcon, 
  ShieldCheck, 
  Zap,
  Sparkles
} from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab, onQuickNewMeeting }) => {
  const { user, isAuthenticated, logout, demoLogin } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(8, 12, 20, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0 24px',
      height: '68px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      {/* Brand Logo */}
      <div 
        onClick={() => setActiveTab('dashboard')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer'
        }}
      >
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(99, 102, 241, 0.45)'
        }}>
          <Video size={20} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#ffffff'
            }}>
              Intell<span style={{ color: '#818cf8' }}>Meet</span>
            </span>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(99, 102, 241, 0.2)',
              color: '#a5b4fc',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}>
              v2.0 AI
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginTop: '-2px' }}>
            Enterprise Meeting Intelligence
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      {isAuthenticated && (
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'meetings', label: 'Meetings', icon: Video },
            { id: 'kanban', label: 'Kanban Board', icon: KanbanSquare },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'docs', label: 'Project Docs', icon: FileText }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: isActive ? '#a5b4fc' : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent'
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Right Action & User Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {isAuthenticated ? (
          <>
            <button
              onClick={onQuickNewMeeting}
              className="btn btn-primary"
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            >
              <Plus size={16} />
              <span>New Meeting</span>
            </button>

            {/* User Profile Pill */}
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '4px 10px 4px 4px',
                  borderRadius: '30px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}
              >
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
                  alt={user?.name}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    background: '#1e293b'
                  }}
                />
                <div style={{ textAlign: 'left', marginRight: '4px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.2 }}>
                    {user?.name?.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <ShieldCheck size={11} />
                    {user?.role === 'admin' ? 'Admin' : 'Member'}
                  </div>
                </div>
              </div>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div 
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    top: '46px',
                    right: 0,
                    width: '240px',
                    padding: '12px',
                    zIndex: 100,
                    boxShadow: 'var(--shadow-lg)'
                  }}
                >
                  <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '8px' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{user?.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{user?.email}</p>
                    <p style={{ fontSize: '0.72rem', color: '#a5b4fc', marginTop: '4px' }}>{user?.title || user?.department}</p>
                  </div>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setActiveTab('docs');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      borderRadius: '6px'
                    }}
                  >
                    <FileText size={15} color="#818cf8" />
                    <span>Zidio Project Report</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      marginTop: '4px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: 'none',
                      color: '#f87171',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      borderRadius: '6px'
                    }}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => demoLogin('admin')}
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', padding: '7px 13px' }}
            >
              <Zap size={14} />
              <span>Instant Demo (Admin)</span>
            </button>
            <button
              onClick={() => demoLogin('member')}
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '7px 13px' }}
            >
              <span>Demo (Member)</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
