/**
 * CreateTicket Component
 * ---------------------
 * Form for creating new tickets with validation.
 */

import { useState, useEffect } from 'react';
import { api } from '../api';

const STATUS_OPTIONS = ['Open', 'In Progress', 'Waiting on Customer', 'Resolved'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];

export default function CreateTicket({ onSuccess, onCancel }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    customer_name: '',
    customer_email: '',
    description: '',
    priority: 'Medium',
    status: 'Open',
    assignee_id: '',
    author: 'Agent',
  });

  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const data = await api.getAgents();
      setAgents(data.agents);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.subject.trim()) errors.subject = 'Subject is required';
    if (!formData.customer_name.trim()) errors.customer_name = 'Customer name is required';
    if (!formData.customer_email.trim()) errors.customer_email = 'Customer email is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.customer_email.trim() && !emailRegex.test(formData.customer_email)) {
      errors.customer_email = 'Invalid email format';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    try {
      setLoading(true);
      const payload = {
        ...formData,
        assignee_id: formData.assignee_id ? Number(formData.assignee_id) : null,
      };
      await api.createTicket(payload);
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="state-box">
        <div className="state-icon">✅</div>
        <p>Ticket created successfully!</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="panel-header">
        <span>Create New Ticket</span>
        {onCancel && (
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      <div className="panel-body">
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group span-2">
              <label>
                Subject <span className="req">*</span>
              </label>
              <input
                type="text"
                name="subject"
                className={`form-control ${fieldErrors.subject ? 'error-field' : ''}`}
                value={formData.subject}
                onChange={handleChange}
                placeholder="Brief summary of the issue"
              />
              {fieldErrors.subject && <div className="field-error">{fieldErrors.subject}</div>}
            </div>

            <div className="form-group">
              <label>
                Customer Name <span className="req">*</span>
              </label>
              <input
                type="text"
                name="customer_name"
                className={`form-control ${fieldErrors.customer_name ? 'error-field' : ''}`}
                value={formData.customer_name}
                onChange={handleChange}
                placeholder="Full name"
              />
              {fieldErrors.customer_name && <div className="field-error">{fieldErrors.customer_name}</div>}
            </div>

            <div className="form-group">
              <label>
                Customer Email <span className="req">*</span>
              </label>
              <input
                type="email"
                name="customer_email"
                className={`form-control ${fieldErrors.customer_email ? 'error-field' : ''}`}
                value={formData.customer_email}
                onChange={handleChange}
                placeholder="email@example.com"
              />
              {fieldErrors.customer_email && <div className="field-error">{fieldErrors.customer_email}</div>}
            </div>

            <div className="form-group span-2">
              <label>
                Description <span className="req">*</span>
              </label>
              <textarea
                name="description"
                className={`form-control ${fieldErrors.description ? 'error-field' : ''}`}
                value={formData.description}
                onChange={handleChange}
                placeholder="Detailed description of the issue..."
              />
              {fieldErrors.description && <div className="field-error">{fieldErrors.description}</div>}
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                name="priority"
                className="form-control"
                value={formData.priority}
                onChange={handleChange}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                className="form-control"
                value={formData.status}
                onChange={handleChange}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Assignee</label>
              <select
                name="assignee_id"
                className="form-control"
                value={formData.assignee_id}
                onChange={handleChange}
              >
                <option value="">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Author</label>
              <input
                type="text"
                name="author"
                className="form-control"
                value={formData.author}
                onChange={handleChange}
                placeholder="Your name"
              />
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            {onCancel && (
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
