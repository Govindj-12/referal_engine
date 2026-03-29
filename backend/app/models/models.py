from sqlalchemy import (
    Column, String, Float, DateTime, Boolean, Text, Integer, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class UserStatus(str, enum.Enum):
    active = "active"
    flagged = "flagged"
    suspended = "suspended"


class FraudReason(str, enum.Enum):
    cycle = "cycle"
    self_referral = "self_referral"
    velocity_limit = "velocity_limit"
    duplicate = "duplicate"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    referrer_id = Column(String, ForeignKey("users.id"), nullable=True)
    reward_balance = Column(Float, default=0.0)
    status = Column(Enum(UserStatus), default=UserStatus.active)
    is_root = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    referrer = relationship("User", remote_side="User.id", foreign_keys=[referrer_id])
    referrals = relationship("Referral", foreign_keys="Referral.new_user_id", back_populates="new_user")
    received_referrals = relationship("Referral", foreign_keys="Referral.referrer_id", back_populates="referrer")
    reward_logs = relationship("RewardLog", foreign_keys="RewardLog.user_id", back_populates="user")
    fraud_flags = relationship("FraudFlag", foreign_keys="FraudFlag.user_id", back_populates="user")


class Referral(Base):
    __tablename__ = "referrals"

    id = Column(String, primary_key=True, default=gen_uuid)
    new_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    referrer_id = Column(String, ForeignKey("users.id"), nullable=False)
    is_valid = Column(Boolean, default=True)
    rejection_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # temporal expiry bonus

    new_user = relationship("User", foreign_keys=[new_user_id], back_populates="referrals")
    referrer = relationship("User", foreign_keys=[referrer_id], back_populates="received_referrals")


class RewardLog(Base):
    __tablename__ = "reward_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    source_referral_id = Column(String, ForeignKey("referrals.id"), nullable=False)
    amount = Column(Float, nullable=False)
    depth_level = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="reward_logs")


class FraudFlag(Base):
    __tablename__ = "fraud_flags"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    attempted_referrer_id = Column(String, nullable=True)
    reason = Column(Enum(FraudReason), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="fraud_flags")


class SecondaryEdge(Base):
    """Bonus: Hybrid graph - secondary non-reward edges"""
    __tablename__ = "secondary_edges"

    id = Column(String, primary_key=True, default=gen_uuid)
    from_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    to_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    edge_type = Column(String, default="referral_contact")
    created_at = Column(DateTime, default=datetime.utcnow)
