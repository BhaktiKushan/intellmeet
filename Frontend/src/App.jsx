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
 * Client-Side Router with Full Browser History, Back/Forward Support & Unique User ID in URL
 */
const parseRouteFromHash = (hashString, defaultUserId = null) => {
  const clean = (hashString || '').replace(/^#\/?/, '').trim();
  if (!clean) return { tab: 'dashboard', roomId: null, summaryId: null, userId: defaultUserId };

  let remaining = clean;
  let parsedUserId = defaultUserId;

  // Check if hash starts with u/:userId/
  if (remaining.startsWith('u/')) {
    const afterU = remaining.slice(2);
    const slashIdx = afterU.indexOf('/');
    if (slashIdx !== -1) {
      parsedUserId = afterU.slice(0, slashIdx).trim();
      remaining = afterU.slice(slashIdx + 1).trim();
    } else {
      parsedUserId = afterU.trim();
      remaining = '';
    }
  }

  if (remaining.startsWith('room/')) {
    const roomId = remaining.replace('room/', '').trim();
    return { tab: 'meetings', roomId: roomId || null, summaryId: null, userId: parsedUserId };
  }
  if (remaining.startsWith('summary/')) {
    const summaryId = clean.replace('summary/', '').trim();
    return { tab: 'meetings', roomId: null, summaryId: summaryId || null, userId: parsedUserId };
  }

  const validTabs = ['dashboard', 'meetings', 'kanban', 'analytics', 'docs'];
  if (validTabs.includes(remaining)) {
    return { tab: remaining, roomId: null, summaryId: null, userId: parsedUserId };
  }

  return { tab: 'dashboard', roomId: null, summaryId: null, userId: parsedUserId };
};

export const App = () => {
  const { user, isAuthenticated, loading } = useAuth();

  const userPermanentId = user?.userId || (user?._id ? `USR-${user._id.toString().slice(-6).toUpperCase()}` : null);

  // Route state initialized from current URL hash
  const [routeState, setRouteState] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseRouteFromHash(window.location.hash);
    }
    return { tab: 'dashboard', roomId: null, summaryId: null, userId: null };
  });

  const { tab: activeTab, roomId: activeRoomId, summaryId: summaryMeetingId } = routeState;

  // Browser History & Navigation Manager
  const navigate = useCallback((target, options = {}) => {
    const { replace = false } = options;
    const currentUserId = userPermanentId || 'USR-ONLINE';
    let targetPath = 'dashboard';

    if (typeof target === 'string') {
      targetPath = target.replace(/^#\/?/, '').replace(/^u\/[^/]+\/?/, '');
    } else if (target && typeof target === 'object') {
      if (target.roomId) {
        targetPath = `room/${target.roomId}`;
      } else if (target.summaryId) {
        targetPath = `summary/${target.summaryId}`;
      } else if (target.tab) {
        targetPath = target.tab;
      }
    }

    const newHash = `#/u/${currentUserId}/${targetPath}`;
    const nextState = parseRouteFromHash(newHash, currentUserId);

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
  }, [userPermanentId]);

  // Synchronize URL with logged-in user's unique permanent ID
  useEffect(() => {
    if (!isAuthenticated || !userPermanentId || typeof window === 'undefined') return;

    const currentHash = window.location.hash || '';
    const parsed = parseRouteFromHash(currentHash, userPermanentId);

    // If URL does not have the user's permanent ID, normalize it
    const expectedPrefix = `#/u/${userPermanentId}/`;
    if (!currentHash.startsWith(expectedPrefix)) {
      let targetPath = 'dashboard';
      if (parsed.roomId) {
        targetPath = `room/${parsed.roomId}`;
      } else if (parsed.summaryId) {
        targetPath = `summary/${parsed.summaryId}`;
      } else if (parsed.tab) {
        targetPath = parsed.tab;
      }
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, userPermanentId, navigate]);

  // Listen to Browser Back / Forward buttons and URL hash changes
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseRouteFromHash(window.location.hash, userPermanentId);
      setRouteState(parsed);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [userPermanentId]);

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
        <ErrorBoundary resetKey={`room-${activeRoomId}`} onNavigateHome={() => navigate('dashboard')}>
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
        <ErrorBoundary resetKey={`summary-${summaryMeetingId}`} onNavigateHome={() => navigate('dashboard')}>
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
        <ErrorBoundary resetKey={`tab-${activeTab}`} onNavigateHome={() => navigate('dashboard')}>
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
