"""
GET /dashboard/metrics — aggregate system metrics
GET /dashboard/activity — recent activity feed
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.core.database import get_db
from app.models.models import User, Referral, FraudFlag, RewardLog
from app.schemas.schemas import DashboardMetrics

router = APIRouter()


@router.get("/metrics", response_model=DashboardMetrics, summary="System dashboard metrics")
async def get_dashboard_metrics(db: AsyncSession = Depends(get_db)):
    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    total_referrals = (await db.execute(select(func.count(Referral.id)))).scalar()
    valid_referrals = (await db.execute(
        select(func.count(Referral.id)).where(Referral.is_valid == True)
    )).scalar()
    rejected_referrals = (await db.execute(
        select(func.count(Referral.id)).where(Referral.is_valid == False)
    )).scalar()
    fraud_attempts = (await db.execute(select(func.count(FraudFlag.id)))).scalar()
    total_rewards = (await db.execute(select(func.coalesce(func.sum(RewardLog.amount), 0.0)))).scalar()
    root_users = (await db.execute(
        select(func.count(User.id)).where(User.is_root == True)
    )).scalar()

    return DashboardMetrics(
        total_users=total_users or 0,
        total_referrals=total_referrals or 0,
        valid_referrals=valid_referrals or 0,
        rejected_referrals=rejected_referrals or 0,
        fraud_attempts=fraud_attempts or 0,
        total_rewards_distributed=float(total_rewards or 0),
        root_users=root_users or 0,
    )


@router.get("/activity", summary="Recent activity feed")
async def get_activity(limit: int = 20, db: AsyncSession = Depends(get_db)):
    """Recent referrals + fraud flags merged and sorted by time."""
    referrals_res = await db.execute(
        select(Referral, User.name.label("new_name"), )
        .join(User, User.id == Referral.new_user_id)
        .order_by(Referral.created_at.desc())
        .limit(limit)
    )

    events = []
    for row in referrals_res:
        r = row[0]
        events.append({
            "id": r.id,
            "type": "referral_valid" if r.is_valid else "referral_rejected",
            "new_user_id": r.new_user_id,
            "referrer_id": r.referrer_id,
            "is_valid": r.is_valid,
            "reason": r.rejection_reason,
            "timestamp": r.created_at.isoformat(),
        })

    fraud_res = await db.execute(
        select(FraudFlag)
        .order_by(FraudFlag.created_at.desc())
        .limit(limit)
    )
    for ff in fraud_res.scalars():
        events.append({
            "id": ff.id,
            "type": "fraud_detected",
            "user_id": ff.user_id,
            "attempted_referrer_id": ff.attempted_referrer_id,
            "reason": ff.reason,
            "details": ff.details,
            "timestamp": ff.created_at.isoformat(),
        })

    # Sort by timestamp desc
    events.sort(key=lambda x: x["timestamp"], reverse=True)
    return events[:limit]


@router.get("/referrals", summary="All referrals with user info")
async def get_all_referrals(limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Referral).order_by(Referral.created_at.desc()).limit(limit)
    )
    referrals = result.scalars().all()
    
    # Collect all user ids
    user_ids = set()
    for r in referrals:
        user_ids.add(r.new_user_id)
        user_ids.add(r.referrer_id)
    
    users_res = await db.execute(select(User).where(User.id.in_(user_ids)))
    users = {u.id: u for u in users_res.scalars()}
    
    output = []
    for r in referrals:
        new_u = users.get(r.new_user_id)
        ref_u = users.get(r.referrer_id)
        output.append({
            "id": r.id,
            "new_user_id": r.new_user_id,
            "new_user_name": new_u.name if new_u else "Unknown",
            "referrer_id": r.referrer_id,
            "referrer_name": ref_u.name if ref_u else "Unknown",
            "is_valid": r.is_valid,
            "rejection_reason": r.rejection_reason,
            "created_at": r.created_at.isoformat(),
            "expires_at": r.expires_at.isoformat() if r.expires_at else None,
        })
    return output
