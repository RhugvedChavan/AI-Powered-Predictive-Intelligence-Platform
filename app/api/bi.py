import os
import uuid
import json
import pandas as pd
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.models.bi import BIDashboard
from app.models.activity import ActivityLog
from app.schemas.bi import (
    DashboardCreateRequest, DashboardResponse, KPISummaryResponse, KPIDefinition
)
from app.bi.engine import BIEngine
from app.api.cleaning import load_dataset_df

router = APIRouter(prefix="/bi", tags=["Business Intelligence"])

@router.get("/kpis", response_model=KPISummaryResponse)
def get_dataset_kpis(
    dataset_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    df = load_dataset_df(dataset)
    kpis = BIEngine.discover_kpis(df)
    
    return {
        "dataset_id": dataset.id,
        "suggested_kpis": [KPIDefinition(**k) for k in kpis]
    }

@router.post("/dashboards", response_model=DashboardResponse)
def create_dashboard(
    req: DashboardCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    # If no charts or KPIs supplied, automatically generate them
    if not req.kpis or not req.charts:
        df = load_dataset_df(dataset)
        default_dash = BIEngine.generate_default_dashboard(df, req.name)
        kpis_data = req.kpis or default_dash["kpis"]
        charts_data = req.charts or default_dash["charts"]
    else:
        kpis_data = req.kpis
        charts_data = req.charts

    dashboard = BIDashboard(
        id=str(uuid.uuid4()),
        project_id=req.project_id or dataset.project_id,
        dataset_id=dataset.id,
        user_id=current_user.id,
        name=req.name,
        description=req.description,
        kpis_json=json.dumps(kpis_data),
        charts_json=json.dumps(charts_data),
        layout_json=json.dumps(req.layout or {"columns": 3})
    )
    db.add(dashboard)
    
    # Activity log
    log = ActivityLog(
        user_id=current_user.id,
        action="create_dashboard",
        entity_type="dashboard",
        entity_id=dashboard.id,
        details_json=json.dumps({"name": dashboard.name, "dataset_id": dataset.id})
    )
    db.add(log)
    db.commit()
    db.refresh(dashboard)

    return {
        "id": dashboard.id,
        "project_id": dashboard.project_id,
        "dataset_id": dashboard.dataset_id,
        "name": dashboard.name,
        "description": dashboard.description,
        "kpis": json.loads(dashboard.kpis_json) if dashboard.kpis_json else [],
        "charts": json.loads(dashboard.charts_json) if dashboard.charts_json else [],
        "layout": json.loads(dashboard.layout_json) if dashboard.layout_json else {},
        "created_at": dashboard.created_at,
        "updated_at": dashboard.updated_at
    }

@router.get("/dashboards", response_model=list[DashboardResponse])
def list_dashboards(
    dataset_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BIDashboard).filter(BIDashboard.user_id == current_user.id)
    if dataset_id and isinstance(dataset_id, str):
        query = query.filter(BIDashboard.dataset_id == dataset_id)
    if project_id and isinstance(project_id, str):
        query = query.filter(BIDashboard.project_id == project_id)
        
    dashboards = query.order_by(BIDashboard.updated_at.desc()).all()
    res = []
    for d in dashboards:
        res.append({
            "id": d.id,
            "project_id": d.project_id,
            "dataset_id": d.dataset_id,
            "name": d.name,
            "description": d.description,
            "kpis": json.loads(d.kpis_json) if d.kpis_json else [],
            "charts": json.loads(d.charts_json) if d.charts_json else [],
            "layout": json.loads(d.layout_json) if d.layout_json else {},
            "created_at": d.created_at,
            "updated_at": d.updated_at
        })
    return res

@router.get("/dashboards/{dashboard_id}", response_model=DashboardResponse)
def get_dashboard(
    dashboard_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    d = db.query(BIDashboard).filter(BIDashboard.id == dashboard_id, BIDashboard.user_id == current_user.id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    return {
        "id": d.id,
        "project_id": d.project_id,
        "dataset_id": d.dataset_id,
        "name": d.name,
        "description": d.description,
        "kpis": json.loads(d.kpis_json) if d.kpis_json else [],
        "charts": json.loads(d.charts_json) if d.charts_json else [],
        "layout": json.loads(d.layout_json) if d.layout_json else {},
        "created_at": d.created_at,
        "updated_at": d.updated_at
    }
