import os
import uuid
import json
import joblib
import pandas as pd
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.models.ml import MLModel, PredictionRecord
from app.models.activity import ActivityLog
from app.schemas.ml import (
    ModelTrainRequest, ModelDetailResponse, PredictRequest, PredictResponse
)
from app.ml.engine import MLEngine
from app.api.cleaning import load_dataset_df

router = APIRouter(prefix="/ml", tags=["Predictive Machine Learning Studio"])

@router.post("/train", response_model=ModelDetailResponse)
def train_model(
    req: ModelTrainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    df = load_dataset_df(dataset)
    
    # Validate feature columns exist in dataset
    missing_feats = [col for col in req.feature_columns if col not in df.columns]
    if missing_feats:
        raise HTTPException(
            status_code=400, 
            detail=f"Feature columns not found in dataset: {', '.join(missing_feats)}"
        )

    model_id = str(uuid.uuid4())
    artifact_filename = f"{model_id}_{req.algorithm}.joblib"
    artifact_path = str(settings.MODELS_DIR / artifact_filename)

    try:
        if req.task_type == "regression":
            if not req.target_column or req.target_column not in df.columns:
                raise ValueError("Valid target_column required for regression.")
            result = MLEngine.train_regression(
                df, req.target_column, req.feature_columns, req.algorithm, test_size=req.test_size
            )
        elif req.task_type == "classification":
            if not req.target_column or req.target_column not in df.columns:
                raise ValueError("Valid target_column required for classification.")
            result = MLEngine.train_classification(
                df, req.target_column, req.feature_columns, req.algorithm, test_size=req.test_size
            )
        elif req.task_type == "clustering":
            result = MLEngine.train_clustering(df, req.feature_columns)
        elif req.task_type == "time_series":
            date_col = next((c for c in df.columns if pd.api.types.is_datetime64_any_dtype(df[c]) or "date" in c.lower()), req.feature_columns[0])
            target_col = req.target_column or req.feature_columns[-1]
            result = MLEngine.train_forecasting(df, target_col, date_col, req.algorithm)
        else:
            raise ValueError(f"Unsupported task_type '{req.task_type}'")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Model training failed: {str(e)}")

    # Save model artifact
    save_bundle = {
        "model": result["model"],
        "encoders": result["encoders"],
        "task_type": req.task_type,
        "algorithm": req.algorithm,
        "feature_columns": req.feature_columns,
        "target_column": req.target_column
    }
    joblib.dump(save_bundle, artifact_path)

    # Save MLModel record
    ml_model = MLModel(
        id=model_id,
        dataset_id=dataset.id,
        project_id=req.project_id or dataset.project_id,
        user_id=current_user.id,
        name=req.name,
        task_type=req.task_type,
        algorithm=req.algorithm,
        target_column=req.target_column,
        feature_columns_json=json.dumps(req.feature_columns),
        hyperparams_json=json.dumps(req.hyperparameters or {}),
        metrics_json=json.dumps(result["metrics"]),
        feature_importance_json=json.dumps(result.get("feature_importance", [])),
        evaluation_chart_data_json=json.dumps(result.get("evaluation_chart_data", [])),
        artifact_path=artifact_path
    )
    db.add(ml_model)

    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        action="train_model",
        entity_type="model",
        entity_id=ml_model.id,
        details_json=json.dumps({
            "name": ml_model.name,
            "algorithm": ml_model.algorithm,
            "task_type": ml_model.task_type,
            "metrics": result["metrics"]
        })
    )
    db.add(log)
    db.commit()
    db.refresh(ml_model)

    return {
        "id": ml_model.id,
        "dataset_id": ml_model.dataset_id,
        "project_id": ml_model.project_id,
        "name": ml_model.name,
        "task_type": ml_model.task_type,
        "algorithm": ml_model.algorithm,
        "target_column": ml_model.target_column,
        "feature_columns": json.loads(ml_model.feature_columns_json),
        "metrics": json.loads(ml_model.metrics_json),
        "feature_importance": json.loads(ml_model.feature_importance_json) if ml_model.feature_importance_json else [],
        "evaluation_chart_data": json.loads(ml_model.evaluation_chart_data_json) if ml_model.evaluation_chart_data_json else [],
        "created_at": ml_model.created_at
    }

