from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class ModelTrainRequest(BaseModel):
    dataset_id: str
    project_id: str
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

