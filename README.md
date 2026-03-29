# 🚀 Cycle-Safe Referral Engine

A production-grade DAG-based referral system with real-time cycle detection, fraud prevention, reward propagation, and a live React dashboard — all in Docker.

## Quick Start

```bash
docker compose up --build
```

That's it. Everything starts automatically:
- Seeds demo data (users, referrals, fraud scenarios)
- Starts backend API on port 8000
- Builds and serves the React dashboard
- Nginx reverse proxy on port 80

### Access

| Service   | URL                          |
|-----------|------------------------------|
| Dashboard | http://localhost             |
| API docs  | http://localhost:8000/docs   |
| Backend   | http://localhost/api         |

---

## Features

### ✅ DAG Cycle Detection (<100ms)
- Uses NetworkX DiGraph + `is_directed_acyclic_graph()` check
- Detects multi-hop cycles: A→B→C→A
- Rejected users assigned as root nodes automatically

### ✅ Fraud Detection
1. **Self-referral** — immediate reject
2. **Velocity limit** — Redis-backed rate limiting per referrer
3. **Duplicate detection** — SQL dedup check

### ✅ Reward Engine
- Propagates rewards up to 3 levels (configurable)
- Depth-decayed amounts (L1=10%, L2=5%, L3=3.3% of base ₹100)
- Full audit log in `reward_logs` table

### ✅ Dashboard
- Key metrics panel (7 KPIs)
- D3 force-directed graph viewer with depth control
- Fraud monitoring panel with reason breakdown
- Activity feed (DB + live WebSocket events)
- Referrals table with filters
- Users panel with reward history
- Reward simulator (bonus)
- Claim interface for live testing

### ✅ Bonus Features
- Hybrid graph mode (secondary non-reward edges)
- Temporal expiry on referrals
- Simulation tool with cost projection chart
- Real-time WebSocket event stream

---

## Environment Variables

| Variable        | Default | Description                    |
|-----------------|---------|--------------------------------|
| REWARD_DEPTH    | 3       | Max levels for reward propagation |
| REWARD_PERCENT  | 10      | Base reward percentage          |
| VELOCITY_LIMIT  | 5       | Max referrals per window        |
| VELOCITY_WINDOW | 60      | Rate limit window (seconds)     |

---

## API Quick Reference

```bash
# Claim a referral
curl -X POST http://localhost/api/referral/claim \
  -H "Content-Type: application/json" \
  -d '{"new_user_id": "...", "referrer_id": "..."}'

# Get user graph
curl http://localhost/api/user/{id}/graph?depth=3

# Dashboard metrics
curl http://localhost/api/dashboard/metrics

# Fraud flags
curl http://localhost/api/fraud/flags
```

Full interactive docs: http://localhost:8000/docs
