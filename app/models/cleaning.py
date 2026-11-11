import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

class CleaningJob(Base):
    __tablename__ = "cleaning_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    cleaned_dataset_id = Column(String(36), ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="pending", nullable=False)  # pending, approved, applied, rejected
    operations_json = Column(Text, nullable=False)  # list of proposed operations
    before_stats_json = Column(Text, nullable=True)
    after_stats_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    dataset = relationship("Dataset", foreign_keys=[dataset_id], back_populates="cleaning_jobs")
    cleaned_dataset = relationship("Dataset", foreign_keys=[cleaned_dataset_id])

