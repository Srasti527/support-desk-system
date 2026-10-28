/**
 * index.js
 * --------
 * Entry point for the Support Desk backend.
 *
 * Startup sequence:
 *   1. Initialise and load the SQLite database from disk.
 *   2. Register all API routes.
 *   3. Start listening.
 */

import express from 'express';
import cors from 'cors';

import { initDb } from './db.js';
import ticketRoutes    from './routes/tickets.js';
import agentRoutes     from './routes/agents.js';
import dashboardRoutes from './routes/dashboard.js';

const app  = express();
const PORT = 5000;

// --------------------------------------------------------------------------
// Middleware
// --------------------------------------------------------------------------
app.use(cors());
app.use(express.json());

// --------------------------------------------------------------------------
// Health-check route (kept from the original setup)
// --------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    message:   'Support Desk backend is running!',
    timestamp: new Date().toISOString(),
  });
});

// --------------------------------------------------------------------------
// Feature routes
// --------------------------------------------------------------------------
app.use('/api/tickets',   ticketRoutes);
app.use('/api/agents',    agentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// --------------------------------------------------------------------------
// 404 catch-all for unknown routes
// --------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// --------------------------------------------------------------------------
// Start the server only after the database is ready
// --------------------------------------------------------------------------
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n✅ Server is running at http://localhost:${PORT}`);
      console.log(`   Health check : http://localhost:${PORT}/api/health`);
      console.log(`   Tickets      : http://localhost:${PORT}/api/tickets`);
      console.log(`   Agents       : http://localhost:${PORT}/api/agents`);
      console.log(`   Dashboard    : http://localhost:${PORT}/api/dashboard\n`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to initialise database:', err);
    process.exit(1);
  });
