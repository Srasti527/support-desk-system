/**
 * routes/agents.js
 * ----------------
 * GET /api/agents – Return all support agents.
 */

import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

function query(sql, params = []) {
  const db = getDb();
  const result = db.exec(sql, params);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
}

// ===========================================================================
// GET /api/agents
// Returns all agents (id, name, email, created_at).
// ===========================================================================
router.get('/', (req, res) => {
  try {
    const agents = query('SELECT id, name, email, created_at FROM agents ORDER BY name ASC');
    res.json({ agents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch agents.' });
  }
});

export default router;
