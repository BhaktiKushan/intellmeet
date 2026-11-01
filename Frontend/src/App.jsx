import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Navbar } from './components/Navbar.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { MeetingsPage } from './pages/MeetingsPage.jsx';
import { MeetingRoomPage } from './pages/MeetingRoomPage.jsx';
import { PostMeetingDetailsPage } from './pages/PostMeetingDetailsPage.jsx';
import { KanbanPage } from './pages/KanbanPage.jsx';
import { AnalyticsPage } from './pages/AnalyticsPage.jsx';
import { DocsPage } from './pages/DocsPage.jsx';

/**
 * Client-Side Router with Full Browser History & Back/Forward Support
 */
const parseRouteFromHash = (hashString) => {
  const clean = (hashString || '').replace(/^#\/?/, '').trim();
  if (!clean) return { tab: 'dashboard', roomId: null, summaryId: null };

  if (clean.startsWith('room/')) {
    const roomId = clean.replace('room/', '').trim();
    return { tab: 'meetings', roomId: roomId || null, summaryId: null };
  }
  if (clean.startsWith('summary/')) {
    const summaryId = clean.replace('summary/', '').trim();
    return { tab: 'meetings', roomId: null, summaryId: summaryId || null };
  }

  const validTabs = ['dashboard', 'meetings', 'kanban', 'analytics', 'docs'];
  if (validTabs.includes(clean)) {
    return { tab: clean, roomId: null, summaryId: null };
  }

  return { tab: 'dashboard', roomId: null, summaryId: null };
};

export const App = () => {
  const { isAuthenticated, loading } = useAuth();

  // Route state initialized from current URL hash
  const [routeState, setRouteState] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseRouteFromHash(window.location.hash);
    }
    return { tab: 'dashboard', roomId: null, summaryId: null };
  });

  const { tab: activeTab, roomId: activeRoomId, summaryId: summaryMeetingId } = routeState;

  // Browser History & Navigation Manager
  const navigate = useCallback((target, options = {}) => {
    const { replace = false } = options;
    let newHash = '#/dashboard';

    if (typeof target === 'string') {
      newHash = `"#/${target}`;
      if (newHash.startsWith('"')) newHash = newHash.slice(1);
    } else if (target && typeof target === 'object') {
      if (target.roomId) {
        newHash = `#/room/${target.roomId}`;
      } else if (target.summaryId) {
        newHash = `#/summary/${target.summaryId}`;
      } else if (target.tab) {
        newHash = `#/${target.tab}`;
      }
    }

    const nextState = parseRouteFromHash(newHash);

    if (typeof window !== 'undefined' && window.history) {
      if (replace) {
        window.history.replaceState(nextState, '', newHash);
      } else if (window.location.hash !== newHash) {
        window.history.pushState(nextState, '', newHash);
      }
    }

    setRouteState(nextState);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Listen to Browser Back / Forward buttons and URL hash changes
  useEffect(() => {
    const handlePopState = (e) => {
      const parsed = parseRouteFromHash(window.location.hash);
      setRouteState(parsed);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    // Initial URL sync if authenticated and hash is empty
    if (isAuthenticated && typeof window !== 'undefined') {
      if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#') {
        navigate('dashboard', { replace: true });
      }
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [isAuthenticated, navigate]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-main, #080c14)',
        color: '#a5b4fc',
        fontSize: '1.1rem',
        fontWeight: 600
      }}>
        Initializing IntellMeet Platform...
      </div>
    );
  }

  // Not logged in -> Show Authentication (Login / Sign Up)
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // In Active Video Meeting
  if (activeRoomId) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', background: '#070a12' }}>
        <ErrorBoundary onNavigateHome={() => navigate('dashboard')}>
          <MeetingRoomPage
            roomId={activeRoomId}
            onLeaveRoom={() => {
              const currentRoom = activeRoomId;
              navigate({ summaryId: currentRoom });
            }}
            onViewSummary={(id) => {
              navigate({ summaryId: id || activeRoomId });
            }}
            onCancelLobby={() => {
              navigate('dashboard');
            }}
          />
        </ErrorBoundary>
      </div>
    );
  }

  // Viewing Post-Meeting AI Intelligence & Summary
  if (summaryMeetingId) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main, #080c14)', position: 'relative' }}>
        <div className="atmospheric-bg" />
        <Navbar
          activeTab={activeTab}
          setActiveTab={(tab) => navigate(tab)}
        />
        <ErrorBoundary onNavigateHome={() => navigate('dashboard')}>
          <PostMeetingDetailsPage
            meetingIdOrCode={summaryMeetingId}
            onBack={() => navigate('dashboard')}
            onNavigateKanban={() => navigate('kanban')}
          />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main, #080c14)', position: 'relative' }}>
      <div className="atmospheric-bg" />
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => navigate(tab)}
      />

      {/* Main Routed Page with Native Browser Navigation */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        <ErrorBoundary onNavigateHome={() => navigate('dashboard')}>
          {activeTab === 'dashboard' && (
            <DashboardPage
              onJoinMeeting={(code) => navigate({ roomId: code })}
              onViewMeetingDetails={(codeOrId) => navigate({ summaryId: codeOrId })}
              onNavigateTab={(tab) => navigate(tab)}
            />
          )}

          {activeTab === 'meetings' && (
            <MeetingsPage
              onBack={() => navigate('dashboard')}
              onJoinMeeting={(code) => navigate({ roomId: code })}
              onViewMeetingDetails={(codeOrId) => navigate({ summaryId: codeOrId })}
              onNavigateTab={(tab) => navigate(tab)}
            />
          )}

          {activeTab === 'kanban' && (
            <KanbanPage
              onBack={() => navigate('dashboard')}
              onNavigateTab={(tab) => navigate(tab)}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsPage
              onBack={() => navigate('dashboard')}
              onNavigateTab={(tab) => navigate(tab)}
            />
          )}

          {activeTab === 'docs' && (
            <DocsPage
              onBack={() => navigate('dashboard')}
              onNavigateTab={(tab) => navigate(tab)}
            />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default App;
