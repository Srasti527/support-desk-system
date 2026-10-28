/**
 * TicketDetail Component
 * ----------------------
 * Displays full ticket details with editable fields, replies, notes, and activity history.
 */

import { useState, useEffect } from 'react';
import { api } from '../api';

const STATUS_OPTIONS = ['Open', 'In Progress', 'Waiting on Customer', 'Resolved'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];

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

function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

export default function TicketDetail({ ticketId, onBack, onUpdated }) {
  const [ticket, setTicket] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [history, setHistory] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Reply/Note form
  const [activeTab, setActiveTab] = useState('reply');
  const [replyForm, setReplyForm] = useState({ author: 'Agent', body: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTicket(ticketId);
      setTicket(data.ticket);
      setConversation(data.conversation);
      setHistory(data.history);
      setEditForm({
        subject: data.ticket.subject,
        status: data.ticket.status,
        priority: data.ticket.priority,
        assignee_id: data.ticket.assignee_id || '',
      });
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
    fetchData();
    fetchAgents();
  }, [ticketId]);

  const handleEditToggle = () => {
    if (isEditing) {
      setEditForm({
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        assignee_id: ticket.assignee_id || '',
      });
    }
    setIsEditing(!isEditing);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    try {
      setSubmitting(true);
      setSubmitError(null);
      const payload = {
        ...editForm,
        assignee_id: editForm.assignee_id ? Number(editForm.assignee_id) : null,
        author: 'Agent',
      };
      const data = await api.updateTicket(ticketId, payload);
      setTicket(data.ticket);
      setIsEditing(false);
      setSuccessMsg('Ticket updated successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      onUpdated?.();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyNoteSubmit = async () => {
    if (!replyForm.body.trim()) {
      setSubmitError('Message body is required');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      if (activeTab === 'reply') {
        await api.addReply(ticketId, {
          author: replyForm.author,
          body: replyForm.body,
        });
      } else {
        await api.addNote(ticketId, {
          author: replyForm.author,
          body: replyForm.body,
        });
      }

      setReplyForm({ ...replyForm, body: '' });
      setSuccessMsg(activeTab === 'reply' ? 'Reply sent' : 'Note added');
      setTimeout(() => setSuccessMsg(''), 3000);
      await fetchData();
      onUpdated?.();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="state-box">
        <div className="state-icon">⏳</div>
        <p>Loading ticket details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-box">
        <div className="state-icon">❌</div>
        <p>{error}</p>
        <button className="btn btn-secondary btn-sm" onClick={fetchData} style={{ marginTop: '12px' }}>
          Retry
        </button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="state-box">
        <div className="state-icon">📭</div>
        <p>Ticket not found</p>
        <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginTop: '12px' }}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div>
      <button className="back-btn" onClick={onBack}>
        ← Back to Tickets
      </button>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '16px' }}>
          <span>✅</span>
          <span>{successMsg}</span>
        </div>
      )}

      <div className="detail-layout">
        <div className="detail-main">
          {/* Ticket Info Panel */}
          <div className="panel">
            <div className="panel-header">
              <span>#{ticket.id} - {ticket.subject}</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleEditToggle}
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            <div className="panel-body">
              {isEditing ? (
                <div className="form-grid">
                  <div className="form-group span-2">
                    <label>Subject</label>
                    <input
                      type="text"
                      name="subject"
                      className="form-control"
                      value={editForm.subject}
                      onChange={handleEditChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      className="form-control"
                      value={editForm.status}
                      onChange={handleEditChange}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      name="priority"
                      className="form-control"
                      value={editForm.priority}
                      onChange={handleEditChange}
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group span-2">
                    <label>Assignee</label>
                    <select
                      name="assignee_id"
                      className="form-control"
                      value={editForm.assignee_id}
                      onChange={handleEditChange}
                    >
                      <option value="">Unassigned</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="span-2" style={{ marginTop: '12px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleSaveEdit}
                      disabled={submitting}
                    >
                      {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', marginBottom: '4px' }}>
                      STATUS
                    </div>
                    <div>{getStatusBadge(ticket.status)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', marginBottom: '4px' }}>
                      PRIORITY
                    </div>
                    <div>{getPriorityBadge(ticket.priority)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', marginBottom: '4px' }}>
                      DESCRIPTION
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {ticket.description}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Conversation Panel */}
          <div className="panel">
            <div className="panel-header">
              <span>Conversation</span>
            </div>
            <div className="panel-body">
              {conversation.length === 0 ? (
                <div className="state-box" style={{ padding: '32px 24px' }}>
                  <div className="state-icon">💬</div>
                  <p>No conversation yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {conversation.map((entry) => (
                    <div key={entry.id} className="conv-entry">
                      <div className="conv-meta">
                        <span className={`badge ${entry.type === 'reply' ? 'badge-reply' : 'badge-note'}`}>
                          {entry.type === 'reply' ? 'Reply' : 'Note'}
                        </span>
                        <span className="conv-author">{entry.author}</span>
                        <span className="conv-time">{formatDateTime(entry.created_at)}</span>
                      </div>
                      <div className={`conv-body ${entry.type === 'note' ? 'conv-note-bg' : ''}`}>
                        {entry.body}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reply/Note Form */}
          <div className="panel">
            <div className="panel-body">
              <div className="tab-bar">
                <button
                  className={`tab-btn ${activeTab === 'reply' ? 'active' : ''}`}
                  onClick={() => setActiveTab('reply')}
                >
                  Public Reply
                </button>
                <button
                  className={`tab-btn ${activeTab === 'note' ? 'active' : ''}`}
                  onClick={() => setActiveTab('note')}
                >
                  Internal Note
                </button>
              </div>

              {submitError && (
                <div className="alert alert-error" style={{ marginBottom: '12px' }}>
                  <span>⚠️</span>
                  <span>{submitError}</span>
                </div>
              )}

              <div className="form-group">
                <label>Author</label>
                <input
                  type="text"
                  className="form-control"
                  value={replyForm.author}
                  onChange={(e) => setReplyForm({ ...replyForm, author: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
              </div>
              <div className="form-group">
                <label>{activeTab === 'reply' ? 'Reply' : 'Note'}</label>
                <textarea
                  className="form-control"
                  value={replyForm.body}
                  onChange={(e) => setReplyForm({ ...replyForm, body: e.target.value })}
                  placeholder={activeTab === 'reply' ? 'Type your public reply...' : 'Type an internal note...'}
                  rows={4}
                />
              </div>
              <div style={{ marginTop: '12px', textAlign: 'right' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleReplyNoteSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Sending...' : activeTab === 'reply' ? 'Send Reply' : 'Add Note'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-side">
          {/* Customer Info */}
          <div className="panel">
            <div className="panel-header">Customer</div>
            <div className="panel-body">
              <div className="info-row">
                <div className="info-label">Name</div>
                <div className="info-value">{ticket.customer_name}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Email</div>
                <div className="info-value">{ticket.customer_email}</div>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="panel">
            <div className="panel-header">Assignment</div>
            <div className="panel-body">
              <div className="info-row">
                <div className="info-label">Assignee</div>
                <div className="info-value">
                  {ticket.assignee_name || <span style={{ color: 'var(--text-3)' }}>Unassigned</span>}
                </div>
              </div>
              {ticket.assignee_email && (
                <div className="info-row">
                  <div className="info-label">Email</div>
                  <div className="info-value">{ticket.assignee_email}</div>
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="panel">
            <div className="panel-header">Timestamps</div>
            <div className="panel-body">
              <div className="info-row">
                <div className="info-label">Created</div>
                <div className="info-value">{formatDateTime(ticket.created_at)}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Last Updated</div>
                <div className="info-value">{formatDateTime(ticket.updated_at)}</div>
              </div>
            </div>
          </div>

          {/* Activity History */}
          <div className="panel">
            <div className="panel-header">Activity History</div>
            <div className="panel-body">
              {history.length === 0 ? (
                <div style={{ color: 'var(--text-3)', fontSize: '13px' }}>No activity yet</div>
              ) : (
                <div className="history-list">
                  {history.map((item) => (
                    <div key={item.id} className="history-item">
                      <div className="history-dot"></div>
                      <div>
                        <div className="history-text">{item.description}</div>
                        <div className="history-meta">
                          {item.author} • {formatDateTime(item.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
