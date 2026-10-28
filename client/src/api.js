/**
 * API Client Module
 * -----------------
 * Centralized API calls with configurable base URL.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Failed to connect to the backend. Is the server running?');
    }
    throw error;
  }
}

export const api = {
  // Dashboard
  getDashboard: () => request('/api/dashboard'),

  // Tickets
  getTickets: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.priority) query.append('priority', params.priority);
    if (params.assignee_id) query.append('assignee_id', params.assignee_id);
    if (params.sort) query.append('sort', params.sort);
    const queryString = query.toString();
    return request(`/api/tickets${queryString ? `?${queryString}` : ''}`);
  },

  getTicket: (id) => request(`/api/tickets/${id}`),

  createTicket: (data) => request('/api/tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateTicket: (id, data) => request(`/api/tickets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  addReply: (id, data) => request(`/api/tickets/${id}/replies`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  addNote: (id, data) => request(`/api/tickets/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Agents
  getAgents: () => request('/api/agents'),
};