@router.get("/models", response_model=list[ModelDetailResponse])
def list_models(
    dataset_id: Optional[str] = Query(None),
    task_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MLModel).filter(MLModel.user_id == current_user.id)
    if dataset_id and isinstance(dataset_id, str):
        query = query.filter(MLModel.dataset_id == dataset_id)
    if task_type and isinstance(task_type, str):
        query = query.filter(MLModel.task_type == task_type)
        
    models = query.order_by(MLModel.created_at.desc()).all()
    res = []
    for m in models:
        res.append({
            "id": m.id,
            "dataset_id": m.dataset_id,
            "project_id": m.project_id,
            "name": m.name,
            "task_type": m.task_type,
            "algorithm": m.algorithm,
            "target_column": m.target_column,
            "feature_columns": json.loads(m.feature_columns_json) if m.feature_columns_json else [],
            "metrics": json.loads(m.metrics_json) if m.metrics_json else {},
            "feature_importance": json.loads(m.feature_importance_json) if m.feature_importance_json else [],
            "evaluation_chart_data": json.loads(m.evaluation_chart_data_json) if m.evaluation_chart_data_json else [],
            "created_at": m.created_at
        })
    return res

@router.get("/models/{model_id}", response_model=ModelDetailResponse)
def get_model(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    m = db.query(MLModel).filter(MLModel.id == model_id, MLModel.user_id == current_user.id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")
        
    return {
        "id": m.id,
        "dataset_id": m.dataset_id,
        "project_id": m.project_id,
        "name": m.name,
        "task_type": m.task_type,
        "algorithm": m.algorithm,
        "target_column": m.target_column,
        "feature_columns": json.loads(m.feature_columns_json) if m.feature_columns_json else [],
        "metrics": json.loads(m.metrics_json) if m.metrics_json else {},
        "feature_importance": json.loads(m.feature_importance_json) if m.feature_importance_json else [],
        "evaluation_chart_data": json.loads(m.evaluation_chart_data_json) if m.evaluation_chart_data_json else [],
        "created_at": m.created_at
    }

@router.post("/predict", response_model=PredictResponse)
def predict(
    req: PredictRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    m = db.query(MLModel).filter(MLModel.id == req.model_id, MLModel.user_id == current_user.id).first()
    if not m or not os.path.exists(m.artifact_path):
        raise HTTPException(status_code=404, detail="Model or artifact not found")
        
    bundle = joblib.load(m.artifact_path)
    model = bundle["model"]
    encoders = bundle["encoders"]
    feature_cols = bundle["feature_columns"]
    task_type = bundle["task_type"]

    X = MLEngine.transform_single_input(req.inputs, encoders, feature_cols)
    
    probabilities = None
    if task_type == "regression":
        pred_val = float(model.predict(X)[0])
        pred_output = round(pred_val, 4)
    elif task_type == "classification":
        pred_idx = model.predict(X)[0]
        target_encoder = encoders.get("_target_encoder")
        if target_encoder:
            pred_output = str(target_encoder.inverse_transform([pred_idx])[0])
        else:
            pred_output = str(pred_idx)
            
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X)[0]
            classes = encoders.get("_target_classes", [str(i) for i in range(len(probs))])
            probabilities = {classes[i]: round(float(p), 4) for i, p in enumerate(probs)}
    elif task_type == "clustering":
        cluster_id = int(model.predict(X)[0])
        pred_output = f"Cluster {cluster_id}"
    else:
        pred_output = "Forecasting model output evaluated."

    # Save prediction history
    pred_rec = PredictionRecord(
        id=str(uuid.uuid4()),
        model_id=m.id,
        inputs_json=json.dumps(req.inputs),
        prediction_json=json.dumps(pred_output)
    )
    db.add(pred_rec)
    db.commit()

    return {
        "model_id": m.id,
        "prediction": pred_output,
        "probabilities": probabilities
    }

@router.get("/models/{model_id}/download")
def download_model(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    m = db.query(MLModel).filter(MLModel.id == model_id, MLModel.user_id == current_user.id).first()
    if not m or not os.path.exists(m.artifact_path):
        raise HTTPException(status_code=404, detail="Model artifact not found")
        
    return FileResponse(
        path=m.artifact_path,
        filename=os.path.basename(m.artifact_path),
        media_type="application/octet-stream"
    )
