import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    task_type = Column(String(50), nullable=False)  # regression, classification, clustering, time_series
    algorithm = Column(String(100), nullable=False)
    target_column = Column(String(255), nullable=True)
    feature_columns_json = Column(Text, nullable=False)
    hyperparams_json = Column(Text, nullable=True)
    metrics_json = Column(Text, nullable=False)  # metrics (MAE, RMSE, R2 or Acc, F1, etc.)
    feature_importance_json = Column(Text, nullable=True)
    evaluation_chart_data_json = Column(Text, nullable=True)  # actual vs predicted, confusion matrix, etc.
    artifact_path = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    dataset = relationship("Dataset", back_populates="models")
    predictions = relationship("PredictionRecord", back_populates="model", cascade="all, delete-orphan")

class PredictionRecord(Base):
    __tablename__ = "predictions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_id = Column(String(36), ForeignKey("ml_models.id", ondelete="CASCADE"), nullable=False, index=True)
    inputs_json = Column(Text, nullable=False)
    prediction_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    model = relationship("MLModel", back_populates="predictions")

