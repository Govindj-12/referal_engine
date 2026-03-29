from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from app.core.database import engine, Base
from app.api import referral, users, fraud, dashboard
from app.core.websocket_manager import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Cycle-Safe Referral Engine",
    description="A DAG-based referral system with real-time cycle detection and fraud prevention.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(referral.router, prefix="/referral", tags=["Referral"])
app.include_router(users.router, prefix="/user", tags=["Users"])
app.include_router(fraud.router, prefix="/fraud", tags=["Fraud"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])

from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(30)
            await websocket.send_text('{"type":"ping"}')
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "referral-engine"}
