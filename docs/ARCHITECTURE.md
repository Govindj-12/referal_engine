# Architecture Note — Cycle-Safe Referral Engine

## Overview

A backend-heavy, DAG-enforced referral system with real-time fraud detection and a React dashboard.

---

## Stack

| Layer      | Technology                    |
|------------|-------------------------------|
| Backend    | FastAPI (Python 3.11)         |
| Database   | PostgreSQL 15 (via SQLAlchemy async) |
| Cache      | Redis 7 (velocity limiting)   |
| Graph      | NetworkX (DAG operations)     |
| Frontend   | React 18 + Vite + D3 + Recharts |
| Proxy      | Nginx                         |
| Container  | Docker Compose                |

---

## Core: DAG Cycle Detection

**Algorithm**: Incremental DAG validation using NetworkX.

On each `POST /referral/claim`:
1. Load all valid referral edges from PostgreSQL → build `nx.DiGraph`
2. Tentatively add the proposed edge `(new_user → referrer)`
3. Call `nx.is_directed_acyclic_graph(G)` — O(V+E) DFS
4. If result is False → cycle exists → reject
5. If True → commit edge to DB and propagate rewards

**Why this works**: A cycle A→B→C→A is detected because adding C→A when A→B→C already exists makes the graph non-DAG. NetworkX's Kahn/DFS implementation handles multi-hop cycles correctly.

**Performance**: Targeting <100ms. For large graphs, this can be optimised further with incremental ancestor-reachability caching via Redis.

---

## Fraud Detection

Three mechanisms, all checked before cycle detection:

1. **Self-referral**: `new_user_id == referrer_id` — immediate reject
2. **Velocity limit**: Redis INCR + EXPIRE per referrer ID. Configurable `VELOCITY_LIMIT` and `VELOCITY_WINDOW` env vars
3. **Duplicate detection**: SQL query for existing `(new_user_id, referrer_id)` pair

Any fraud attempt:
- Creates a `FraudFlag` record with reason + details
- Sets user `status = flagged`
- Broadcasts via WebSocket to dashboard

---

## Reward Engine

- Base reward: ₹100 per referral event
- Propagation: up to `REWARD_DEPTH` levels (default: 3)
- Amount decay: `base × (reward_percent/100) × (1/depth)`
  - Level 1: 10% of ₹100 = ₹10
  - Level 2: 5% of ₹100 = ₹5
  - Level 3: 3.33% of ₹100 = ₹3.33
- All logged to `reward_logs` table

---

## Data Model

```
users          — id, name, email, referrer_id (FK self), reward_balance, status, is_root
referrals      — id, new_user_id, referrer_id, is_valid, rejection_reason, expires_at
reward_logs    — id, user_id, source_referral_id, amount, depth_level
fraud_flags    — id, user_id, attempted_referrer_id, reason, details
secondary_edges — id, from_user_id, to_user_id, edge_type  (hybrid graph bonus)
```

---

## API Endpoints

| Method | Path                      | Description                       |
|--------|---------------------------|-----------------------------------|
| POST   | /referral/claim           | Claim referral (core)             |
| POST   | /referral/simulate        | Project reward cost (bonus)       |
| GET    | /user/{id}                | Get user details                  |
| GET    | /user/{id}/graph          | Get DAG subgraph for user         |
| GET    | /user/{id}/rewards        | Reward history                    |
| POST   | /user                     | Create user                       |
| GET    | /users                    | List all users                    |
| GET    | /fraud/flags              | All fraud flags                   |
| GET    | /fraud/stats              | Fraud breakdown by reason         |
| GET    | /dashboard/metrics        | Aggregated system metrics         |
| GET    | /dashboard/activity       | Recent activity feed              |
| GET    | /dashboard/referrals      | All referrals with user details   |
| WS     | /ws                       | Real-time event stream            |

Swagger UI: `http://localhost:8000/docs`

---

## Bonus Features Implemented

- ✅ **Hybrid Graph Mode** — `secondary_edges` table for non-reward edges
- ✅ **Temporal Expiry** — `expires_in_days` param on `/referral/claim`, stored as `expires_at`
- ✅ **Simulation Tool** — `POST /referral/simulate` projects cost without DB writes
- ✅ **Real-Time Updates** — WebSocket `/ws` broadcasts all events; dashboard polls + listens

---

## Running

```bash
docker compose up --build
```

- Dashboard:  http://localhost (port 80)
- API:        http://localhost/api
- Swagger:    http://localhost:8000/docs
- DB:         localhost:5432
