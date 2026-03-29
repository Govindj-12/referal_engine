# Setup Guide

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- (Optional) Node.js 18+ and Python 3.11+ for local development without Docker

## Quick Start (Docker)

```bash
# Clone the repository
git clone <repo-url>
cd referral-engine

# Start all services
docker compose up --build
```

This will:
1. Start PostgreSQL 15 and Redis 7
2. Run database migrations (auto-creates tables on startup)
3. Seed demo data (users, referrals, fraud scenarios)
4. Start the FastAPI backend on port 8000
5. Build and serve the React dashboard
6. Start Nginx reverse proxy on port 80

## Local Development (Without Docker)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables (see docs/ENVIRONMENT.md)
export DATABASE_URL="postgresql+asyncpg://referral:referral_secret@localhost:5432/referral_engine"
export SYNC_DATABASE_URL="postgresql://referral:referral_secret@localhost:5432/referral_engine"
export REDIS_URL="redis://localhost:6379/0"

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The Vite dev server runs on `http://localhost:5173` by default.

### Database & Redis

If running locally, you still need PostgreSQL and Redis. You can start just those services via Docker:

```bash
docker compose up db redis
```

### Seeding Demo Data

```bash
cd backend
python seed.py
```

This creates sample users, referral chains, and fraud test scenarios.

## Verifying the Setup

| Check | Command / URL |
|-------|---------------|
| Backend health | `curl http://localhost:8000/health` |
| API docs | Open http://localhost:8000/docs |
| Dashboard | Open http://localhost |
| Database | `docker exec -it referral_db psql -U referral -d referral_engine` |
| Redis | `docker exec -it referral_redis redis-cli ping` |

## Troubleshooting

### Port conflicts

If port 80, 5432, or 8000 is in use, update the port mappings in `docker-compose.yml`.

### Database connection errors

Ensure PostgreSQL is healthy before the backend starts. Docker Compose healthchecks handle this automatically, but for local dev, verify PostgreSQL is running:

```bash
pg_isready -U referral -d referral_engine
```

### Frontend not loading

If behind Nginx, check `nginx/nginx.conf` for correct upstream configuration. For local dev, ensure the Vite proxy is configured to point to the backend.
