/**
 * App Component
 * -------------
 * Main application with sidebar navigation and view routing.
 */

import { useState, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import TicketList from './components/TicketList';
import CreateTicket from './components/CreateTicket';
import TicketDetail from './components/TicketDetail';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [refreshDashboard, setRefreshDashboard] = useState(null);

  const handleTicketClick = (id) => {
    setSelectedTicketId(id);
    setCurrentView('ticket-detail');
  };

  const handleBackToTickets = () => {
    setSelectedTicketId(null);
    setCurrentView('tickets');
  };

  const handleTicketUpdated = useCallback(() => {
    setRefreshDashboard((prev) => (prev ? prev() : null));
  }, []);

  const setDashboardRefresh = useCallback((refreshFn) => {
    setRefreshDashboard(() => refreshFn);
  }, []);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>
            <span>🎫</span>
            <span>Support Desk</span>
          </h1>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <span className="icon">📊</span>
            <span className="label">Dashboard</span>
          </button>
          <button
            className={`nav-item ${currentView === 'tickets' ? 'active' : ''}`}
            onClick={() => setCurrentView('tickets')}
          >
            <span className="icon">📋</span>
            <span className="label">Tickets</span>
          </button>
          <button
            className={`nav-item ${currentView === 'create' ? 'active' : ''}`}
            onClick={() => setCurrentView('create')}
          >
            <span className="icon">➕</span>
            <span className="label">New Ticket</span>
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {currentView === 'dashboard' && (
          <>
            <div className="page-header">
              <div>
                <h2>Dashboard</h2>
                <p>Overview of support ticket statistics</p>
              </div>
            </div>
            <Dashboard onRefresh={setDashboardRefresh} />
          </>
        )}

        {currentView === 'tickets' && (
          <>
            <div className="page-header">
              <div>
                <h2>Tickets</h2>
                <p>View and manage all support tickets</p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setCurrentView('create')}
              >
                ➕ New Ticket
              </button>
            </div>
            <TicketList onTicketClick={handleTicketClick} />
          </>
        )}

        {currentView === 'create' && (
          <>
            <div className="page-header">
              <div>
                <h2>Create Ticket</h2>
                <p>Submit a new support ticket</p>
              </div>
            </div>
            <CreateTicket
              onSuccess={() => {
                setCurrentView('tickets');
                handleTicketUpdated();
              }}
              onCancel={() => setCurrentView('tickets')}
            />
          </>
        )}

        {currentView === 'ticket-detail' && selectedTicketId && (
          <TicketDetail
            ticketId={selectedTicketId}
            onBack={handleBackToTickets}
            onUpdated={handleTicketUpdated}
          />
        )}
      </main>
    </div>
  );
}

export default App
