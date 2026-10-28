import { useState, useEffect } from 'react'
import './App.css'

function App() {
  // This piece of state holds the health-check result from the backend
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // When the page first loads, ask the backend if it's alive
  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHealth(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Could not reach the backend. Make sure the server is running.')
        setLoading(false)
      })
  }, [])

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🎫 Support Desk System</h1>
        <p className="subtitle">Full-Stack Engineering Assessment Project</p>
      </header>

      <main className="app-main">
        <div className="card">
          <h2>Backend Health Check</h2>
          {loading && <p className="status loading">⏳ Checking backend…</p>}
          {error && <p className="status error">❌ {error}</p>}
          {health && (
            <div className="status ok">
              <p>✅ Status: <strong>{health.status}</strong></p>
              <p>📢 Message: {health.message}</p>
              <p>🕒 Time: {health.timestamp}</p>
            </div>
          )}
        </div>

        <div className="card info">
          <h2>Project Stack</h2>
          <ul>
            <li>⚛️ <strong>Frontend</strong>: React + Vite (this page)</li>
            <li>🟢 <strong>Backend</strong>: Node.js + Express</li>
            <li>🗃️ <strong>Database</strong>: SQLite (via better-sqlite3)</li>
          </ul>
        </div>
      </main>
    </div>
  )
}

export default App
