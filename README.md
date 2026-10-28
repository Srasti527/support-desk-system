# Support Desk System

A full-stack support ticket management system with a React frontend and Express/SQLite backend.

## Project Overview

The Support Desk System provides a web-based interface for managing customer support tickets. Support agents can create, view, update, and track tickets through a clean dashboard interface. The system includes conversation tracking with public replies and internal notes, activity history, and agent assignment.

### Implemented Features

- **Dashboard**: Real-time statistics showing total tickets, Open, In Progress, Resolved, Urgent, and Overdue counts
- **Ticket Management**: Create, view, and update support tickets
- **Search & Filtering**: Search tickets by subject or customer name/email; filter by status, priority, and assignee
- **Sorting**: Sort tickets by recently updated or priority
- **Ticket Details**: View full ticket information with editable fields (subject, status, priority, assignee)
- **Conversation**: Add public replies and internal notes to tickets
- **Activity History**: Chronological log of all ticket activities (creation, status changes, assignments, replies, notes)
- **Agent Assignment**: Assign tickets to support agents from a predefined list
- **Responsive Design**: Works on desktop and smaller screens

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite via sql.js (in-memory with disk persistence)
- **CORS**: Enabled for cross-origin requests

### Frontend
- **Framework**: React 19.3.1
- **Build Tool**: Vite 8.3.5
- **Styling**: Custom CSS with CSS variables
- **Linting**: oxlint

## Project Structure

```
support-desk-system/
├── server/
│   ├── index.js              # Express server entry point
│   ├── db.js                 # SQLite database initialization and schema
│   ├── package.json          # Backend dependencies
│   ├── support_desk.db       # SQLite database file (auto-generated)
│   └── routes/
│       ├── tickets.js        # Ticket CRUD, replies, and notes endpoints
│       ├── agents.js         # Agent listing endpoint
│       └── dashboard.js      # Dashboard statistics endpoint
└── client/
    ├── package.json          # Frontend dependencies
    ├── vite.config.js        # Vite configuration
    ├── index.html            # HTML entry point
    └── src/
        ├── main.jsx          # React application entry
        ├── index.css         # Global styles
        ├── App.jsx           # Main app component with navigation
        ├── api.js            # Centralized API client
        └── components/
            ├── Dashboard.jsx      # Statistics cards
            ├── TicketList.jsx     # Ticket table with filters
            ├── CreateTicket.jsx   # Ticket creation form
            └── TicketDetail.jsx   # Ticket detail view with conversation
```

## Database Schema

The system uses SQLite with the following tables:

### `agents`
Support agents who can be assigned to tickets.
- `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
- `name` (TEXT, NOT NULL)
- `email` (TEXT, NOT NULL, UNIQUE)
- `created_at` (TEXT, NOT NULL, ISO timestamp)

### `tickets`
Main ticket records.
- `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
- `subject` (TEXT, NOT NULL)
- `customer_name` (TEXT, NOT NULL)
- `customer_email` (TEXT, NOT NULL)
- `description` (TEXT, NOT NULL)
- `status` (TEXT, NOT NULL, DEFAULT 'Open') - CHECK: 'Open', 'In Progress', 'Waiting on Customer', 'Resolved'
- `priority` (TEXT, NOT NULL, DEFAULT 'Medium') - CHECK: 'Low', 'Medium', 'High', 'Urgent'
- `assignee_id` (INTEGER, REFERENCES agents(id) ON DELETE SET NULL)
- `created_at` (TEXT, NOT NULL, ISO timestamp)
- `updated_at` (TEXT, NOT NULL, ISO timestamp)

### `conversation_entries`
Public replies and internal notes associated with tickets.
- `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
- `ticket_id` (INTEGER, NOT NULL, REFERENCES tickets(id))
- `type` (TEXT, NOT NULL) - CHECK: 'reply', 'note'
- `author` (TEXT, NOT NULL)
- `body` (TEXT, NOT NULL)
- `created_at` (TEXT, NOT NULL, ISO timestamp)

### `activity_history`
Log of all ticket-related events.
- `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
- `ticket_id` (INTEGER, NOT NULL, REFERENCES tickets(id))
- `event_type` (TEXT, NOT NULL) - e.g., 'created', 'status_changed', 'assigned', 'reply_added', 'note_added'
- `description` (TEXT, NOT NULL)
- `author` (TEXT, NOT NULL)
- `created_at` (TEXT, NOT NULL, ISO timestamp)

### Data Persistence

The database uses sql.js, which keeps the database in-memory during server runtime. To persist data across restarts:
1. On server startup, the database file (`server/support_desk.db`) is loaded into memory if it exists
2. After every write operation (INSERT/UPDATE/DELETE), the in-memory database is exported back to disk
3. Foreign key constraints are enforced

Default agents are seeded on first run if the agents table is empty:
- Alice Johnson (alice@support.com)
- Bob Smith (bob@support.com)
- Carol White (carol@support.com)

## Prerequisites

- **Node.js**: Version 18 or higher (ES modules support required)
- **npm**: Comes with Node.js
- **Git**: For cloning the repository (optional)

## Setup and Run Instructions (Windows)

### 1. Clone or Navigate to Project

```powershell
git clone https://github.com/YOUR-USERNAME/support-desk-system.git
cd support-desk-system
```

### 2. Install Backend Dependencies

```powershell
cd server
npm install
```

### 3. Start the Backend Server

```powershell
npm start
```

The backend will start at `http://localhost:5000`. You should see:
```
📂 Loaded existing database from C:\...\server\support_desk.db
✅ Server is running at http://localhost:5000
   Health check : http://localhost:5000/api/health
   Tickets      : http://localhost:5000/api/tickets
   Agents       : http://localhost:5000/api/agents
   Dashboard    : http://localhost:5000/api/dashboard
```

