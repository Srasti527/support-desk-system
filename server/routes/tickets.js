/**
 * routes/tickets.js
 * -----------------
 * All ticket-related API endpoints.
 *
 * GET    /api/tickets              – List tickets (with search, filter, sort)
 * POST   /api/tickets              – Create a ticket
 * GET    /api/tickets/:id          – Get ticket details (with conversation + history)
 * PATCH  /api/tickets/:id          – Update ticket fields
 * POST   /api/tickets/:id/replies  – Add a public reply
 * POST   /api/tickets/:id/notes    – Add an internal note
 */

import { Router } from 'express';
import { getDb, saveDb } from '../db.js';

const router = Router();

// ---------------------------------------------------------------------------
// Helper: run a SELECT and return rows as plain objects
// ---------------------------------------------------------------------------
function query(sql, params = []) {
  const db = getDb();
  const result = db.exec(sql, params);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
}

// ---------------------------------------------------------------------------
// Helper: run a single SELECT that must return exactly one row (or null)
// ---------------------------------------------------------------------------
function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Helper: run an INSERT / UPDATE / DELETE
// ---------------------------------------------------------------------------
function run(sql, params = []) {
  getDb().run(sql, params);
}

// ---------------------------------------------------------------------------
// Helper: get the last inserted row ID
// ---------------------------------------------------------------------------
function lastInsertRowId() {
  return queryOne('SELECT last_insert_rowid() AS id').id;
}

// ---------------------------------------------------------------------------
// Helper: record an activity history event
// ---------------------------------------------------------------------------
function recordActivity(ticketId, eventType, description, author) {
  run(
    `INSERT INTO activity_history (ticket_id, event_type, description, author)
     VALUES (?, ?, ?, ?)`,
    [ticketId, eventType, description, author]
  );
}

// ---------------------------------------------------------------------------
// Helper: update the ticket's updated_at timestamp
// ---------------------------------------------------------------------------
function touchTicket(ticketId) {
  run(
    `UPDATE tickets SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     WHERE id = ?`,
    [ticketId]
  );
}

