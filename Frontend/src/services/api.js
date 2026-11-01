const rawBackend = import.meta.env.VITE_BACKEND_URL || '';
const BACKEND_URL = rawBackend.trim().replace(/\/$/, '');
const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const getHeaders = () => {
  const token = localStorage.getItem('intellmeet_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'API Request Failed');
  }
  return data;
};

export const api = {
  // Auth
  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  register: async (userData) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  },

  demoLogin: async (role = 'admin') => {
    const res = await fetch(`${API_BASE}/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    return handleResponse(res);
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getUsers: async () => {
    const res = await fetch(`${API_BASE}/auth/users`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Meetings
  getMeetings: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/meetings${queryString ? `?${queryString}` : ''}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getMeeting: async (codeOrId) => {
    const res = await fetch(`${API_BASE}/meetings/${codeOrId}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  createMeeting: async (meetingData) => {
    const res = await fetch(`${API_BASE}/meetings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(meetingData)
    });
    return handleResponse(res);
  },

  endMeeting: async (id, data = {}) => {
    const res = await fetch(`${API_BASE}/meetings/${id}/end`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  generateAiSummary: async (meetingId, transcript) => {
    const res = await fetch(`${API_BASE}/meetings/${meetingId}/ai-intelligence`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ transcript })
    });
    return handleResponse(res);
  },

  saveRecording: async (meetingId, recordingData) => {
    const res = await fetch(`${API_BASE}/meetings/${meetingId}/recording`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(recordingData)
    });
    return handleResponse(res);
  },

  convertActionItemToTask: async (meetingId, actionItemId) => {
    const res = await fetch(`${API_BASE}/meetings/${meetingId}/action-items/${actionItemId}/task`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // AI Translation
  translateText: async (text, targetLanguage, sourceLanguage = 'auto') => {
    const res = await fetch(`${API_BASE}/ai/translate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text, targetLanguage, sourceLanguage })
    });
    return handleResponse(res);
  },

  // AI Live Topic Detection
  detectTopic: async (recentTurns, title = 'Meeting Discussion') => {
    const res = await fetch(`${API_BASE}/ai/detect-topic`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ recentTurns, title })
    });
    return handleResponse(res);
  },

  // Tasks (Kanban)
  getTasks: async (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_BASE}/tasks${queryString ? `?${queryString}` : ''}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  createTask: async (taskData) => {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(taskData)
    });
    return handleResponse(res);
  },

  updateTaskStatus: async (taskId, status) => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    return handleResponse(res);
  },

  deleteTask: async (taskId) => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Analytics
  getDashboardAnalytics: async () => {
    const res = await fetch(`${API_BASE}/analytics/dashboard`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Workspaces
  getWorkspaces: async () => {
    const res = await fetch(`${API_BASE}/workspaces`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};
