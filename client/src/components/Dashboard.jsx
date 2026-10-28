/**
 * Dashboard Component
 * -------------------
 * Displays statistics cards for ticket counts.
 */

import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Dashboard({ onRefresh }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDashboard();
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Expose refresh function to parent
  useEffect(() => {
    if (onRefresh) onRefresh(fetchStats);
  }, [onRefresh]);

  if (loading) {
    return (
      <div className="state-box">
        <div className="state-icon">⏳</div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-box">
        <div className="state-icon">❌</div>
        <p>{error}</p>
        <button className="btn btn-secondary btn-sm" onClick={fetchStats} style={{ marginTop: '12px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="stat-grid">
      <div className="stat-card">
        <div className="stat-label">Total Tickets</div>
        <div className="stat-value">{stats.total}</div>
      </div>
      <div className="stat-card accent-open">
        <div className="stat-label">Open</div>
        <div className="stat-value">{stats.open}</div>
      </div>
      <div className="stat-card accent-prog">
        <div className="stat-label">In Progress</div>
        <div className="stat-value">{stats.in_progress}</div>
      </div>
      <div className="stat-card accent-res">
        <div className="stat-label">Resolved</div>
        <div className="stat-value">{stats.resolved}</div>
      </div>
      <div className="stat-card accent-urg">
        <div className="stat-label">Urgent</div>
        <div className="stat-value">{stats.urgent}</div>
      </div>
      <div className="stat-card accent-over">
        <div className="stat-label">Overdue</div>
        <div className="stat-value">{stats.overdue}</div>
      </div>
    </div>
  );
}
