import os
import json
import pandas as pd
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.schemas.eda import EDASummaryResponse, DescriptiveStat
from app.analytics.profiler import profile_dataframe, compute_correlation_matrix, recommend_visualizations
from app.api.cleaning import load_dataset_df

router = APIRouter(prefix="/analysis", tags=["Exploratory Data Analysis"])

@router.post("/profile", response_model=EDASummaryResponse)
def get_eda_profile(
    dataset_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    df = load_dataset_df(dataset)
    overall_summary, column_profiles = profile_dataframe(df)
    correlations = compute_correlation_matrix(df)
    recommended_charts = recommend_visualizations(df, column_profiles)
    
    missing_matrix = {c["name"]: c["null_count"] for c in column_profiles}
    
    stats_list = []
    for c in column_profiles:
        st = c["stats"]
        stats_list.append(DescriptiveStat(
            column=c["name"],
            data_type=c["data_type"],
            count=overall_summary["total_rows"],
            missing=c["null_count"],
            missing_pct=st.get("null_pct", 0.0),
            unique=c["unique_count"],
            mean=st.get("mean"),
            std=st.get("std"),
            min=st.get("min"),
            q25=st.get("q25"),
            median=st.get("median"),
            q75=st.get("q75"),
            max=st.get("max"),
            skewness=st.get("skewness"),
            kurtosis=st.get("kurtosis"),
            top_values=st.get("top_categories")
        ))

    return {
        "dataset_id": dataset.id,
        "row_count": overall_summary["total_rows"],
        "col_count": overall_summary["total_columns"],
        "statistics": stats_list,
        "correlations": correlations,
        "missing_matrix": missing_matrix,
        "recommended_charts": recommended_charts
    }

@router.post("/correlation")
def get_correlation(
    dataset_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    df = load_dataset_df(dataset)
    corr = compute_correlation_matrix(df)
    return {"dataset_id": dataset.id, "correlations": corr}

@router.post("/charts")
def get_recommended_charts(
    dataset_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    df = load_dataset_df(dataset)
    overall_summary, column_profiles = profile_dataframe(df)
    recommended_charts = recommend_visualizations(df, column_profiles)
    return {"dataset_id": dataset.id, "charts": recommended_charts}

