from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── User ──────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: str
    referrer_id: Optional[str] = None


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    referrer_id: Optional[str]
    reward_balance: float
    status: str
    is_root: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Referral ──────────────────────────────────────────────────────────────────
class ReferralClaimRequest(BaseModel):
    new_user_id: str
    referrer_id: str
    expires_in_days: Optional[int] = None  # bonus temporal expiry


class ReferralOut(BaseModel):
    id: str
    new_user_id: str
    referrer_id: str
    is_valid: bool
    rejection_reason: Optional[str]
    created_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Reward ────────────────────────────────────────────────────────────────────
class RewardLogOut(BaseModel):
    id: str
    user_id: str
    source_referral_id: str
    amount: float
    depth_level: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Fraud ─────────────────────────────────────────────────────────────────────
class FraudFlagOut(BaseModel):
    id: str
    user_id: str
    attempted_referrer_id: Optional[str]
    reason: str
    details: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Dashboard ─────────────────────────────────────────────────────────────────
class DashboardMetrics(BaseModel):
    total_users: int
    total_referrals: int
    valid_referrals: int
    rejected_referrals: int
    fraud_attempts: int
    total_rewards_distributed: float
    root_users: int


# ── Graph ─────────────────────────────────────────────────────────────────────
class GraphNode(BaseModel):
    id: str
    name: str
    email: str
    status: str
    reward_balance: float
    is_root: bool


class GraphEdge(BaseModel):
    source: str
    target: str
    edge_type: str = "primary"


class UserGraph(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


# ── Simulation (Bonus) ────────────────────────────────────────────────────────
class SimulationRequest(BaseModel):
    referrer_id: str
    reward_percent: float = 10.0
    depth: int = 3
    num_referrals: int = 5


class SimulationResult(BaseModel):
    projected_cost: float
    breakdown: List[dict]
