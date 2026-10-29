import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Video, 
  LayoutDashboard, 
  KanbanSquare, 
  BarChart3, 
  FileText, 
  LogOut, 
  User as UserIcon, 
  ShieldCheck, 
  Menu, 
  X 
} from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'meetings', label: 'Meetings', icon: Video },
    { id: 'kanban', label: 'Kanban Board', icon: KanbanSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'docs', label: 'Project Docs', icon: FileText }
  ];

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
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginTop: '-2px' }}>
            Enterprise Meeting Intelligence
          </span>
        </div>
      </div>

      {/* Navigation Links (Desktop) */}
      {isAuthenticated && (
        <nav className="navbar-desktop-links" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {navItems.map((item) => {
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

      {/* Right User Controls (Create Meeting removed from Navbar per Requirement) */}
      <div className="navbar-right-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isAuthenticated ? (
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
                  background: 'rgba(255, 255, 255, 0.1)'
                }}
              />
              <div className="navbar-profile-text" style={{ textAlign: 'left', marginRight: '4px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
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
                  background: 'rgba(14, 21, 36, 0.98)',
                  boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.6)'
                }}
              >
                <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '8px' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{user?.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</p>
                  <p style={{ fontSize: '0.72rem', color: '#818cf8', marginTop: '4px' }}>{user?.title || user?.department}</p>
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
        ) : null}

        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="navbar-mobile-toggle"
          aria-label="Toggle navigation menu"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            padding: '7px'
          }}
        >
          {mobileMenuOpen ? <X size={22} color="#818cf8" /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Slide-down Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="navbar-mobile-drawer">
          {isAuthenticated && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: isActive ? '#a5b4fc' : '#cbd5e1',
                      fontFamily: 'var(--font-body)',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Icon size={18} color={isActive ? '#818cf8' : '#94a3b8'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {isAuthenticated ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '12px', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                <LogOut size={16} />
                <span>Sign Out ({user?.name?.split(' ')[0]})</span>
              </button>
            </div>
          ) : null}
        </div>
      )}
    </header>
  );
};

export default Navbar;
