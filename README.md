<div align="center">

# CollabBoard

> Real-time collaborative project management — built for teams, engineered for production.

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.6-010101?style=for-the-badge&logo=socket.io)](https://socket.io)
[![Groq](https://img.shields.io/badge/Groq-LLaMA%203.1-F55036?style=for-the-badge&logo=groq&logoColor=white)](https://groq.com)

<br/>

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-collabboard--kappa.vercel.app-6B5CFF?style=for-the-badge)](https://collabboard-akashms24s-projects.vercel.app/)
[![API Health](https://img.shields.io/badge/🟢%20API-collabboard--41qb.onrender.com-22C97E?style=for-the-badge)](https://collabboard-41qb.onrender.com/health)

</div>

## What It Does

CollabBoard is a full-stack, production-grade collaborative task management platform. Multiple users can work on the same Kanban board simultaneously — tasks move, update, and appear in real time across every connected session without a page refresh.

Think Linear or Jira, but built from scratch with a focus on engineering fundamentals: event-driven architecture, transactional database operations, secure token-based authentication, and an integrated AI layer powered by LLaMA 3.1 via Groq.

---

## Live Features

- **Real-time board sync** — changes appear instantly across all connected clients via WebSocket rooms scoped to board ID
- **Kanban task management** — create, move, and delete tasks across columns (Backlog → In Progress → Review → Done)
- **Priority & tagging** — tasks support priority levels (High / Med / Low) and category tags (feat, bug, infra, docs, design...)
- **Online presence** — see who's viewing the same board in real time
- **Activity log** — live feed of all board actions
- **JWT authentication** — access tokens (15min) + refresh tokens (7d) with single-use rotation
- **Workspace organization** — group boards into workspaces
- **AI Assistant** — three LLM-powered tools built into the sidebar (see below)
- **Admin Panel** — real-time platform analytics, user management, and CSV export (owner-only)

---

## 🧠 AI Assistant

Powered by **LLaMA 3.1 via Groq** — free, fast, no credit card required.

Three tools are available directly from the sidebar:

### ✨ AI Task Generator
Describe your project in plain English — the AI builds a full, structured task breakdown across Backlog, In Progress, Review, and Done columns. Ideal for kicking off a new board without manually creating every card.

> Input: project name + optional description → Output: complete task plan ready to populate your board

### ✍️ Smart Task Writer
Give it a task title and optional project context — the AI writes a professional task description with acceptance criteria, edge cases, and definition of done. Turns a one-liner into a properly scoped ticket.

> Input: task title + project name → Output: description with acceptance criteria, auto-filled into the task form

### 📋 AI Standup Bot
Paste your board ID (from the URL: `/board/YOUR-ID-HERE`) — the bot reads the last 24 hours of board activity and generates a daily standup report in the standard format: what was done, what's in progress, any blockers.

> Input: board ID → Output: formatted standup report based on real board activity

All three tools run on **LLaMA 3.1-8B-Instant** served via the Groq API. Latency is typically under 1 second.

---

## ⚙️ Admin Panel

Visible only to the platform owner. Accessible from the sidebar when logged in as the admin account.

- **Platform stats** — total users, workspaces, boards, tasks, and new signups today
- **Signup chart** — bar chart of new user registrations over the last 7 days
- **User directory** — searchable list of all users with online/offline status and role badges
- **CSV export** — one-click export of all user data
- **Auto-refresh** — stats update every 30 seconds automatically; manual refresh also available

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18, Zustand, Vite | Fast SPA with lightweight global state |
| Styling | Tailwind CSS | Utility-first, consistent design system |
| Real-time | Socket.io client/server | Bidirectional event-driven communication |
| Backend | Node.js, Express | Lightweight, non-blocking I/O |
| Database | PostgreSQL + pg pool | ACID transactions, connection pooling |
| Auth | JWT (access + refresh) | Stateless auth with secure rotation |
| AI | LLaMA 3.1 via Groq API | Fast LLM inference, free tier, no GPU needed |
| Logging | Winston + Morgan | Structured production logging |
| Deployment | Vercel (frontend), Render (backend + DB) | Zero-cost production infrastructure |

---

## Architecture

```
Client (React + Zustand)
        │
        ├── REST API (Express) ──────────── PostgreSQL
        │         │                         (connection pool)
        ├── WebSocket (Socket.io) ────────── Board rooms
        │                                    (scoped broadcast)
        └── AI Routes (Express) ─────────── Groq API
                                             (LLaMA 3.1)
```

### Key Engineering Decisions

**Event-driven real-time sync** — Socket.io rooms are scoped to `boardId`. When a task is created or moved, the server broadcasts only to clients in that board's room — not all connected users.

**Optimistic UI updates** — task moves update the local state immediately before the server confirms, giving instant feedback. If the server call fails, a toast error is shown.

**JWT refresh token rotation** — refresh tokens are single-use and stored in the database. On each refresh, the old token is invalidated and a new one is issued, preventing replay attacks.

**Idempotency keys** — task creation requests include a client-generated UUID. If the same request is retried (e.g., on network failure), the server deduplicates it — no duplicate tasks created.

**DB transactions with row locking** — task move operations use `SELECT ... FOR UPDATE` to prevent race conditions when multiple users move the same task simultaneously.

**AI via Groq, not OpenAI** — Groq's inference API serves LLaMA 3.1 at near-instant speeds with a generous free tier. No credit card, no cold starts, no per-token billing anxiety during demos.

**Admin gate at the component level** — the Admin Panel nav item and route are conditionally rendered based on the authenticated user's email, keeping the surface area minimal. No separate role column needed in the DB for a single-owner platform.

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login, receive tokens |
| POST | `/api/auth/refresh` | — | Rotate access token |
| POST | `/api/auth/logout` | ✓ | Invalidate refresh token |
| GET | `/api/auth/me` | ✓ | Current user info |
| GET | `/api/workspaces` | ✓ | List workspaces |
| POST | `/api/workspaces` | ✓ | Create workspace |
| GET | `/api/workspaces/:id/boards` | ✓ | List boards in workspace |
| POST | `/api/workspaces/:id/boards` | ✓ | Create board (auto-creates 4 columns) |
| GET | `/api/boards/:id` | ✓ | Board + columns + tasks |
| POST | `/api/boards/:id/columns/:colId/tasks` | ✓ | Create task (idempotent) |
| PATCH | `/api/tasks/:id/move` | ✓ | Move task (transactional) |
| DELETE | `/api/tasks/:id` | ✓ | Delete task |
| GET | `/api/boards/:id/activity` | ✓ | Activity log |
| POST | `/api/ai/generate-tasks` | ✓ | AI task plan from description |
| POST | `/api/ai/write-description` | ✓ | AI task description + criteria |
| POST | `/api/ai/standup` | ✓ | AI standup from board activity |
| GET | `/api/admin/stats` | ✓ Admin | Platform stats |
| GET | `/api/admin/users` | ✓ Admin | All users |
| GET | `/api/admin/export` | ✓ Admin | CSV user export |
| GET | `/health` | — | Health check |

---

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `board:join` | Client → Server | Join a board's socket room |
| `board:online_users` | Server → Client | Current viewers on join |
| `user:joined` | Server → Client | Another user joined |
| `user:left` | Server → Client | A user disconnected |
| `task:created` | Bidirectional | New task broadcast to room |
| `task:moved` | Bidirectional | Task column change |
| `task:updated` | Bidirectional | Task field update |
| `task:deleted` | Bidirectional | Task removal |

---

## Local Setup

**Prerequisites:** Node.js 18+, PostgreSQL 14+, Groq API key (free at [console.groq.com](https://console.groq.com))

```bash
# Clone
git clone https://github.com/AkashMs24/collabboard
cd collabboard

# Backend
cd server
npm install
cp .env.example .env
# Fill in: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, CLIENT_URL, GROQ_API_KEY
npm run migrate
npm run dev

# Frontend (new terminal)
cd client
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:4000
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deployment

**Backend → Render**
1. New Web Service → connect GitHub repo → root: `server/`
2. Add PostgreSQL plugin
3. Set env vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_URL`, `GROQ_API_KEY`, `NODE_ENV=production`
4. Shell → `npm run migrate`

**Frontend → Vercel**
1. Import repo → root: `client/`
2. Set `VITE_API_URL` → your Render backend URL
3. Deploy

> **Groq API key** — get yours free at [console.groq.com](https://console.groq.com) → API Keys → Create. No credit card required. Add it as `GROQ_API_KEY` in both your `.env` and Render environment variables.

---

## Project Structure

```
collabboard/
├── server/
│   └── src/
│       ├── config/        # DB pool, logger, migrations
│       ├── controllers/   # Auth, board, task, AI, admin logic
│       ├── middleware/    # JWT auth, rate limiting, error handler
│       ├── routes/        # API route definitions
│       ├── socket/        # WebSocket event handlers
│       └── index.js       # Server entry point
└── client/
    └── src/
        ├── components/    # Layout, UI components
        ├── context/       # Auth store (Zustand), Socket context
        ├── lib/           # Axios instance with auto token refresh
        ├── pages/         # Login, Register, Dashboard, Board, AI, Admin
        └── App.jsx
```

---

## Author

**Akash M S** — [GitHub](https://github.com/AkashMs24)

Built as a demonstration of production software engineering: real-time systems, event-driven architecture, secure JWT auth patterns, transactional database design, scalable backend architecture, and LLM integration without infrastructure overhead.

> This is not a tutorial clone. Every architectural decision — from idempotency keys to optimistic UI to refresh token rotation to Groq-powered AI tooling — was made deliberately to reflect how production systems are actually built.
