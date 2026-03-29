"""
Fraud Detection Service
========================
Implements:
1. Self-referral detection
2. Velocity limit (X referrals/min via Redis)
3. Mock duplicate detection (same email pattern)
"""
import time
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.core.redis_client import get_redis
from app.models.models import Referral, FraudFlag, FraudReason, User


async def check_self_referral(new_user_id: str, referrer_id: str) -> bool:
    """True if self-referral attempt."""
    return new_user_id == referrer_id


async def check_velocity_limit(referrer_id: str) -> Tuple[bool, int]:
    """
    True if referrer has exceeded velocity limit within window.
    Returns (exceeded, current_count).
    """
    redis = await get_redis()
    key = f"velocity:{referrer_id}"
    
    pipe = redis.pipeline()
    await pipe.incr(key)
    await pipe.expire(key, settings.VELOCITY_WINDOW)
    results = await pipe.execute()
    
    current_count = results[0]
    return current_count > settings.VELOCITY_LIMIT, current_count


async def check_duplicate(
    db: AsyncSession, new_user_id: str, referrer_id: str
) -> bool:
    """True if same pair has already been referred (duplicate)."""
    result = await db.execute(
        select(Referral).where(
            Referral.new_user_id == new_user_id,
            Referral.referrer_id == referrer_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def log_fraud(
    db: AsyncSession,
    user_id: str,
    reason: FraudReason,
    attempted_referrer_id: Optional[str] = None,
    details: Optional[str] = None,
):
    """Record a fraud flag."""
    flag = FraudFlag(
        user_id=user_id,
        attempted_referrer_id=attempted_referrer_id,
        reason=reason,
        details=details,
    )
    db.add(flag)
    await db.commit()
    return flag


async def flag_user_as_fraud(db: AsyncSession, user_id: str):
    """Update user status to flagged."""
    from app.models.models import UserStatus
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        user.status = UserStatus.flagged
        await db.commit()
