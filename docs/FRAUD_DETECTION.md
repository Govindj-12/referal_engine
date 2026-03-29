# Fraud Detection

The referral engine implements three fraud prevention mechanisms, all evaluated before cycle detection on every `POST /referral/claim` request.

## 1. Self-Referral Detection

**Check:** `new_user_id == referrer_id`

The simplest fraud vector — a user attempting to refer themselves. Caught immediately with a string comparison.

**Result:** Referral rejected, `FraudFlag` created with reason `self_referral`, user status set to `flagged`.

## 2. Velocity Limiting

**Check:** Redis-backed rate counter per referrer.

Prevents a single referrer from creating an abnormally high number of referrals in a short window, which is a common pattern in bot-driven fraud.

**How it works:**
1. On each claim, increment a Redis key: `velocity:{referrer_id}`
2. Key has a TTL of `VELOCITY_WINDOW` seconds (default: 60)
3. If count exceeds `VELOCITY_LIMIT` (default: 5), reject the referral

**Configuration:**

| Variable | Default | Description |
|----------|---------|-------------|
| `VELOCITY_LIMIT` | `5` | Max referrals per window |
| `VELOCITY_WINDOW` | `60` | Window duration in seconds |

**Result:** Referral rejected, `FraudFlag` created with reason `velocity_limit`.

## 3. Duplicate Detection

**Check:** SQL query for existing `(new_user_id, referrer_id)` pair.

Prevents the same referral from being claimed twice, whether by replay attacks or UI bugs.

**Result:** Referral rejected, `FraudFlag` created with reason `duplicate`.

## Processing Order

```
1. Self-referral check       → O(1)
2. Velocity limit check      → O(1) Redis lookup
3. Duplicate detection       → O(1) SQL index lookup
4. DAG cycle detection       → O(V+E) graph traversal
5. Commit referral + rewards → DB write
```

Fraud checks are ordered cheapest-first to reject bad requests as early as possible.

## Fraud Flag Schema

Every detected fraud attempt creates a persistent record:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "attempted_referrer_id": "uuid",
  "reason": "self_referral | velocity_limit | duplicate",
  "details": "Human-readable explanation",
  "created_at": "timestamp"
}
```

## Monitoring

- **Dashboard panel:** The React dashboard includes a fraud monitoring panel with reason breakdown charts.
- **API endpoints:**
  - `GET /fraud/flags` — all fraud flags
  - `GET /fraud/stats` — count breakdown by reason
- **Real-time:** Fraud events are broadcast via WebSocket to the dashboard immediately.

## User Flagging

When fraud is detected, the offending user's status is set to `flagged`. Flagged users appear in the dashboard for review. Currently, flagging is informational — flagged users can still operate. For production, consider adding:

- Automatic blocking of flagged users after N violations
- Manual review queue with approve/block actions
- IP-based rate limiting alongside user-based limits
