# Environment Variables

All environment variables and their defaults. Set these in `docker-compose.yml` or export them for local development.

## Application

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | — | Application secret key for signing |

## Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | Async PostgreSQL connection string (`postgresql+asyncpg://...`) |
| `SYNC_DATABASE_URL` | — | Sync PostgreSQL connection string (`postgresql://...`) — used by seed scripts |

**Docker Compose default:**
```
DATABASE_URL=postgresql+asyncpg://referral:referral_secret@db:5432/referral_engine
SYNC_DATABASE_URL=postgresql://referral:referral_secret@db:5432/referral_engine
```

## Redis

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL for velocity limiting |

## Reward Engine

| Variable | Default | Description |
|----------|---------|-------------|
| `REWARD_DEPTH` | `3` | Maximum levels for reward propagation up the referral chain |
| `REWARD_PERCENT` | `10` | Base reward percentage applied at each level |

**Reward calculation:**
- Level 1: `base × (REWARD_PERCENT / 100) × (1/1)` = 10% of ₹100 = ₹10
- Level 2: `base × (REWARD_PERCENT / 100) × (1/2)` = 5% of ₹100 = ₹5
- Level 3: `base × (REWARD_PERCENT / 100) × (1/3)` = 3.33% of ₹100 = ₹3.33

## Fraud Prevention

| Variable | Default | Description |
|----------|---------|-------------|
| `VELOCITY_LIMIT` | `5` | Maximum referrals a single user can make within the rate window |
| `VELOCITY_WINDOW` | `60` | Rate limit window in seconds |

## PostgreSQL (Docker)

These are set on the `db` service in `docker-compose.yml`:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `referral` | Database user |
| `POSTGRES_PASSWORD` | `referral_secret` | Database password |
| `POSTGRES_DB` | `referral_engine` | Database name |
