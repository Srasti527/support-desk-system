/**
 * TicketList Component
 * --------------------
 * Displays a table of tickets with search, filters, and sorting.
 */

import { useState, useEffect } from 'react';
import { api } from '../api';

const STATUS_OPTIONS = ['All', 'Open', 'In Progress', 'Waiting on Customer', 'Resolved'];
const PRIORITY_OPTIONS = ['All', 'Low', 'Medium', 'High', 'Urgent'];
const SORT_OPTIONS = ['updated', 'priority'];

function getStatusBadge(status) {
  const map = {
    'Open': 'badge-open',
    'In Progress': 'badge-prog',
    'Waiting on Customer': 'badge-wait',
    'Resolved': 'badge-res',
  };
  return <span className={`badge ${map[status] || ''}`}>{status}</span>;
}

function getPriorityBadge(priority) {
  const map = {
    'Low': 'badge-low',
    'Medium': 'badge-med',
    'High': 'badge-high',
    'Urgent': 'badge-urg',
  };
  return <span className={`badge ${map[priority] || ''}`}>{priority}</span>;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function TicketList({ onTicketClick }) {
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [priority, setPriority] = useState('All');
  const [assigneeId, setAssigneeId] = useState('');
  const [sort, setSort] = useState('updated');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (search) params.search = search;
      if (status !== 'All') params.status = status;
      if (priority !== 'All') params.priority = priority;
      if (assigneeId) params.assignee_id = assigneeId;
      if (sort) params.sort = sort;
      
      const data = await api.getTickets(params);
      setTickets(data.tickets);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const data = await api.getAgents();
      setAgents(data.agents);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchAgents();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [status, priority, assigneeId, sort]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTickets();
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="state-box">
        <div className="state-icon">⏳</div>
        <p>Loading tickets...</p>
      </div>
    );
  }

  if (error && tickets.length === 0) {
    return (
      <div className="state-box">
        <div className="state-icon">❌</div>
        <p>{error}</p>
        <button className="btn btn-secondary btn-sm" onClick={fetchTickets} style={{ marginTop: '12px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="toolbar">
        <form className="search-box" onSubmit={handleSearchSubmit}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by subject or customer..."
            value={search}
            onChange={handleSearch}
          />
        </form>

        <select
          className="filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>{p === 'All' ? 'All Priorities' : p}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
        >
          <option value="">All Assignees</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>{agent.name}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="updated">Sort: Recently Updated</option>
          <option value="priority">Sort: Priority</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Subject</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Assignee</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <div className="state-box" style={{ padding: '32px 24px' }}>
                    <div className="state-icon">📭</div>
                    <p>No tickets found</p>
                  </div>
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="td-id">#{ticket.id}</td>
                  <td>
                    <button
                      className="td-link"
                      onClick={() => onTicketClick(ticket.id)}
                    >
                      {ticket.subject}
                    </button>
                  </td>
                  <td>
                    <div>{ticket.customer_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                      {ticket.customer_email}
                    </div>
                  </td>
                  <td>{getStatusBadge(ticket.status)}</td>
                  <td>{getPriorityBadge(ticket.priority)}</td>
                  <td>{ticket.assignee_name || <span style={{ color: 'var(--text-3)' }}>Unassigned</span>}</td>
                  <td>{formatDate(ticket.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
