"""
POST /referral/claim   — claim a referral (with cycle detection)
GET  /referral/simulate — bonus simulation tool
"""
import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.websocket_manager import manager
from app.models.models import User, Referral, FraudReason, UserStatus
from app.schemas.schemas import ReferralClaimRequest, ReferralOut, SimulationRequest, SimulationResult
from app.services.dag_service import would_create_cycle
from app.services.fraud_service import (
    check_self_referral,
    check_velocity_limit,
    check_duplicate,
    log_fraud,
    flag_user_as_fraud,
)
from app.services.reward_service import distribute_rewards, simulate_rewards

router = APIRouter()


@router.post("/claim", response_model=dict, summary="Claim a referral")
async def claim_referral(
    body: ReferralClaimRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Core endpoint. Enforces:
    1. Self-referral check
    2. Velocity limit check
    3. Duplicate check
    4. DAG cycle detection (< 100ms target)
    5. Reward propagation if valid
    """
    t_start = time.perf_counter()

    # ── Validate both users exist ─────────────────────────────────────────────
    new_user_res = await db.execute(select(User).where(User.id == body.new_user_id))
    new_user = new_user_res.scalar_one_or_none()
    if not new_user:
        raise HTTPException(404, f"User {body.new_user_id} not found")

    referrer_res = await db.execute(select(User).where(User.id == body.referrer_id))
    referrer = referrer_res.scalar_one_or_none()
    if not referrer:
        raise HTTPException(404, f"Referrer {body.referrer_id} not found")

    # ── Fraud Check 1: Self-referral ──────────────────────────────────────────
    if await check_self_referral(body.new_user_id, body.referrer_id):
        await log_fraud(
            db, body.new_user_id, FraudReason.self_referral,
            attempted_referrer_id=body.referrer_id,
            details="User attempted to refer themselves"
        )
        await flag_user_as_fraud(db, body.new_user_id)
        await manager.broadcast("fraud", {
            "reason": "self_referral",
            "user_id": body.new_user_id,
            "message": f"Self-referral blocked for user {new_user.name}"
        })
        elapsed = round((time.perf_counter() - t_start) * 1000, 2)
        return {
            "success": False,
            "reason": "self_referral",
            "message": "Self-referral is not allowed",
            "user_assigned_as_root": True,
            "response_time_ms": elapsed,
        }

    # ── Fraud Check 2: Velocity limit ─────────────────────────────────────────
    exceeded, count = await check_velocity_limit(body.referrer_id)
    if exceeded:
        await log_fraud(
            db, body.referrer_id, FraudReason.velocity_limit,
            attempted_referrer_id=body.new_user_id,
            details=f"Referral velocity exceeded: {count} in window"
        )
        await manager.broadcast("fraud", {
            "reason": "velocity_limit",
            "user_id": body.referrer_id,
            "message": f"Velocity limit exceeded by {referrer.name}"
        })
        elapsed = round((time.perf_counter() - t_start) * 1000, 2)
        return {
            "success": False,
            "reason": "velocity_limit",
            "message": f"Referrer has exceeded rate limit ({count} referrals in window)",
            "response_time_ms": elapsed,
        }

    # ── Fraud Check 3: Duplicate ──────────────────────────────────────────────
    if await check_duplicate(db, body.new_user_id, body.referrer_id):
        await log_fraud(
            db, body.new_user_id, FraudReason.duplicate,
            attempted_referrer_id=body.referrer_id,
            details="Duplicate referral attempt"
        )
        elapsed = round((time.perf_counter() - t_start) * 1000, 2)
        return {
            "success": False,
            "reason": "duplicate",
            "message": "This referral already exists",
            "response_time_ms": elapsed,
        }

    # ── Core: DAG Cycle Detection ─────────────────────────────────────────────
    has_cycle = await would_create_cycle(db, body.new_user_id, body.referrer_id)
    elapsed_cycle = round((time.perf_counter() - t_start) * 1000, 2)

    if has_cycle:
        # Record rejected referral
        rejected = Referral(
            new_user_id=body.new_user_id,
            referrer_id=body.referrer_id,
            is_valid=False,
            rejection_reason="cycle_detected",
        )
        db.add(rejected)
        
        # Flag as fraud
        await log_fraud(
            db, body.new_user_id, FraudReason.cycle,
            attempted_referrer_id=body.referrer_id,
            details=f"Cycle detected: {body.new_user_id} → {body.referrer_id} would create cycle"
        )
        await flag_user_as_fraud(db, body.new_user_id)
        
        # Assign as root
        new_user.is_root = True
        new_user.referrer_id = None
        await db.commit()

        await manager.broadcast("cycle_prevented", {
            "new_user_id": body.new_user_id,
            "referrer_id": body.referrer_id,
            "message": f"Cycle prevented: {new_user.name} → {referrer.name}",
            "detection_time_ms": elapsed_cycle
        })

        return {
            "success": False,
            "reason": "cycle_detected",
            "message": f"Cycle detected! Edge rejected. User assigned as root node.",
            "user_assigned_as_root": True,
            "detection_time_ms": elapsed_cycle,
        }

    # ── Valid: Commit edge ────────────────────────────────────────────────────
    expires_at = None
    if body.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=body.expires_in_days)

    referral = Referral(
        new_user_id=body.new_user_id,
        referrer_id=body.referrer_id,
        is_valid=True,
        expires_at=expires_at,
    )
    db.add(referral)
    new_user.referrer_id = body.referrer_id
    await db.flush()

    # ── Distribute rewards ────────────────────────────────────────────────────
    rewards = await distribute_rewards(db, referral.id, body.new_user_id)

    await manager.broadcast("referral_created", {
        "new_user": new_user.name,
        "referrer": referrer.name,
        "new_user_id": body.new_user_id,
        "referrer_id": body.referrer_id,
        "rewards_distributed": len(rewards),
        "message": f"User {new_user.name} referred by {referrer.name}"
    })

    elapsed = round((time.perf_counter() - t_start) * 1000, 2)

    return {
        "success": True,
        "referral_id": referral.id,
        "message": "Referral claimed successfully",
        "rewards_distributed": rewards,
        "response_time_ms": elapsed,
        "detection_time_ms": elapsed_cycle,
    }


@router.post("/simulate", response_model=SimulationResult, summary="Simulate reward cost")
async def simulate_reward_cost(
    body: SimulationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Bonus: Project reward cost for a given rule set without committing."""
    result = await simulate_rewards(
        db,
        referrer_id=body.referrer_id,
        reward_percent=body.reward_percent,
        depth=body.depth,
        num_referrals=body.num_referrals,
    )
    return result
