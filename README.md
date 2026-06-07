# CollabBoard

> Real-time collaborative project management platform — built for teams, designed for speed.

![CollabBoard](https://img.shields.io/badge/status-production--ready-22C97E?style=flat-square)
![Node](https://img.shields.io/badge/node-18+-6B5CFF?style=flat-square)
![React](https://img.shields.io/badge/react-18-3B82F6?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/postgresql-15-336791?style=flat-square)

---

## What It Does

CollabBoard is a full-stack, production-grade collaborative task management system. Multiple users can work on the same board simultaneously — tasks move, update, and appear in real time across every connected session without a page refresh.

**Core capabilities:**
- Real-time board sync via WebSockets (Socket.io)
- JWT authentication with access/refresh token rotation
- Kanban boards with drag-to-move task management
- Workspace and board organization
- Activity log with live updates
- Online presence indicators (who's viewing right now)
- Idempotent task creation (safe on retry/duplicate requests)
- Rate limiting, structured logging, full error handling

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Zustand, Socket.io-client, Vite |
| Backend | Node.js, Express, Socket.io |
| Database | PostgreSQL (connection pooling via `pg`) |
| Auth | JWT (access 15min + refresh 7d) |
| Deployment | Railway (backend + DB), Vercel (frontend) |
| Logging | Winston |

---

## Architecture

```
Client (React)
    │
    ├── REST API (Express) ──── PostgreSQL
    │         │
    └── WebSocket (Socket.io) ─ Broadcasts to board rooms
```

Key patterns used:
- **Event-driven real-time sync** — socket rooms scoped to board ID
- **Optimistic UI updates** — task moves update locally before server confirms
- **Token rotation** — refresh tokens single-use, stored in DB
- **Idempotency keys** — prevent duplicate task creation on network retry
- **DB transactions** — task moves use row locking to prevent race conditions

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Backend

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your DB credentials
npm run migrate
npm run dev
```

### Frontend

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`

---

## Deployment

### Backend → Railway

1. Push `server/` to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add a PostgreSQL plugin (Railway provisions it automatically)
4. Set environment variables:
   ```
   DATABASE_URL=<from Railway PostgreSQL plugin>
   JWT_SECRET=<generate: openssl rand -base64 32>
   JWT_REFRESH_SECRET=<generate: openssl rand -base64 32>
   CLIENT_URL=<your Vercel frontend URL>
   NODE_ENV=production
   ```
5. Run migrations: Railway console → `npm run migrate`

### Frontend → Vercel

1. Push `client/` to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project
3. Set env variable:
   ```
   VITE_API_URL=<your Railway backend URL>
   ```
4. Deploy

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login, get tokens |
| POST | `/api/auth/refresh` | — | Rotate access token |
| POST | `/api/auth/logout` | ✓ | Invalidate refresh token |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/workspaces` | ✓ | List workspaces |
| POST | `/api/workspaces` | ✓ | Create workspace |
| GET | `/api/workspaces/:id/boards` | ✓ | List boards |
| POST | `/api/workspaces/:id/boards` | ✓ | Create board (auto-creates 4 columns) |
| GET | `/api/boards/:id` | ✓ | Board + columns + tasks |
| POST | `/api/boards/:id/columns/:colId/tasks` | ✓ | Create task (idempotent) |
| PATCH | `/api/tasks/:id/move` | ✓ | Move task (transactional) |
| DELETE | `/api/tasks/:id` | ✓ | Delete task |
| GET | `/api/boards/:id/activity` | ✓ | Activity log |
| GET | `/health` | — | Health check |

---

## WebSocket Events

| Event | Direction | Description |
|---|---|---|
| `board:join` | Client → Server | Join a board room |
| `board:online_users` | Server → Client | Current online users |
| `user:joined` | Server → Client | Someone joined the board |
| `task:created` | Bidirectional | New task broadcast |
| `task:moved` | Bidirectional | Task column change |
| `task:updated` | Bidirectional | Task field update |
| `task:deleted` | Bidirectional | Task removal |
| `cursor:move` | Bidirectional | Collaborative cursor position |

---

## Project Structure

```
collabboard/
├── server/
│   └── src/
│       ├── config/        # DB pool, logger, migrations
│       ├── controllers/   # Auth, board, task logic
│       ├── middleware/    # JWT auth, error handler
│       ├── routes/        # All API routes
│       ├── socket/        # WebSocket event handlers
│       └── index.js       # Server entry
└── client/
    └── src/
        ├── components/    # Layout, board, UI
        ├── context/       # Auth store (Zustand), Socket context
        ├── lib/           # Axios instance with token refresh
        ├── pages/         # Login, Register, Dashboard, Board
        └── App.jsx
```

---

## Author

**Akash Ms** — [GitHub](https://github.com/AkashMs24)

Built as a demonstration of production software engineering: real-time systems, event-driven architecture, JWT auth patterns, and scalable backend design.
