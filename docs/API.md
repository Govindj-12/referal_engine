# API Reference

Base URL: `http://localhost/api` (via Nginx) or `http://localhost:8000` (direct)

Interactive Swagger UI: http://localhost:8000/docs

---

## Referral

### POST /referral/claim

Claim a referral link — the core operation. Validates against fraud, checks for DAG cycles, and propagates rewards on success.

**Request Body:**

```json
{
  "new_user_id": "uuid-string",
  "referrer_id": "uuid-string",
  "expires_in_days": 30
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `new_user_id` | string (UUID) | Yes | The user being referred |
| `referrer_id` | string (UUID) | Yes | The referring user |
| `expires_in_days` | integer | No | Referral expiry in days (temporal expiry feature) |

**Response (201):**

```json
{
  "id": "uuid",
  "new_user_id": "uuid",
  "referrer_id": "uuid",
  "is_valid": true,
  "rejection_reason": null,
  "created_at": "2024-01-01T00:00:00Z",
  "expires_at": "2024-01-31T00:00:00Z"
}
```

**Error Responses:**

| Status | Reason |
|--------|--------|
| 400 | Self-referral detected |
| 400 | Cycle detected in referral graph |
| 400 | Duplicate referral |
| 429 | Velocity limit exceeded |

### POST /referral/simulate

Project reward costs without writing to the database.

**Request Body:**

```json
{
  "num_referrals": 100,
  "depth": 3,
  "reward_percent": 10
}
```

**Response (200):**

```json
{
  "total_cost": 1833.33,
  "breakdown": [
    { "depth": 1, "cost_per_referral": 10.0, "total": 1000.0 },
    { "depth": 2, "cost_per_referral": 5.0, "total": 500.0 },
    { "depth": 3, "cost_per_referral": 3.33, "total": 333.33 }
  ]
}
```

---

## Users

### POST /user

Create a new user.

**Request Body:**

```json
{
  "name": "Alice",
  "email": "alice@example.com"
}
```

### GET /user/{id}

Get user details including reward balance and status.

### GET /user/{id}/graph?depth=3

Get the DAG subgraph rooted at the given user, up to the specified depth.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `depth` | integer | 3 | Max traversal depth |

### GET /user/{id}/rewards

Get reward history for a user.

### GET /users

List all users.

---

## Fraud

### GET /fraud/flags

List all fraud flags with details.

**Response (200):**

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "attempted_referrer_id": "uuid",
    "reason": "self_referral",
    "details": "User attempted to refer themselves",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### GET /fraud/stats

Get fraud breakdown by reason.

**Response (200):**

```json
{
  "self_referral": 5,
  "velocity_limit": 12,
  "duplicate": 3
}
```

---

## Dashboard

### GET /dashboard/metrics

Aggregated system KPIs.

**Response (200):**

```json
{
  "total_users": 150,
  "total_referrals": 89,
  "valid_referrals": 75,
  "rejected_referrals": 14,
  "total_rewards_distributed": 1250.00,
  "total_fraud_flags": 20,
  "active_users": 120
}
```

### GET /dashboard/activity

Recent activity feed.

### GET /dashboard/referrals

All referrals with joined user details. Supports filtering.

---

## WebSocket

### WS /ws

Real-time event stream. See [WEBSOCKET.md](WEBSOCKET.md) for protocol details.

---

## Health

### GET /health

```json
{
  "status": "ok",
  "service": "referral-engine"
}
```
