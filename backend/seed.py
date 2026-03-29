"""
Seed script — creates a realistic referral tree + fraud scenarios.
Run automatically on container start (idempotent).
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, text
import os, uuid
from datetime import datetime, timedelta

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://referral:referral_secret@db:5432/referral_engine",
)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Import models AFTER engine is created
import sys
sys.path.insert(0, "/app")
from app.core.database import Base
from app.models.models import User, Referral, RewardLog, FraudFlag, FraudReason, UserStatus


async def seed():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        count = (await db.execute(select(User))).scalars().first()
        if count:
            print("✅ Already seeded, skipping.")
            return

        print("🌱 Seeding database...")

        # ── Root users ─────────────────────────────────────────────────────
        root1 = User(id=str(uuid.uuid4()), name="Alice Root", email="alice@demo.com",
                     is_root=True, reward_balance=0, status=UserStatus.active)
        root2 = User(id=str(uuid.uuid4()), name="Bob Root", email="bob@demo.com",
                     is_root=True, reward_balance=0, status=UserStatus.active)
        db.add_all([root1, root2])
        await db.flush()

        # ── Level 1 ────────────────────────────────────────────────────────
        c1 = User(id=str(uuid.uuid4()), name="Carol", email="carol@demo.com",
                  referrer_id=root1.id, reward_balance=10.0)
        c2 = User(id=str(uuid.uuid4()), name="Dave", email="dave@demo.com",
                  referrer_id=root1.id, reward_balance=10.0)
        c3 = User(id=str(uuid.uuid4()), name="Eve", email="eve@demo.com",
                  referrer_id=root2.id, reward_balance=10.0)
        db.add_all([c1, c2, c3])
        await db.flush()

        # ── Level 2 ────────────────────────────────────────────────────────
        gc1 = User(id=str(uuid.uuid4()), name="Frank", email="frank@demo.com",
                   referrer_id=c1.id, reward_balance=5.0)
        gc2 = User(id=str(uuid.uuid4()), name="Grace", email="grace@demo.com",
                   referrer_id=c1.id, reward_balance=5.0)
        gc3 = User(id=str(uuid.uuid4()), name="Heidi", email="heidi@demo.com",
                   referrer_id=c2.id, reward_balance=5.0)
        gc4 = User(id=str(uuid.uuid4()), name="Ivan", email="ivan@demo.com",
                   referrer_id=c3.id, reward_balance=5.0)
        db.add_all([gc1, gc2, gc3, gc4])
        await db.flush()

        # ── Level 3 ────────────────────────────────────────────────────────
        ggc1 = User(id=str(uuid.uuid4()), name="Judy", email="judy@demo.com",
                    referrer_id=gc1.id, reward_balance=2.5)
        ggc2 = User(id=str(uuid.uuid4()), name="Karl", email="karl@demo.com",
                    referrer_id=gc2.id, reward_balance=2.5)
        ggc3 = User(id=str(uuid.uuid4()), name="Laura", email="laura@demo.com",
                    referrer_id=gc3.id, reward_balance=2.5)
        db.add_all([ggc1, ggc2, ggc3])
        await db.flush()

        # ── Valid referral edges ────────────────────────────────────────────
        ref_pairs = [
            (c1, root1), (c2, root1), (c3, root2),
            (gc1, c1), (gc2, c1), (gc3, c2), (gc4, c3),
            (ggc1, gc1), (ggc2, gc2), (ggc3, gc3),
        ]
        referrals = {}
        for child, parent in ref_pairs:
            ref = Referral(
                new_user_id=child.id, referrer_id=parent.id,
                is_valid=True,
                created_at=datetime.utcnow() - timedelta(days=10),
            )
            db.add(ref)
            referrals[(child.id, parent.id)] = ref
        await db.flush()

        # ── Reward logs ────────────────────────────────────────────────────
        # Use actual referral IDs that correspond to each reward
        ref_c1 = referrals[(c1.id, root1.id)].id       # c1 referred by root1
        ref_c3 = referrals[(c3.id, root2.id)].id       # c3 referred by root2
        ref_gc1 = referrals[(gc1.id, c1.id)].id        # gc1 referred by c1
        ref_gc3 = referrals[(gc3.id, c2.id)].id        # gc3 referred by c2
        ref_gc4 = referrals[(gc4.id, c3.id)].id        # gc4 referred by c3
        for u, depth, amt, ref_id in [
            (root1, 1, 10.0, ref_c1), (root1, 2, 5.0, ref_gc1), (root1, 3, 2.5, ref_gc3),
            (root2, 1, 10.0, ref_c3), (c1, 1, 10.0, ref_gc1), (c1, 2, 5.0, ref_gc3),
            (c2, 1, 10.0, ref_gc3), (c3, 1, 10.0, ref_gc4),
        ]:
            db.add(RewardLog(
                user_id=u.id, source_referral_id=ref_id,
                amount=amt, depth_level=depth,
                created_at=datetime.utcnow() - timedelta(days=8),
            ))

        # ── Fraud scenarios ────────────────────────────────────────────────
        # Flagged user
        bad_user = User(id=str(uuid.uuid4()), name="Mallory Fraudster",
                        email="mallory@demo.com", is_root=True,
                        status=UserStatus.flagged, reward_balance=0)
        db.add(bad_user)
        await db.flush()

        # Rejected referral (cycle attempt)
        db.add(Referral(
            new_user_id=bad_user.id, referrer_id=root1.id,
            is_valid=False, rejection_reason="cycle_detected",
            created_at=datetime.utcnow() - timedelta(hours=2),
        ))

        # Fraud flags
        db.add(FraudFlag(
            user_id=bad_user.id, attempted_referrer_id=root1.id,
            reason=FraudReason.cycle,
            details="Cycle detected: mallory → alice → carol → mallory",
            created_at=datetime.utcnow() - timedelta(hours=2),
        ))
        db.add(FraudFlag(
            user_id=bad_user.id, attempted_referrer_id=bad_user.id,
            reason=FraudReason.self_referral,
            details="User attempted to refer themselves",
            created_at=datetime.utcnow() - timedelta(hours=1),
        ))
        db.add(FraudFlag(
            user_id=c2.id, attempted_referrer_id=root1.id,
            reason=FraudReason.velocity_limit,
            details="Referral velocity exceeded: 8 in window",
            created_at=datetime.utcnow() - timedelta(minutes=30),
        ))

        await db.commit()
        print(f"✅ Seeded: 2 roots, 10 users, fraud scenarios, reward logs.")


if __name__ == "__main__":
    asyncio.run(seed())
