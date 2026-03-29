# Cycle-Safe Referral Engine

A production-grade DAG-based referral system with real-time cycle detection, fraud prevention, reward propagation, and a live React dashboard — all in Docker.

## Quick Start

```bash
docker compose up --build
```

| Service   | URL                        |
|-----------|----------------------------|
| Dashboard | http://localhost           |
| API Docs  | http://localhost:8000/docs |
| Backend   | http://localhost/api       |

## Documentation

All project documentation lives in the [`docs/`](docs/) folder:

| Document | Description |
|----------|-------------|
| [README](docs/README.md) | Full project overview and feature list |
| [Architecture](docs/ARCHITECTURE.md) | System design, stack, data model, and algorithms |
| [Setup Guide](docs/SETUP.md) | Local development setup and Docker configuration |
| [API Reference](docs/API.md) | Complete API endpoint documentation with examples |
| [Environment Variables](docs/ENVIRONMENT.md) | All configurable env vars and their defaults |
| [Database Schema](docs/DATABASE.md) | Tables, relationships, and migration notes |
| [Fraud Detection](docs/FRAUD_DETECTION.md) | Deep dive into fraud prevention mechanisms |
| [WebSocket Events](docs/WEBSOCKET.md) | Real-time event stream protocol and usage |
| [Deployment](docs/DEPLOYMENT.md) | Production deployment guide |
| [Contributing](docs/CONTRIBUTING.md) | Contribution guidelines and development workflow |

## License

MIT