### 4. Install Frontend Dependencies

Open a new terminal (keep the backend running):

```powershell
cd client
npm install
```

### 5. Start the Frontend Development Server

```powershell
npm run dev
```

The frontend will start at `http://localhost:5173` (or `http://localhost:5174` if 5173 is in use). You should see:
```
VITE v8.3.5  ready in XXX ms
➜  Local:   http://localhost:5173/
```

### 6. Access the Application

Open your browser and navigate to the frontend URL displayed above (e.g., `http://localhost:5173`).

## Application URLs

- **Frontend**: http://localhost:5173 (development)
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## API Endpoints

### Health Check
- `GET /api/health` - Returns server status and timestamp

### Dashboard
- `GET /api/dashboard` - Returns aggregate statistics (total, open, in_progress, waiting_on_customer, resolved, urgent, overdue)

### Tickets
- `GET /api/tickets` - List tickets with optional query parameters:
  - `search` - Partial match on subject, customer_name, or customer_email
  - `status` - Exact match (e.g., "Open")
  - `priority` - Exact match (e.g., "High")
  - `assignee_id` - Integer agent ID
  - `sort` - "updated" (default) or "priority"
- `POST /api/tickets` - Create a new ticket. Body: `subject`, `customer_name`, `customer_email`, `description`, `priority` (optional, default "Medium"), `assignee_id` (optional), `author` (optional, default "System")
- `GET /api/tickets/:id` - Get ticket details including conversation and activity history
- `PATCH /api/tickets/:id` - Update ticket fields. Body: any of `subject`, `customer_name`, `customer_email`, `description`, `status`, `priority`, `assignee_id`, `author`
- `POST /api/tickets/:id/replies` - Add a public reply. Body: `author`, `body`
- `POST /api/tickets/:id/notes` - Add an internal note. Body: `author`, `body`

### Agents
- `GET /api/agents` - Return all agents (id, name, email, created_at)

## Input Validation and Error Handling

### Backend Validation
- **Required fields**: All endpoints validate that required fields are present and non-empty
- **Email format**: Email fields are validated for format on the frontend
- **Status values**: Must be one of: 'Open', 'In Progress', 'Waiting on Customer', 'Resolved'
- **Priority values**: Must be one of: 'Low', 'Medium', 'High', 'Urgent'
- **Assignee existence**: When assigning an agent, the agent ID must exist in the agents table
- **Foreign key constraints**: Enforced at database level

### Frontend Validation
- **Create ticket form**: Validates subject, customer name, customer email (format), and description are non-empty
- **Reply/Note forms**: Validates that message body is non-empty before submission
- **Error display**: API errors are displayed as alert banners with retry options
- **Loading states**: All async operations show loading indicators

### Error Responses
All API errors return JSON with an `error` field:
```json
{
  "error": "Descriptive error message"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created (for POST endpoints)
- `400` - Bad request (validation errors)
- `404` - Not found (invalid ticket ID)
- `500` - Internal server error

## How to Test Main Features

### 1. View Dashboard
- Navigate to the Dashboard tab
- Verify statistics cards display counts for total, Open, In Progress, Resolved, Urgent, and Overdue tickets

### 2. Create a Ticket
- Click "New Ticket" in the sidebar
- Fill in the form:
  - Subject (required)
  - Customer Name (required)
  - Customer Email (required, must be valid format)
  - Description (required)
  - Priority (optional, defaults to Medium)
  - Status (optional, defaults to Open)
  - Assignee (optional)
  - Author (optional, defaults to "Agent")
- Click "Create Ticket"
- Verify success message and redirect to ticket list

### 3. View and Filter Tickets
- Navigate to the Tickets tab
- Use the search box to filter by subject or customer
- Use dropdowns to filter by status, priority, or assignee
- Change sort order to "Priority" to see urgent tickets first
- Click on a ticket subject to view details

### 4. Update Ticket Details
- On the ticket detail page, click "Edit"
- Modify subject, status, priority, or assignee
- Click "Save Changes"
- Verify the ticket updates and activity history records the change

### 5. Add Public Reply
- On the ticket detail page, ensure "Public Reply" tab is selected
- Enter author name and reply text
- Click "Send Reply"
- Verify the reply appears in the conversation with a blue "Reply" badge
- Verify activity history shows the reply addition

### 6. Add Internal Note
- On the ticket detail page, click the "Internal Note" tab
- Enter author name and note text
- Click "Add Note"
- Verify the note appears in the conversation with a yellow "Note" badge and yellow background
- Verify activity history shows the note addition

### 7. View Activity History
- Scroll to the "Activity History" panel on the right side
- Verify all actions (creation, updates, replies, notes) are logged chronologically with author and timestamp

## Current Limitations

- **No Authentication**: The system has no user authentication or authorization. Anyone with access to the frontend can perform all actions.
- **No Automated Tests**: No unit tests, integration tests, or end-to-end tests are present. Testing is manual only.
- **Single-User Assumption**: The author field is a free-text input, not tied to authenticated users.
- **No Email Notifications**: The system does not send email notifications to customers or agents.
- **No File Attachments**: Tickets and conversations do not support file attachments.
- **No Ticket Deletion**: There is no endpoint to delete tickets.
- **No Agent Management**: Agents cannot be created, updated, or deleted through the UI. They are seeded in the database schema.
- **Database Size Limitations**: sql.js keeps the entire database in memory, which may be limiting for very large datasets.
- **No Real-Time Updates**: The frontend does not use WebSockets or polling for real-time updates. Users must refresh to see changes made by others.
