"""
GET /fraud/flags — list all fraud flags with details
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.models import FraudFlag, User
from app.schemas.schemas import FraudFlagOut

router = APIRouter()


@router.get("/flags", response_model=list[FraudFlagOut], summary="List fraud flags")
async def get_fraud_flags(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FraudFlag)
        .order_by(FraudFlag.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/stats", summary="Fraud statistics")
async def get_fraud_stats(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FraudFlag.reason, func.count(FraudFlag.id))
        .group_by(FraudFlag.reason)
    )
    rows = result.fetchall()
    return {reason: count for reason, count in rows}
