from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from datetime import datetime

class ModelTrainRequest(BaseModel):
    dataset_id: str
    project_id: Optional[str] = None
    name: str
    task_type: str  # regression, classification, clustering, time_series
    algorithm: str  # LinearRegression, RandomForestRegressor, DecisionTreeRegressor, GradientBoostingRegressor,
                    # LogisticRegression, RandomForestClassifier, DecisionTreeClassifier, GradientBoostingClassifier,
                    # KMeans, MovingAverage, ExponentialSmoothing, ARIMA
    target_column: Optional[str] = None
    feature_columns: list[str]
    test_size: float = 0.2
    hyperparameters: Optional[dict[str, Any]] = None

class ModelMetrics(BaseModel):
    model_config = ConfigDict(extra="allow", from_attributes=True)

    # Regression
    mae: Optional[float] = None
    mse: Optional[float] = None
    rmse: Optional[float] = None
    r2: Optional[float] = None
    
    # Classification
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    confusion_matrix: Optional[list[list[int]]] = None
    roc_auc: Optional[float] = None
    
    # Clustering
    silhouette_score: Optional[float] = None
    cluster_distribution: Optional[dict[str, int]] = None

    # Anomaly Detection
    anomaly_count: Optional[int] = None
    inlier_count: Optional[int] = None
    anomaly_rate: Optional[float] = None

    # Dimensionality Reduction
    explained_variance_ratio: Optional[list[float]] = None
    cumulative_variance: Optional[float] = None

class ModelDetailResponse(BaseModel):
    id: str
    dataset_id: str
    project_id: str
    name: str
    task_type: str
    algorithm: str
    target_column: Optional[str] = None
    feature_columns: list[str]
    metrics: ModelMetrics
    feature_importance: Optional[list[dict[str, Any]]] = None
    evaluation_chart_data: Optional[list[dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PredictRequest(BaseModel):
    model_id: str
    inputs: dict[str, Any]

class PredictResponse(BaseModel):
    model_id: str
    prediction: Any
    probabilities: Optional[dict[str, float]] = None

