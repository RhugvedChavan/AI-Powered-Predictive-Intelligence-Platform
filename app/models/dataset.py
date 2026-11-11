import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # csv, xlsx, xls, sqlite, duckdb
    file_path = Column(String(500), nullable=False)
    row_count = Column(Integer, default=0, nullable=False)
    col_count = Column(Integer, default=0, nullable=False)
    file_size_bytes = Column(Integer, default=0, nullable=False)
    summary_json = Column(Text, nullable=True)  # Stores JSON profile summary
    is_cleaned = Column(Boolean, default=False, nullable=False)
    parent_dataset_id = Column(String(36), ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    project = relationship("Project", back_populates="datasets")
    user = relationship("User", back_populates="datasets")
    columns = relationship("DatasetColumn", back_populates="dataset", cascade="all, delete-orphan")
    cleaning_jobs = relationship("CleaningJob", back_populates="dataset", foreign_keys="CleaningJob.dataset_id", cascade="all, delete-orphan")
    models = relationship("MLModel", back_populates="dataset", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="dataset", cascade="all, delete-orphan")

class DatasetColumn(Base):
    __tablename__ = "dataset_columns"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    data_type = Column(String(50), nullable=False)  # numerical, categorical, datetime, text, boolean
    raw_type = Column(String(50), nullable=False)   # int64, float64, object, datetime64, etc.
    null_count = Column(Integer, default=0, nullable=False)
    unique_count = Column(Integer, default=0, nullable=False)
    sample_values_json = Column(Text, nullable=True)
    stats_json = Column(Text, nullable=True)  # min, max, mean, std, quartiles, top_categories

    dataset = relationship("Dataset", back_populates="columns")

