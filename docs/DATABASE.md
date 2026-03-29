# Database Schema

PostgreSQL 15 with SQLAlchemy async ORM. Tables are auto-created on application startup via `Base.metadata.create_all`.

## Tables

### users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique user identifier |
| `name` | VARCHAR | NOT NULL | Display name |
| `email` | VARCHAR | UNIQUE, NOT NULL | User email |
| `referrer_id` | UUID | FK → users.id, NULL | Direct referrer (self-reference) |
| `reward_balance` | DECIMAL | DEFAULT 0 | Accumulated reward balance |
| `status` | VARCHAR | DEFAULT 'active' | User status: `active`, `flagged` |
| `is_root` | BOOLEAN | DEFAULT false | True if user has no referrer (root node in DAG) |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |

### referrals

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique referral identifier |
| `new_user_id` | UUID | FK → users.id, NOT NULL | The referred user |
| `referrer_id` | UUID | FK → users.id, NOT NULL | The referring user |
| `is_valid` | BOOLEAN | DEFAULT true | Whether referral passed validation |
| `rejection_reason` | VARCHAR | NULL | Reason if rejected (cycle, fraud, etc.) |
| `expires_at` | TIMESTAMP | NULL | Temporal expiry timestamp |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |

### reward_logs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique log identifier |
| `user_id` | UUID | FK → users.id, NOT NULL | User who received the reward |
| `source_referral_id` | UUID | FK → referrals.id, NOT NULL | The referral that triggered this reward |
| `amount` | DECIMAL | NOT NULL | Reward amount |
| `depth_level` | INTEGER | NOT NULL | Level in the referral chain (1, 2, 3...) |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |

### fraud_flags

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique flag identifier |
| `user_id` | UUID | FK → users.id, NOT NULL | Flagged user |
| `attempted_referrer_id` | UUID | FK → users.id, NOT NULL | The referrer in the fraudulent attempt |
| `reason` | VARCHAR | NOT NULL | Fraud type: `self_referral`, `velocity_limit`, `duplicate` |
| `details` | TEXT | NULL | Human-readable description |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |

### secondary_edges (Hybrid Graph)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique edge identifier |
| `from_user_id` | UUID | FK → users.id, NOT NULL | Source user |
| `to_user_id` | UUID | FK → users.id, NOT NULL | Target user |
| `edge_type` | VARCHAR | NOT NULL | Type of secondary relationship |
| `created_at` | TIMESTAMP | DEFAULT now() | Creation timestamp |

## Entity Relationships

```
users 1──────* referrals     (as referrer_id)
users 1──────* referrals     (as new_user_id)
users 1──────* reward_logs   (as user_id)
users 1──────* fraud_flags   (as user_id)
users 1──────1 users         (self-ref via referrer_id)
referrals 1──* reward_logs   (as source_referral_id)
users 1──────* secondary_edges (as from/to_user_id)
```

## DAG Constraint

The referral graph forms a Directed Acyclic Graph (DAG). This is enforced at the application level using NetworkX rather than as a database constraint. Every `POST /referral/claim` request rebuilds the graph from valid referral edges and checks acyclicity before committing.

## Migrations

Tables are auto-created via SQLAlchemy's `Base.metadata.create_all` on application startup. For production use with schema changes, consider adding [Alembic](https://alembic.sqlalchemy.org/) migrations:

```bash
# Initialize Alembic (one-time)
cd backend
alembic init alembic

# Generate a migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

Alembic is already included in `requirements.txt`.
