/**
 * routes/dashboard.js
 * -------------------
 * GET /api/dashboard – Return aggregate statistics for the dashboard.
 *
 * All counts come directly from the database.
 *
 * Overdue definition:
 *   A ticket is overdue when it is NOT Resolved AND was created more than
 *   24 hours ago. "Waiting on Customer" tickets can be overdue.
 */

import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

function queryOne(sql, params = []) {
  const db = getDb();
  const result = db.exec(sql, params);
  if (!result.length) return null;
  const { columns, values } = result[0];
  return Object.fromEntries(columns.map((col, i) => [col, values[0][i]]));
}

// ===========================================================================
// GET /api/dashboard
// Returns:
//   total, open, in_progress, waiting_on_customer, resolved, urgent, overdue
// ===========================================================================
router.get('/', (req, res) => {
  try {
    const row = queryOne(`
      SELECT
        COUNT(*)                                                        AS total,
        SUM(CASE WHEN status = 'Open'                THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN status = 'In Progress'         THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status = 'Waiting on Customer' THEN 1 ELSE 0 END) AS waiting_on_customer,
        SUM(CASE WHEN status = 'Resolved'            THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN priority = 'Urgent'            THEN 1 ELSE 0 END) AS urgent,
        SUM(
          CASE
            WHEN status != 'Resolved'
             AND (julianday('now') - julianday(created_at)) * 24 > 24
            THEN 1
            ELSE 0
          END
        )                                                               AS overdue
      FROM tickets
    `);

    // Ensure all counts are numbers (sql.js may return null for empty tables)
    const stats = {
      total:               Number(row?.total               ?? 0),
      open:                Number(row?.open                ?? 0),
      in_progress:         Number(row?.in_progress         ?? 0),
      waiting_on_customer: Number(row?.waiting_on_customer ?? 0),
      resolved:            Number(row?.resolved            ?? 0),
      urgent:              Number(row?.urgent              ?? 0),
      overdue:             Number(row?.overdue             ?? 0),
    };

    res.json({ stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics.' });
  }
});

export default router;
