import uuid
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.dataset import Dataset
from app.models.ml import MLModel
from app.models.report import Report
from app.models.activity import ActivityLog
from app.schemas.project import ProjectCreate, ProjectResponse
from app.schemas.history import ActivityLogResponse

router = APIRouter(tags=["History & Workspace"])

@router.get("/dashboard/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_datasets = db.query(Dataset).filter(Dataset.user_id == current_user.id).count()
    total_records = db.query(func.sum(Dataset.row_count)).filter(Dataset.user_id == current_user.id).scalar() or 0
    total_models = db.query(MLModel).filter(MLModel.user_id == current_user.id).count()
    total_reports = db.query(Report).filter(Report.user_id == current_user.id).count()

    recent_activities = db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id).order_by(ActivityLog.created_at.desc()).limit(10).all()
    recent_datasets = db.query(Dataset).filter(Dataset.user_id == current_user.id).order_by(Dataset.created_at.desc()).limit(5).all()
    recent_models = db.query(MLModel).filter(MLModel.user_id == current_user.id).order_by(MLModel.created_at.desc()).limit(5).all()

    activity_list = []
    for a in recent_activities:
        activity_list.append({
            "id": a.id,
            "action": a.action,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "details": json.loads(a.details_json) if a.details_json else {},
            "created_at": a.created_at
        })

    dataset_list = []
    for d in recent_datasets:
        dataset_list.append({
            "id": d.id,
            "name": d.name,
            "file_type": d.file_type,
            "row_count": d.row_count,
            "col_count": d.col_count,
            "is_cleaned": d.is_cleaned,
            "created_at": d.created_at
        })

    model_list = []
    for m in recent_models:
        model_list.append({
            "id": m.id,
            "name": m.name,
            "algorithm": m.algorithm,
            "task_type": m.task_type,
            "metrics": json.loads(m.metrics_json) if m.metrics_json else {},
            "created_at": m.created_at
        })

    return {
        "kpis": {
            "total_datasets": total_datasets,
            "total_records": int(total_records),
            "total_models": total_models,
            "total_reports": total_reports
        },
        "recent_activity": activity_list,
        "recent_datasets": dataset_list,
        "recent_models": model_list
    }

@router.get("/history", response_model=list[ActivityLogResponse])
def get_user_history(
    entity_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id)
    if entity_type and isinstance(entity_type, str):
        query = query.filter(ActivityLog.entity_type == entity_type)
    logs = query.order_by(ActivityLog.created_at.desc()).limit(limit).all()
    
    res = []
    for log in logs:
        res.append({
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": json.loads(log.details_json) if log.details_json else None,
            "created_at": log.created_at
        })
    return res

@router.delete("/history/{history_id}")
def delete_history_item(
    history_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = db.query(ActivityLog).filter(ActivityLog.id == history_id, ActivityLog.user_id == current_user.id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Activity log not found")
    db.delete(log)
    db.commit()
    return {"message": "Activity record removed."}

@router.get("/projects", response_model=list[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projects = db.query(Project).filter(Project.user_id == current_user.id).order_by(Project.updated_at.desc()).all()
    return projects

@router.post("/projects", response_model=ProjectResponse)
def create_project(
    req: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    proj = Project(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=req.name,
        description=req.description
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return proj
