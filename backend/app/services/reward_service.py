"""
Reward Engine
=============
Propagates rewards up the referral chain to configurable depth.
Only valid for acyclic paths.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict
from datetime import datetime

from app.core.config import settings
from app.models.models import User, RewardLog
from app.services.dag_service import get_ancestors


BASE_REFERRAL_REWARD = 100.0  # Base reward in rupees


async def distribute_rewards(
    db: AsyncSession,
    referral_id: str,
    new_user_id: str,
    reward_percent: float = None,
    depth: int = None,
) -> List[Dict]:
    """
    Walk up the ancestor chain and distribute rewards.
    Returns list of reward distributions made.
    """
    if reward_percent is None:
        reward_percent = settings.REWARD_PERCENT
    if depth is None:
        depth = settings.REWARD_DEPTH

    ancestors = await get_ancestors(db, new_user_id, max_depth=depth)
    distributions = []
    
    for ancestor in ancestors:
        user_id = ancestor["user_id"]
        d = ancestor["depth"]
        
        # Reward decreases with depth: depth 1 = full %, depth 2 = half, etc.
        factor = 1.0 / d
        amount = round(BASE_REFERRAL_REWARD * (reward_percent / 100) * factor, 2)
        
        if amount <= 0:
            continue
        
        # Update user balance
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            user.reward_balance = round(user.reward_balance + amount, 2)
        
        # Log the reward
        log = RewardLog(
            user_id=user_id,
            source_referral_id=referral_id,
            amount=amount,
            depth_level=d,
        )
        db.add(log)
        distributions.append({
            "user_id": user_id,
            "amount": amount,
            "depth": d,
        })
    
    await db.commit()
    return distributions


async def simulate_rewards(
    db: AsyncSession,
    referrer_id: str,
    reward_percent: float,
    depth: int,
    num_referrals: int,
) -> Dict:
    """
    Bonus: Simulate projected reward cost without writing to DB.
    """
    ancestors = await get_ancestors(db, referrer_id, max_depth=depth)
    
    # Project for num_referrals new users
    total = 0.0
    breakdown = []
    
    for d in range(1, depth + 1):
        ancestors_at_depth = [a for a in ancestors if a["depth"] == d]
        count = len(ancestors_at_depth) or (1 if d == 1 else 0)
        
        factor = 1.0 / d
        per_referral = round(BASE_REFERRAL_REWARD * (reward_percent / 100) * factor, 2)
        subtotal = round(per_referral * count * num_referrals, 2)
        total += subtotal
        
        breakdown.append({
            "depth": d,
            "ancestors": count,
            "reward_per_referral": per_referral,
            "subtotal": subtotal,
        })
    
    return {
        "projected_cost": round(total, 2),
        "breakdown": breakdown,
    }
