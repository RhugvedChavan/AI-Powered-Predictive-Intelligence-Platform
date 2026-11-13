import os
import uuid
import json
import pandas as pd
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.dataset import Dataset, DatasetColumn
from app.models.cleaning import CleaningJob
from app.models.activity import ActivityLog
from app.schemas.cleaning import (
    CleaningAnalysisResponse, CleaningApplyRequest, CleaningJobResponse, CleaningOperation, AutoCleanRequest
)
from app.cleaning.engine import DataCleaningEngine
from app.analytics.profiler import profile_dataframe

router = APIRouter(prefix="/cleaning", tags=["Data Cleaning"])

def load_dataset_df(dataset: Dataset) -> pd.DataFrame:
    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset source file not found on disk.")
    ext = os.path.splitext(dataset.file_path)[1].lower()
    if ext == ".csv":
        return pd.read_csv(dataset.file_path)
    elif ext in (".xlsx", ".xls"):
        return pd.read_excel(dataset.file_path)
    else:
        return pd.read_csv(dataset.file_path)

@router.post("/analyze", response_model=CleaningAnalysisResponse)
def analyze_dataset_cleaning(
    dataset_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    df = load_dataset_df(dataset)
    quality_summary, recommendations = DataCleaningEngine.analyze_dataset(df)
    
    return {
        "dataset_id": dataset.id,
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "duplicate_rows_count": quality_summary["duplicate_rows"],
        "missing_cells_count": quality_summary["total_missing_cells"],
        "recommendations": recommendations,
        "column_quality_summary": quality_summary["columns"]
    }

@router.post("/preview")
def preview_cleaning_operations(
    req: CleaningApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    df = load_dataset_df(dataset)
    ops_dicts = [op.model_dump() for op in req.operations]
    
    cleaned_df, before_stats, after_stats = DataCleaningEngine.apply_operations(df, ops_dicts)
    
    sample_preview = cleaned_df.head(20).to_dict(orient="records")
    clean_sample = []
    for row in sample_preview:
        clean_row = {}
        for k, v in row.items():
            if pd.isna(v):
                clean_row[k] = None
            elif isinstance(v, (int, float, str, bool)):
                clean_row[k] = v
            else:
                clean_row[k] = str(v)
        clean_sample.append(clean_row)

    return {
        "dataset_id": dataset.id,
        "before_stats": before_stats,
        "after_stats": after_stats,
        "sample_preview": clean_sample
    }

@router.post("/apply", response_model=CleaningJobResponse)
def apply_cleaning_operations(
    req: CleaningApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    df = load_dataset_df(dataset)
    ops_dicts = [op.model_dump() for op in req.operations]
    
    cleaned_df, before_stats, after_stats = DataCleaningEngine.apply_operations(df, ops_dicts)
    
    # Save cleaned dataset separately to preserve original
    new_dataset_id = str(uuid.uuid4())
    cleaned_filename = f"{new_dataset_id}_cleaned_{dataset.original_filename}.csv"
    cleaned_path = str(settings.PROCESSED_DIR / cleaned_filename)
    cleaned_df.to_csv(cleaned_path, index=False)
    
    # Profile cleaned dataset
    overall_summary, column_profiles = profile_dataframe(cleaned_df)
    
    new_name = req.new_dataset_name or f"{dataset.name} (Cleaned)"
    cleaned_dataset = Dataset(
        id=new_dataset_id,
        project_id=dataset.project_id,
        user_id=current_user.id,
        name=new_name,
        original_filename=cleaned_filename,
        file_type="csv",
        file_path=cleaned_path,
        row_count=overall_summary["total_rows"],
        col_count=overall_summary["total_columns"],
        file_size_bytes=os.path.getsize(cleaned_path),
        summary_json=json.dumps(overall_summary),
        is_cleaned=True,
        parent_dataset_id=dataset.id
    )
    db.add(cleaned_dataset)
    db.commit()
    
    for col_info in column_profiles:
        col_rec = DatasetColumn(
            dataset_id=cleaned_dataset.id,
            name=col_info["name"],
            data_type=col_info["data_type"],
            raw_type=col_info["raw_type"],
            null_count=col_info["null_count"],
            unique_count=col_info["unique_count"],
            sample_values_json=json.dumps(col_info["sample_values"]),
            stats_json=json.dumps(col_info["stats"])
        )
        db.add(col_rec)

    # Create cleaning job record
    cleaning_job = CleaningJob(
        id=str(uuid.uuid4()),
        dataset_id=dataset.id,
        cleaned_dataset_id=cleaned_dataset.id,
        status="applied",
        operations_json=json.dumps(ops_dicts),
        before_stats_json=json.dumps(before_stats),
        after_stats_json=json.dumps(after_stats)
    )
    db.add(cleaning_job)

    # Activity log
    log = ActivityLog(
        user_id=current_user.id,
        action="clean",
        entity_type="dataset",
        entity_id=cleaned_dataset.id,
        details_json=json.dumps({
            "parent_id": dataset.id,
            "cleaned_id": cleaned_dataset.id,
            "operations_count": len(ops_dicts),
            "rows_before": before_stats["row_count"],
            "rows_after": after_stats["row_count"]
        })
    )
    db.add(log)
    db.commit()
    db.refresh(cleaning_job)

    return {
        "id": cleaning_job.id,
        "dataset_id": cleaning_job.dataset_id,
        "cleaned_dataset_id": cleaning_job.cleaned_dataset_id,
        "status": cleaning_job.status,
        "operations": json.loads(cleaning_job.operations_json),
        "before_stats": json.loads(cleaning_job.before_stats_json),
        "after_stats": json.loads(cleaning_job.after_stats_json),
        "created_at": cleaning_job.created_at
    }

@router.post("/auto-clean", response_model=CleaningJobResponse)
def auto_clean_dataset(
    req: AutoCleanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    df = load_dataset_df(dataset)
    cleaned_df, applied_ops, before_stats, after_stats = DataCleaningEngine.auto_clean_dataframe(df)
    
    new_dataset_id = str(uuid.uuid4())
    cleaned_filename = f"{new_dataset_id}_autocleaned_{dataset.original_filename}.csv"
    cleaned_path = str(settings.PROCESSED_DIR / cleaned_filename)
    cleaned_df.to_csv(cleaned_path, index=False)
    
    overall_summary, column_profiles = profile_dataframe(cleaned_df)
    
    new_name = req.new_dataset_name or f"{dataset.name} (Auto-Cleaned)"
    cleaned_dataset = Dataset(
        id=new_dataset_id,
        project_id=dataset.project_id,
        user_id=current_user.id,
        name=new_name,
        original_filename=cleaned_filename,
        file_type="csv",
        file_path=cleaned_path,
        row_count=overall_summary["total_rows"],
        col_count=overall_summary["total_columns"],
        file_size_bytes=os.path.getsize(cleaned_path),
        summary_json=json.dumps(overall_summary),
        is_cleaned=True,
        parent_dataset_id=dataset.id
    )
    db.add(cleaned_dataset)
    db.commit()
    
    for col_info in column_profiles:
        col_rec = DatasetColumn(
            dataset_id=cleaned_dataset.id,
            name=col_info["name"],
            data_type=col_info["data_type"],
            raw_type=col_info["raw_type"],
            null_count=col_info["null_count"],
            unique_count=col_info["unique_count"],
            sample_values_json=json.dumps(col_info["sample_values"]),
            stats_json=json.dumps(col_info["stats"])
        )
        db.add(col_rec)

    cleaning_job = CleaningJob(
        id=str(uuid.uuid4()),
        dataset_id=dataset.id,
        cleaned_dataset_id=cleaned_dataset.id,
        status="applied",
        operations_json=json.dumps(applied_ops),
        before_stats_json=json.dumps(before_stats),
        after_stats_json=json.dumps(after_stats)
    )
    db.add(cleaning_job)

    log = ActivityLog(
        user_id=current_user.id,
        action="auto_clean",
        entity_type="dataset",
        entity_id=cleaned_dataset.id,
        details_json=json.dumps({
            "parent_id": dataset.id,
            "cleaned_id": cleaned_dataset.id,
            "operations_count": len(applied_ops),
            "rows_before": before_stats["row_count"],
            "rows_after": after_stats["row_count"]
        })
    )
    db.add(log)
    db.commit()
    db.refresh(cleaning_job)

    return {
        "id": cleaning_job.id,
        "dataset_id": cleaning_job.dataset_id,
        "cleaned_dataset_id": cleaning_job.cleaned_dataset_id,
        "status": cleaning_job.status,
        "operations": json.loads(cleaning_job.operations_json),
        "before_stats": json.loads(cleaning_job.before_stats_json),
        "after_stats": json.loads(cleaning_job.after_stats_json),
        "created_at": cleaning_job.created_at
    }

@router.get("/history", response_model=list[CleaningJobResponse])
def get_cleaning_history(
    dataset_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CleaningJob).join(Dataset, CleaningJob.dataset_id == Dataset.id).filter(Dataset.user_id == current_user.id)
    if dataset_id and isinstance(dataset_id, str):
        query = query.filter(CleaningJob.dataset_id == dataset_id)
    jobs = query.order_by(CleaningJob.created_at.desc()).all()
    
    results = []
    for j in jobs:
        results.append({
            "id": j.id,
            "dataset_id": j.dataset_id,
            "cleaned_dataset_id": j.cleaned_dataset_id,
            "status": j.status,
            "operations": json.loads(j.operations_json) if j.operations_json else [],
            "before_stats": json.loads(j.before_stats_json) if j.before_stats_json else {},
            "after_stats": json.loads(j.after_stats_json) if j.after_stats_json else {},
            "created_at": j.created_at
        })
    return results
