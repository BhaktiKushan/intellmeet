import React, { useState } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { Navbar } from './components/Navbar.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { MeetingRoomPage } from './pages/MeetingRoomPage.jsx';
import { PostMeetingDetailsPage } from './pages/PostMeetingDetailsPage.jsx';
import { KanbanPage } from './pages/KanbanPage.jsx';
import { AnalyticsPage } from './pages/AnalyticsPage.jsx';
import { DocsPage } from './pages/DocsPage.jsx';

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
        backgroundColor: '#f8fafc',
        color: '#4f46e5',
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
        <MeetingRoomPage
          roomId={activeRoomId}
          onLeaveRoom={() => {
            const currentRoom = activeRoomId;
            setActiveRoomId(null);
            setSummaryMeetingId(currentRoom);
          }}
          onViewSummary={(id) => {
            setActiveRoomId(null);
            setSummaryMeetingId(id);
          }}
        />
      </div>
    );
  }

  // Viewing Post-Meeting AI Intelligence & Summary
  if (summaryMeetingId) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', position: 'relative' }}>
        <div className="atmospheric-bg" />
        <Navbar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setSummaryMeetingId(null);
            setActiveTab(tab);
          }}
        />
        <PostMeetingDetailsPage
          meetingIdOrCode={summaryMeetingId}
          onBack={() => setSummaryMeetingId(null)}
          onNavigateKanban={() => {
            setSummaryMeetingId(null);
            setActiveTab('kanban');
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', position: 'relative' }}>
      <div className="atmospheric-bg" />
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Routed Page */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        {(activeTab === 'dashboard' || activeTab === 'meetings') && (
          <DashboardPage
            onJoinMeeting={(code) => setActiveRoomId(code)}
            onViewMeetingDetails={(codeOrId) => setSummaryMeetingId(codeOrId)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'kanban' && <KanbanPage />}

        {activeTab === 'analytics' && <AnalyticsPage />}

        {activeTab === 'docs' && <DocsPage />}
      </main>
    </div>
  );
};

export default App;
