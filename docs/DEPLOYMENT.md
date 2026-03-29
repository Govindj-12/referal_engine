# Deployment Guide

## Docker Compose (Recommended)

The included `docker-compose.yml` is production-ready with minor adjustments.

### Pre-flight Checklist

1. **Change default credentials:**
   ```yaml
   # docker-compose.yml
   POSTGRES_PASSWORD: <strong-password>
   SECRET_KEY: <random-secret>
   ```

2. **Set appropriate resource limits:**
   ```yaml
   backend:
     deploy:
       resources:
         limits:
           cpus: '1.0'
           memory: 512M
   ```

3. **Configure CORS for your domain:**
   Update `allow_origins` in `backend/app/main.py` from `["*"]` to your actual domain(s).

4. **Enable HTTPS:**
   Update `nginx/nginx.conf` with SSL certificates. Consider using Let's Encrypt with certbot.

### Starting

```bash
docker compose up -d --build
```

### Stopping

```bash
docker compose down
```

To also remove persistent data (database volume):

```bash
docker compose down -v
```

## Environment Configuration

See [ENVIRONMENT.md](ENVIRONMENT.md) for all configurable variables.

For production, consider:

| Variable | Production Recommendation |
|----------|---------------------------|
| `VELOCITY_LIMIT` | Tune based on expected legitimate usage patterns |
| `VELOCITY_WINDOW` | Increase to 300s+ for stricter rate limiting |
| `REWARD_DEPTH` | Keep at 3 unless business rules require more |

## Health Monitoring

### Health Check Endpoint

```bash
curl http://your-domain/api/health
# {"status": "ok", "service": "referral-engine"}
```

### Docker Health Checks

PostgreSQL and Redis have built-in health checks in `docker-compose.yml`. The backend waits for both to be healthy before starting.

## Scaling Considerations

### Database
- Add connection pooling (PgBouncer) for high concurrency
- Add read replicas for dashboard/reporting queries
- Index `referrals(new_user_id, referrer_id)` for duplicate detection performance

### Redis
- Redis Sentinel or Redis Cluster for high availability
- Separate Redis instances for velocity limiting vs. caching

### Backend
- Run multiple backend instances behind Nginx with `upstream` load balancing
- The DAG cycle detection rebuilds the graph per-request — for very large graphs, consider caching the NetworkX graph in memory and updating incrementally

### Frontend
- The built React app is static files served by Nginx — scales trivially via CDN

## Backup & Recovery

### Database Backup

```bash
# Manual backup
docker exec referral_db pg_dump -U referral referral_engine > backup.sql

# Restore
docker exec -i referral_db psql -U referral referral_engine < backup.sql
```

### Data Volume

The PostgreSQL data is persisted in the `pg_data` Docker volume. Back up this volume for disaster recovery.

## Logging

- Backend logs to stdout (captured by Docker)
- View logs: `docker compose logs -f backend`
- Consider forwarding to a log aggregator (ELK, Datadog, etc.) for production
