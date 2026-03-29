# WebSocket Events

The referral engine provides a real-time event stream via WebSocket at `ws://localhost/ws` (via Nginx) or `ws://localhost:8000/ws` (direct).

## Connecting

```javascript
const ws = new WebSocket('ws://localhost/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.type, data);
};
```

## Keep-Alive

The server sends a ping every 30 seconds:

```json
{ "type": "ping" }
```

Clients should handle this silently or respond with a pong if needed.

## Event Types

### referral_claimed

Fired when a referral is successfully claimed and committed.

```json
{
  "type": "referral_claimed",
  "referral_id": "uuid",
  "new_user_id": "uuid",
  "referrer_id": "uuid",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### referral_rejected

Fired when a referral is rejected due to cycle detection or fraud.

```json
{
  "type": "referral_rejected",
  "new_user_id": "uuid",
  "referrer_id": "uuid",
  "reason": "cycle_detected | self_referral | velocity_limit | duplicate",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### fraud_detected

Fired when a fraud flag is created.

```json
{
  "type": "fraud_detected",
  "user_id": "uuid",
  "reason": "self_referral | velocity_limit | duplicate",
  "details": "description",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### reward_distributed

Fired when rewards are propagated up the referral chain.

```json
{
  "type": "reward_distributed",
  "user_id": "uuid",
  "amount": 10.0,
  "depth_level": 1,
  "source_referral_id": "uuid",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Dashboard Integration

The React dashboard uses WebSocket events to:
- Update the activity feed in real-time
- Refresh fraud monitoring counters
- Animate new nodes/edges in the D3 graph viewer
- Flash KPI changes on the metrics panel

## Connection Management

The backend uses a `WebSocketManager` class that:
- Tracks all active connections
- Broadcasts events to all connected clients
- Handles disconnections gracefully
- Runs in the same async event loop as FastAPI