// ===========================================================================
// GET /api/tickets
// List tickets – supports search, filters, and sorting.
//
// Query params:
//   search   – partial match on subject, customer_name, customer_email
//   status   – exact match  (e.g. "Open")
//   priority – exact match  (e.g. "High")
//   assignee_id – integer
//   sort     – "updated" (default) | "priority"
// ===========================================================================
router.get('/', (req, res) => {
  try {
    const { search, status, priority, assignee_id, sort } = req.query;

    // Priority order for sorting (lower number = higher priority)
    // We map to a CASE expression inside SQL
    const priorityOrder = `CASE priority
      WHEN 'Urgent' THEN 1
      WHEN 'High'   THEN 2
      WHEN 'Medium' THEN 3
      WHEN 'Low'    THEN 4
      ELSE 5 END`;

    let sql = `
      SELECT
        t.id,
        t.subject,
        t.customer_name,
        t.customer_email,
        t.status,
        t.priority,
        t.created_at,
        t.updated_at,
        a.name  AS assignee_name,
        a.email AS assignee_email
      FROM tickets t
      LEFT JOIN agents a ON a.id = t.assignee_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (
        t.subject        LIKE '%' || ? || '%' OR
        t.customer_name  LIKE '%' || ? || '%' OR
        t.customer_email LIKE '%' || ? || '%'
      )`;
      params.push(search, search, search);
    }

    if (status)      { sql += ` AND t.status = ?`;      params.push(status); }
    if (priority)    { sql += ` AND t.priority = ?`;    params.push(priority); }
    if (assignee_id) { sql += ` AND t.assignee_id = ?`; params.push(Number(assignee_id)); }

    if (sort === 'priority') {
      sql += ` ORDER BY ${priorityOrder}, t.updated_at DESC`;
    } else {
      sql += ` ORDER BY t.updated_at DESC`;
    }

    const tickets = query(sql, params);
    res.json({ tickets, total: tickets.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tickets.' });
  }
});

// ===========================================================================
// POST /api/tickets
// Create a new ticket.
//
// Body (JSON):
//   subject*        – string
//   customer_name*  – string
//   customer_email* – string
//   description*    – string
//   priority        – Low | Medium | High | Urgent  (default: Medium)
//   assignee_id     – integer (optional)
//   author*         – who is creating the ticket (for activity log)
// ===========================================================================
router.post('/', (req, res) => {
  try {
    const {
      subject,
      customer_name,
      customer_email,
      description,
      priority = 'Medium',
      assignee_id = null,
      author = 'System',
    } = req.body;

    // --- Validate required fields ---
    const missing = [];
    if (!subject?.trim())         missing.push('subject');
    if (!customer_name?.trim())   missing.push('customer_name');
    if (!customer_email?.trim())  missing.push('customer_email');
    if (!description?.trim())     missing.push('description');
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
    }

    // Verify assignee exists if provided
    if (assignee_id !== null) {
      const agent = queryOne('SELECT id FROM agents WHERE id = ?', [assignee_id]);
      if (!agent) {
        return res.status(400).json({ error: `No agent found with id ${assignee_id}` });
      }
    }

    // --- Insert ticket ---
    run(
      `INSERT INTO tickets
         (subject, customer_name, customer_email, description, priority, assignee_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [subject.trim(), customer_name.trim(), customer_email.trim(), description.trim(), priority, assignee_id]
    );
    const ticketId = lastInsertRowId();

    // --- Record creation event ---
    recordActivity(ticketId, 'created', `Ticket created by ${author}`, author);

    if (assignee_id) {
      const agent = queryOne('SELECT name FROM agents WHERE id = ?', [assignee_id]);
      recordActivity(ticketId, 'assigned', `Assigned to ${agent?.name ?? 'agent'}`, author);
    }

    saveDb();

    const ticket = queryOne('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    res.status(201).json({ ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create ticket.' });
  }
});

// ===========================================================================
// GET /api/tickets/:id
// Get full ticket details: ticket fields + conversation + activity history.
// ===========================================================================
router.get('/:id', (req, res) => {
  try {
    const ticketId = Number(req.params.id);

    const ticket = queryOne(
      `SELECT t.*, a.name AS assignee_name, a.email AS assignee_email
       FROM tickets t
       LEFT JOIN agents a ON a.id = t.assignee_id
       WHERE t.id = ?`,
      [ticketId]
    );

    if (!ticket) {
      return res.status(404).json({ error: `Ticket #${ticketId} not found.` });
    }

    // Conversation entries (replies + notes) in chronological order
    const conversation = query(
      `SELECT id, type, author, body, created_at
       FROM conversation_entries
       WHERE ticket_id = ?
       ORDER BY created_at ASC`,
      [ticketId]
    );

    // Activity history in chronological order
    const history = query(
      `SELECT id, event_type, description, author, created_at
       FROM activity_history
       WHERE ticket_id = ?
       ORDER BY created_at ASC`,
      [ticketId]
    );

    res.json({ ticket, conversation, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ticket.' });
  }
});

// ===========================================================================
// PATCH /api/tickets/:id
// Update one or more ticket fields.
//
// Allowed body fields (all optional; send only what you want to change):
//   subject, customer_name, customer_email, description,
//   status, priority, assignee_id, author (for activity log)
// ===========================================================================
router.patch('/:id', (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const author   = req.body.author ?? 'System';

    const existing = queryOne('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    if (!existing) {
      return res.status(404).json({ error: `Ticket #${ticketId} not found.` });
    }

    const VALID_STATUSES   = ['Open', 'In Progress', 'Waiting on Customer', 'Resolved'];
    const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

    const updates   = [];  // SQL "col = ?" fragments
    const values    = [];  // Corresponding parameter values
    const activities = []; // Activity records to insert after the update

    const fields = ['subject', 'customer_name', 'customer_email', 'description'];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        const val = req.body[field]?.toString().trim();
        if (!val) {
          return res.status(400).json({ error: `Field "${field}" cannot be empty.` });
        }
        updates.push(`${field} = ?`);
        values.push(val);
      }
    }

    if (req.body.status !== undefined) {
      const newStatus = req.body.status;
      if (!VALID_STATUSES.includes(newStatus)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      if (newStatus !== existing.status) {
        updates.push('status = ?');
        values.push(newStatus);
        activities.push({
          type: 'status_changed',
          desc: `Status changed from "${existing.status}" to "${newStatus}"`,
        });
      }
    }

    if (req.body.priority !== undefined) {
      const newPriority = req.body.priority;
      if (!VALID_PRIORITIES.includes(newPriority)) {
        return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
      }
      if (newPriority !== existing.priority) {
        updates.push('priority = ?');
        values.push(newPriority);
        activities.push({
          type: 'priority_changed',
          desc: `Priority changed from "${existing.priority}" to "${newPriority}"`,
        });
      }
    }

    if (req.body.assignee_id !== undefined) {
      const newAssigneeId = req.body.assignee_id === null ? null : Number(req.body.assignee_id);
      if (newAssigneeId !== null) {
        const agent = queryOne('SELECT name FROM agents WHERE id = ?', [newAssigneeId]);
        if (!agent) {
          return res.status(400).json({ error: `No agent found with id ${newAssigneeId}` });
        }
        updates.push('assignee_id = ?');
        values.push(newAssigneeId);
        activities.push({
          type: 'assigned',
          desc: `Assigned to ${agent.name}`,
        });
      } else {
        updates.push('assignee_id = ?');
        values.push(null);
        activities.push({ type: 'unassigned', desc: 'Removed assignee' });
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided to update.' });
    }

    // Apply the updates and bump updated_at
    updates.push(`updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`);
    values.push(ticketId);

    run(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`, values);

    for (const act of activities) {
      recordActivity(ticketId, act.type, act.desc, author);
    }

    saveDb();

    const updated = queryOne(
      `SELECT t.*, a.name AS assignee_name, a.email AS assignee_email
       FROM tickets t LEFT JOIN agents a ON a.id = t.assignee_id
       WHERE t.id = ?`,
      [ticketId]
    );
    res.json({ ticket: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update ticket.' });
  }
});

// ===========================================================================
// POST /api/tickets/:id/replies
// Add a public reply to a ticket.
//
// Body:
//   author* – string (who is replying)
//   body*   – string (the reply text)
// ===========================================================================
router.post('/:id/replies', (req, res) => {
  try {
    const ticketId = Number(req.params.id);

    const ticket = queryOne('SELECT id FROM tickets WHERE id = ?', [ticketId]);
    if (!ticket) {
      return res.status(404).json({ error: `Ticket #${ticketId} not found.` });
    }

    const { author, body } = req.body;
    if (!author?.trim()) return res.status(400).json({ error: 'Field "author" is required.' });
    if (!body?.trim())   return res.status(400).json({ error: 'Field "body" is required.'   });

    run(
      `INSERT INTO conversation_entries (ticket_id, type, author, body)
       VALUES (?, 'reply', ?, ?)`,
      [ticketId, author.trim(), body.trim()]
    );
    const entryId = lastInsertRowId();

    recordActivity(ticketId, 'reply_added', `Public reply added by ${author.trim()}`, author.trim());
    touchTicket(ticketId);
    saveDb();

    const entry = queryOne('SELECT * FROM conversation_entries WHERE id = ?', [entryId]);
    res.status(201).json({ entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add reply.' });
  }
});

// ===========================================================================
// POST /api/tickets/:id/notes
// Add an internal note to a ticket (not visible to the customer).
//
// Body:
//   author* – string
//   body*   – string
// ===========================================================================
router.post('/:id/notes', (req, res) => {
  try {
    const ticketId = Number(req.params.id);

    const ticket = queryOne('SELECT id FROM tickets WHERE id = ?', [ticketId]);
    if (!ticket) {
      return res.status(404).json({ error: `Ticket #${ticketId} not found.` });
    }

    const { author, body } = req.body;
    if (!author?.trim()) return res.status(400).json({ error: 'Field "author" is required.' });
    if (!body?.trim())   return res.status(400).json({ error: 'Field "body" is required.'   });

    run(
      `INSERT INTO conversation_entries (ticket_id, type, author, body)
       VALUES (?, 'note', ?, ?)`,
      [ticketId, author.trim(), body.trim()]
    );
    const entryId = lastInsertRowId();

    recordActivity(ticketId, 'note_added', `Internal note added by ${author.trim()}`, author.trim());
    touchTicket(ticketId);
    saveDb();

    const entry = queryOne('SELECT * FROM conversation_entries WHERE id = ?', [entryId]);
    res.status(201).json({ entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add note.' });
  }
});

export default router;
