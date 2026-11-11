import os
import uuid
import json
import pandas as pd
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.models.report import Report
from app.models.ml import MLModel
from app.models.activity import ActivityLog
from app.schemas.report import ReportGenerateRequest, ReportResponse
from app.reports.generator import ReportGenerator
from app.api.cleaning import load_dataset_df

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.post("/generate", response_model=ReportResponse)
def generate_report(
    req: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    df = load_dataset_df(dataset)

    # Check if any ML models exist for this dataset to include
    ml_model = db.query(MLModel).filter(MLModel.dataset_id == dataset.id).first()
    ml_summary = None
    if ml_model:
        ml_summary = {
            "name": ml_model.name,
            "algorithm": ml_model.algorithm,
            "task_type": ml_model.task_type,
            "metrics": json.loads(ml_model.metrics_json) if ml_model.metrics_json else {}
        }

    sections = ReportGenerator.compile_report_sections(
        df, dataset.name, ml_model_summary=ml_summary
    )

    report_id = str(uuid.uuid4())
    fmt = req.format.lower()
    
    if fmt == "pdf":
        file_name = f"{report_id}_{dataset.name}_report.pdf"
        file_path = str(settings.REPORTS_DIR / file_name)
        ReportGenerator.generate_pdf(sections, file_path)
    elif fmt in ("excel", "xlsx"):
        fmt = "excel"
        file_name = f"{report_id}_{dataset.name}_report.xlsx"
        file_path = str(settings.REPORTS_DIR / file_name)
        ReportGenerator.generate_excel(sections, file_path, df)
    elif fmt == "csv":
        file_name = f"{report_id}_{dataset.name}_report.csv"
        file_path = str(settings.REPORTS_DIR / file_name)
        ReportGenerator.generate_csv(sections, file_path, df)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format '{fmt}'. Use pdf, excel, or csv.")

    report = Report(
        id=report_id,
        project_id=req.project_id or dataset.project_id,
        dataset_id=dataset.id,
        user_id=current_user.id,
        title=req.title,
        format=fmt,
        file_path=file_path,
        sections_json=json.dumps(sections)
    )
    db.add(report)

    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        action="generate_report",
        entity_type="report",
        entity_id=report.id,
        details_json=json.dumps({"title": report.title, "format": fmt, "dataset_id": dataset.id})
    )
    db.add(log)
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "project_id": report.project_id,
        "dataset_id": report.dataset_id,
        "title": report.title,
        "format": report.format,
        "file_path": report.file_path,
        "sections": json.loads(report.sections_json) if report.sections_json else None,
        "created_at": report.created_at
    }

@router.get("", response_model=list[ReportResponse])
def list_reports(
    dataset_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Report).filter(Report.user_id == current_user.id)
    if dataset_id and isinstance(dataset_id, str):
        query = query.filter(Report.dataset_id == dataset_id)
    if project_id and isinstance(project_id, str):
        query = query.filter(Report.project_id == project_id)
        
    reports = query.order_by(Report.created_at.desc()).all()
    res = []
    for r in reports:
        res.append({
            "id": r.id,
            "project_id": r.project_id,
            "dataset_id": r.dataset_id,
            "title": r.title,
            "format": r.format,
            "file_path": r.file_path,
            "sections": json.loads(r.sections_json) if r.sections_json else None,
            "created_at": r.created_at
        })
    return res

@router.get("/{report_id}/download")
def download_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found")
        
    media_types = {
        "pdf": "application/pdf",
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "csv": "text/csv"
    }
    
    return FileResponse(
        path=report.file_path,
        filename=os.path.basename(report.file_path),
        media_type=media_types.get(report.format, "application/octet-stream")
    )
