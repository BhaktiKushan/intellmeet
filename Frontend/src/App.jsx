import React, { useState, lazy, Suspense } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Navbar } from './components/Navbar.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { MeetingsPage } from './pages/MeetingsPage.jsx';

// Lazy-loaded heavy modules for optimized bundle splitting & faster initial load
const MeetingRoomPage = lazy(() => import('./pages/MeetingRoomPage.jsx').then(m => ({ default: m.MeetingRoomPage })));
const PostMeetingDetailsPage = lazy(() => import('./pages/PostMeetingDetailsPage.jsx').then(m => ({ default: m.PostMeetingDetailsPage })));
const KanbanPage = lazy(() => import('./pages/KanbanPage.jsx').then(m => ({ default: m.KanbanPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx').then(m => ({ default: m.AnalyticsPage })));
const DocsPage = lazy(() => import('./pages/DocsPage.jsx').then(m => ({ default: m.DocsPage })));

const PageLoader = () => (
  <div style={{
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: '#a5b4fc',
    fontSize: '0.95rem'
  }}>
    <div style={{
      width: 26,
      height: 26,
      border: '3px solid rgba(99, 102, 241, 0.2)',
      borderTopColor: '#818cf8',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <span>Loading module...</span>
  </div>
);

export const App = () => {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [summaryMeetingId, setSummaryMeetingId] = useState(null);

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
        <ErrorBoundary onNavigateHome={() => setActiveRoomId(null)}>
          <Suspense fallback={<PageLoader />}>
            <MeetingRoomPage
              roomId={activeRoomId}
              onLeaveRoom={() => {
                const currentRoom = activeRoomId;
                setActiveRoomId(null);
                setSummaryMeetingId(currentRoom);
              }}
              onViewSummary={(id) => {
                setActiveRoomId(null);
                setSummaryMeetingId(id || activeRoomId);
              }}
              onCancelLobby={() => {
                setActiveRoomId(null);
                setSummaryMeetingId(null);
                setActiveTab('dashboard');
              }}
            />
          </Suspense>
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
          setActiveTab={(tab) => {
            setSummaryMeetingId(null);
            setActiveTab(tab);
          }}
        />
        <ErrorBoundary onNavigateHome={() => {
          setSummaryMeetingId(null);
          setActiveTab('dashboard');
        }}>
          <Suspense fallback={<PageLoader />}>
            <PostMeetingDetailsPage
              meetingIdOrCode={summaryMeetingId}
              onBack={() => {
                setSummaryMeetingId(null);
                setActiveTab('dashboard');
              }}
              onNavigateKanban={() => {
                setSummaryMeetingId(null);
                setActiveTab('kanban');
              }}
            />
          </Suspense>
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
        setActiveTab={setActiveTab}
      />

      {/* Main Routed Page */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        <ErrorBoundary onNavigateHome={() => setActiveTab('dashboard')}>
          <Suspense fallback={<PageLoader />}>
            {activeTab === 'dashboard' && (
              <DashboardPage
                onJoinMeeting={(code) => setActiveRoomId(code)}
                onViewMeetingDetails={(codeOrId) => setSummaryMeetingId(codeOrId)}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'meetings' && (
              <MeetingsPage
                onBack={() => setActiveTab('dashboard')}
                onJoinMeeting={(code) => setActiveRoomId(code)}
                onViewMeetingDetails={(codeOrId) => setSummaryMeetingId(codeOrId)}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'kanban' && (
              <KanbanPage
                onBack={() => setActiveTab('dashboard')}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsPage
                onBack={() => setActiveTab('dashboard')}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'docs' && (
              <DocsPage
                onBack={() => setActiveTab('dashboard')}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default App;
