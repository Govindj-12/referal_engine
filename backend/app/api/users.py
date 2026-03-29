"""
GET  /user/{id}         — get user details
GET  /user/{id}/graph   — get referral graph for user
GET  /user/{id}/rewards — get reward history
POST /user              — create a user
GET  /users             — list all users
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import User, RewardLog
from app.schemas.schemas import UserCreate, UserOut, UserGraph, GraphNode, GraphEdge, RewardLogOut
from app.services.dag_service import get_user_subgraph

router = APIRouter()


@router.post("", response_model=UserOut, summary="Create a user")
async def create_user(body: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")
    
    user = User(
        name=body.name,
        email=body.email,
        referrer_id=body.referrer_id,
        is_root=(body.referrer_id is None),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("s", response_model=list[UserOut], summary="List all users")
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserOut, summary="Get user by ID")
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.get("/{user_id}/graph", response_model=UserGraph, summary="Get referral graph for user")
async def get_user_graph(user_id: str, depth: int = 3, db: AsyncSession = Depends(get_db)):
    node_ids, edges = await get_user_subgraph(db, user_id, depth=depth)
    
    if not node_ids:
        # Return just the user if no edges
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(404, "User not found")
        node_ids = [user_id]
    
    # Fetch user details for all nodes
    result = await db.execute(select(User).where(User.id.in_(node_ids)))
    users = {u.id: u for u in result.scalars().all()}
    
    nodes = [
        GraphNode(
            id=uid,
            name=users[uid].name if uid in users else "Unknown",
            email=users[uid].email if uid in users else "",
            status=users[uid].status if uid in users else "active",
            reward_balance=users[uid].reward_balance if uid in users else 0,
            is_root=users[uid].is_root if uid in users else False,
        )
        for uid in node_ids
        if uid in users
    ]
    
    graph_edges = [
        GraphEdge(source=src, target=tgt, edge_type="primary")
        for src, tgt in edges
    ]
    
    return UserGraph(nodes=nodes, edges=graph_edges)


@router.get("/{user_id}/rewards", response_model=list[RewardLogOut], summary="Get reward history")
async def get_user_rewards(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RewardLog)
        .where(RewardLog.user_id == user_id)
        .order_by(RewardLog.created_at.desc())
    )
    return result.scalars().all()
