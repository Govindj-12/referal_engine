# Contributing

## Development Setup

See [SETUP.md](SETUP.md) for getting your local environment running.

## Project Structure

```
referral-engine/
├── backend/
│   ├── app/
│   │   ├── api/            # Route handlers (referral, users, fraud, dashboard)
│   │   ├── core/           # Config, database, Redis, WebSocket manager
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   └── services/       # Business logic (DAG, fraud, rewards)
│   ├── seed.py             # Demo data seeder
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page-level components
│   │   └── utils/          # Helper functions
│   ├── package.json
│   └── Dockerfile
├── nginx/
│   └── nginx.conf
├── docs/                   # Project documentation
└── docker-compose.yml
```

## Code Style

### Backend (Python)
- Follow PEP 8
- Use type hints for function signatures
- Async/await for all database and Redis operations
- Business logic goes in `services/`, not in route handlers

### Frontend (React)
- Functional components with hooks
- Axios for API calls
- D3 for graph visualization, Recharts for charts

## Making Changes

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature
   ```

2. Make your changes and test locally:
   ```bash
   docker compose up --build
   ```

3. Verify the dashboard works and API endpoints respond correctly.

4. Commit with a clear message:
   ```bash
   git commit -m "Add: description of what you added"
   ```

5. Push and open a pull request against `main`.

## Commit Message Convention

Use a prefix to categorize changes:

| Prefix | Usage |
|--------|-------|
| `Add:` | New features |
| `Fix:` | Bug fixes |
| `Update:` | Enhancements to existing features |
| `Refactor:` | Code restructuring without behavior change |
| `Docs:` | Documentation changes |
| `Chore:` | Build, tooling, dependency updates |

## Adding a New API Endpoint

1. Add the route handler in `backend/app/api/`
2. Add request/response schemas in `backend/app/schemas/schemas.py`
3. Add business logic in `backend/app/services/`
4. Update the API docs in `docs/API.md`

## Adding a New Dashboard Panel

1. Create the component in `frontend/src/components/`
2. Add it to the appropriate page in `frontend/src/pages/`
3. If it needs data, add an API call using the patterns in `frontend/src/utils/`
