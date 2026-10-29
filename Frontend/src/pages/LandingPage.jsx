import React, { useState, useEffect } from 'react';
import { LoginPage } from './LoginPage.jsx';
import { SignUpPage } from './SignUpPage.jsx';

export const LandingPage = () => {
  const [authMode, setAuthMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash.includes('signup') || hash.includes('register') || path.includes('signup') || path.includes('register')) {
        return 'signup';
      }
    }
    return 'login';
  });

  useEffect(() => {
    // Ensure clean light background styling for the authentication view
    const originalBodyBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#f8fafc';

    const handleLocationChange = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash.includes('signup') || hash.includes('register') || path.includes('signup') || path.includes('register')) {
        setAuthMode('signup');
      } else {
        setAuthMode('login');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      document.body.style.backgroundColor = originalBodyBg;
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const handleNavigateToSignUp = () => {
    setAuthMode('signup');
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState(null, '', '#signup');
    }
  };

  const handleNavigateToLogin = () => {
    setAuthMode('login');
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState(null, '', '#login');
    }
  };

  return authMode === 'signup' ? (
    <SignUpPage onNavigateToLogin={handleNavigateToLogin} />
  ) : (
    <LoginPage onNavigateToSignUp={handleNavigateToSignUp} />
  );
};

export { LoginPage, SignUpPage };
export default LandingPage;
